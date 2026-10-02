// Renders frames with headless Chromium. Every frame: build SVG -> wait two animation frames
// (layout + paint complete) -> screenshot -> pipe PNG to ffmpeg. Modes:
//   node tools/render.js check                           build every frame's SVG, surface errors fast
//   node tools/render.js events                          write build/events.json (sound cues)
//   node tools/render.js bounds                          list visible text outside the IG safe area
//   node tools/render.js stills <t1,t2,...> <outdir> [guides]   single Reel frames at given seconds
//   node tools/render.js cards <outdir>                  5 carousel stills, 1080x1350
//   node tools/render.js video <workers>                 render all frames into build/seg_*.mp4
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const FFMPEG = process.env.FFMPEG || require('child_process').execSync('python3 -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())"').toString().trim();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/render/index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
    }).listen(0, () => res(srv));
  });
}

const VW = 1080, VH = 1920;
async function openPage(browser, port, query = '', h = VH) {
  const page = await browser.newPage({ viewport: { width: VW, height: h }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  // THEME=finance|ai|growth overrides script.json's theme (for side-by-side previews)
  if (process.env.THEME) query += (query.includes('?') ? '&' : '?') + 'theme=' + process.env.THEME;
  await page.goto(`http://127.0.0.1:${port}/${query}`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  if (errs.length) throw new Error('page errors: ' + errs.join('\n'));
  return { page, errs, h };
}
async function shot(ctx, frame, card = false) {
  const label = await ctx.page.evaluate(([f, c]) => c ? renderCard(f) : renderFrame(f), [frame, card]);
  await ctx.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  if (ctx.errs.length) throw new Error(`frame ${frame}: ` + ctx.errs.join('\n'));
  return { png: await ctx.page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: VW, height: ctx.h } }), label };
}

(async () => {
  const [mode, arg, out] = process.argv.slice(2);
  const srv = await serve(), port = srv.address().port;
  const LAUNCH = { args: ['--font-render-hinting=none'] };
  const browser = await chromium.launch(LAUNCH);
  const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/timeline.json')));
  const total = Math.ceil(TL.duration * TL.fps);
  if (mode === 'check') {  // build every frame's SVG (no capture) to surface script/attribute errors fast
    const ctx = await openPage(browser, port);
    for (let f = 0; f < total; f++) { await ctx.page.evaluate(f => renderFrame(f), f); if (ctx.errs.length) throw new Error(`frame ${f}: ` + ctx.errs.join('\n')); }
    console.log('check ok', total, 'frames');
  } else if (mode === 'range') {  // re-render frames [a, b) into one segment: node tools/render.js range a b out.mp4
    const [a, b] = arg.split(',').map(Number), ctx = await openPage(browser, port);
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-tune', 'animation', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
    for (let f = a; f < b; f++) { const { png } = await shot(ctx, f); if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r)); }
    ff.stdin.end(); await done; console.log('range', a, b, 'done');
  } else if (mode === 'bounds') {  // every 0.5 s: any visible text outside the IG safe area (x > 960, y < 220, y > 1540)?
    const ctx = await openPage(browser, port); let bad = 0;
    for (let f = 0; f < total; f += Math.round(TL.fps / 2)) {
      const hits = await ctx.page.evaluate(f => { renderFrame(f); const out = [];
        for (const el of document.querySelectorAll('#slot0 text, #slot1 text, #subs text')) {
          const op = [...(function* (n) { while (n && n.getAttribute) { yield n; n = n.parentNode; } })(el)].reduce((a, n) => a * (n.getAttribute('opacity') == null ? 1 : +n.getAttribute('opacity')), 1);
          if (op < 0.05 || !el.textContent.trim()) continue;
          const r = el.getBoundingClientRect(); if (r.width < 1) continue;
          if (r.right > 960 || r.top < 220 || r.bottom > 1540) out.push(`${el.textContent.slice(0, 14)} [${Math.round(r.left)}..${Math.round(r.right)}, ${Math.round(r.top)}..${Math.round(r.bottom)}]`);
        } return out; }, f);
      for (const h of hits) { console.log(`t=${(f / TL.fps).toFixed(1)}s  ${h}`); bad++; }
    }
    console.log('bounds check:', bad, 'text boxes outside the safe area');
  } else if (mode === 'events') {
    const ctx = await openPage(browser, port);
    const ev = await ctx.page.evaluate(() => collectEvents());
    fs.writeFileSync(path.join(ROOT, 'build/events.json'), JSON.stringify(ev, null, 1)); console.log('events', ev.length);
  } else if (mode === 'cards') {
    const ctx = await openPage(browser, port, '?mode=card', 1350); fs.mkdirSync(arg, { recursive: true });
    for (let i = 0; i < TL.scenes.length; i++) { const { png, label } = await shot(ctx, i, true); const f = path.join(arg, `${String(i + 1).padStart(2, '0')}_${label}.png`); fs.writeFileSync(f, png); console.log(f); }
  } else if (mode === 'stills') {
    const ctx = await openPage(browser, port, process.argv[5] === 'guides' ? '?guides=1' : ''); fs.mkdirSync(out, { recursive: true });
    for (const s of arg.split(',')) { const f = Math.round(parseFloat(s) * TL.fps); const { png, label } = await shot(ctx, f); fs.writeFileSync(path.join(out, `f${String(f).padStart(5, '0')}.png`), png); console.log(s, f, label); }
  } else {
    const W = parseInt(arg || '4'), per = Math.ceil(total / W), t0 = Date.now();
    await Promise.all([...Array(W).keys()].map(async w => {
      const a = w * per, b = Math.min(total, a + per);
      // one browser per worker: pages in a shared browser serialise on its single GPU/raster process
      const br = w === 0 ? browser : await chromium.launch(LAUNCH);
      const ctx = await openPage(br, port);
      const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-tune', 'animation', path.join(ROOT, `build/seg_${w}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
      for (let f = a; f < b; f++) {
        const { png } = await shot(ctx, f);
        if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
        if (w === 0 && f % 60 === 0) console.log(`w0 ${f - a}/${b - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end(); await done; if (br !== browser) await br.close(); console.log(`worker ${w} done frames ${a}-${b - 1}`);
    }));
    fs.writeFileSync(path.join(ROOT, 'build/segments.txt'), [...Array(W).keys()].map(w => `file 'seg_${w}.mp4'`).join('\n'));
    console.log('frames', total, 'time', ((Date.now() - t0) / 1000).toFixed(0), 's');
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
