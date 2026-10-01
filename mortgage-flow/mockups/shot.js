// 封面提案截圖：node mockups/shot.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff' };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
  const port = srv.address().port;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto(`http://127.0.0.1:${port}/mockups/covers.html`);
  fs.mkdirSync(path.join(ROOT, 'mockups/out'), { recursive: true });
  for (const v of ['A', 'B', 'C']) { await page.evaluate((v) => window.draw(v), v); await page.locator('canvas').screenshot({ path: path.join(ROOT, `mockups/out/cover_${v}.png`) }); console.log(v); }
  await browser.close(); srv.close();
})();
