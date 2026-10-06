const {chromium}=require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+process.cwd()+'/cover_ep01.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
const w=await p.evaluate(()=>[...document.querySelectorAll('.t1,.t2,.st,.tag')].map(e=>Math.round(e.getBoundingClientRect().right)));console.log('right edges',w);
await p.screenshot({path:'out/cover_ep01.png'});await b.close();})();
