"""Load narration for every script line, trim silence, measure durations,
and build build/timeline.json that drives visuals, subtitles, sound effects and music.

Narration source, in order of preference:
  voice/01.* ... voice/NN.*  (VoAI 子墨 recordings; tools/split_voice.py makes them from voice/full.*)
  offline Kokoro TTS         (placeholder voice for drafts only)
Pacing (lead / gap / tail seconds) is set per scene in script.json, so scene 4 can breathe
while the hook scenes stay tight."""
import json, sys, os, glob, subprocess, numpy as np, soundfile as sf, imageio_ffmpeg
sys.path.insert(0, os.path.dirname(__file__))

SID, SPEED, SR = 67, 1.3, 24000
script = json.load(open("script.json"))
os.makedirs("build/vo", exist_ok=True)
N_LINES = sum(len(sc["lines"]) for sc in script["scenes"])
EXT = {int(os.path.basename(f).split(".")[0]): f for f in glob.glob("voice/[0-9][0-9].*") if f.rsplit(".", 1)[-1].lower() in ("wav", "mp3", "m4a", "aac", "flac", "ogg")}
USE_EXT = all(i in EXT for i in range(1, N_LINES + 1))
if EXT and not USE_EXT: sys.exit(f"voice/ has {len(EXT)} of {N_LINES} lines; missing {sorted(set(range(1, N_LINES + 1)) - set(EXT))}")
print("narration source:", "voice/ recordings (VoAI)" if USE_EXT else f"PLACEHOLDER offline TTS sid {SID}")
tts = None
if not USE_EXT:
    from tts_common import make_tts
    tts = make_tts()

TEMPO = float(script.get("voice_tempo", 1.0))   # e.g. 1.08 = 8% faster; ffmpeg atempo keeps the pitch
if TEMPO != 1.0: print(f"voice tempo x{TEMPO}")
def load_ext(path):  # decode any format to mono float32 at SR with ffmpeg (optionally time-stretched)
    af = ["-af", f"atempo={TEMPO}"] if TEMPO != 1.0 else []
    raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", path, *af, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).copy(); return x / max(1e-6, np.abs(x).max()) * 0.9

def trim(x, thr=0.01, pad=0.05):
    idx = np.where(np.abs(x) > thr)[0]
    a = max(0, idx[0] - int(pad * SR)); b = min(len(x), idx[-1] + int(pad * SR))
    return x[a:b]

t = 0.0; scenes = []; n = 0
for si, sc in enumerate(script["scenes"]):
    start = t
    lines = []
    t += sc["lead"]
    for li, ln in enumerate(sc["lines"]):
        n += 1
        x = trim(load_ext(EXT[n])) if USE_EXT else trim(np.array(tts.generate(ln.get("tts", ln["zh"]), sid=SID, speed=SPEED).samples, dtype=np.float32))
        path = f"build/vo/{n:02d}.wav"; sf.write(path, x, SR)
        d = len(x) / SR
        lines.append(dict(n=n, zh=ln["zh"], wav=path, start=round(t, 3), dur=round(d, 3)))
        t += d + (sc["gap"] if li < len(sc["lines"]) - 1 else 0)
    t += sc["tail"]
    scenes.append(dict(id=sc["id"], start=round(start, 3), end=round(t, 3), lines=lines))
    print(f'{sc["id"]:9s} {start:6.2f} -> {t:6.2f}  ({t - start:5.2f}s) ' + " ".join(f'{l["dur"]:.2f}' for l in lines))
json.dump(dict(title_zh=script["title_zh"], fps=script["fps"], duration=round(t, 3), placeholder_voice=not USE_EXT, scenes=scenes),
          open("build/timeline.json", "w"), ensure_ascii=False, indent=1)
print("total", round(t, 2), "s, lines", n)
