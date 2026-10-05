#!/usr/bin/env python3
"""《樓下那間房不能住了》剪輯 v2：快剪＋單鏡重構特寫、回溯、穿樓板轉場、後果計數、球球過場、聲音設計"""
import json, os, subprocess, sys
import numpy as np
from scipy.io import wavfile
sys.path.insert(0, '/home/user/insurance-signal-review-p01/.agents/skills/talking-head-reel/scripts')
import sfx as S
W, H, FPS, SR = 1080, 1920, 24, 48000
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def run(c):
    r = subprocess.run(c, shell=True, capture_output=True, text=True)
    if r.returncode: sys.exit(f'FAIL {c}\n{r.stderr[-1500:]}')
    return r
os.makedirs('v2', exist_ok=True)

def piece(name, shot, a, b, zs=1.0, ze=1.0, c0=(.5, .5), c1=None, ease=None, hold=0, extra=''):
    """one video piece: crop/zoom over time (zoompan) from an upscaled source"""
    c1 = c1 or c0; d = b - a; n = max(1, round(d * FPS)); ne = round((ease or d) * FPS)
    p = f"min(1,on/{ne})"; pe = f"(1-(1-{p})*(1-{p}))"
    z = f"{zs}+({ze}-{zs})*{pe}"
    cx = f"({c0[0]}+({c1[0]}-{c0[0]})*{pe})"; cy = f"({c0[1]}+({c1[1]}-{c0[1]})*{pe})"
    vf = (f"fps={FPS},scale={int(W*1.25)}:{int(H*1.25)}:flags=lanczos,"
          f"zoompan=z='{z}':x='max(0,min(iw-iw/zoom,{cx}*iw-iw/zoom/2))':y='max(0,min(ih-ih/zoom,{cy}*ih-ih/zoom/2))':d=1:s={W}x{H}:fps={FPS},"
          f"unsharp=5:5:0.6,setsar=1{extra}")
    if hold: vf += f",tpad=stop_mode=clone:stop_duration={hold}"
    run(f'ffmpeg -loglevel error -y -ss {a} -t {d:.3f} -i src/shot0{shot}.mp4 -an -vf "{vf}" -c:v libx264 -preset veryfast -crf 12 -pix_fmt yuv420p v2/{name}.mkv')
    return d + hold

dur = {}
dur['p1'] = piece('p1', 1, 0.0, 5.1, 1.22, 1.04, ease=0.7)
# freeze-frame flashback (desaturated, slow push)
run('ffmpeg -loglevel error -y -ss 5.05 -i src/shot01.mp4 -frames:v 1 v2/f1.png')
run(f"""ffmpeg -loglevel error -y -loop 1 -t 0.8 -i v2/f1.png -vf "scale={int(W*1.25)}:{int(H*1.25)}:flags=lanczos,zoompan=z='1.04+0.05*on/19':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS},hue=s=0.15,eq=brightness=-0.04,vignette=PI/4,setsar=1" -c:v libx264 -preset veryfast -crf 12 -pix_fmt yuv420p v2/p1f.mkv""")
dur['p1f'] = 0.8
dur['p2a'] = piece('p2a', 2, 0.6, 1.7, 1.0, 1.02)
dur['p2b'] = piece('p2b', 2, 1.7, 2.9, 1.5, 1.56, (.66, .55))            # faucet insert
dur['p2c'] = piece('p2c', 2, 2.9, 5.0, 1.0, 1.04)
dur['p3'] = piece('p3', 3, 0.0, 4.65, 1.0, 1.07)
dur['p4'] = piece('p4', 4, 0.9, 4.3, 1.6, 1.0, (.5, .12), (.5, .5), ease=1.8)   # ceiling stain -> reveal
XF = 0.35
run(f'ffmpeg -loglevel error -y -i v2/p3.mkv -i v2/p4.mkv -filter_complex "[0:v][1:v]xfade=transition=slideup:duration={XF}:offset={dur["p3"]-XF:.3f},format=yuv420p[v]" -map "[v]" -c:v libx264 -preset veryfast -crf 12 v2/p34.mkv')
dur['p5a'] = piece('p5a', 5, 0.5, 2.3, 1.0, 1.04)
dur['p5b'] = piece('p5b', 5, 2.3, 4.2, 1.35, 1.42, (.55, .74))          # tight on the floor
dur['p6'] = piece('p6', 6, 0.0, 5.167, 1.0, 1.03)
dur['p7'] = piece('p7', 7, 2.6, 8.0, 1.0, 1.07, hold=0.5)
dur['p8a'] = piece('p8a', 8, 0.0, 3.0, 1.0, 1.0)
dur['p8b'] = piece('p8b', 8, 2.6, 8.0, 1.0, 1.06, hold=13.6, extra=',gblur=sigma=24,eq=brightness=-0.20:saturation=0.75')
run('ffmpeg -loglevel error -y -i v2/p8a.mkv -i v2/p8b.mkv -filter_complex "[0:v][1:v]xfade=transition=fade:duration=0.4:offset=2.6,format=yuv420p[v]" -map "[v]" -c:v libx264 -preset veryfast -crf 12 v2/p8.mkv')
order = ['p1', 'p1f', 'p2a', 'p2b', 'p2c', 'p34', 'p5a', 'p5b', 'p6', 'p7', 'p8']
open('v2/list.txt', 'w').write(''.join(f"file '{p}.mkv'\n" for p in order))
run('ffmpeg -loglevel error -y -f concat -safe 0 -i v2/list.txt -c copy v2/video.mkv')

# ---- output time anchors ----
o1 = 0; ofz = 5.1; o2 = ofz + .8; o2b = o2 + 1.1; o3 = o2 + 4.4; o4 = o3 + dur['p3'] - XF
o5 = o4 + 3.4; o5b = o5 + 1.8; o6 = o5 + 3.7; o7 = o6 + 5.167; o8 = o7 + 5.9; TOTAL = o8 + 21.6
src = lambda s: (wavfile.read(f'v2/a{s}.wav')[1].astype(np.float32) / 32768)
for s in range(1, 9): run(f'ffmpeg -loglevel error -y -i src/shot0{s}.mp4 -vn -ac 1 -ar {SR} v2/a{s}.wav')
mix = np.zeros(int((TOTAL + 1) * SR), np.float32); bed = np.zeros_like(mix)
def put(x, at, db=0, buf=None):
    buf = mix if buf is None else buf; i = int(at * SR); x = x[:max(0, len(buf) - i)]; buf[i:i + len(x)] += x * 10 ** (db / 20)
def clip(s, a, b, at, db=0, f=.06):
    x = src(s)[int(a * SR):int(b * SR)].copy(); k = int(f * SR); r = np.linspace(0, 1, k); x[:k] *= r; x[-k:] *= r[::-1]; put(x, at, db)
clip(1, 0, 5.1, o1); clip(2, .6, 5.0, o2); clip(3, 0, dur['p3'], o3, f=.3); clip(4, .9, 8.0, o4)
clip(5, .5, 4.2, o5, -8); clip(6, 0, 5.167, o6); clip(7, 2.6, 8.0, o7); clip(8, 0, 2.55, o8, f=.15)
# ---- designed sounds ----
t_ = lambda d: np.arange(int(d * SR)) / SR
def tape_stop():
    t = t_(.45); f = 220 * (1 - t / .45) ** 2 + 30; y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .3 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * .5
    return S.norm(S.lp(y * np.linspace(1, .2, len(t)), 2500), -14)
def tick():
    t = t_(.04); return S.norm(S.bp(np.random.randn(len(t)), 2500, 7000) * np.exp(-t * 300) + np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 400) * .5, -24)
def knock():
    t = t_(.18); body = np.sin(2 * np.pi * (140 + 80 * np.exp(-t * 60)) * t) * np.exp(-t * 35)
    return S.norm(np.tanh(2 * (body + .5 * S.lp(np.random.randn(len(t)), 1800) * np.exp(-t * 90))), -8)
def drip():
    t = t_(.25); f = 900 + 1400 * np.exp(-t * 40); return S.norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22) * np.minimum(1, t / .002), -16)
def pad(d):
    t = t_(d); y = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * .13 * t) * .5) for f in (55, 82.4, 110.2, 164.8))
    y = S.lp(y, 900) * np.minimum(1, t / 2.5) * np.minimum(1, (d - t) / .25) * (0.6 + 0.4 * t / d)
    return S.norm(y, -30)
def plucks(d):
    t = t_(d); y = np.zeros_like(t); notes = [523.25, 659.25, 783.99, 659.25, 587.33, 783.99, 880.0, 783.99]
    for k, st in enumerate(np.arange(.2, d - .8, .9)):
        f = notes[k % len(notes)]; i = int(st * SR); tt = t[:len(t) - i]
        y[i:] += (np.sin(2 * np.pi * f * tt) + .3 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 3.2) * np.minimum(1, tt / .005)
    return S.norm(S.lp(y, 3000) * np.minimum(1, (d - t) / 1.2), -31)
def ping():
    t = t_(.5); y = np.zeros_like(t)
    for st, f in ((0, 1568), (.11, 2093)):
        tt = t - st; m = tt >= 0; y[m] += np.sin(2 * np.pi * f * tt[m]) * np.exp(-tt[m] * 9) * np.minimum(1, tt[m] / .004)
    return S.norm(y, -14)
mono = lambda x: x
put(tape_stop(), ofz); put(S.whoosh(.35, False), ofz + .05, -10); put(tick(), ofz + .45, 4)
for k in range(9): put(tick(), o2 + k * .5)                             # urgency clock
put(S.whoosh(.3, True), o2b - .12, -12); put(S.pop(1100, 600), o2b + .05, -10)
put(knock(), o3 + 1.15); put(knock(), o3 + 1.42)
put(S.whoosh(.45, False), o4 - .1, -6); put(drip(), o4 + .25); put(drip(), o4 + 1.1, -3)
put(S.thud(), o5 + (6.75 - 0.9) - 3.4, -10)                             # 停用 stamp
put(ping(), o6 + 1.0)
for i in range(5): put(tick(), o7 + .35 + .35 + i * .28, 2)
put(S.whoosh(.3, True), o8 - .55, -8); put(S.ding(), o8 - .35, -10)
put(pad(o8 - .55 - o3), o3, 0, bed); put(plucks(TOTAL - o8), o8, 2, bed)
for c in (3.0, 6.4, 11.0, 14.8, 19.0): put(S.whoosh(.3, True), o8 + c - .12, -12)
put(S.pop(1200, 600), o8 + 4.2, -6)
put(S.thud(), o8 + 7.9, -8); put(S.ding(), o8 + 8.0, -14)
put(S.pop(1000, 500), o8 + 11.8, -6)
for i in range(4): put(S.pop(900 + 120 * i, 450), o8 + 15.5 + i * .55, -8)
put(S.ding(), o8 + 19.4, -12)
# ---- hook (0-3s): flash/impact, slam lines, rolling yen counter ----
put(S.boom(), 0.0, -3); put(S.whoosh(.3), 0.0, -8); put(S.boom(), 0.62, -7)
for k in range(22): put(S.click(), 1.25 + k * .045, 6)
put(S.boom(), 2.3, -4); put(S.glitch(), 2.3, -6); put(S.ding(), 2.35, -10)
out = mix + bed
wavfile.write('v2/mix.wav', SR, (np.clip(np.stack([out, out], 1), -1, 1) * 32767).astype(np.int16))

# ---- subtitles ----
def T(s, t):
    return {1: o1 + t, 2: o2 + t - .6, 3: o3 + t, 7: o7 + t - 2.6, 8: o8 + t}[s]
T4 = lambda t: o4 + t - .9
SUBS = [(T(1, 0), T(1, 3.1), '先生，樓下那間房'), (T(1, 3.44), T(1, 4.95), '現在不能住了'),
        (T(2, 3.11), T(2, 4.85), '好，我拿完護照就下去！'), (T(3, 0), T(3, .6), '先生？'), (T(3, 2.19), T(3, 4.0), '房間有人嗎？'),
        (T4(1.29), T4(3.95), '初步看，水已經滲進樓板層'), (T4(4.6), T4(6.4), '地板要拆開檢查、乾燥'), (T4(6.75), T4(8.0), '這間房也要先停用'),
        (T(7, 4.85), T(7, 5.75), '飯店的損失，'), (T(7, 6.0), T(7, 7.8), '也算我要負的責任嗎？'),
        (T(8, 0), T(8, 2.5), '第三人，就是不是你自己的那一方')]
ts = lambda t: f"0:{int(t//60):02d}:{t%60:05.2f}"
ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1080", "PlayResY: 1920", "WrapStyle: 2", "", "[V4+ Styles]",
       "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
       "Style: Sub,Noto Sans CJK TC,58,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,1,0,1,4,2,2,80,80,400,1",
       "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
ass += [f"Dialogue: 0,{ts(a)},{ts(b)},Sub,,0,0,0,,{{\\fad(80,80)}}{t}" for a, b, t in SUBS]
open('v2/subs.ass', 'w').write('\n'.join(ass) + '\n')

# ---- overlay timings ----
OV = {'total': TOTAL, 'end': TOTAL, 'fb': [ofz, o2], 'ring': {'x': 756, 'y': 730, 't': [o2b + .1, o2b + 1.15]},
      'down': [o4 - .05, o4 + .7],
      'lts': [{'n': 1, 'text': '水越過房門', 't': [o3 + .4, o4 - .05]}, {'n': 2, 'text': '樓下天花板滲水', 't': [o4 + .6, o5 - .1]},
              {'n': 3, 'text': '地板拆開、除濕乾燥', 't': [o5 + .2, o6 - .2]}],
      'stamp': [T4(6.75), o6 - .1], 'notif': [o6 + 1.0, o6 + 4.9], 'recap': [o7 + .2, o7 + 2.3],
      'bump': [o8 - .62, o8 + .12], 'cards': [o8 + 3.0, o8 + 6.4, o8 + 11.0, o8 + 14.8, o8 + 19.0], 'hook': [0.0, 3.3]}
json.dump(OV, open('v2/ov.json', 'w'), ensure_ascii=False)
open('v2/ov.js', 'w').write("""const {chromium}=require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
const fs=require('fs');(async()=>{const ov=JSON.parse(fs.readFileSync('v2/ov.json'));fs.mkdirSync('v2/frames',{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>{console.error(e);process.exit(1)});
await p.addInitScript(d=>{window.OV=d},ov);await p.goto('file://'+process.cwd()+'/overlay4.html');await p.evaluate(()=>document.fonts.ready);
const only=process.argv[2];const ts=only?only.split(',').map(Number):[...Array(Math.round(ov.total*24)+1).keys()].map(i=>i/24);
for(const [k,t] of ts.entries()){await p.evaluate(t=>render(t),t);
 await p.screenshot({path:only?`v2/still_${t}.png`:`v2/frames/${String(k).padStart(5,'0')}.png`,omitBackground:true});}
await b.close();})();""")
print(json.dumps({k: (round(v, 2) if isinstance(v, float) else v) for k, v in OV.items() if k in ('fb', 'down', 'stamp', 'notif', 'recap', 'bump', 'cards', 'total')}, ensure_ascii=False))
if '--stills' in sys.argv: sys.exit()
run('rm -rf v2/frames && node v2/ov.js')
ENC = f'-c:v libx264 -preset slow -crf 19 -maxrate 6000k -bufsize 12000k -profile:v high -pix_fmt yuv420p -r {FPS} -c:a aac -b:a 160k -ar 48000 -movflags +faststart'
AUD = '[1:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,alimiter=limit=0.79:level=false[a]'
os.makedirs('out', exist_ok=True)
run(f'ffmpeg -loglevel error -y -i v2/video.mkv -framerate {FPS} -i v2/frames/%05d.png -filter_complex "[0:v][1:v]overlay=0:0:eof_action=pass,format=yuv420p[v]" -map "[v]" -c:v libx264 -preset veryfast -crf 12 v2/ov.mkv')
run(f'ffmpeg -loglevel error -y -i v2/ov.mkv -i v2/mix.wav -filter_complex "{AUD};[0:v]ass=v2/subs.ass[v]" -map "[v]" -map "[a]" -t {TOTAL:.3f} {ENC} out/v4_full.mp4')
print('TOTAL', round(TOTAL, 2))
