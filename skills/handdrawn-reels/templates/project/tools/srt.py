"""Export the Chinese .srt with exactly the same on/off times and line breaks as the burned-in subtitles
(render/main.js SUB: shown from start - 0.1 s to end + 0.15 s; trailing 。 dropped)."""
import json, sys
tl = json.load(open("build/timeline.json")); out_path = sys.argv[1]
def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
out, n = [], 0
for sc in tl["scenes"]:
    for l in sc["lines"]:
        n += 1; out.append(f"{n}\n{ts(l['start'] - 0.1)} --> {ts(l['start'] + l['dur'] + 0.15)}\n{l['zh'].rstrip('。')}\n")
open(out_path, "w", encoding="utf-8").write("\n".join(out))
print(n, "cues ->", out_path)
