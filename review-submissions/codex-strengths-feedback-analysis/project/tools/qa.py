"""Frame-by-frame QA of the final MP4: decodes every frame and flags blank/near-uniform frames,
pure black/white blotches, frozen runs, and abrupt jumps outside scene transitions."""
import json, subprocess, sys, numpy as np, imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe(); src = sys.argv[1]
tl = json.load(open("build/timeline.json")); fps = tl["fps"]
W, H = 270, 480
p = subprocess.Popen([FF, "-v", "error", "-i", src, "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
bounds = [s["start"] for s in tl["scenes"][1:]]
def near_transition(t): return any(abs(t - b) < 0.7 for b in bounds) or t <= 0.2 or t > tl["duration"] - 0.7
issues, prev, frozen, n, stats = [], None, 0, 0, []
while True:
    buf = p.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    f = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32); t = n / fps
    lum = f.mean(2); sd = lum.std()
    black = (lum < 6).mean(); white = (lum > 252).mean()
    # 30x30-cell block check: any cell that is perfectly flat pure black/white = broken render region
    cells = lum[:H // 30 * 30, :W // 30 * 30].reshape(H // 30, 30, W // 30, 30).transpose(0, 2, 1, 3).reshape(-1, 900)
    flat_bad = ((cells.std(1) < 0.5) & ((cells.mean(1) < 4) | (cells.mean(1) > 252))).sum()
    if not near_transition(t):
        if sd < 6: issues.append((n, t, f"near-uniform frame (std {sd:.1f})"))
        if black > 0.01: issues.append((n, t, f"pure-black area {black:.1%}"))
        if white > 0.01: issues.append((n, t, f"pure-white area {white:.1%}"))
        if flat_bad: issues.append((n, t, f"{flat_bad} flat black/white blocks"))
    if prev is not None:
        d = np.abs(f - prev).mean()
        frozen = frozen + 1 if d < 0.02 else 0
        # Deliberate reading holds are valid. Without artificial line boil, six
        # identical frames (0.2s) do not indicate failure. Flag holds over 4s;
        # semantic actions and text layout are checked separately.
        if frozen >= 4 * fps and not near_transition(t): issues.append((n, t, f"frozen for {frozen} frames"))
        if d > 25 and not near_transition(t): issues.append((n, t, f"abrupt jump (mean diff {d:.1f})"))
        stats.append(d)
    prev = f; n += 1
code = p.wait()
if code: issues.append((n,n/fps,f"decoder exit {code}"))
exp = int(np.ceil(tl["duration"] * fps))
print(f"frames decoded: {n} (expected {exp})  mean inter-frame diff {np.mean(stats):.2f}, max {np.max(stats):.2f}")
if n != exp: issues.append((n, n / fps, f"frame count mismatch {n} vs {exp}"))
print(f"issues: {len(issues)}")
for i in issues[:60]: print(f"  frame {i[0]:5d}  t={i[1]:7.2f}s  {i[2]}")
sys.exit(1 if issues else 0)
