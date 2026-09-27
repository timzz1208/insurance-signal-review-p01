"""Export bilingual .srt using exactly the same on/off times as the burned-in subtitles."""
import json
tl = json.load(open("build/timeline.json"))
def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
out, n = [], 0
for sc in tl["scenes"]:
    for l in sc["lines"]:
        n += 1; out.append(f"{n}\n{ts(l['start'] - 0.15)} --> {ts(l['start'] + l['dur'] + 0.35)}\n{l['zh']}\n<i>{l['en']}</i>\n")
open("output/新社九庄媽進香.srt", "w", encoding="utf-8").write("\n".join(out))
print(n, "cues")
