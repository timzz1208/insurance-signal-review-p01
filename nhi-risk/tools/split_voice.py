"""Split one long narration recording (voice/full.*, e.g. all 21 lines generated at once in VoAI)
into voice/01.wav ... voice/NN.wav, then verify each piece against the script with offline ASR.
Sentence boundaries = the N-1 longest pauses (sentence-final pauses are longer than comma pauses)."""
import glob, json, subprocess, sys, difflib, os, numpy as np, soundfile as sf, imageio_ffmpeg, sherpa_onnx, opencc
strip = lambda s: "".join(c for c in s if "\u4e00" <= c <= "\u9fff")
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
# Choose the N-1 cut points by dynamic programming over candidate pauses: each segment's length
# should match its share of the script's characters, and longer pauses are preferred as cuts.
# (Sentence pauses can be barely longer than comma pauses, so "longest N-1 pauses" is not enough.)
cands = [r for r in runs if r[0] >= 12]
cpos = [a0] + [(r[1] + r[2]) / 2 for r in cands] + [a1 + 1]
clen = [0] + [r[0] for r in cands] + [0]
nch = [len(strip(l)) for l in lines]; rate = (a1 - a0) / sum(nch)
M, K = len(cpos), len(lines)
INF = 1e18; cost = np.full((K + 1, M), INF); back = np.zeros((K + 1, M), int); cost[0][0] = 0
for k in range(1, K + 1):
    exp = nch[k - 1] * rate
    for j in range(1, M):
        if k < K and j == M - 1: continue
        if k == K and j != M - 1: continue
        best, bi = INF, 0
        for i in range(j):
            if cost[k - 1][i] >= INF: continue
            d = cpos[j] - cpos[i]
            c = cost[k - 1][i] + ((d - exp) / (0.25 * exp + 30)) ** 2 - (0 if j == M - 1 else 0.15 * clen[j])
            if c < best: best, bi = c, i
        cost[k][j], back[k][j] = best, bi
path, j = [], M - 1
for k in range(K, 0, -1): path.append(j); j = back[k][j]
path = path[::-1]
cuts = [cands[j - 1] for j in path[:-1]]
bounds = [a0] + [int(cpos[j]) for j in path]
print(f"{src}: {len(x) / SR:.1f}s, {len(cands)} candidate pauses, shortest pause used as a sentence cut {min(r[0] for r in cuts) * 10} ms")
D = os.environ.get("ASR_DIR", os.environ.get("MODELS_DIR", "/tmp/claude-0/models") + "/sherpa-onnx-paraformer-zh-small-2024-03-09")
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
