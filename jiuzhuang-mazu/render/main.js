// Frame driver: composes scenes (with crossfades), paper textures, line boil, subtitles and fades.
const W = 1920, H = 1080, XF = 0.5;
let TLINE = null, BG = {}, ALLTEXT = '';

// Seeded paper textures, identical in every render worker.
function makeTexture(night) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const r = rng(night ? 99 : 42);
  if (night) { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0e1a33'); gr.addColorStop(1, '#1b2c4d'); g.fillStyle = gr; }
  else g.fillStyle = '#f3ecdc';
  g.fillRect(0, 0, W, H);
  // blotches
  for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H, rad = 60 + r() * 260; const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const col = night ? (r() < 0.5 ? '40,60,100' : '5,10,25') : (r() < 0.6 ? '190,160,110' : '255,255,245');
    gr.addColorStop(0, `rgba(${col},${night ? 0.10 : 0.07})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  // fibres
  g.lineWidth = 0.7;
  for (let i = 0; i < 1400; i++) { const x = r() * W, y = r() * H, a = r() * 6.28, L = 4 + r() * 16;
    g.strokeStyle = night ? `rgba(150,170,210,${0.03 + r() * 0.05})` : `rgba(120,95,60,${0.04 + r() * 0.07})`;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * L / 2 + r() * 3, y + Math.sin(a) * L / 2, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
  // grain
  const im = g.getImageData(0, 0, W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * (night ? 10 : 14); d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
  // vignette
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, night ? 'rgba(0,0,10,0.45)' : 'rgba(90,60,20,0.22)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return c.toDataURL('image/png');
}

const DEFS = () => `<defs>
  <radialGradient id="glow"><stop offset="0" stop-color="#ffe3a0" stop-opacity="0.95"/><stop offset="0.35" stop-color="#ffcf70" stop-opacity="0.45"/><stop offset="1" stop-color="#ffc060" stop-opacity="0"/></radialGradient>
  <radialGradient id="glowR"><stop offset="0" stop-color="#ffb09a" stop-opacity="0.9"/><stop offset="0.4" stop-color="#ff7a5c" stop-opacity="0.4"/><stop offset="1" stop-color="#ff5a40" stop-opacity="0"/></radialGradient>
  <filter id="boil" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence id="turb" type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter>
</defs>`;

// Canvas text measurement for subtitle box sizing.
const mctx = document.createElement('canvas').getContext('2d');
function measure(str, font) { mctx.font = font; return mctx.measureText(str).width; }

function subtitles(t) {
  let out = '';
  for (const sc of TLINE.scenes) for (const l of sc.lines) {
    const a = l.start - 0.15, b = l.start + l.dur + 0.35;
    if (t < a - 0.25 || t > b + 0.25) continue;
    const op = Math.min(smooth01((t - (a - 0.25)) / 0.25), smooth01(((b + 0.25) - t) / 0.25));
    if (op <= 0) continue;
    const zw = measure(l.zh, `46px "LXGW WenKai TC"`), ew = measure(l.en, `italic 31px "EB Garamond"`);
    const bw = Math.max(zw, ew) + 72, bh = 118, bx = 960 - bw / 2, by = 1080 - 36 - bh;
    out += `<g opacity="${f3(op)}"><rect x="${f1(bx)}" y="${by}" width="${f1(bw)}" height="${bh}" rx="18" fill="#1d1712" fill-opacity="0.52"/>` +
      `<text x="960" y="${by + 54}" text-anchor="middle" font-family="LXGW WenKai TC" font-size="46" fill="#fbf4e2">${l.zh}</text>` +
      `<text x="960" y="${by + 96}" text-anchor="middle" font-family="EB Garamond" font-style="italic" font-size="31" fill="#efe4c8">${l.en.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}</text></g>`;
  }
  return out;
}

// Persistent layers: two scene slots (for crossfades), each with pre-loaded day/night paper images,
// so textures never reload between frames; only the vector content is rebuilt every frame.
function buildStage() {
  const svg = document.getElementById('stage');
  const slot = k => `<g id="slot${k}"><image id="bd${k}" href="${BG.day}" x="0" y="0" width="1920" height="1080"/><image id="bn${k}" href="${BG.night}" x="0" y="0" width="1920" height="1080"/><g id="c${k}" filter="url(#boil)"></g></g>`;
  svg.innerHTML = DEFS() + slot(0) + slot(1) + '<g id="subs"></g><rect id="fade" x="0" y="0" width="1920" height="1080" fill="#000" opacity="0"/>';
}

function renderFrame(frame) {
  const t = frame / TLINE.fps, $ = id => document.getElementById(id);
  const active = [];
  TLINE.scenes.forEach((sc, i) => {
    const a = i === 0 ? -1 : sc.start - XF, b = i === TLINE.scenes.length - 1 ? 1e9 : sc.end + XF;
    if (t >= a && t < b) active.push([sc, i === 0 ? 1 : smooth01((t - a) / (2 * XF))]);
  });
  for (let k = 0; k < 2; k++) {
    const e = active[k];
    $('slot' + k).setAttribute('display', e ? 'inline' : 'none');
    if (!e) { $('c' + k).innerHTML = ''; continue; }
    const [sc, op] = e;
    setTheme(sc.night);
    $('slot' + k).setAttribute('opacity', f3(op));
    $('bd' + k).setAttribute('display', sc.night ? 'none' : 'inline');
    $('bn' + k).setAttribute('display', sc.night ? 'inline' : 'none');
    $('c' + k).innerHTML = SCENES[sc.id](t - sc.start, sc);
  }
  $('subs').innerHTML = subtitles(t);
  const fade = Math.max(1 - clamp(t / 0.9), clamp((t - (TLINE.duration - 1.6)) / 1.5));
  $('fade').setAttribute('opacity', f3(fade));
  // line boil: re-seed the displacement noise every 3 frames (~10 Hz), like redrawn animation cels
  $('turb').setAttribute('seed', String(1 + (Math.floor(frame / 3) % 7)));
  return active.map(a => a[0].id).join('+');
}

async function init() {
  TLINE = await (await fetch('/build/timeline.json')).json();
  ALLTEXT = JSON.stringify(TLINE) + '新社九庄媽進香遊庄過爐遶境臺中山頂土城畚箕湖擺頭店鳥銃頭水底寮大南馬力埔大甲溪北九庄同沐恩四季保平安有神無廟聖筊一平一凸登錄臺中市民俗文化資產２００９九年一輪旁白畫面配樂皆以程式原創繪製與合成資料來源處國家網政府新聞學庫自由時報聯合謹向信眾致敬　・、：0123456789';
  const fams = ['400 46px "LXGW WenKai TC"', '700 46px "LXGW WenKai TC"', 'italic 400 31px "EB Garamond"'];
  for (const f of fams) await document.fonts.load(f, ALLTEXT);
  await document.fonts.ready;
  BG.day = makeTexture(false); BG.night = makeTexture(true);
  for (const k of ['day', 'night']) { const im = new Image(); im.src = BG[k]; await im.decode(); }
  buildStage();
  // wait until every <image> in the stage has decoded so no frame is ever painted without its paper
  await Promise.all([...document.querySelectorAll('#stage image')].map(im => new Promise(res => {
    const probe = new Image(); probe.onload = res; probe.onerror = res; probe.src = im.getAttribute('href'); })));
  window.READY = true;
}
init();
