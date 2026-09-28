"""Extract actual encoded MP4 frames and make timestamped contact sheets."""
import sys, subprocess, math
from pathlib import Path
from PIL import Image, ImageDraw
import shutil

src, dest = sys.argv[1:3]
out = Path(dest); out.mkdir(parents=True, exist_ok=True)
ff = shutil.which('ffmpeg')
if not ff:
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
subprocess.run([ff, '-y', '-v', 'error', '-i', src, '-vf', 'fps=1,scale=270:480', str(out/'second_%03d.png')], check=True)
files = sorted(out.glob('second_*.png'))
for start in range(0, len(files), 15):
    batch = files[start:start+15]
    sheet = Image.new('RGB', (270*5, 510*math.ceil(len(batch)/5)), '#ffffff')
    draw = ImageDraw.Draw(sheet)
    for j, f in enumerate(batch):
        x, y = j%5*270, j//5*510
        sheet.paste(Image.open(f), (x,y+30)); draw.text((x+10,y+8), f'{start+j:02d}s (1 fps sample)', fill='#111111')
    sheet.save(out/f'contact_{start:02d}.png')
print('extracted', len(files), 'seconds from', src)
