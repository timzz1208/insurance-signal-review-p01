import json,time
from faster_whisper import WhisperModel
m=WhisperModel('large-v3-turbo',device='cpu',compute_type='int8',cpu_threads=4)
t=time.time()
segs,info=m.transcribe('audio16k.wav',language='zh',word_timestamps=True,vad_filter=False,
  initial_prompt='以下是繁體中文的口播，主題是用AI剪輯口播短影音，提到大字卡、音效、配音、章節卡、剪接點。')
out=[]
for s in segs:
    out.append({'start':s.start,'end':s.end,'text':s.text,'words':[{'w':w.word,'s':w.start,'e':w.end,'p':w.probability} for w in s.words]})
json.dump(out,open('transcript.json','w'),ensure_ascii=False,indent=1)
print(f'done {time.time()-t:.0f}s')
