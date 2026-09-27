"""Generate narration for every script line, trim silence, measure durations,
and build timeline.json that drives visuals, subtitles and audio."""
import json, sys, os, numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(__file__))
from tts_common import make_tts

# Taiwanese readings the TTS lexicon gets wrong: 筊 jiǎo (not xiáo), 著 zhe (not zhù)
FIX = {"筊": "餃", "著": "着"}
SID, SPEED, SR = 67, 0.92, 24000
LEAD, GAP, TAIL, FIRST_LEAD = 1.2, 0.7, 1.4, 2.4
script = json.load(open("script.json"))
os.makedirs("build/vo", exist_ok=True)
tts = make_tts()

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
            a = tts.generate(txt, sid=SID, speed=SPEED)
            x = trim(np.array(a.samples, dtype=np.float32))
            n += 1; path = f"build/vo/{n:02d}.wav"; sf.write(path, x, SR)
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
