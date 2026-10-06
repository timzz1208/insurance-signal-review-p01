// Usage: node render_overlay.js overlay.json OUT_DIR            -> every frame as transparent PNG
//        node render_overlay.js overlay.json OUT_DIR 1.2,40,49  -> stills at those output times
//        node render_overlay.js overlay.json OUT_DIR check      -> report visible elements that leave the 1080x1920 frame
const path=require('path'),fs=require('fs');
let pw;try{pw=require('playwright')}catch(e){pw=require(path.join(require('child_process').execSync('npm root -g').toString().trim(),'playwright'))}
(async()=>{
  const [f,outDir,mode]=process.argv.slice(2);const ov=JSON.parse(fs.readFileSync(f));const fps=ov.fps||24;fs.mkdirSync(outDir,{recursive:true});
  const b=await pw.chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
  const pg=await b.newPage({viewport:{width:1080,height:1920}});pg.on('pageerror',e=>{console.error('PAGE ERROR',e.message);process.exit(1)});
  await pg.addInitScript(d=>{window.OV=d},ov);await pg.goto('file://'+path.resolve(__dirname,'../assets/drama_overlay.html'));await pg.evaluate(()=>document.fonts.ready);
  if(mode==='check'){
    const ts=[];for(const it of ov.items){if(it.start!=null)ts.push(it.start+Math.min(.7,((it.end??it.start+1.4)-it.start)/2));(it.cards||[]).forEach(c=>ts.push(c.start+2.5))}
    const bad=[];for(const t of ts){await pg.evaluate(t=>render(t),t);
      const r=await pg.evaluate(()=>[...document.body.querySelectorAll('.l,.l *,.hk *')].filter(e=>{let o=1,x=e;while(x&&x!==document.body){o*=+getComputedStyle(x).opacity;x=x.parentElement}return o>.5&&e.offsetWidth>0})
        .map(e=>{const r=e.getBoundingClientRect();return [e.className||e.tagName,Math.round(r.left),Math.round(r.right),Math.round(r.top),Math.round(r.bottom)]}).filter(([c,l,r])=>l<-2||r>1082));
      r.forEach(x=>bad.push(`t=${t.toFixed(2)} ${x[0]} x:${x[1]}..${x[2]}`))}
    console.log(bad.length?'OVERFLOW '+[...new Set(bad)].slice(0,8).join(' | '):'ok ('+ts.length+' checkpoints)');await b.close();return}
  const ts=mode?mode.split(',').map(Number):[...Array(Math.round(ov.total*fps)+1).keys()].map(i=>i/fps);
  for(const [k,t] of ts.entries()){await pg.evaluate(t=>render(t),t);
    await pg.screenshot({path:path.join(outDir,mode?`still_${t}.png`:`${String(k).padStart(5,'0')}.png`),omitBackground:true})}
  await b.close();console.log('rendered',ts.length,'frames')})();
