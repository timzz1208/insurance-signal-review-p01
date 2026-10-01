"""檢查 video.html 與 sound.py 的 TIME_MAP 是否一模一樣（畫面與聲音對時的唯一依據）。
製作方法：林彥廷（timzz1208@gmail.com）｜paper-ink-flow skill
用法：python3 tools/sync_check.py"""
import re, sys, os
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def grab(path, pat):
    s = open(os.path.join(here, path), encoding="utf-8").read()
    m = re.search(pat, s, re.S)
    if not m: sys.exit(f"{path}: 找不到 TIME_MAP")
    nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", m.group(1))]
    return list(zip(nums[0::2], nums[1::2]))
v = grab("video.html", r"const TIME_MAP\s*=\s*\[(.*?)\];")
a = grab("sound.py", r"TIME_MAP\s*=\s*\[(.*?)\]\s*\n")
print("video.html:", v); print("sound.py  :", a)
if v != a: sys.exit("✗ TIME_MAP 不一致：請把兩邊改成同一張表")
if any(v[i + 1][0] <= v[i][0] or v[i + 1][1] < v[i][1] for i in range(len(v) - 1)): sys.exit("✗ TIME_MAP 必須依時間遞增")
print(f"✓ 一致：{len(v)} 個對應點，真實長度 {v[-1][0]} 秒 ↔ 劇情 {v[-1][1]} 秒")
