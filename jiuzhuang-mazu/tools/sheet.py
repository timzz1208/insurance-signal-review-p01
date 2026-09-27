import sys, glob, os
from PIL import Image, ImageDraw
src, out, per = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4
fs = sorted(glob.glob(os.path.join(src, "*.png"))); os.makedirs(out, exist_ok=True)
cols = 2
for k in range(0, len(fs), per):
    grp = fs[k:k+per]; rows = (len(grp)+1)//2
    sh = Image.new("RGB", (1920, 540*rows), "white")
    for i, f in enumerate(grp):
        im = Image.open(f).convert("RGB").resize((960, 540), Image.LANCZOS)
        ImageDraw.Draw(im).text((8, 6), os.path.basename(f), fill=(255, 0, 0))
        sh.paste(im, ((i % 2)*960, (i//2)*540))
    sh.save(os.path.join(out, f"sheet_{k//per:02d}.jpg"), quality=88)
