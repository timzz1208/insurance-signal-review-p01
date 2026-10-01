"""定格總覽：python3 tools/sheet.py build/stills out.png [欄數]"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
fs = sorted([f for f in os.listdir(d) if f.endswith('.png')], key=lambda f: float(f[6:-4]))
w, h = 360, 640
rows = (len(fs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 16) + 16, rows * (h + 50) + 16), '#666')
dr = ImageDraw.Draw(sheet)
for i, f in enumerate(fs):
    im = Image.open(os.path.join(d, f)).convert('RGB').resize((w, h))
    x, y = 16 + (i % cols) * (w + 16), 16 + (i // cols) * (h + 50)
    sheet.paste(im, (x, y)); dr.text((x, y + h + 8), f[6:-4] + ' s', fill='white')
sheet.save(out)
