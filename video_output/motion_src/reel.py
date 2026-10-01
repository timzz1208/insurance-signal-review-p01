import subprocess,json
# (src_start, src_end, zoom)
C=[(7.15,11.95,1.00),(13.05,15.55,1.08),(16.70,20.95,1.18),(25.00,26.80,1.00),(28.55,33.00,1.08),
   (150.00,154.20,1.00),(154.30,159.60,1.10),(161.90,164.70,1.00)]
offs=[];o=0
for s,e,z in C: offs.append(o); o+=e-s
TOTAL=o
def T(src):  # source time -> output time
    for (s,e,z),of in zip(C,offs):
        if s-0.01<=src<=e+0.01: return of+src-s
    best=min(((abs(src-s),of) if src<s else (abs(src-e),of+e-s) for (s,e,z),of in zip(C,offs)))
    return best[1]
def ts(t): return f"0:{int(t//60):02d}:{t%60:05.2f}"
# subtitles: (text, src_start, src_end)
S=[("你以為只要把一支口播影片",7.12,9.20),("丟給AI",9.20,9.84),("再跟它說「幫我剪好看一點」",10.02,11.86),
   ("它就能幫你做出",13.10,13.88),("一支好看的短影音嗎？",13.88,15.40),("通常不會",16.80,17.76),
   ("因為「好看」兩個字",18.02,18.94),("對AI來說太模糊了",18.94,20.80),("它不知道你要強調哪一句",25.06,26.74),
   ("哪裡該換畫面",28.60,30.06),("更不知道什麼時候",30.12,30.82),("應該要加上大字卡和音效",30.82,32.86),
   ("所以好的剪輯指令",150.12,151.52),("不是跟AI說",151.52,152.38),("「幫我剪得很有質感」",152.38,154.06),
   ("而是要告訴它",154.38,155.48),("這支影片的主題是什麼",155.48,156.98),("段落要怎麼分",157.20,158.12),
   ("哪一句話最重要",158.34,159.46),("以及每一種效果",162.02,163.12),("在什麼時候出現",163.12,164.42)]
cues=[[T(a),T(b),t] for t,a,b in S]
for i in range(len(cues)-1):
    if cues[i+1][0]-cues[i][1]<0.6: cues[i][1]=cues[i+1][0]
cues[-1][1]=TOTAL
Y='&H0000D7FF&'; R='&H004A4AFF&'; W='&H00FFFFFF&'
ev=[f"Dialogue: 1,{ts(s)},{ts(e)},Sub,,0,0,0,,{t}" for s,e,t in cues if t!="通常不會"]
def card(a,b,txt,style='Card',pos=None,fade=(120,120)):
    p=f"\\pos({pos[0]},{pos[1]})" if pos else ""
    ev.append(f"Dialogue: 2,{ts(a)},{ts(b)},{style},,0,0,0,,{{\\fad({fade[0]},{fade[1]}){p}}}{txt}")
# hook title
card(0,T(15.40),f"{{\\c{Y}}}「幫我剪好看一點」{{\\c{W}}}\\N真的有用嗎？",pos=(540,430))
# keyword cards (pop in with scale)
pop="{\\fscx60\\fscy60\\t(0,140,\\fscx100\\fscy100)}"
card(T(16.80),T(17.76),pop+"通常不會",'Big',pos=(540,470))
card(T(19.92),T(20.95),pop+f"{{\\c{Y}}}「好看」{{\\c{W}}}太模糊",'Big',pos=(540,470))
card(T(31.58),T(33.00),pop+"大字卡？音效？",'Big',pos=(540,470))
card(T(152.38),T(154.20),pop+f"{{\\c{R}}}{{\\s1}}剪得很有質感{{\\s0}}",'Big',pos=(540,470))
# checklist builds up
items=[("① 主題是什麼",156.24),("② 段落怎麼分",157.20),("③ 哪句最重要",158.34),("④ 效果何時出現",162.42)]
end=TOTAL
ev.append(f"Dialogue: 0,{ts(T(155.48))},{ts(end)},Box,,0,0,0,,{{\\fad(150,0)\\p1}}m 170 215 l 910 215 l 910 560 l 170 560{{\\p0}}")
for k,(t,src) in enumerate(items):
    card(T(src),end,("{\\fscx70\\fscy70\\t(0,150,\\fscx100\\fscy100)}")+t,'List',pos=(215,252+k*80),fade=(100,0))
head=["[Script Info]","ScriptType: v4.00+","PlayResX: 1080","PlayResY: 1920","WrapStyle: 2","","[V4+ Styles]",
"Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
"Style: Sub,Noto Sans CJK TC,66,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,6,2,2,70,70,520,1",
"Style: Card,Noto Sans CJK TC,76,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,3,0,1,7,3,5,40,40,0,1",
"Style: Big,Noto Sans CJK TC,120,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,4,0,1,9,4,5,40,40,0,1",
"Style: List,Noto Sans CJK TC,60,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,0,0,4,0,0,0,1",
"Style: Box,Noto Sans CJK TC,20,&H50101010,&H50101010,&H50101010,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1",
"","[Events]","Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
import json as _j
_j.dump({'total':TOTAL,'hook':[0,T(15.40)],'nope':[T(16.80),T(18.0)],'blur':[T(18.02),T(20.95)],'qs':[T(30.12),T(33.0)],
 'strike':[T(152.38),T(154.20)],'list':[T(154.38)]+[T(x) for _,x in items],'end':TOTAL},open('cards.json','w'),indent=1)
ev=[e for e in ev if ',Sub,' in e]
open('reel.ass','w').write('\n'.join(head+ev)+'\n')
# render clips with zoom
L=[]
import sys
if "--norender" in sys.argv: raise SystemExit
for i,(s,e,z) in enumerate(C):
    d=e-s; w=int(1080/z)//2*2; h=int(1920/z)//2*2; x=(1080-w)//2; y=max(0,min(1920-h,900-h//2))
    vf=f"fps=30,crop={w}:{h}:{x}:{y},scale=1080:1920:flags=lanczos,setsar=1"
    f=f'clips/r{i}.mkv'
    subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(s),'-i','raw.mp4','-t',f'{d:.3f}','-vf',vf,
      '-af',f'afade=t=in:d=0.03,afade=t=out:st={d-0.04:.3f}:d=0.04','-c:v','libx264','-preset','veryfast','-crf','14',
      '-pix_fmt','yuv420p','-c:a','pcm_s16le','-ar','48000',f],check=True)
    L.append(f"file '{f}'")
open('rlist.txt','w').write('\n'.join(L)+'\n')
print(f'total {TOTAL:.2f}s')
