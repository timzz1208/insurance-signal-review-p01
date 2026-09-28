"""Contact sheet of vertical stills: python3 tools/sheet.py <dir> <out.jpg> [cols]"""
import sys, glob, os
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
fs = [f for f in sorted(glob.glob(os.path.join(src, "*.png"))) if not os.path.basename(f).startswith('00_') and os.path.abspath(f) != os.path.abspath(out)]
w0, h0 = Image.open(fs[0]).size; tw = 432; th = round(h0 * tw / w0)
rows = (len(fs) + cols - 1) // cols
sh = Image.new("RGB", (cols * tw, rows * th), "white")
for i, f in enumerate(fs):
    im = Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS)
    ImageDraw.Draw(im).text((8, 6), os.path.basename(f), fill=(255, 0, 0))
    sh.paste(im, ((i % cols) * tw, (i // cols) * th))
sh.save(out, quality=88)
