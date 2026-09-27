"""Generate narration for every script line, trim silence, measure durations,
and build timeline.json that drives visuals, subtitles and audio.

If voice/01.* ... voice/NN.* exist for every line (wav/mp3/m4a, e.g. exported from VoAI 子墨),
those recordings are used instead of the offline TTS voice."""
import json, sys, os, glob, subprocess, numpy as np, soundfile as sf, imageio_ffmpeg
sys.path.insert(0, os.path.dirname(__file__))
from tts_common import make_tts

# Taiwanese readings the TTS lexicon gets wrong: 筊 jiǎo (not xiáo), 著 zhe (not zhù)
FIX = {"筊": "餃", "著": "着"}
SID, SPEED, SR = 67, 0.92, 24000
LEAD, GAP, TAIL, FIRST_LEAD = 1.2, 0.7, 1.4, 2.4
script = json.load(open("script.json"))
os.makedirs("build/vo", exist_ok=True)
N_LINES = sum(len(sc["lines"]) for sc in script["scenes"])
EXT = {int(os.path.basename(f).split(".")[0]): f for f in glob.glob("voice/[0-9][0-9].*") if f.rsplit(".", 1)[-1].lower() in ("wav", "mp3", "m4a", "aac", "flac", "ogg")}
USE_EXT = all(i in EXT for i in range(1, N_LINES + 1))
if EXT and not USE_EXT: sys.exit(f"voice/ has {len(EXT)} of {N_LINES} lines; missing {sorted(set(range(1, N_LINES + 1)) - set(EXT))}")
print("narration source:", "voice/ recordings" if USE_EXT else f"offline TTS sid {SID}")
tts = None if USE_EXT else make_tts()

def load_ext(path):  # decode any format to mono float32 at SR with ffmpeg
    raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).copy(); return x / max(1e-6, np.abs(x).max()) * 0.9

def trim(x, thr=0.01, pad=0.06):
    idx = np.where(np.abs(x) > thr)[0]
    a = max(0, idx[0] - int(pad*SR)); b = min(len(x), idx[-1] + int(pad*SR))
    return x[a:b]

t = 0.0; scenes = []; n = 0
for si, sc in enumerate(script["scenes"]):
    start = t
    lines = []
    if sc["lines"]:
        t += FIRST_LEAD if si == 0 else LEAD
        for li, ln in enumerate(sc["lines"]):
            txt = ln.get("tts", ln["zh"])
            for k, v in FIX.items(): txt = txt.replace(k, v)
            n += 1
            x = trim(load_ext(EXT[n])) if USE_EXT else trim(np.array(tts.generate(txt, sid=SID, speed=SPEED).samples, dtype=np.float32))
            path = f"build/vo/{n:02d}.wav"; sf.write(path, x, SR)
            d = len(x) / SR
            lines.append(dict(n=n, zh=ln["zh"], en=ln["en"], wav=path, start=round(t, 3), dur=round(d, 3)))
            t += d + (GAP if li < len(sc["lines"]) - 1 else 0)
        t += TAIL
    else:
        t += sc["hold"]
    scenes.append(dict(id=sc["id"], night=sc["night"], start=round(start, 3), end=round(t, 3), lines=lines))
    print(f'{sc["id"]:11s} {start:7.2f} -> {t:7.2f}  ({t-start:5.2f}s) ' + " ".join(f'{l["dur"]:.2f}' for l in lines))
json.dump(dict(title_zh=script["title_zh"], title_en=script["title_en"], fps=30, duration=round(t, 3), scenes=scenes),
          open("build/timeline.json", "w"), ensure_ascii=False, indent=1)
print("total", round(t, 2), "lines", n)
