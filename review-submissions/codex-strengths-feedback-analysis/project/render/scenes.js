// Five existing scenes. Actions and sound cues share unchanged narration line starts.
const CX=510, ls=(sc,i)=>sc.lines[i].start-sc.start;
const tIn=(t,a,d=.7)=>clamp((t-a)/d), move=(t,a,d=.7)=>smooth01(tIn(t,a,d));
const SOURCES=['方法出處：Drucker〈Managing Oneself〉1999'];
const box=(x,y,w,h,c=TH.ink)=>S(roundRect(x,y,w,h,18,17),1,{fill:TH.paper2,stroke:c,w:3});
const label=(x,y,s,size=42,c=TH.ink)=>T(x,y,s,{size,fill:c});
const show=(p,s)=>p<=0?'':'<g opacity="'+f3(clamp(p))+'">'+s+'</g>';
const chip=(x,y,w,s,c=TH.teal)=>box(x-w/2,y-34,w,68,c)+label(x,y+14,s,36,c);
function heading(k,title,sub='') {return label(CX,342,k,30,TH.teal)+label(CX,447,title,72)+(sub?label(CX,514,sub,36,TH.faint):'');}
function arrowLine(x,y,xx,yy,p=1) {return S('M'+x+' '+y+'L'+xx+' '+yy+'m-18 -12l18 12 -18 12',p,{stroke:TH.teal,w:4});}
function rail(active) {return ['寫預期','比結果','找模式','再投入'].map((s,i)=>label(170+i*222,1295,(i+1)+' '+s,31,i===active?TH.teal:TH.faint)).join('');}
const SCENES={
 cover(t,sc) {
  const stop=move(t,.3,.9),shift=move(t,ls(sc,1),.7),result=move(t,ls(sc,2),.9);
  let art=G('translate(0 '+(-155*shift)+')',box(135,690,285,140,TH.red)+box(540,690,335,140,TH.red));
  let txt=heading('回饋分析｜先換一個問題','你補對地方了嗎？');
  const px=lerp(200,460,stop)+260*shift,py=lerp(1040,760,stop)+235*shift;
  art+=G('translate('+px+' '+py+')',box(-50,-50,100,100,TH.red)+S('M-24 0H24',1,{w:6,stroke:TH.red}));
  txt+=show(1-shift,label(CX,1180,'一直補，先停一下。',52,TH.red));
  art+=show(shift,box(180,780,660,360,TH.teal));
  txt+=show(shift,label(CX,850,'把焦點移向結果',48,TH.teal)+label(CX,925,'預期',32,TH.faint)+label(CX,1105,'實際結果',32,TH.teal));
  art+=S('M255 955H600',shift,{stroke:TH.faint,w:3});
  art+=S('M255 1040H'+(255+470*result),result,{stroke:TH.teal,w:14});
  txt+=show(result,label(CX,1220,'哪件事，常常超出預期？',48,TH.teal));
  return {art,txt};
 },
 reframe(t,sc) {
  const flip=move(t,ls(sc,1),.85),pull=move(t,ls(sc,2),.85),scale=Math.max(.025,Math.abs(1-2*flip));
  let card=box(190,630,640,430,flip<.5?TH.red:TH.teal);
  card+=flip<.5?label(CX,775,'我不夠好？',68,TH.red)+label(CX,900,'單靠印象',38,TH.faint):label(CX,720,'回到紀錄',52,TH.teal)+label(CX,840,'原本預期什麼？',44)+label(CX,940,'實際發生什麼？',44);
  const art=G('translate('+CX+' 0) scale('+scale+' 1) translate('+(-CX)+' 0)',card)+show(pull,G('translate(0 '+(100*(1-pull))+')',chip(CX,1165,560,'讓兩個答案能被比較')));
  return {art,txt:heading('先留下可對照的紀錄','感覺，先放一旁。')};
 },
 feedback(t,sc) {
  const write=tIn(t,ls(sc,1),1.65),compare=move(t,ls(sc,2),.85),mark=tIn(t,ls(sc,2)+.9,.65);
  let art=box(105,625,390,505)+box(525,625,390,505,TH.teal);
  let txt=heading('01 寫預期 → 02 比結果','同一件事，前後對照。','示例｜教對方操作一項工具');
  txt+=label(300,704,'行動前',44,TH.red)+label(720,704,'事後',44,TH.teal);
  art+=S('M150 750H450M570 750H870',1,{stroke:TH.faint,w:2});
  txt+=Tw(300,850,'可能還要',write,{size:44,id:'expect1'})+Tw(300,925,'再解釋一次',tIn(t,ls(sc,1)+.65,1),{size:44,id:'expect2'});
  if(write>0&&write<1)art+=G('translate('+(160+260*write)+' '+(850+75*Math.floor(write*1.99))+') scale(.5)',pen());
  art+=show(compare,G('translate('+(30*(1-compare))+' 0)',box(550,780,340,260,TH.teal)+label(720,855,'對方能',44,TH.teal)+label(720,932,'自行操作',44,TH.teal)));
  art+=arrowLine(420,1075,615,1075,mark);
  txt+=show(mark,label(CX,1200,'把差異留下，先不急著定論。',43,TH.teal))+rail(compare>.1?1:0);
  return {art,txt};
 },
 pattern(t,sc) {
  const spread=move(t,ls(sc,1),.45),scan=move(t,ls(sc,2),1.1);
  let art='',txt=heading('03 找模式｜三筆僅為示意','一次結果，還不能定型。','示例紀錄｜也留下未超預期的情況');
  [['A','教工具','先畫步驟圖','超預期'],['B','交接工作','先畫步驟圖','超預期'],['C','臨時說明','只用口述','未超預期']].forEach((r,i)=>{
   const p=i===0?1:move(t,ls(sc,1)+.55+(i-1)*.4,.6);if(!p)return;
   const y=i===0?lerp(755,625,spread):625+i*177,x=125+(1-p)*30;
   art+=show(p,box(x,y,770,151,i===2?TH.faint:TH.teal)+label(x+49,y+57,r[0],38,TH.faint)+label(x+225,y+57,r[1],38)+label(x+630,y+57,r[3],34,i===2?TH.faint:TH.teal)+label(x+370,y+115,r[2],42));
   if(i<2)art+=S('M'+(x+225)+' '+(y+134)+'h'+(310*scan),scan,{stroke:TH.teal,w:9,op:.65});
  });
  txt+=show(1-spread,chip(CX,1125,430,'先標記：待觀察',TH.red));
  art+=show(scan,G('translate(0 '+(60*(1-scan))+')',chip(CX,1190,710,'線索：把步驟說清楚？')));
  txt+=rail(2);return {art,txt};
 },
 close(t,sc) {
  const evidence=move(t,ls(sc,1),.9),invest=move(t,ls(sc,2),1.15),guard=move(t,ls(sc,3),.8),save=move(t,ls(sc,4),.8);
  const old=1-clamp(save*2),next=clamp(save*2-1);
  let art=box(145,625,730,515,TH.teal),txt=heading('04 再投入｜繼續驗證','把線索，帶進下一輪。')+label(CX,699,'下一次重要行動',44,TH.teal);
  art+=show(old,chip(CX,lerp(855,795,invest),650,evidence>0?'待驗證：把步驟說清楚？':'我覺得我擅長？',evidence>0?TH.teal:TH.faint));
  for(let i=0;i<3;i++){
   const p=move(t,ls(sc,2)+i*.28,.85),x=lerp(285+i*220,400+i*110,p),y=lerp(1200,960,p);
   art+=show(old,box(x-37,y-27,74,54,p>.8?TH.teal:TH.faint)+label(x,y+10,'時',27,TH.teal));
  }
  txt+=show(invest*old,label(CX,915,'先留時間，試用這個做法',39));
  txt+=show(guard*old,label(CX,1080,'短板仍要處理；結果繼續記。',37,TH.faint));
  art+=show(next,box(166,745,688,365,TH.teal));
  ['行動前：寫下預期','事後：對照實際','多筆：找模式與例外','下一輪：投入，再記錄'].forEach((s,i)=>txt+=show(next,label(CX,806+i*83,s,42,i%2?TH.teal:TH.ink)));
  txt+=show(next,label(CX,1215,'收藏，下次行動前照著填。',43,TH.teal));
  txt+=label(CX,1340,'方法：Drucker〈Managing Oneself〉1999',27,TH.faint);
  return {art,txt};
 }
};
// Independent 4:5 editorial layout, rather than end states of the movie.
function carouselPage(i){
 const c=540,titles=['別急著補短板','行動前，留下預期','事後，對照差異','多筆紀錄，找共同點','下一輪，照這張填'];
 let art='',txt=label(c,220,titles[i],76);
 const row=(y,k,title,body)=>{
  art+=box(80,y,920,186,TH.teal);
  txt+=label(140,y+62,k,42,TH.teal)+T(202,y+62,title,{size:45,anchor:'start'})+T(125,y+134,body,{size:38,anchor:'start',fill:TH.faint});
 };
 if(i===0){
  txt+=label(c,327,'先找出你的超預期',62,TH.teal);
  row(435,'01','寫下預期','先留下答案，才有事後比較的基準。');
  row(649,'02','對照結果','把實際發生的事，放回同一份紀錄。');
  row(863,'03','找模式 → 再投入','多筆觀察，帶著線索做下一次行動。');
  txt+=label(c,1160,'一次成功，還不能證明能力。',44,TH.red);
 }else if(i===1){
  txt+=label(c,320,'選一件重要行動，先寫三件事。',43,TH.faint);
  row(402,'1','我要做什麼？','任務：＿＿＿＿＿＿＿＿＿＿＿＿');
  row(616,'2','我預期會有什麼結果？','可觀察的結果：＿＿＿＿＿＿＿＿');
  row(830,'3','之後怎麼回來比？','回看時間／結果紀錄：＿＿＿＿＿');
  txt+=label(c,1135,'寫下當時預期，別事後改答案。',42,TH.teal);
 }else if(i===2){
  txt+=label(c,320,'示例｜教對方操作一項工具',42,TH.faint);
  [[80,'原本預期','可能還要','再解釋一次',TH.red],[560,'實際結果','對方能','自行操作',TH.teal]].forEach(r=>{
   art+=box(r[0],430,440,290,r[4]);txt+=label(r[0]+220,495,r[1],38,r[4])+label(r[0]+220,575,r[2],44)+label(r[0]+220,645,r[3],44);
  });
  row(782,'→','留下這次的做法','這次先畫步驟圖，再讓對方試一次。');
  txt+=label(c,1050,'這次超預期，原因還需要觀察。',43,TH.teal)+label(c,1140,'能力、情境、運氣，都先保留可能。',38,TH.faint);
 }else if(i===3){
  txt+=label(c,320,'示例｜三筆不是能力認定門檻',42,TH.faint);
  [['A 教工具','先畫步驟圖','超預期'],['B 交接工作','先畫步驟圖','超預期'],['C 臨時說明','只用口述','未超預期']].forEach((r,j)=>{
   const y=410+j*182;art+=box(80,y,920,155,j===2?TH.faint:TH.teal);
   txt+=T(115,y+58,r[0],{size:40,anchor:'start'})+T(965,y+58,r[2],{size:36,anchor:'end',fill:j===2?TH.faint:TH.teal})+label(c,y+120,r[1],44);
  });
  txt+=label(c,1050,'共同線索：把步驟說清楚？',48,TH.teal)+label(c,1140,'也看例外，再換情境繼續驗證。',40,TH.faint);
 }else{
  txt+=label(c,316,'截圖留存｜下次行動前拿出來',43,TH.teal);
  ['我要再試的做法：＿＿＿＿＿＿','這次的任務：＿＿＿＿＿＿＿＿','預期結果：＿＿＿＿＿＿＿＿＿','實際結果：＿＿＿＿＿＿＿＿＿','共同點／例外：＿＿＿＿＿＿＿'].forEach((s,j)=>{
   const y=440+j*112;art+=S('M90 '+(y+36)+'H990',1,{stroke:TH.faint,w:1});txt+=T(110,y,s,{size:44,anchor:'start'});
  });
  txt+=label(c,1065,'留下多筆紀錄，再判斷能力線索。',42,TH.teal)+label(c,1150,'方法：Drucker〈Managing Oneself〉1999',30,TH.faint)+label(c,1200,'編輯示例與練習表；完整來源見說明。',30,TH.faint);
 }
 return {art,txt,abs:true};
}
const EVENTS={
 cover:sc=>[{t:.3,kind:'thump',g:.5},{t:1.1,kind:'strike',g:.4},{t:ls(sc,1),kind:'page',g:.5},{t:ls(sc,2),kind:'write',d:.9,g:.45}],
 reframe:sc=>[{t:ls(sc,1),kind:'page',g:.5},{t:ls(sc,2),kind:'click',g:.4}],
 feedback:sc=>[{t:ls(sc,1),kind:'write',d:1.65,g:.5},{t:ls(sc,2),kind:'page',g:.5},{t:ls(sc,2)+.9,kind:'click',g:.4}],
 pattern:sc=>[0,.55,.95].map((d,i)=>({t:ls(sc,1)+d,kind:'blip',n:i,g:.35})).concat([{t:ls(sc,2),kind:'write',d:1.1,g:.45}]),
 close:sc=>[0,.28,.56].map(d=>({t:ls(sc,2)+d,kind:'click',g:.3})).concat([{t:ls(sc,4),kind:'page',g:.5}])
};
