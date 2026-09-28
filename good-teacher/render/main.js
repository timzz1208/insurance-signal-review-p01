// Frame driver: paper texture, scene crossfades, line boil, burned-in subtitles (Reel), and the
// 4:5 carousel still mode (?mode=card). ?guides=1 overlays the IG safe area for review stills.
const Q = new URLSearchParams(location.search), CARD = Q.get('mode') === 'card', GUIDES = Q.get('guides') === '1';
const W = 1080, H = CARD ? 1350 : 1920, XF = 0.25;
// Reel layout: content is authored around CX = 510 and shifted by REEL_DX so it sits centred on the frame
// (x = 540); text is kept ≤ 840 px wide so it still clears IG's right-hand button column (x > 960).
const REEL_DX = 30;
const SUB = { cx: CX + REEL_DX, bottom: 1530, size: 54, maxW: 840, pre: 0.1, post: 0.15 };  // shared with tools/srt.py timing
let TLINE = null, BG = '';

// Seeded warm paper texture (fibres, blotches, grain, soft vignette), identical in every render worker.
function makeTexture() {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const r = rng(42);
  g.fillStyle = TH.fill; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * H, rad = 60 + r() * 240; const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const col = r() < 0.6 ? '190,165,120' : '255,255,248';
    gr.addColorStop(0, `rgba(${col},0.07)`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.lineWidth = 0.7;
  for (let i = 0; i < 1300; i++) { const x = r() * W, y = r() * H, a = r() * 6.28, L = 4 + r() * 16;
    g.strokeStyle = `rgba(120,98,66,${0.04 + r() * 0.07})`;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * L / 2 + r() * 3, y + Math.sin(a) * L / 2, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
  const im = g.getImageData(0, 0, W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(im, 0, 0);
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.9);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(90,64,28,0.16)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  return c.toDataURL('image/png');
}

const DEFS = () => `<defs>
  <filter id="boil" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence id="turb" type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="boilT" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence id="turbT" type="fractalNoise" baseFrequency="0.03" numOctaves="1" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.2" xChannelSelector="R" yChannelSelector="G"/></filter>
</defs>`;

// Subtitle line breaking: Chinese only, trailing 。 dropped; break at the punctuation nearest the middle.
function subLines(zh) {
  const s = zh.replace(/。$/, '');
  if (measure(s, SUB.size) <= SUB.maxW) return [s];
  let best = -1, bd = 1e9;
  [...s].forEach((c, i) => { if ('，：、；？'.includes(c) && i < s.length - 1) { const d = Math.abs(i + 1 - s.length / 2); if (d < bd) { bd = d; best = i + 1; } } });
  if (best < 0 || measure(s.slice(0, best), SUB.size) > SUB.maxW || measure(s.slice(best), SUB.size) > SUB.maxW) best = Math.ceil(s.length / 2);
  return [s.slice(0, best), s.slice(best)];
}
function subtitles(t) {
  let out = '';
  for (const sc of TLINE.scenes) for (const l of sc.lines) {
    const a = l.start - SUB.pre, b = l.start + l.dur + SUB.post;
    if (t < a || t > b) continue;
    const op = Math.min(clamp((t - a) / 0.12), clamp((b - t) / 0.12));
    const lines = subLines(l.zh), lh = SUB.size * 1.32;
    const bw = Math.max(...lines.map(s => measure(s, SUB.size))) + 56, bh = lines.length * lh + 30, by = SUB.bottom - bh;
    out += `<g opacity="${f3(op)}"><rect x="${f1(SUB.cx - bw / 2)}" y="${f1(by)}" width="${f1(bw)}" height="${f1(bh)}" rx="20" fill="#26211c" fill-opacity="0.8"/>` +
      lines.map((s, i) => `<text x="${SUB.cx}" y="${f1(by + 15 + lh * i + SUB.size * 1.02)}" text-anchor="middle" font-family="${ZH}" font-size="${SUB.size}" fill="#fbf6ea" stroke="#fbf6ea" stroke-width="${boldW(SUB.size)}" stroke-linejoin="round">${esc(s)}</text>`).join('') + '</g>';
  }
  return out;
}

// Account signature: @handle (teal, bold) | series label. Reel: handle top-left just inside the IG safe area,
// on its own layer so it stays put through scene crossfades. Card: top-left, page number top-right.
const HANDLE = '@timzz1208', SERIES = '教學筆記';
function brand(x, y, size, series = true) {
  const w = measure(HANDLE, size), bar = measure('  ｜  ', size, 400);
  return T(x, y, HANDLE, { size, anchor: 'start', fill: TH.teal }) + (series ? T(x + w, y, '  ｜  ', { size, anchor: 'start', fill: TH.faint, weight: 400 }) +
    T(x + w + bar, y, SERIES, { size, anchor: 'start', fill: TH.ink, weight: 400 }) : '');
}

function guides() {
  if (!GUIDES) return '';
  const r = 'fill="#ff00aa" fill-opacity="0.13" stroke="#ff00aa" stroke-width="2" stroke-dasharray="10 8"';
  return CARD ? '' : `<rect x="0" y="0" width="${W}" height="220" ${r}/><rect x="0" y="${H - 380}" width="${W}" height="380" ${r}/><rect x="${W - 120}" y="220" width="120" height="${H - 600}" ${r}/>`;
}

function buildStage() {
  const svg = document.getElementById('stage');
  svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const slot = k => `<g id="slot${k}"><g id="a${k}" filter="url(#boil)"></g><g id="t${k}" filter="url(#boilT)"></g></g>`;
  svg.innerHTML = DEFS() + `<image href="${BG}" x="0" y="0" width="${W}" height="${H}"/>` + slot(0) + slot(1) + '<g id="subs"></g><g id="extra"></g><g id="guides"></g>';
}
function boil(frame) {
  // line boil: re-seed the displacement noise every 3 frames (~10 Hz), like redrawn animation cels
  document.getElementById('turb').setAttribute('seed', String(1 + (Math.floor(frame / 3) % 7)));
  document.getElementById('turbT').setAttribute('seed', String(1 + (Math.floor(frame / 3) % 5)));
}

function renderFrame(frame) {
  const t = frame / TLINE.fps, $ = id => document.getElementById(id);
  WIPE_ID = 0;
  const active = [];
  TLINE.scenes.forEach((sc, i) => {
    const a = i === 0 ? -1 : sc.start - XF, b = i === TLINE.scenes.length - 1 ? 1e9 : sc.end + XF;
    if (t >= a && t < b) active.push([sc, i === 0 ? 1 : smooth01((t - a) / (2 * XF))]);
  });
  for (let k = 0; k < 2; k++) {
    const e = active[k];
    $('slot' + k).setAttribute('display', e ? 'inline' : 'none');
    if (!e) { $('a' + k).innerHTML = ''; $('t' + k).innerHTML = ''; continue; }
    const [sc, op] = e, r = SCENES[sc.id](t - sc.start, sc, { card: false });
    $('slot' + k).setAttribute('opacity', f3(op));
    $('a' + k).innerHTML = `<g transform="translate(${REEL_DX} 0)">${r.art}</g>`; $('t' + k).innerHTML = `<g transform="translate(${REEL_DX} 0)">${r.txt}</g>`;
  }
  $('subs').innerHTML = subtitles(t);
  $('extra').innerHTML = brand(60, 262, 30, false);   // handle only: the series label would touch scene 4/5 headlines
  $('guides').innerHTML = guides();
  boil(frame);
  return active.map(a => a[0].id).join('+');
}

// Carousel still: the scene's fully-built state, re-laid for 1080x1350 with page number + swipe hint.
function renderCard(i) {
  const $ = id => document.getElementById(id), sc = TLINE.scenes[i], n = TLINE.scenes.length;
  WIPE_ID = 0;
  const r = SCENES[sc.id](sc.end - sc.start - 0.02, sc, { card: true });
  const tf = r.abs ? '' : 'translate(30 -130)';
  $('slot0').setAttribute('display', 'inline'); $('slot0').setAttribute('opacity', '1'); $('slot1').setAttribute('display', 'none');
  $('a0').innerHTML = `<g transform="${tf}">${r.art}</g>`; $('t0').innerHTML = `<g transform="${tf}">${r.txt}</g>`;
  $('subs').innerHTML = '';
  $('extra').innerHTML = brand(64, 70, 28) +
    T(1016, 70, `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`, { size: 28, anchor: 'end', fill: TH.faint, weight: 400 }) +
    (i < n - 1 ? T(1016, 1312, '往左滑 →', { size: 28, anchor: 'end', fill: TH.faint, weight: 400 }) : '');
  boil(i * 3);
  return sc.id;
}

// Sound cues in absolute seconds, for tools/audio.py.
function collectEvents() {
  const out = [];
  for (const sc of TLINE.scenes) for (const e of (EVENTS[sc.id] ? EVENTS[sc.id](sc) : [])) out.push({ ...e, t: +(sc.start + e.t).toFixed(3), scene: sc.id });
  return out.sort((a, b) => a.t - b.t);
}

async function init() {
  TLINE = await (await fetch('/build/timeline.json')).json();
  // every glyph the film will draw: render each scene's end state (Reel + card) once and harvest its text,
  // so the font subsets are loaded before frame 0 (no hand-maintained character list to fall out of date)
  let all = JSON.stringify(TLINE) + SOURCES.join('') + HANDLE + SERIES + ' ｜0123456789/ 往左滑→';
  for (const sc of TLINE.scenes) for (const card of [false, true]) {
    for (const t of [0.5, (sc.end - sc.start) * 0.5, sc.end - sc.start - 0.02]) { const r = SCENES[sc.id](t, sc, { card }); all += (r.art + r.txt).replace(/<[^>]*>/g, ''); }
  }
  await document.fonts.load('400 48px "Iansui"', all);
  await document.fonts.ready;
  BG = makeTexture();
  { const im = new Image(); im.src = BG; await im.decode(); }
  buildStage();
  await Promise.all([...document.querySelectorAll('#stage image')].map(im => new Promise(res => {
    const probe = new Image(); probe.onload = res; probe.onerror = res; probe.src = im.getAttribute('href'); })));
  window.READY = true;
}
init();
