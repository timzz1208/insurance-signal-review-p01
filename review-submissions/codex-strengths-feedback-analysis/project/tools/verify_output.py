"""Verify encoded artifacts, subtitle timing, actual narration durations and existence."""
import json, subprocess, re, hashlib
from pathlib import Path
from PIL import Image
import soundfile as sf

out=Path('output'); qa=out/'qa'; qa.mkdir(exist_ok=True)
tl=json.loads(Path('build/timeline.json').read_text(encoding='utf-8'))
script=json.loads(Path('script.json').read_text(encoding='utf-8'))
movie=out/'strengths_feedback_analysis.mp4'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(movie)]))
v=next(s for s in probe['streams'] if s['codec_type']=='video')
a=next(s for s in probe['streams'] if s['codec_type']=='audio')
issues=[]
def check(ok,msg):
    if not ok: issues.append(msg)
check((v['width'],v['height'],v['r_frame_rate'])==(1080,1920,'30/1'),'video geometry/fps')
check(abs(float(v['duration'])-tl['duration'])<=1/30+.001,'video duration')
check(abs(float(a.get('start_time',0)))<.04,'audio start offset')
check(abs(float(a['duration'])-tl['duration'])<.06,'audio duration')
lines=[l for sc in tl['scenes'] for l in sc['lines']]
expected=[l['zh'] for sc in script['scenes'] for l in sc['lines']]
check([l['zh'] for l in lines]==expected,'script/timeline mismatch')
for l in lines:
    check(len(l['zh'])<=30 and l['zh'][-1] in '。！？：','narration length/punctuation')
    info=sf.info(l['wav']);check(abs(info.duration-l['dur'])<=.001,'wav duration '+str(l['n']))
def secs(s):
    h,m,sec,ms=map(int,re.split('[:,]',s));return h*3600+m*60+sec+ms/1000
srt=(out/'strengths_feedback_analysis.srt').read_text(encoding='utf-8').strip().split('\n\n')
cues=json.loads(Path('build/subtitle_cues.json').read_text(encoding='utf-8'))
check(len(srt)==len(lines)==len(cues)==17,'cue count')
for block,l,cue in zip(srt,lines,cues):
    r=block.splitlines();start,end=map(secs,r[1].split(' --> '))
    check(abs(start-(l['start']-.1))<.0011 and abs(end-(l['start']+l['dur']+.15))<.0011,'cue timing '+str(l['n']))
    check('\n'.join(r[2:])==cue['text'],'burned/SRT layout '+str(l['n']))
    check(''.join(r[2:])==l['zh'].rstrip('。'),'cue text '+str(l['n']))
files=[movie,out/'strengths_feedback_analysis.srt']
for i,sc in enumerate(tl['scenes'],1):
    p=out/'carousel'/f"{i:02}_{sc['id']}.png";files.append(p)
    check(Image.open(p).size==(1080,1350),'carousel size '+p.name)
for p in files:check(p.exists() and p.stat().st_size>0,'missing '+str(p))
report={'issues':issues,'video':{k:v.get(k) for k in ['codec_name','width','height','r_frame_rate','duration','nb_frames']},'audio':{k:a.get(k) for k in ['codec_name','sample_rate','duration','start_time']},'subtitles':len(srt),'files':[{'path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
(qa/'artifacts.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(qa/'timeline.json').write_text(json.dumps(tl,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2));raise SystemExit(bool(issues))
