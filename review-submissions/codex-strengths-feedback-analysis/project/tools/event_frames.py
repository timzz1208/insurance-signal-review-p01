"""Decode exact MP4 frames at meaningful action phases and scene cuts."""
import json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np
import imageio_ffmpeg

ff=imageio_ffmpeg.get_ffmpeg_exe();out=Path('output/stills');out.mkdir(exist_ok=True)
tl=json.loads(Path('build/timeline.json').read_text(encoding='utf-8'))
movie='output/strengths_feedback_analysis.mp4'
def event_times(idx,sc):
    line=lambda n:sc['lines'][n]['start']
    if idx==0:return [0,.65,1.3,line(1)+.8,line(2),line(2)+1.1]
    if idx==1:return [line(1)-.1,line(1)+.35,line(1)+.95,line(2)-.1,line(2)+.4,line(2)+1]
    if idx==2:return [line(1)-.1,line(1)+.7,line(1)+1.8,line(2)-.1,line(2)+.5,line(2)+1.7]
    if idx==3:return [line(1)-.1,line(1)+.5,line(1)+1.5,line(2)-.1,line(2)+.5,line(2)+1.3]
    return [line(2)-.1,line(2)+.65,line(2)+1.8,line(4)-.1,line(4)+.4,line(4)+1]
frames={int(p.stem[1:]) for p in out.glob('f[0-9]*.png')}
for idx,sc in enumerate(tl['scenes']):
    frames.update(round(t*30) for t in event_times(idx,sc)+[sc['end']-.5])
for sc in tl['scenes'][1:]:frames.update(round((sc['start']+d)*30) for d in [-.2,-.1,0,.1,.2])
# Decode once. frame_pts preserves original 30 fps frame indices in filenames.
select='+'.join(f'eq(n,{f})' for f in sorted(frames))
subprocess.run([ff,'-y','-v','error','-i',movie,'-vf',f"select='{select}'",'-fps_mode','passthrough','-frame_pts','1',str(out/'f%05d.png')],check=True)
def capture(t,path):
    frame=round(t*30)
    return Image.open(out/f'f{frame:05}.png').convert('RGB')
reports=[]
for idx,sc in enumerate(tl['scenes']):
    times=[round(t*30)/30 for t in event_times(idx,sc)]
    sheet=Image.new('RGB',(270*6,510),'white');draw=ImageDraw.Draw(sheet);ims=[]
    for j,t in enumerate(times):
        t=round(t*30)/30;im=capture(t,out/f'f{round(t*30):05}.png');ims.append(np.array(im.crop((80,570,930,1250)).resize((255,204)),dtype=float))
        sheet.paste(im.resize((270,480)),(270*j,30));draw.text((270*j+8,8),f'{sc["id"]} {t:.3f}s',fill='black')
    sheet.save(out/f'events_{idx+1:02}_{sc["id"]}.png')
    diffs=[float(np.abs(ims[b]-ims[a]).mean()) for a,b in [(0,2),(3,5)]]
    reports.append({'scene':sc['id'],'times':times,'content_roi_mean_difference':diffs,'note':'Pixel change alone is not semantic QA; visually inspect the event sheet.'})
# Refresh every pre-existing fNNNNN still from the actual final MP4, preventing stale v1 images.
for p in sorted(out.glob('f[0-9]*.png')):capture(int(p.stem[1:])/30,p)
sheet=Image.new('RGB',(270*5,510),'white');draw=ImageDraw.Draw(sheet)
for i,sc in enumerate(tl['scenes']):
    t=round((sc['end']-.5)*30)/30;im=capture(t,out/f'f{round(t*30):05}.png');sheet.paste(im.resize((270,480)),(270*i,30));draw.text((270*i+8,8),f'{sc["id"]} {t:.3f}s',fill='black')
sheet.save(out/'00_scene_contact_sheet.png')
sheet=Image.new('RGB',(270*5,510*4),'white');draw=ImageDraw.Draw(sheet)
for i,sc in enumerate(tl['scenes'][1:]):
    for j,offset in enumerate([-.2,-.1,0,.1,.2]):
        t=round((sc['start']+offset)*30)/30;im=capture(t,out/f'f{round(t*30):05}.png');sheet.paste(im.resize((270,480)),(270*j,510*i+30));draw.text((270*j+8,510*i+8),f'{t:.3f}s',fill='black')
sheet.save(out/'transitions.png')
Path('output/qa/motion.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
print('Five action sheets, transition sheet and final stills decoded from MP4.')
