#!/usr/bin/env python3
"""《樓下那間房不能住了》剪輯：8 段 AI 生成素材 → 9:16 1080x1920 24fps，兩版輸出（乾淨版／字幕字卡版）"""
import json, os, subprocess, sys
import numpy as np
from scipy.io import wavfile
W, H, FPS = 1080, 1920, 24
os.chdir(os.path.dirname(os.path.abspath(__file__)))
def run(c):
    r = subprocess.run(c, shell=True, capture_output=True, text=True)
    if r.returncode: sys.exit(f'FAIL {c}\n{r.stderr[-1500:]}')
    return r

# shot, in, out, push-in amount, hold-at-end
SEGS = [(1, 0.0, 5.1, .04, 0), (2, 0.6, 5.0, 0, 0), (3, 0.0, 4.3, .05, 0), (4, 0.9, 4.3, .03, 0),
        (5, 0.5, 4.2, .04, 0), (6, 0.0, 5.167, 0, 0), (7, 2.6, 8.0, .06, 0), (8, 0.0, 8.0, 0, 2.0)]
off, o = {}, 0.0
for s, a, b, z, h in SEGS: off[s] = o; o += (b - a) + h
TOTAL = o

# ---- video: per segment upscale + optional slow push-in ----
os.makedirs('seg', exist_ok=True); lst = []
for s, a, b, z, h in SEGS:
    d = b - a; n = round(d * FPS)
    vf = f"fps={FPS},scale={int(W*1.25)}:{int(H*1.25)}:flags=lanczos"
    vf += (f",zoompan=z='1+{z}*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}" if z
           else f",scale={W}:{H}:flags=lanczos")
    vf += ",unsharp=5:5:0.6,setsar=1"
    if h: vf += f",tpad=stop_mode=clone:stop_duration={h}"
    f = f'seg/s{s}.mkv'
    run(f'ffmpeg -loglevel error -y -ss {a} -t {d:.3f} -i src/shot0{s}.mp4 -an -vf "{vf}" -c:v libx264 -preset veryfast -crf 12 -pix_fmt yuv420p {f}')
    lst.append(f"file 's{s}.mkv'")
open('seg/list.txt', 'w').write('\n'.join(lst) + '\n')
run('ffmpeg -loglevel error -y -f concat -safe 0 -i seg/list.txt -c copy video.mkv')

# ---- audio: dialogue/ambience timeline (shot04 audio runs under shot05 picture = L-cut) ----
SR = 48000
def load(s):
    run(f'ffmpeg -loglevel error -y -i src/shot0{s}.mp4 -vn -ac 2 -ar {SR} seg/a{s}.wav')
    return wavfile.read(f'seg/a{s}.wav')[1].astype(np.float32) / 32768
mix = np.zeros((int((TOTAL + .5) * SR), 2), np.float32)
def place(s, a, b, at, gain_db=0, fade=.06):
    x = load(s)[int(a * SR):int(b * SR)].copy(); n = len(x); k = int(fade * SR)
    ramp = np.linspace(0, 1, k)[:, None]; x[:k] *= ramp; x[n - k:] *= ramp[::-1]
    i = int(at * SR); mix[i:i + n] += x[:len(mix) - i] * 10 ** (gain_db / 20)
place(1, 0.0, 5.1, off[1]); place(2, 0.6, 5.0, off[2]); place(3, 0.0, 4.3, off[3])
place(4, 0.9, 8.0, off[4])                       # covers shot04 + shot05 picture
place(5, 0.5, 4.2, off[5], -8)                   # shot05 ambience under the dialogue
place(6, 0.0, 5.167, off[6]); place(7, 2.6, 8.0, off[7]); place(8, 0.0, 8.0, off[8], fade=.06)
# soft phone notification (two-tone), synced with the message card
def ping():
    t = np.arange(int(.5 * SR)) / SR; y = np.zeros_like(t)
    for st, f in ((0, 1568), (.11, 2093)):
        tt = t - st; m = tt >= 0
        y[m] += np.sin(2 * np.pi * f * tt[m]) * np.exp(-tt[m] * 9) * np.minimum(1, tt[m] / .004)
    return y / np.abs(y).max() * 10 ** (-14 / 20)
PING_AT = off[6] + 1.0
p = ping(); i = int(PING_AT * SR); mix[i:i + len(p)] += np.stack([p, p], 1)
wavfile.write('mix.wav', SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16))

# ---- subtitles (source times per shot -> output) ----
def T(s, t):
    a = next(x[1] for x in SEGS if x[0] == s)
    return off[s] + t - a
def T4(t): return off[4] + t - 0.9          # shot04 audio clock
SUBS = [(T(1, 0.0), T(1, 3.1), '先生，樓下那間房'), (T(1, 3.44), T(1, 4.9), '現在不能住了'),
        (T(2, 3.11), T(2, 4.85), '好，我拿完護照就下去！'),
        (T(3, 0.0), T(3, 0.6), '先生？'), (T(3, 2.19), T(3, 4.0), '房間有人嗎？'),
        (T4(1.29), T4(3.95), '初步看，水已經滲進樓板層'), (T4(4.6), T4(6.4), '地板要拆開檢查、乾燥'),
        (T4(6.75), T4(8.0), '這間房也要先停用'),
        (T(7, 4.85), T(7, 5.75), '飯店的損失，'), (T(7, 6.0), T(7, 7.8), '也算我要負的責任嗎？'),
        (T(8, 0.0), T(8, 2.4), '第三人，就是不是你自己的那一方'), (T(8, 2.86), T(8, 4.0), '飯店的財物損失'),
        (T(8, 4.1), T(8, 5.6), '能不能由保險協助'), (T(8, 5.86), T(8, 7.5), '要回到保單條款確認')]
def ts(t): return f"0:{int(t//60):02d}:{t%60:05.2f}"
ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1080", "PlayResY: 1920", "WrapStyle: 2", "", "[V4+ Styles]",
       "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
       "Style: Sub,Noto Sans CJK TC,58,&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,1,0,1,4,2,2,80,80,400,1",
       "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
ass += [f"Dialogue: 0,{ts(a)},{ts(b)},Sub,,0,0,0,,{{\\fad(80,80)}}{t}" for a, b, t in SUBS]
open('subs.ass', 'w').write('\n'.join(ass) + '\n')
srt = []
for k, (a, b, t) in enumerate(SUBS, 1):
    f = lambda x: f"00:{int(x//60):02d}:{int(x%60):02d},{int(round((x%1)*1000))%1000:03d}"
    srt.append(f"{k}\n{f(a)} --> {f(b)}\n{t}\n")
open('subs.srt', 'w').write('\n'.join(srt))

# ---- overlay frames (notification + end cards) ----
ov = {'notif': [off[6] + 1.0, off[6] + 4.9], 'main': [off[8] + 0.3], 'sub': [off[8] + 5.8], 'disc': [off[8] + 7.5], 'end': TOTAL, 'total': TOTAL}
json.dump(ov, open('ov.json', 'w'))
js = """const {chromium}=require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
const fs=require('fs');(async()=>{const ov=JSON.parse(fs.readFileSync('ov.json'));fs.mkdirSync('frames',{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.addInitScript(d=>{window.OV=d},ov);await p.goto('file://'+process.cwd()+'/overlay.html');await p.evaluate(()=>document.fonts.ready);
const only=process.argv[2];const ts=only?only.split(',').map(Number):[...Array(Math.round(ov.total*24)+1).keys()].map(i=>i/24);
for(const [k,t] of ts.entries()){await p.evaluate(t=>render(t),t);
 await p.screenshot({path:only?`still_${t}.png`:`frames/${String(k).padStart(5,'0')}.png`,omitBackground:true});}
await b.close();})();"""
open('ov.js', 'w').write(js)
if '--stills' in sys.argv:
    print(json.dumps({k: round(v, 2) if isinstance(v, float) else [round(x, 2) for x in v] for k, v in ov.items()})); sys.exit()
run('rm -rf frames && node ov.js')

ENC = f'-c:v libx264 -preset slow -crf 19 -maxrate 6000k -bufsize 12000k -profile:v high -pix_fmt yuv420p -r {FPS} -c:a aac -b:a 160k -ar 48000 -movflags +faststart'
AUD = '[1:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,alimiter=limit=0.79:level=false[a]'
os.makedirs('out', exist_ok=True)
run(f'ffmpeg -loglevel error -y -i video.mkv -i mix.wav -filter_complex "{AUD}" -map 0:v -map "[a]" -t {TOTAL:.3f} {ENC} out/clean.mp4')
run(f'ffmpeg -loglevel error -y -i video.mkv -framerate {FPS} -i frames/%05d.png -filter_complex "[0:v][1:v]overlay=0:0:eof_action=pass,format=yuv420p[v]" -map "[v]" -c:v libx264 -preset veryfast -crf 12 ov.mkv')
run(f'ffmpeg -loglevel error -y -i ov.mkv -i mix.wav -filter_complex "{AUD};[0:v]ass=subs.ass[v]" -map "[v]" -map "[a]" -t {TOTAL:.3f} {ENC} out/full.mp4')
json.dump({'segments': [{'shot': s, 'src_in': a, 'src_out': b, 'out_in': round(off[s], 2), 'out_out': round(off[s] + b - a + h, 2), 'push_in': z, 'hold': h} for s, a, b, z, h in SEGS],
           'audio_note': 'shot04 audio 0.9-8.0 runs under shot05 picture (L-cut); shot05 ambience -8dB; notification ping at %.2fs' % PING_AT,
           'total': round(TOTAL, 2)}, open('out/timeline.json', 'w'), ensure_ascii=False, indent=1)
print('TOTAL', round(TOTAL, 2))
