"""Split one long narration recording (voice/full.*, e.g. all 21 lines generated at once in VoAI)
into voice/01.wav ... voice/NN.wav, then verify each piece against the script with offline ASR.
Sentence boundaries = the N-1 longest pauses (sentence-final pauses are longer than comma pauses)."""
import glob, json, subprocess, sys, difflib, numpy as np, soundfile as sf, imageio_ffmpeg
SR = 24000
src = (glob.glob("voice/full.*") or sys.exit("put the whole recording at voice/full.wav (or .mp3)"))[0]
lines = [l.get("tts", l["zh"]) for sc in json.load(open("script.json"))["scenes"] for l in sc["lines"]]
raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32).copy()
hop = int(0.01 * SR); fr = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
db = 20 * np.log10(fr + 1e-9); silent = db < db.max() - 38
# silent runs (in frames), ignoring leading/trailing silence
voiced = np.where(~silent)[0]; a0, a1 = voiced[0], voiced[-1]
runs, i = [], a0
while i < a1:
    if silent[i]:
        j = i
        while j < a1 and silent[j]: j += 1
        runs.append((j - i, i, j)); i = j
    else: i += 1
need = len(lines) - 1
if len(runs) < need: sys.exit(f"found only {len(runs)} pauses, need {need}")
cuts = sorted(sorted(runs, reverse=True)[:need], key=lambda r: r[1])
bounds = [a0] + [(r[1] + r[2]) // 2 for r in cuts] + [a1 + 1]
print(f"{src}: {len(x) / SR:.1f}s, shortest sentence pause used {min(r[0] for r in cuts) * 10} ms, longest comma pause left {sorted(runs, reverse=True)[need][0] * 10 if len(runs) > need else 0} ms")
import sherpa_onnx, opencc, os
D = os.environ.get("ASR_DIR", "/tmp/claude-0/-home-user-insurance-signal-review-p01/209ba1a0-5e5b-51b7-b14f-a021e3bef3cf/scratchpad/tts/sherpa-onnx-paraformer-zh-small-2024-03-09")
asr = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=f"{D}/model.int8.onnx", tokens=f"{D}/tokens.txt", num_threads=4) if os.path.isdir(D) else None
t2s = opencc.OpenCC("t2s"); strip = lambda s: "".join(c for c in s if "一" <= c <= "鿿")
for k in range(len(lines)):
    seg = x[bounds[k] * hop:bounds[k + 1] * hop]
    sf.write(f"voice/{k + 1:02d}.wav", seg, SR)
    msg = f"{k + 1:02d} {len(seg) / SR:5.2f}s  {lines[k]}"
    if asr:
        s = asr.create_stream(); s.accept_waveform(SR, seg); asr.decode_stream(s)
        r = difflib.SequenceMatcher(None, strip(t2s.convert(lines[k])), strip(s.result.text)).ratio()
        msg += f"  match {r:.0%}{'  <-- CHECK' if r < 0.45 else ''}"
    print(msg)
