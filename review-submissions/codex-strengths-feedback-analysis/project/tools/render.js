// Renders frames with headless Chromium. Every frame: build SVG -> wait two animation frames
// (layout + paint complete) -> screenshot -> pipe PNG to ffmpeg. Modes:
//   node tools/render.js check                           build every frame's SVG, surface errors fast
//   node tools/render.js events                          write build/events.json (sound cues)
//   node tools/render.js stills <t1,t2,...> <outdir> [guides]   single Reel frames at given seconds
//   node tools/render.js cards <outdir>                  5 carousel stills, 1080x1350
//   node tools/render.js video <workers>                 render all frames into build/seg_*.mp4
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const browserServers = new Map();
async function launchBrowser(options) {
  const server = await chromium.launchServer(options);
  const browser = await chromium.connect(server.wsEndpoint());
  browserServers.set(browser, server);
  return browser;
}
async function closeBrowser(browser) {
  // Windows installed Chrome can hang on graceful shutdown. BrowserServer owns
  // only this render's child process; kill() deterministically reaps that process.
  const server = browserServers.get(browser);
  await server.kill();
  browserServers.delete(browser);
}
const FFMPEG = process.env.FFMPEG || require('child_process').execSync('python -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())"').toString().trim();
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/render/index.html';
      if (p === '/favicon.ico') { r.writeHead(204); return r.end(); }
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
  await page.goto(`http://127.0.0.1:${port}/${query}`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  if (errs.length) throw new Error('page errors: ' + errs.join('\n'));
  return { page, errs, h };
}
async function shot(ctx, frame, card = false, fast = false) {
  const label = await ctx.page.evaluate(([f, c]) => c ? renderCard(f) : renderFrame(f), [frame, card]);
  // Screenshot forces layout/paint; rAF can stall indefinitely in background headless tabs on Windows.
  await ctx.page.evaluate(() => document.getElementById('stage').getBoundingClientRect().width);
  if (ctx.errs.length) throw new Error(`frame ${frame}: ` + ctx.errs.join('\n'));
  return { png: await ctx.page.screenshot({ type: fast ? 'jpeg' : 'png', ...(fast ? {quality:95} : {}), clip: { x: 0, y: 0, width: VW, height: ctx.h } }), label };
}

(async () => {
  const [mode, arg, out] = process.argv.slice(2);
  const srv = await serve(), port = srv.address().port;
  const candidates = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].filter(Boolean);
  const executablePath = candidates.find(p => fs.existsSync(p));
  const LAUNCH = { args: ['--font-render-hinting=none'], ...(executablePath ? { executablePath } : {}) };
  const browser = await launchBrowser(LAUNCH);
  const TL = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/timeline.json')));
  const total = Math.ceil(TL.duration * TL.fps);
  if (mode === 'layout') {
    const problems = [], checked = [];
    for (const card of [false, true]) {
      const ctx = await openPage(browser, port, card ? '?mode=card' : '', card ? 1350 : VH);
      // Inspect every non-transition frame, including partially visible moving text.
      // Push transitions intentionally move entire pages outside the viewport.
      const samples = card ? TL.scenes.map((_,i)=>i) : Array.from({length:total},(_,i)=>i).filter(f=>!TL.scenes.slice(1).some(sc=>Math.abs(f/TL.fps-sc.start)<.18));
      for (const f of samples) {
        await ctx.page.evaluate(([f,c])=>c?renderCard(f):renderFrame(f),[f,card]);
        const errors = await ctx.page.evaluate(card=>{
          const visible=e=>{for(let p=e;p&&p.tagName!=='svg';p=p.parentElement){if(p.getAttribute('display')==='none'||+(p.getAttribute('opacity')??1)<.15)return false;}return true;};
          const nodes=[...document.querySelectorAll('#stage text')].filter(visible).map(e=>({text:e.textContent,r:e.getBoundingClientRect()}));
          const bad=[];
          for(const {text,r} of nodes) if(r.left<45||r.right>(card?1035:955)||r.top<(card?25:220)||r.bottom>(card?1320:1540)) bad.push({kind:'safe-area',text,rect:[r.left,r.top,r.right,r.bottom]});
          for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++){
            const x=nodes[a],y=nodes[b];
            if(Math.min(x.r.right,y.r.right)-Math.max(x.r.left,y.r.left)>3 && Math.min(x.r.bottom,y.r.bottom)-Math.max(x.r.top,y.r.top)>3)bad.push({kind:'text-overlap',text:[x.text,y.text]});
          }
          return bad;
        },card);
        checked.push({card,frame:f}); problems.push(...errors.map(e=>({card,frame:f,...e})));
      }
      await ctx.page.close();
    }
    fs.mkdirSync('output/qa',{recursive:true});
    fs.writeFileSync('output/qa/layout.json',JSON.stringify({checked,problems},null,2));
    console.log('layout samples',checked.length,'issues',problems.length); if(problems.length) {console.log(problems);process.exitCode=1;}
  } else if (mode === 'check') {  // build every frame's SVG (no capture) to surface script/attribute errors fast
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
  } else if (mode === 'events') {
    const ctx = await openPage(browser, port);
    const ev = await ctx.page.evaluate(() => collectEvents());
    fs.writeFileSync(path.join(ROOT, 'build/events.json'), JSON.stringify(ev, null, 1)); console.log('events', ev.length);
    const cues = await ctx.page.evaluate(() => TLINE.scenes.flatMap(sc=>sc.lines.map(l=>({start:l.start-SUB.pre,end:l.start+l.dur+SUB.post,text:subLines(l.zh).join('\n')}))));
    fs.writeFileSync(path.join(ROOT,'build/subtitle_cues.json'),JSON.stringify(cues,null,2));
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
      const br = w === 0 ? browser : await launchBrowser(LAUNCH);
      const ctx = await openPage(br, port);
      const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-tune', 'animation', path.join(ROOT, `build/seg_${w}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
      const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
      for (let f = a; f < b; f++) {
        const { png } = await shot(ctx, f, false, true);
        if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
        if (w === 0 && f % 60 === 0) console.log(`w0 ${f - a}/${b - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      ff.stdin.end(); await done; if (br !== browser) await closeBrowser(br); console.log(`worker ${w} done frames ${a}-${b - 1}`);
    }));
    fs.writeFileSync(path.join(ROOT, 'build/segments.txt'), [...Array(W).keys()].map(w => `file 'seg_${w}.mp4'`).join('\n'));
    console.log('frames', total, 'time', ((Date.now() - t0) / 1000).toFixed(0), 's');
  }
  await closeBrowser(browser); srv.closeAllConnections(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
