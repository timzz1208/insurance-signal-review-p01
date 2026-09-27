// Renders frames with headless Chromium. Every frame: build SVG -> wait two animation frames
// (layout + paint complete) -> screenshot -> pipe PNG to ffmpeg. Modes:
//   node tools/render.js stills <t1,t2,...> <outdir>     render single frames at given seconds
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

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  if (errs.length) throw new Error('page errors: ' + errs.join('\n'));
  return { page, errs };
}
async function shot(ctx, frame) {
  const label = await ctx.page.evaluate(f => renderFrame(f), frame);
  await ctx.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  if (ctx.errs.length) throw new Error(`frame ${frame}: ` + ctx.errs.join('\n'));
  return { png: await ctx.page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } }), label };
}

(async () => {
  const [mode, arg, out] = process.argv.slice(2);
  const srv = await serve(), port = srv.address().port;
  const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
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
  } else if (mode === 'stills') {
    const ctx = await openPage(browser, port); fs.mkdirSync(out, { recursive: true });
    for (const s of arg.split(',')) { const f = Math.round(parseFloat(s) * TL.fps); const { png, label } = await shot(ctx, f); fs.writeFileSync(path.join(out, `f${String(f).padStart(5, '0')}.png`), png); console.log(s, f, label); }
  } else {
    const W = parseInt(arg || '4'), per = Math.ceil(total / W), t0 = Date.now();
    await Promise.all([...Array(W).keys()].map(async w => {
      const a = w * per, b = Math.min(total, a + per);
      // one browser per worker: pages in a shared browser serialise on its single GPU/raster process
      const br = w === 0 ? browser : await chromium.launch({ args: ['--font-render-hinting=none'] });
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
