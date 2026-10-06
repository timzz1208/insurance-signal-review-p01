#!/usr/bin/env python3
"""Transcribe a talking-head video with word-level timestamps (Traditional Chinese output).

Usage:
  python transcribe.py VIDEO --workdir work [--model large-v3-turbo] [--prompt "專有名詞..."] [--script script.txt]
  python transcribe.py VIDEO --workdir work --range 99 108      # re-check one region (prints words, saves nothing)

Writes in workdir:
  transcript.json   [{start,end,text,words:[{w,s,e,p}]}]  (times in source seconds, text already Traditional)
  transcript.txt    human-readable lines "  12.34-  15.60 text"
  silences.json     [[start,end],...] from ffmpeg silencedetect (-35dB, >=0.4s)
  unmatched.txt     non-silent regions with NO transcribed words -> likely missed speech/retakes; re-check them with --range
"""
import argparse, json, os, re, subprocess, sys

def sh(cmd): return subprocess.run(cmd, shell=True, capture_output=True, text=True)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video'); ap.add_argument('--workdir', default='work')
    ap.add_argument('--model', default='large-v3-turbo'); ap.add_argument('--lang', default='zh')
    ap.add_argument('--prompt', default=''); ap.add_argument('--script', help='optional script text file; used only as a vocabulary hint')
    ap.add_argument('--range', nargs=2, type=float)
    a = ap.parse_args(); os.makedirs(a.workdir, exist_ok=True)
    from faster_whisper import WhisperModel
    from opencc import OpenCC
    cc = OpenCC('s2twp')
    wav = os.path.join(a.workdir, 'audio16k.wav')
    if not os.path.exists(wav):
        sh(f'ffmpeg -loglevel error -y -i "{a.video}" -vn -ac 1 -ar 16000 "{wav}"')
    prompt = '以下是繁體中文的口播。' + a.prompt
    if a.script:
        txt = open(a.script, encoding='utf-8').read()
        prompt += re.sub(r'\s+', '', txt)[:150]
    m = WhisperModel(a.model, device='cpu', compute_type='int8', cpu_threads=os.cpu_count() or 4)
    if a.range:
        s0, s1 = a.range; seg = os.path.join(a.workdir, '_range.wav')
        sh(f'ffmpeg -loglevel error -y -ss {s0} -to {s1} -i "{wav}" "{seg}"')
        segs, _ = m.transcribe(seg, language=a.lang, word_timestamps=True, initial_prompt=prompt)
        words = []
        for s in segs:
            print(' '.join(f"{cc.convert(w.word)}[{w.start+s0:.2f}-{w.end+s0:.2f}]" for w in s.words))
            words += [{'w': cc.convert(w.word), 's': round(w.start + s0, 3), 'e': round(w.end + s0, 3)} for w in s.words]
        fn = os.path.join(a.workdir, f'range_{s0:g}_{s1:g}.json')
        json.dump({'range': [s0, s1], 'words': words}, open(fn, 'w'), ensure_ascii=False, indent=1)
        print(f'saved {fn}  -> 確認是要保留的那一次後，用 suggest_plan.py --add {fn}（會取代原逐字稿在這段時間內的字；重複的另一次仍要用 --drop 刪掉）')
        return
    segs, info = m.transcribe(wav, language=a.lang, word_timestamps=True, initial_prompt=prompt)
    out = []
    for s in segs:
        out.append({'start': s.start, 'end': s.end, 'text': cc.convert(s.text),
                    'words': [{'w': cc.convert(w.word), 's': w.start, 'e': w.end, 'p': round(w.probability, 3)} for w in s.words]})
    json.dump(out, open(os.path.join(a.workdir, 'transcript.json'), 'w'), ensure_ascii=False, indent=1)
    with open(os.path.join(a.workdir, 'transcript.txt'), 'w') as f:
        for s in out: f.write(f"{s['start']:7.2f}-{s['end']:7.2f} {s['text']}\n")
    find_unmatched(wav, out, info.duration, a.workdir)
    print(open(os.path.join(a.workdir, 'transcript.txt')).read())
    um = open(os.path.join(a.workdir, 'unmatched.txt')).read().strip()
    print('\n[unmatched voiced regions]\n' + (um or '(none)'))

def find_unmatched(wav, out, duration, workdir):
    """Voiced stretches (not silent) that contain no transcribed word for >= 0.8s -> likely skipped speech/retakes."""
    r = sh(f'ffmpeg -hide_banner -i "{wav}" -af silencedetect=noise=-35dB:d=0.4 -f null -')
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r.stderr)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r.stderr)]
    sil = list(zip(st, en)); json.dump(sil, open(os.path.join(workdir, 'silences.json'), 'w'))
    voiced, prev = [], 0.0
    for s0, s1 in sil:
        if s0 - prev > 0.3: voiced.append((prev, s0))
        prev = s1
    if duration - prev > 0.3: voiced.append((prev, duration))
    words = sorted((w['s'] - .15, w['e'] + .15) for s in out for w in s['words'])
    gaps = []
    for v0, v1 in voiced:
        cur = v0
        for s, e in words:
            if e <= cur or s >= v1: continue
            if s - cur >= 0.8: gaps.append((cur, s))
            cur = max(cur, e)
        if v1 - cur >= 0.8: gaps.append((cur, v1))
    with open(os.path.join(workdir, 'unmatched.txt'), 'w') as f:
        for g0, g1 in gaps:
            f.write(f"{g0:.2f} {g1:.2f}  # {g1-g0:.1f}s 有聲音但沒有轉出字 -> transcribe.py --range {max(0,g0-1):.1f} {g1+1:.1f}\n")
    return gaps

if __name__ == '__main__': main()
