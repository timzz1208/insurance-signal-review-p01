// Usage: node render_cards.js <cards.json> <out_dir> [t1,t2,...]
// cards.json = {total, fps, cards:[...]} in OUTPUT seconds. Without times: renders every frame as transparent PNG.
const path=require('path'),fs=require('fs');
let pw; try{pw=require('playwright')}catch(e){pw=require(path.join(require('child_process').execSync('npm root -g').toString().trim(),'playwright'))}
(async()=>{
  const [cardsFile,outDir,only]=process.argv.slice(2);
  const data=JSON.parse(fs.readFileSync(cardsFile)); const fps=data.fps||30;
  fs.mkdirSync(outDir,{recursive:true});
  const opts=process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{};
  const b=await pw.chromium.launch(opts); const pg=await b.newPage({viewport:{width:1080,height:1920}});
  pg.on('pageerror',e=>{console.error('PAGE ERROR',e.message);process.exit(1)});
  await pg.addInitScript(d=>{window.CARDS=d},data);
  await pg.goto('file://'+path.resolve(__dirname,'../assets/cards.html')); await pg.evaluate(()=>document.fonts.ready);
  const ts=only?only.split(',').map(Number):[...Array(Math.round(data.total*fps)+1).keys()].map(i=>i/fps);
  for(const [k,t] of ts.entries()){
    await pg.evaluate(t=>render(t),t);
    await pg.screenshot({path:path.join(outDir,only?`still_${t}.png`:`${String(k).padStart(5,'0')}.png`),omitBackground:true});
  }
  await b.close(); console.log('rendered',ts.length,'frames');
})();
