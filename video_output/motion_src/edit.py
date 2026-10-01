import json,re,subprocess
from opencc import OpenCC; cc=OpenCC('s2twp')
T=json.load(open('transcript.json'))
W=[dict(w=cc.convert(w['w']),s=w['s'],e=w['e']) for s in T for w in s['words']]
# drop retakes: first take of "如果整段口播..." and the unfinished "這次我就要...測試一下AI"
W=[w for w in W if not (94.6<=w['s']<=99.5 or 104.5<=w['s']<=108 or 182.0<=w['s']<=185.0)]
retry=[('如果',101.18,101.54),('整',101.54,101.82),('段',101.82,102.0),('口',102.0,102.2),('播',102.2,102.4),('從',102.4,102.62),('頭',102.62,102.74),('到',102.74,102.86),('尾',102.86,103.0),('都',103.0,103.1),('沒有',103.1,103.26),('停',103.26,103.44),('頓，',103.44,103.76),('AI',103.76,104.02),('就',104.02,104.18),('很',104.18,104.3),('難',104.3,104.4),('分',104.4,104.54),('辨',104.54,104.82),('你是',104.82,105.32),('在',105.32,105.5),('繼',105.5,105.74),('續',105.74,105.86),('解',105.86,106.0),('釋，',106.0,106.26),('還是',106.26,106.5),('已經',106.5,106.78),('換',106.78,107.0),('了',107.0,107.14),('一個',107.14,107.26),('新',107.26,107.42),('的',107.42,107.56),('重',107.56,107.72),('點。',107.72,107.92)]
W+= [dict(w=a,s=b,e=c) for a,b,c in retry]; W.sort(key=lambda w:w['s'])
PARA=[35.8,71.1,112.0,150.0,168.7,187.0]
# group into units (merge if gap<0.8s)
U=[[W[0]]]
for w in W[1:]:
    if w['s']-U[-1][-1]['e']<0.8 and not any(U[-1][-1]['e']<p<=w['s'] for p in PARA): U[-1].append(w)
    else: U.append([w])
iv=[]
for i,u in enumerate(U):
    para_start=i==0 or any(abs(u[0]['s']-p)<0.3 for p in PARA)
    para_end=i==len(U)-1 or any(abs(U[i+1][0]['s']-p)<0.3 for p in PARA)
    a=u[0]['s']-(0.30 if para_start else 0.15); b=u[-1]['e']+(0.45 if para_end else 0.25)
    if iv: a=max(a,iv[-1][1])
    iv.append([round(a,3),round(b,3),u])
FIX=[('留給','丟給'),('簡介點','剪接點'),('大致的字幕','大字字幕'),('口波','口播'),('他','它'),('最後下一個','最後留下一個')]
def fix(t):
    for a,b in FIX: t=t.replace(a,b)
    return t
# subtitle cues on output timeline
cues=[];off=0
NOBREAK=['短影音','模糊','大字卡','一件','目的','停頓','簡介點','剪接點','口播','影片','清楚','是什麼','五個','什麼','同時','畫面上']
def vlen(t): return len(re.sub(r'[，,。？?、]','',t.replace('AI','A')))
def split(ph):
    t=''.join(x['w'] for x in ph)
    if vlen(t)<=16 or len(ph)<2: return [ph]
    best=None
    for k in range(1,len(ph)):
        L=''.join(x['w'] for x in ph[:k]); 
        if any(t.find(nb)!=-1 and t.find(nb)<len(L)<t.find(nb)+len(nb) for nb in NOBREAK): continue
        sc=abs(vlen(L)-vlen(t)/2)
        if best is None or sc<best[0]: best=(sc,k)
    k=best[1] if best else len(ph)//2
    return split(ph[:k])+split(ph[k:])
for a,b,u in iv:
    phs=[[]]
    for w in u:
        if phs[-1] and w['s']-phs[-1][-1]['e']>0.5: phs.append([])
        phs[-1].append(w)
        if re.search(r'[，,。？?!、]$',w['w']): phs.append([])
    for ph in phs:
        if not ph: continue
        for p in split(ph): cues.append([p[0]['s']-a+off,p[-1]['e']-a+off,''.join(x['w'] for x in p)])
    off+=b-a
for c in cues:
    c[2]=fix(c[2]); c[2]=re.sub(r'[，,。、]+$','',c[2]).replace(',','，').replace('?','？')
for i in range(len(cues)-1):  # hold each cue until next if gap small
    if cues[i+1][0]-cues[i][1]<0.6: cues[i][1]=cues[i+1][0]
def ts(t): h=int(t//3600);m=int(t%3600//60);s=t%60; return f"{h}:{m:02d}:{s:05.2f}"
ass=["[Script Info]","ScriptType: v4.00+","PlayResX: 1080","PlayResY: 1920","WrapStyle: 2","","[V4+ Styles]",
"Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
"Style: Sub,Noto Sans CJK TC,58,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,2,0,1,5,2,2,60,60,430,1","","[Events]","Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
ass+=[f"Dialogue: 0,{ts(s)},{ts(e)},Sub,,0,0,0,,{t}" for s,e,t in cues]
open('subs.ass','w').write('\n'.join(ass)+'\n')
srt=[]
for i,(s,e,t) in enumerate(cues,1):
    f=lambda x:f"{int(x//3600):02d}:{int(x%3600//60):02d}:{int(x%60):02d},{int(round(x%1*1000))%1000:03d}"
    srt.append(f"{i}\n{f(s)} --> {f(e)}\n{t}\n")
open('subs.srt','w').write('\n'.join(srt))
json.dump([[a,b] for a,b,_ in iv],open('cuts.json','w'))
print(f'{len(iv)} clips, output {off:.1f}s (from 196.7s), {len(cues)} cues')
for s,e,t in cues: print(f'{s:6.2f}-{e:6.2f} {t}')
