#!/usr/bin/env python3
"""Render a multi-shot short (AI-generated clips, storyboard shots) from drama.plan.json.
See references/drama-plan-schema.md for the plan format and examples/drama.plan.example.json.

Usage:
  python drama_build.py plan.json                      # full render (+ clean version if plan.clean_output)
  python drama_build.py plan.json --preview 1.8,40,49  # overlay stills composited on the cut -> workdir/preview.jpg (fast)
  python drama_build.py plan.json --cover              # also render the cover
  python drama_build.py plan.json --skip-video         # reuse workdir/video.mkv (overlay/subtitle/audio changes only)

Time references used everywhere in the plan:
  12.5        absolute OUTPUT seconds
  "p4+0.6"    0.6 s after piece p4 starts in the output
  "p4@1.29"   source-clock time 1.29 s of piece p4 (its shot's own timeline; works for L-cut audio too)
  "p4.end"    when piece p4 ends in the output;  "end" = end of video
"""
import argparse, json, os, re, shutil, subprocess, sys
import numpy as np
from scipy.io import wavfile
HERE = os.path.dirname(os.path.abspath(__file__)); ASSETS = os.path.join(HERE, '..', 'assets')
sys.path.insert(0, HERE)
import sfx as S
SR = 48000
LOOKS = {'flashback': ',hue=s=0.15,eq=brightness=-0.04,vignette=PI/4',
         'blur': ',gblur=sigma=24,eq=brightness=-0.20:saturation=0.75', 'none': ''}

def run(c):
    r = subprocess.run(c, shell=isinstance(c, str), capture_output=True, text=True)
    if r.returncode: sys.exit(f'FAILED: {c if isinstance(c, str) else " ".join(c)}\n{r.stderr[-2000:]}')
    return r

class TL:
    def __init__(s, pieces):
        s.p = {}; t = 0.0
        for i, pc in enumerate(pieces):
            src_len = pc['dur'] if 'freeze' in pc else pc['out'] - pc['in']
            L = src_len + pc.get('hold', 0)
            tr = pc.get('transition_in')
            st = t - tr['dur'] if (tr and i) else t
            s.p[pc['id']] = dict(start=st, end=st + L, len=L, src_in=pc.get('in', 0))
            t = st + L
        s.total = t
    def __call__(s, ref, total=None):
        if isinstance(ref, (int, float)): return float(ref)
        ref = ref.strip()
        if ref == 'end': return total if total is not None else s.total
        m = re.fullmatch(r'(\w+)\.end', ref)
        if m: return s.p[m[1]]['end']
        m = re.fullmatch(r'(\w+)([+@])(-?[\d.]+)', ref)
        if not m: raise ValueError(f'bad time ref {ref!r}')
        p = s.p[m[1]]; v = float(m[3])
        return p['start'] + (v if m[2] == '+' else v - p['src_in'])

def resolve(obj, tl, total):
    """map every time field in an overlay item to output seconds"""
    keys = ('start', 'end', 'at')
    if isinstance(obj, dict):
        return {k: (round(tl(v, total), 3) if k in keys and isinstance(v, (str, int, float)) and not isinstance(v, bool) else resolve(v, tl, total)) for k, v in obj.items()}
    if isinstance(obj, list): return [resolve(x, tl, total) for x in obj]
    return obj

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('plan'); ap.add_argument('--preview'); ap.add_argument('--cover', action='store_true')
    ap.add_argument('--skip-video', action='store_true'); a = ap.parse_args()
    P = json.load(open(a.plan)); base = os.path.dirname(os.path.abspath(a.plan))
    rel = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
    W, H = P.get('size', [1080, 1920]); FPS = P.get('fps', 24)
    wd = rel(P.get('workdir', 'work')); os.makedirs(wd, exist_ok=True); vd = os.path.join(wd, 'pieces'); os.makedirs(vd, exist_ok=True)
    shots = {k: rel(v) for k, v in P['shots'].items()}
    pieces = P['pieces']; tl = TL(pieces); TOTAL = tl.total
    out = rel(P.get('output', 'out/reel.mp4')); os.makedirs(os.path.dirname(out), exist_ok=True)

    # ---------- 1. video pieces ----------
    video = os.path.join(wd, 'video.mkv')
    if not (a.skip_video or a.preview) or not os.path.exists(video):
        files = []
        for pc in pieces:
            f = os.path.join(vd, pc['id'] + '.mkv'); zs, ze = pc.get('zoom', [1.0, 1.0])
            c = pc.get('center', [[.5, .5]]); c0 = c[0]; c1 = c[-1]
            look = LOOKS[pc.get('look', 'none')]
            if 'freeze' in pc:
                fr = pc['freeze']; d = pc['dur']; n = round(d * FPS); png = os.path.join(vd, pc['id'] + '.png')
                run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(fr['t']), '-i', shots[fr['shot']], '-frames:v', '1', png])
                vf = (f"scale={int(W*1.25)}:{int(H*1.25)}:flags=lanczos,zoompan=z='{zs}+({ze}-{zs})*on/{n}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS}{look},setsar=1")
                run(['ffmpeg', '-loglevel', 'error', '-y', '-loop', '1', '-t', f'{d:.3f}', '-i', png, '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', f])
            else:
                d = pc['out'] - pc['in']; ne = round(pc.get('ease', d) * FPS)
                pe = f"(1-(1-min(1,on/{ne}))*(1-min(1,on/{ne})))"
                z = f"{zs}+({ze}-{zs})*{pe}"; cx = f"({c0[0]}+({c1[0]}-{c0[0]})*{pe})"; cy = f"({c0[1]}+({c1[1]}-{c0[1]})*{pe})"
                vf = (f"fps={FPS},scale={int(W*1.25)}:{int(H*1.25)}:force_original_aspect_ratio=increase:flags=lanczos,crop={int(W*1.25)}:{int(H*1.25)},"
                      f"zoompan=z='{z}':x='max(0,min(iw-iw/zoom,{cx}*iw-iw/zoom/2))':y='max(0,min(ih-ih/zoom,{cy}*ih-ih/zoom/2))':d=1:s={W}x{H}:fps={FPS},"
                      f"unsharp=5:5:0.6{look},setsar=1")
                if pc.get('hold'): vf += f",tpad=stop_mode=clone:stop_duration={pc['hold']}"
                run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(pc['in']), '-t', f'{d:.3f}', '-i', shots[pc['shot']], '-an', '-vf', vf,
                     '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', f])
            tr = pc.get('transition_in')
            if tr and files:
                pf, plen = files.pop(); m = os.path.join(vd, f"x_{pc['id']}.mkv")
                run(f'ffmpeg -loglevel error -y -i "{pf}" -i "{f}" -filter_complex "[0:v][1:v]xfade=transition={tr["type"]}:duration={tr["dur"]}:offset={plen-tr["dur"]:.3f},format=yuv420p[v]" -map "[v]" -c:v libx264 -preset veryfast -crf 12 "{m}"')
                files.append((m, plen + tl.p[pc['id']]['len'] - tr['dur']))
            else:
                files.append((f, tl.p[pc['id']]['len']))
        open(os.path.join(vd, 'list.txt'), 'w').write(''.join(f"file '{os.path.basename(f)}'\n" for f, _ in files))
        run(f'ffmpeg -loglevel error -y -f concat -safe 0 -i "{vd}/list.txt" -c copy "{video}"')
        print(f'[video] {len(pieces)} pieces -> {TOTAL:.2f}s')

    # ---------- 2. overlays (resolve times, avatar) ----------
    items = resolve(P.get('overlays', []), tl, TOTAL)
    for it in items:
        if it['type'] == 'cards' and isinstance(it.get('avatar'), dict):
            av = it['avatar']; png = os.path.join(wd, 'avatar.png'); x, y, w = av['crop']
            run(f'ffmpeg -loglevel error -y -ss {av["t"]} -i "{shots[av["shot"]]}" -frames:v 1 -vf "crop=iw*{w}:iw*{w}:iw*{x}:ih*{y},scale=280:280" "{png}"')
            it['avatar'] = 'file://' + png
    ovj = os.path.join(wd, 'overlay.json'); json.dump({'total': TOTAL, 'fps': FPS, 'items': items}, open(ovj, 'w'), ensure_ascii=False)
    js = os.path.join(HERE, 'render_overlay.js')
    if a.preview:
        run(['node', js, ovj, os.path.join(wd, 'stills'), a.preview]); ims = []
        for t in a.preview.split(','):
            st = os.path.join(wd, 'stills', f'still_{float(t):g}.png'); o = os.path.join(wd, f'pv_{t}.jpg')
            run(f'ffmpeg -loglevel error -y -i "{video}" -i "{st}" -filter_complex "[0:v]trim=start={t},setpts=PTS-STARTPTS[b];[b][1:v]overlay,scale=270:-1" -frames:v 1 "{o}"'); ims.append(o)
        run('ffmpeg -loglevel error -y ' + ' '.join(f'-i "{i}"' for i in ims) + (f' -filter_complex hstack={len(ims)}' if len(ims) > 1 else '') + f' "{wd}/preview.jpg"')
        print(f'preview -> {wd}/preview.jpg'); return

    # ---------- 3. audio: dialogue/ambience + SFX (+ optional bed) ----------
    mix = np.zeros(int((TOTAL + 1) * SR), np.float32)
    def put(x, at, db=0):
        i = int(max(0, at) * SR); x = x[:max(0, len(mix) - i)]; mix[i:i + len(x)] += x * 10 ** (db / 20)
    cache = {}
    def src(k):
        if k not in cache:
            w = os.path.join(wd, f'a_{k}.wav')
            r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', shots[k], '-vn', '-ac', '1', '-ar', str(SR), w], capture_output=True)
            cache[k] = wavfile.read(w)[1].astype(np.float32) / 32768 if r.returncode == 0 and os.path.exists(w) else np.zeros(1, np.float32)
        return cache[k]
    segs = []
    for i, pc in enumerate(pieces):
        if 'freeze' in pc or pc.get('audio') is False: continue
        aout = pc.get('audio_out', pc['out']); nxt = pieces[i + 1] if i + 1 < len(pieces) else None
        fo = nxt['transition_in']['dur'] if nxt and nxt.get('transition_in') and aout == pc['out'] else .06
        seg = dict(shot=pc['shot'], a=pc['in'], b=aout, at=tl.p[pc['id']]['start'], db=pc.get('audio_db', 0), fo=fo)
        if segs and segs[-1]['shot'] == seg['shot'] and abs(segs[-1]['b'] - seg['a']) < .01 and abs(segs[-1]['at'] + segs[-1]['b'] - segs[-1]['a'] - seg['at']) < .02 and segs[-1]['db'] == seg['db']:
            segs[-1]['b'] = seg['b']; segs[-1]['fo'] = seg['fo']
        else: segs.append(seg)
    for s_ in segs:
        x = src(s_['shot'])[int(s_['a'] * SR):int(s_['b'] * SR)].copy()
        if len(x) < 10: continue
        ki, ko = int(.06 * SR), int(s_['fo'] * SR); x[:ki] *= np.linspace(0, 1, ki)[:len(x[:ki])]; x[-ko:] *= np.linspace(1, 0, ko)[-len(x[-ko:]):]
        put(x, s_['at'], s_['db'])
    if P.get('sfx', True):
        for pc in pieces:
            if pc.get('transition_in', {}).get('type') == 'slideup': put(S.whoosh(.45, False), tl.p[pc['id']]['start'] - .1, -6)
        for it in items:
            if it.get('sfx') is False: continue
            ty, st = it['type'], it.get('start', 0)
            if ty == 'hook':
                put(S.boom(), st, -3); put(S.whoosh(.3), st, -8); put(S.boom(), st + .62, -7)
                if it.get('counter'):
                    for k in range(22): put(S.click(), st + 1.25 + k * .045, 6)
                    put(S.boom(), st + 2.3, -4); put(S.glitch(), st + 2.3, -6); put(S.ding(), st + 2.35, -10)
            elif ty == 'flashback': put(S.tape_stop(), st); put(S.whoosh(.35, False), st + .05, -10); put(S.tick(), st + .45, 4)
            elif ty == 'ring': put(S.whoosh(.3, True), st - .22, -12); put(S.pop(1100, 600), st - .05, -10)
            elif ty == 'stamp': put(S.thud(), st, -10)
            elif ty == 'notif': put(S.ping(), st)
            elif ty == 'recap':
                for i in range(len(it['items'])): put(S.tick(), st + .5 + i * .28, 2)
            elif ty == 'bumper': put(S.whoosh(.3, True), st + .07, -8); put(S.ding(), st + .27, -10)
            elif ty == 'cards':
                for c in it['cards']:
                    put(S.whoosh(.3, True), c['start'] - .12, -12)
                    for e in c.get('sfx', []): put(S.SOUNDS[e['sound']](), c['start'] + e['at'], e.get('db', 0))
        for e in resolve(P.get('sfx_events', []), tl, TOTAL):
            for k in range(e.get('repeat', 1)): put(S.SOUNDS[e['sound']](), e['at'] + k * e.get('every', 0), e.get('db', 0))
    mb = P.get('music_bed')
    if mb:
        if mb.get('pad'): a0, a1 = tl(mb['pad'][0], TOTAL), tl(mb['pad'][1], TOTAL); put(S.pad(a1 - a0), a0)
        if mb.get('plucks'): a0, a1 = tl(mb['plucks'][0], TOTAL), tl(mb['plucks'][1], TOTAL); put(S.plucks(a1 - a0), a0, 2)
    mixw = os.path.join(wd, 'mix.wav')
    wavfile.write(mixw, SR, (np.clip(np.stack([mix, mix], 1), -1, 1) * 32767).astype(np.int16))

    # ---------- 4. subtitles ----------
    st = {'font': 'Noto Sans CJK TC', 'size': 58, 'outline': 4, 'margin_v': 400}; st.update(P.get('subtitle_style', {}))
    ts = lambda t: f"0:{int(t//60):02d}:{t%60:05.2f}"
    ass = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "WrapStyle: 2", "", "[V4+ Styles]",
           "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
           f"Style: Sub,{st['font']},{st['size']},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,-1,0,0,0,100,100,1,0,1,{st['outline']},2,2,80,80,{st['margin_v']},1",
           "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    srt = []
    for k, s_ in enumerate(P.get('subtitles', []), 1):
        a0, a1 = tl(s_['start'], TOTAL), tl(s_['end'], TOTAL)
        ass.append(f"Dialogue: 0,{ts(a0)},{ts(a1)},Sub,,0,0,0,,{{\\fad(80,80)}}{s_['text']}")
        f = lambda x: f"00:{int(x//60):02d}:{int(x%60):02d},{int(round((x%1)*1000))%1000:03d}"
        srt.append(f"{k}\n{f(a0)} --> {f(a1)}\n{s_['text']}\n")
    assp = os.path.join(wd, 'subs.ass'); open(assp, 'w').write('\n'.join(ass) + '\n')
    open(os.path.splitext(out)[0] + '.srt', 'w').write('\n'.join(srt))

    # ---------- 5. compose (overlay pass, then subtitles+audio pass: never in one filter graph) ----------
    fd = os.path.join(wd, 'frames'); shutil.rmtree(fd, ignore_errors=True)
    r = run(['node', js, ovj, fd]); print('[overlay]', r.stdout.strip())
    ov = os.path.join(wd, 'ov.mkv')
    run(f'ffmpeg -loglevel error -y -i "{video}" -framerate {FPS} -i "{fd}/%05d.png" -filter_complex "[0:v][1:v]overlay=0:0:eof_action=pass,format=yuv420p[v]" -map "[v]" -c:v libx264 -preset veryfast -crf 12 "{ov}"')
    ENC = f'-c:v libx264 -preset slow -crf 19 -maxrate 6000k -bufsize 12000k -profile:v high -pix_fmt yuv420p -r {FPS} -c:a aac -b:a 160k -ar 48000 -movflags +faststart'
    AUD = f"[1:a]loudnorm=I={P.get('loudness', -14)}:TP=-1.5:LRA=11,aresample=48000,alimiter=limit=0.79:level=false[a]"
    run(f'ffmpeg -loglevel error -y -i "{ov}" -i "{mixw}" -filter_complex "{AUD};[0:v]ass=\'{assp}\'[v]" -map "[v]" -map "[a]" -t {TOTAL:.3f} {ENC} "{out}"')
    if P.get('clean_output'):
        run(f'ffmpeg -loglevel error -y -i "{video}" -i "{mixw}" -filter_complex "{AUD}" -map 0:v -map "[a]" -t {TOTAL:.3f} {ENC} "{rel(P["clean_output"])}"')

    # ---------- 6. checks ----------
    nf = int(run(f'ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "{out}"').stdout.strip() or 0)
    loud = run(f'ffmpeg -hide_banner -i "{out}" -af ebur128=peak=true -f null -').stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', loud); pk = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', loud)
    chk = run(['node', js, ovj, os.path.join(wd, 'stills'), 'check']).stdout.strip()
    keyts = sorted({round(x, 2) for it in items for x in ([it['start'] + .6] if 'start' in it else []) + [c['start'] + 1.2 for c in it.get('cards', [])] if x < TOTAL})[:12]
    ims = []
    for t in keyts:
        o = os.path.join(wd, f'cs_{t}.jpg'); run(f'ffmpeg -loglevel error -y -i "{out}" -ss {t} -frames:v 1 -vf "drawbox=x=0:y=0:w=iw:h=ih:color=red@1:t=4,scale=180:-1" "{o}"'); ims.append(o)
    if len(ims) > 1: run('ffmpeg -loglevel error -y ' + ' '.join(f'-i "{i}"' for i in ims) + f' -filter_complex hstack={len(ims)} "{wd}/contact.jpg"')
    exp = round(TOTAL * FPS)
    print(f'\n[done] {out}\n  duration {TOTAL:.2f}s, frames {nf} (expected ~{exp})' + ('  <-- MISMATCH' if abs(nf - exp) > 5 else ''))
    print(f'  loudness {I[-1] if I else "?"} LUFS, true peak {pk[-1] if pk else "?"} dBFS')
    print(f'  overlay bounds check: {chk}')
    print(f'  contact sheet (red = frame edge): {wd}/contact.jpg  times {keyts}')
    if a.cover and P.get('cover'): make_cover(P['cover'], shots, wd, rel)

def make_cover(cv, shots, wd, rel):
    bg = os.path.join(wd, 'cover_bg.jpg'); b = cv['bg']
    run(f'ffmpeg -loglevel error -y -ss {b["t"]} -i "{shots[b["shot"]]}" -frames:v 1 -vf "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,unsharp=5:5:0.7" "{bg}"')
    d = dict(cv); d['bg'] = bg; d.setdefault('template', 'cover_bottom.html')
    cj = os.path.join(wd, 'cover.json'); json.dump(d, open(cj, 'w'), ensure_ascii=False)
    png = os.path.join(wd, 'cover.png'); run(['node', os.path.join(HERE, 'render_cover.js'), cj, png])
    o = rel(cv.get('output', 'out/cover.jpg')); run(f'ffmpeg -loglevel error -y -i "{png}" -q:v 2 "{o}"')
    g = os.path.join(wd, 'cover_grid_check.jpg'); run(f'ffmpeg -loglevel error -y -i "{png}" -vf "crop=1080:1350:0:285,scale=300:-1" "{g}"')
    print(f'  cover: {o}  (4:5 grid crop preview: {g})')

if __name__ == '__main__': main()
