#!/usr/bin/env python3
"""Render a talking-head reel from plan.json (see references/plan-schema.md).

Usage:
  python build.py plan.json                 # full render + checks
  python build.py plan.json --preview 1.2,8.5,20   # only render card stills at OUTPUT times and composite them over video -> workdir/preview.jpg
  python build.py plan.json --cover         # also render cover (plan.cover)

Pipeline (each step is a separate ffmpeg pass on purpose -- see references/pitfalls.md):
  1 cut each clip separately (accurate seek, zoom crop, 20-30ms audio fades) -> concat
  2 pad tail for endcard (tpad/apad)
  3 opener FX on first 2s only (punch zoom + shake + RGB split)
  4 motion cards: Chromium renders transparent PNG per frame -> overlay
  5 subtitles (ASS) + loudnorm voice + synthesized SFX -> final H.264/AAC
  6 checks: frame count, duration, loudness, freeze report, contact sheet
"""
import argparse, json, os, re, subprocess, sys, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

def run(cmd, **kw):
    r = subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=True, text=True, **kw)
    if r.returncode: sys.exit(f'FAILED: {cmd if isinstance(cmd,str) else " ".join(cmd)}\n{r.stderr[-2000:]}')
    return r

def probe_frames(f):
    return int(run(f'ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 "{f}"').stdout.strip() or 0)

class Timeline:
    def __init__(s, clips):
        s.clips = clips; s.offs = []; o = 0
        for c in clips: s.offs.append(o); o += c['end'] - c['start']
        s.total = o
    def T(s, src):
        """source time -> output time (clamped to nearest kept clip)"""
        best = None
        for c, of in zip(s.clips, s.offs):
            if c['start'] - 0.01 <= src <= c['end'] + 0.01: return of + max(0, src - c['start'])
            cand = (abs(src - c['start']), of) if src < c['start'] else (abs(src - c['end']), of + c['end'] - c['start'])
            best = cand if best is None or cand[0] < best[0] else best
        return best[1]

TIME_KEYS = ('start', 'end', 'at', 'sub_at', 'strike_at', 'delete_start', 'delete_end', 'send_at')

def map_cards(cards, tl, speech_total):
    out = []
    for c in cards:
        c = json.loads(json.dumps(c))
        if c['type'] == 'endcard':
            c['start'] = speech_total + 0.0; out.append(c); continue
        if c.get('time_base') == 'output':  # already in output seconds
            pass
        else:
            for k in TIME_KEYS:
                if c.get(k) is not None: c[k] = round(tl.T(c[k]), 3)
            for lst in ('items', 'badges', 'lines'):
                for it in c.get(lst, []) or []:
                    if 'at' in it: it['at'] = round(tl.T(it['at']), 3)
        if c.get('end') is None: c['end'] = speech_total
        if c['type'].startswith('scene_'): c['end_whip'] = c['end'] < speech_total - 0.1
        out.append(c)
    return out

def ass_time(t):
    return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"

def write_ass(path, subs, tl, style, end_total):
    cues = [[tl.T(s['start']), tl.T(s['end']), s['text']] for s in subs if not s.get('hide')]
    for i in range(len(cues) - 1):
        if cues[i + 1][0] - cues[i][1] < 0.6: cues[i][1] = cues[i + 1][0]
    st = {'font': 'Noto Sans CJK TC', 'size': 66, 'outline': 6, 'margin_v': 520}; st.update(style or {})
    head = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1080", "PlayResY: 1920", "WrapStyle: 2", "", "[V4+ Styles]",
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
            f"Style: Sub,{st['font']},{st['size']},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,{st['outline']},2,2,70,70,{st['margin_v']},1",
            "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
    ev = [f"Dialogue: 1,{ass_time(a)},{ass_time(min(b,end_total))},Sub,,0,0,0,,{t}" for a, b, t in cues]
    open(path, 'w', encoding='utf-8').write('\n'.join(head + ev) + '\n')
    return cues

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('plan'); ap.add_argument('--preview'); ap.add_argument('--cover', action='store_true')
    ap.add_argument('--skip-cut', action='store_true', help='reuse workdir/joined.mkv')
    a = ap.parse_args()
    P = json.load(open(a.plan)); base = os.path.dirname(os.path.abspath(a.plan))
    rel = lambda p: p if os.path.isabs(p) else os.path.join(base, p)
    src, wd = rel(P['source']), rel(P.get('workdir', 'work')); out = rel(P.get('output', 'out/reel.mp4'))
    W, H = P.get('size', [1080, 1920]); fps = P.get('fps', 30); cy = P.get('zoom_center_y', H * 0.47)
    os.makedirs(wd, exist_ok=True); os.makedirs(os.path.dirname(out), exist_ok=True)
    tl = Timeline(P['clips']); speech = tl.total
    endc = next((c for c in P.get('cards', []) if c['type'] == 'endcard'), None)
    tail = endc.get('duration', 2.6) if endc else 0
    total = speech + tail
    cards = map_cards(P.get('cards', []), tl, speech)
    cj = os.path.join(wd, 'cards_out.json')
    json.dump({'total': total, 'fps': fps, 'cards': cards}, open(cj, 'w'), ensure_ascii=False, indent=1)
    ass = os.path.join(wd, 'subs.ass'); cues = write_ass(ass, P.get('subtitles', []), tl, P.get('subtitle_style'), total)
    joined = os.path.join(wd, 'joined.mkv')

    # 1. cut
    if not (a.skip_cut and os.path.exists(joined)) and not (a.preview and os.path.exists(joined)):
        cd = os.path.join(wd, 'clips'); shutil.rmtree(cd, ignore_errors=True); os.makedirs(cd)
        lst = []
        for i, c in enumerate(P['clips']):
            d = c['end'] - c['start']; z = c.get('zoom', 1.0)
            cw, ch = int(W / z) // 2 * 2, int(H / z) // 2 * 2
            vf = (f"fps={fps},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
                  f"crop={cw}:{ch}:{(W-cw)//2}:{max(0,min(H-ch,int(cy-ch/2)))},scale={W}:{H}:flags=lanczos,setsar=1")
            f = os.path.join(cd, f'c{i:03d}.mkv')
            run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f"{c['start']}", '-i', src, '-t', f'{d:.3f}', '-vf', vf,
                 '-af', f'afade=t=in:d=0.02,afade=t=out:st={max(0,d-0.03):.3f}:d=0.03', '-c:v', 'libx264', '-preset', 'veryfast',
                 '-crf', '14', '-pix_fmt', 'yuv420p', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', f])
            lst.append(f"file '{f}'")
        open(os.path.join(wd, 'list.txt'), 'w').write('\n'.join(lst) + '\n')
        run(f'ffmpeg -loglevel error -y -f concat -safe 0 -i "{wd}/list.txt" -c copy "{joined}"')
        print(f'[cut] {len(P["clips"])} clips -> {speech:.2f}s')

    if a.preview:
        ts = a.preview
        run(['node', os.path.join(HERE, 'render_cards.js'), cj, os.path.join(wd, 'stills'), ts])
        ims = []
        for t in ts.split(','):
            o = os.path.join(wd, f'pv_{t}.jpg'); st = os.path.join(wd, 'stills', f'still_{float(t)}.png')
            if not os.path.exists(st): st = os.path.join(wd, 'stills', f'still_{t}.png')
            tt = min(float(t), speech - 0.05)
            run(f'ffmpeg -loglevel error -y -ss {tt} -i "{joined}" -i "{st}" -filter_complex "[0:v][1:v]overlay,scale=270:-1" -frames:v 1 "{o}"')
            ims.append(o)
        run('ffmpeg -loglevel error -y ' + ' '.join(f'-i "{i}"' for i in ims) + f' -filter_complex hstack={len(ims)} "{wd}/preview.jpg"' if len(ims) > 1 else f'cp "{ims[0]}" "{wd}/preview.jpg"')
        print(f'preview -> {wd}/preview.jpg'); return

    # 2. tail pad for endcard
    stage = joined
    if tail:
        ext = os.path.join(wd, 'ext.mkv')
        run(f'ffmpeg -loglevel error -y -i "{joined}" -vf "tpad=stop_mode=clone:stop_duration={tail+0.1}" -af "apad=pad_dur={tail+0.1}" -c:v libx264 -preset veryfast -crf 12 -c:a pcm_s16le "{ext}"')
        stage = ext
    # 3. opener fx (first 2s only; zoompan on the whole stream drops frames when combined with overlay)
    if P.get('opener_fx'):
        Z = "1+0.30*exp(-it*6)+gte(it,0.75)*0.12*exp(-(it-0.75)*8)"
        SX = "lt(it,1.8)*(18*exp(-it*6)*sin(it*70)+gte(it,0.75)*14*exp(-(it-0.75)*7)*sin((it-0.75)*75))"
        vfx = (f"zoompan=z='{Z}':x='iw/2-(iw/zoom/2)+({SX})':y='ih/2-(ih/zoom/2)+0.6*({SX})':d=1:s={W}x{H}:fps={fps},"
               f"rgbashift=rh=-14:bh=14:enable='between(t,0,0.1)+between(t,0.95,1.25)'")
        zp = os.path.join(wd, 'zp.mkv'); n = 2 * fps
        run(f'ffmpeg -loglevel error -y -i "{stage}" -filter_complex "[0:v]split[a][b];[a]trim=end_frame={n},setpts=PTS-STARTPTS,{vfx}[h];[b]trim=start_frame={n},setpts=PTS-STARTPTS[t];[h][t]concat=n=2:v=1:a=0[v]" -map "[v]" -map 0:a -c:v libx264 -preset veryfast -crf 12 -c:a copy "{zp}"')
        stage = zp
    # 4. cards
    if cards:
        fd = os.path.join(wd, 'frames'); shutil.rmtree(fd, ignore_errors=True)
        r = run(['node', os.path.join(HERE, 'render_cards.js'), cj, fd]); print('[cards]', r.stdout.strip())
        ov = os.path.join(wd, 'ov.mkv')
        run(f'ffmpeg -loglevel error -y -i "{stage}" -framerate {fps} -i "{fd}/%05d.png" -filter_complex "[0:v][1:v]overlay=0:0:eof_action=pass,format=yuv420p[v]" -map "[v]" -map 0:a -c:v libx264 -preset veryfast -crf 12 -c:a copy "{ov}"')
        stage = ov
    # 5. subtitles + audio
    fx_in, fc_audio = '', f"[0:a]loudnorm=I={P.get('loudness',-14)}:TP=-1.5:LRA=9,aresample=48000,alimiter=limit=0.79:level=false[a]"
    if P.get('sfx', True) and cards:
        import sfx
        wav = os.path.join(wd, 'sfx.wav'); sfx.build(cards, total, wav)
        fx_in = f'-i "{wav}"'
        fc_audio = (f"[0:a]loudnorm=I={P.get('loudness',-14)}:TP=-1.5:LRA=9,aresample=48000[vo];[1:a]volume={P.get('sfx_gain_db',-5)}dB[fx];"
                    f"[vo][fx]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.79:level=false[a]")
    assp = ass.replace('\\', '/').replace(':', '\\:')
    run(f'ffmpeg -loglevel error -y -i "{stage}" {fx_in} -filter_complex "{fc_audio};[0:v]ass=\'{assp}\'[v]" -map "[v]" -map "[a]" -t {total:.3f} -r {fps} '
        f'-c:v libx264 -preset slow -crf 20 -maxrate 6000k -bufsize 12000k -profile:v high -pix_fmt yuv420p -c:a aac -b:a 160k -ar 48000 -movflags +faststart "{out}"')
    # 6. checks
    nf = probe_frames(out); exp = round(total * fps)
    loud = run(f'ffmpeg -hide_banner -i "{out}" -af ebur128=peak=true -f null -').stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', loud); pk = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', loud)
    fr = run(f'ffmpeg -hide_banner -i "{out}" -vf freezedetect=n=0.001:d=1.0 -map 0:v -f null -').stderr
    frz = re.findall(r'freeze_start: ([\d.]+)', fr)
    keyts = {0.3, round(total - .3, 2)} | {round(c['start'] + .6, 2) for c in cards if c['start'] + .6 < total}
    if len(keyts) < 6: keyts |= {round(total * k / 7, 2) for k in range(1, 7)}
    keyts = sorted(keyts)[:10]
    ims = []
    for t in keyts:
        o = os.path.join(wd, f'cs_{t}.jpg'); run(f'ffmpeg -loglevel error -y -i "{out}" -ss {t} -frames:v 1 -vf scale=216:-1 "{o}"'); ims.append(o)
    sheet = os.path.join(wd, 'contact.jpg')
    if len(ims) > 1: run('ffmpeg -loglevel error -y ' + ' '.join(f'-i "{i}"' for i in ims) + f' -filter_complex hstack={len(ims)} "{sheet}"')
    print(f'\n[done] {out}\n  duration {total:.2f}s, frames {nf} (expected ~{exp})' + ('  <-- MISMATCH, check for dropped/frozen video' if abs(nf - exp) > 5 else ''))
    print(f'  loudness {I[-1] if I else "?"} LUFS, true peak {pk[-1] if pk else "?"} dBFS')
    print(f'  freezes >1s at: {", ".join(frz) or "none"}  (expected only during static scenes/typing pauses)')
    print(f'  contact sheet: {sheet}  (times {keyts})  size {os.path.getsize(out)/1e6:.1f} MB')
    if a.cover and P.get('cover'): make_cover(P['cover'], src, wd, rel, run)

def make_cover(cv, src, wd, rel, run):
    bg = os.path.join(wd, 'cover_bg.jpg')
    run(f'ffmpeg -loglevel error -y -ss {cv.get("frame",1.0)} -i "{src}" -frames:v 1 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" "{bg}"')
    cj = os.path.join(wd, 'cover.json'); d = {k: cv.get(k) for k in ('tag', 't1', 't2', 'st')}; d['bg'] = bg
    json.dump(d, open(cj, 'w'), ensure_ascii=False)
    png = os.path.join(wd, 'cover.png'); run(['node', os.path.join(HERE, 'render_cover.js'), cj, png])
    outp = rel(cv.get('output', 'out/cover.jpg')); run(f'ffmpeg -loglevel error -y -i "{png}" -q:v 2 "{outp}"')
    grid = os.path.join(wd, 'cover_grid_check.jpg'); run(f'ffmpeg -loglevel error -y -i "{png}" -vf "crop=1080:1350:0:285,scale=300:-1" "{grid}"')
    print(f'  cover: {outp}  (4:5 grid crop preview: {grid})')

if __name__ == '__main__': main()
