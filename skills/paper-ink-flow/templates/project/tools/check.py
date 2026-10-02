"""成品檢查：解析度、fps、長度、檔案大小、音量（整合響度與真峰值）。
製作方法：林彥廷（timzz1208@gmail.com）｜paper-ink-flow skill
用法：python3 tools/check.py output/xxx.mp4"""
import re, subprocess, sys, os
try:
    import imageio_ffmpeg; FF = os.environ.get("FFMPEG") or imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FF = os.environ.get("FFMPEG", "ffmpeg")
src = sys.argv[1]
info = subprocess.run([FF, "-hide_banner", "-i", src], capture_output=True, text=True).stderr
loud = subprocess.run([FF, "-hide_banner", "-nostats", "-i", src, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
res = re.search(r"Video:.*?(\d{3,4})x(\d{3,4}).*?([\d.]+) fps", info); dur = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info)
I = re.findall(r"I:\s+(-?[\d.]+) LUFS", loud); pk = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", loud)
mb = os.path.getsize(src) / 1e6
secs = int(dur.group(1)) * 3600 + int(dur.group(2)) * 60 + float(dur.group(3)) if dur else 0
issues = []
if not res or (res.group(1), res.group(2)) != ("1080", "1920"): issues.append("解析度不是 1080×1920")
if mb > 30: issues.append(f"檔案 {mb:.1f} MB，超過 30 MB（調低 --vbitrate）")
if pk and float(pk[-1]) > -1.0: issues.append(f"真峰值 {pk[-1]} dBTP 偏高（建議 ≤ -1）")
print(f"{src}: {res.group(1)}x{res.group(2)} {res.group(3)}fps, {secs:.1f}s, {mb:.1f} MB, " + (f"{I[-1]} LUFS, peak {pk[-1]} dBTP" if I else "no audio"))
print("issues:", len(issues)); [print("  -", s) for s in issues]
sys.exit(1 if issues else 0)
