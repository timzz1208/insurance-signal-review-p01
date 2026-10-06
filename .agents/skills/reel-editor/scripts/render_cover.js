// Usage: node render_cover.js <cover.json> <out.png>   cover.json = {bg:"abs path to frame jpg", tag, t1, t2, st}
const path=require('path'),fs=require('fs');
let pw; try{pw=require('playwright')}catch(e){pw=require(path.join(require('child_process').execSync('npm root -g').toString().trim(),'playwright'))}
(async()=>{const [cf,out]=process.argv.slice(2);const c=JSON.parse(fs.readFileSync(cf));c.bg='file://'+path.resolve(c.bg);
  const opts=process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{};
  const b=await pw.chromium.launch(opts);const pg=await b.newPage({viewport:{width:1080,height:1920}});
  await pg.addInitScript(d=>{window.COVER=d},c);await pg.goto('file://'+path.resolve(__dirname,'../assets/'+(c.template||'cover.html')));
  await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(300);await pg.screenshot({path:out});await b.close();console.log('cover',out)})();
