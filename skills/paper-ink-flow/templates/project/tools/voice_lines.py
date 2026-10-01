"""從整段旁白 WAV 找出每句的起訖秒數，輸出可直接貼進 sound.py 的 VOICE_LINES。
製作方法：林彥廷（timzz1208@gmail.com）｜paper-ink-flow skill
用法：python3 tools/voice_lines.py voice/narration.wav voice/lines.txt
  lines.txt：一句一行（就是交給 AI 語音生成的旁白稿）
做法：找出所有停頓，再用動態規劃選出 N-1 個句子分界：每段長度接近該句字數的比例，並偏好較長的停頓。
放置時間（第三欄）先填來源開始時間，之後依畫面的劇情時間調整。"""
import sys, wave, numpy as np
wav, txt = sys.argv[1], sys.argv[2]
lines = [l.strip() for l in open(txt, encoding="utf-8") if l.strip() and not l.startswith("#")]
with wave.open(wav) as w:
    sr, ch = w.getframerate(), w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32768
if ch > 1: x = x.reshape(-1, ch).mean(axis=1)
hop = int(0.01 * sr); e = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
db = 20 * np.log10(e + 1e-9); voiced = db > db.max() - 38
idx = np.where(voiced)[0]; a0, a1 = idx[0], idx[-1]
runs, i = [], a0
while i < a1:
    if not voiced[i]:
        j = i
        while j < a1 and not voiced[j]: j += 1
        runs.append((j - i, i, j)); i = j
    else: i += 1
need = len(lines) - 1
if len(runs) < need: sys.exit(f"只找到 {len(runs)} 個停頓，需要 {need} 個：請確認每句之間有停頓")
# 動態規劃選切點：每段長度要接近「該句字數佔全稿的比例」，同時偏好較長的停頓。
# （只取最長的 N-1 個停頓不夠：句內逗號的停頓有時比句間停頓還長。）
han = lambda t: sum(1 for c in t if "\u4e00" <= c <= "\u9fff") or 1
cands = [r for r in runs if r[0] >= 12]                    # ≥ 120 ms 的停頓才算候選
cpos = [a0] + [(r[1] + r[2]) / 2 for r in cands] + [a1 + 1]
clen = [0] + [r[0] for r in cands] + [0]
nch = [han(l) for l in lines]; rate = (a1 - a0) / sum(nch)
M, K, INF = len(cpos), len(lines), 1e18
cost = np.full((K + 1, M), INF); back = np.zeros((K + 1, M), int); cost[0][0] = 0
for k in range(1, K + 1):
    exp = nch[k - 1] * rate
    for j in range(1, M):
        if (k < K and j == M - 1) or (k == K and j != M - 1): continue
        for i in range(j):
            if cost[k - 1][i] >= INF: continue
            c = cost[k - 1][i] + ((cpos[j] - cpos[i] - exp) / (0.25 * exp + 30)) ** 2 - (0 if j == M - 1 else 0.15 * clen[j])
            if c < cost[k][j]: cost[k][j], back[k][j] = c, i
path, j = [], M - 1
for k in range(K, 0, -1): path.append(j); j = back[k][j]
path = path[::-1]
cuts = [cands[j - 1] for j in path[:-1]]
bounds = [(a0, cuts[0][1])] + [(cuts[k][2], cuts[k + 1][1]) for k in range(need - 1)] + [(cuts[-1][2], a1 + 1)] if need else [(a0, a1 + 1)]
print("VOICE_LINES = [\n    # (來源開始, 來源結束, 放置時間)  句子")
for (s, e2), line in zip(bounds, lines):
    s0, s1 = max(0, s * hop / sr - 0.05), e2 * hop / sr + 0.05
    print(f"    ({s0:.2f}, {s1:.2f}, {s0:.2f}),  # {line}")
print("]")
print(f"# 旁白總長 {len(x) / sr:.1f} 秒；最短的句間停頓 {min(r[0] for r in cuts) * 10 if cuts else 0} ms", file=sys.stderr)
