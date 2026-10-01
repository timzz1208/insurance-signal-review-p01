const { chromium } = require(process.env.PW || 'playwright');
const fs=require('fs'); const path=require('path');
(async()=>{
  const cards=JSON.parse(fs.readFileSync(__dirname+'/cards.json'));
  const only=process.argv[2]?process.argv[2].split(',').map(Number):null;
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1080,height:1920}});
  await pg.addInitScript(c=>{window.CARDS=c},cards);
  await pg.goto('file://'+__dirname+'/cards.html'); await pg.evaluate(()=>document.fonts.ready);
  const N=Math.round(cards.total*30)+1; fs.mkdirSync(__dirname+'/frames',{recursive:true});
  const ts=only||[...Array(N).keys()].map(i=>i/30);
  for(const [k,t] of ts.entries()){
    await pg.evaluate(t=>render(t),t);
    const f=only?`${__dirname}/still_${t}.png`:`${__dirname}/frames/${String(k).padStart(4,'0')}.png`;
    await pg.screenshot({path:f,omitBackground:true});
  }
  await b.close(); console.log('frames',ts.length);
})();
