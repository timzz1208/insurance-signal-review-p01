// 逐格輸出 video.html → MP4（1080×1920，預設 60fps，H.264 固定位元率）
// 製作方法：林彥廷（timzz1208@gmail.com）｜paper-ink-flow skill
//
//   node render.js --frames 0.5,10,28        只輸出幾張定格 PNG 到 build/stills/（先看風格，省時間）
//   node render.js --out build/silent.mp4    輸出無聲影片（make.sh 會再把混音合進去）
//   選項：--fps 60  --vbitrate 5.5M（有逐格顆粒時一定要固定位元率）  --crf 17（改用品質模式）
//   環境變數：FFMPEG=ffmpeg 路徑   CHROMIUM=瀏覽器路徑（沒有就用 playwright 內建的）
//
// 為什麼要用本機伺服器：中文字型（@fontsource）拆成很多子集，畫布只會用「已經載入」的子集。
// 所以先把整支影片會畫的字全部收集起來，預先載入，再開始輸出。
const http = require('http'), fs = require('fs'), path = require('path'), { spawn, execSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = __dirname;
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const FPS = +opt('--fps', 60);
const OUT = path.resolve(opt('--out', path.join(ROOT, 'build', 'silent.mp4')));
const STILLS = opt('--frames', null);
const VBR = opt('--vbitrate', '5.5M');
const CRF = opt('--crf', null);
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { return execSync('python3 -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())"', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) {}
  try { return execSync('python -c "import imageio_ffmpeg as i;print(i.get_ffmpeg_exe())"', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) {}
  return 'ffmpeg';
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const p = decodeURIComponent(q.url.split('?')[0]), f = path.join(ROOT, p === '/' ? '/video.html' : p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}
async function open(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // 只用本機字型，結果才可重現
  await page.goto(`http://127.0.0.1:${port}/video.html?render=1`);
  await page.waitForFunction(() => typeof window.renderAt === 'function');
  if (errs.length) throw new Error('page errors: ' + errs.join('\n'));
  return page;
}

(async () => {
  const srv = await serve(), port = srv.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--font-render-hinting=none'] });
  // 1) 收集整支影片畫到的字（每 0.2 秒跑一次 renderAt，攔截 fillText）
  const probe = await open(browser, port);
  const fontsUsed = await probe.evaluate(() => {
    const seen = {}, P = CanvasRenderingContext2D.prototype, O = typeof OffscreenCanvasRenderingContext2D !== 'undefined' ? OffscreenCanvasRenderingContext2D.prototype : null;
    for (const proto of [P, O].filter(Boolean)) { const orig = proto.fillText; proto.fillText = function (s, ...a) { (seen[this.font] = seen[this.font] || new Set()); for (const c of String(s)) seen[this.font].add(c); return orig.call(this, s, ...a); }; }
    for (let t = 0; t < window.DURATION; t += 0.2) window.renderAt(t);
    window.renderAt(window.DURATION - 1e-3);
    return Object.fromEntries(Object.entries(seen).map(([f, s]) => [f, [...s].join('')]));
  });
  await probe.close();
  // 2) 新開一頁，先載入字型再畫第一格（印章等快取的圖才不會用到備援字體）
  const page = await open(browser, port);
  const missing = await page.evaluate(async (F) => {
    const bad = [];
    for (const [font, text] of Object.entries(F)) {
      await document.fonts.load(font, text);
      if (!document.fonts.check(font, text)) bad.push(font);
    }
    await document.fonts.ready;
    return bad;
  }, fontsUsed);
  if (missing.length) console.warn('⚠ 這些字型沒有完整載入（會用到系統預設字體）：', missing.join(' / '));
  else console.log('fonts ok:', Object.keys(fontsUsed).length, 'font styles');
  const canvas = await page.$('canvas');

  if (STILLS) {
    const dir = process.env.STILL_DIR || path.join(ROOT, 'build', 'stills'); fs.mkdirSync(dir, { recursive: true });
    for (const s of STILLS.split(',')) {
      await page.evaluate(t => window.renderAt(t), +s);
      const f = path.join(dir, `still-${(+s).toFixed(2)}.png`); await canvas.screenshot({ path: f }); console.log(f);
    }
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const dur = await page.evaluate(() => window.DURATION), total = Math.round(dur * FPS);
    const ff = spawn(findFfmpeg(), ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', ...(CRF ? ['-crf', CRF] : ['-b:v', VBR, '-maxrate', VBR, '-bufsize', '12M', '-tune', 'grain']),
      '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
    const t0 = Date.now();
    for (let f = 0; f < total; f++) {
      await page.evaluate(t => window.renderAt(t), Math.min(f / FPS, dur - 1e-3));
      const buf = await canvas.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 240 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await done;
    console.log('done →', OUT, `(${total} frames, ${dur}s @ ${FPS}fps)`);
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
