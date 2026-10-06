#!/usr/bin/env python3
"""Draft a plan.json from transcript.json: tight full-length edit with subtitles. The agent then reviews/edits it.

Usage: python suggest_plan.py --workdir work --source raw.mp4 --out plan.json [--drop 94.6-99.5 --drop 182-185]
  --drop A-B     remove words whose start is in [A,B] (retakes; decide them by reading transcript.txt + unmatched.txt)
  --add FILE     range_*.json from `transcribe.py --range`; replaces transcript words inside that range (repeatable)
  --para T       start a new paragraph (longer pause) at source time T (repeatable)
  --fix 錯=對    subtitle text replacement (repeatable), e.g. --fix 簡介點=剪接點
Clips: words grouped when gap < 0.8s; pads 0.15/0.25s (0.30/0.45s at paragraph breaks).
Subtitles: split at punctuation / pauses, max 16 chars per line, no trailing punctuation.
Also prints retake suspects: repeated openings within 15s.
"""
import argparse, json, re
try:
    import jieba; jieba.setLogLevel(60)
    from opencc import OpenCC; _t2s = OpenCC('t2s')
    def word_bounds(t):  # jieba's dictionary is Simplified: segment a Simplified copy, map offsets back
        st = _t2s.convert(t); st = st if len(st) == len(t) else t
        b, i = set(), 0
        for w in jieba.cut(st): i += len(w); b.add(i)
        return b
except ImportError:  # fallback: any position
    def word_bounds(t): return set(range(len(t) + 1))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--workdir', default='work'); ap.add_argument('--source', required=True); ap.add_argument('--out', default='plan.json')
    ap.add_argument('--drop', action='append', default=[]); ap.add_argument('--add', action='append', default=[]); ap.add_argument('--para', action='append', type=float, default=[])
    ap.add_argument('--fix', action='append', default=[]); ap.add_argument('--maxlen', type=int, default=16)
    a = ap.parse_args()
    T = json.load(open(f'{a.workdir}/transcript.json'))
    W = [dict(w=w['w'], s=w['s'], e=w['e']) for s in T for w in s['words']]
    for d in a.drop:
        x, y = map(float, d.split('-')); W = [w for w in W if not (x <= w['s'] <= y)]
    for f in a.add:
        R = json.load(open(f)); r0, r1 = R['range']
        W = [w for w in W if not (r0 <= w['s'] < r1)] + R['words']
    W.sort(key=lambda w: w['s'])
    # retake suspects: same first 4 chars repeated within 15s
    txts = [(s['start'], re.sub(r'\W', '', s['text'])) for s in T]
    for i in range(len(txts)):
        for j in range(i + 1, len(txts)):
            if txts[j][0] - txts[i][0] > 15: break
            if len(txts[i][1]) >= 4 and txts[i][1][:4] == txts[j][1][:4]:
                print(f'RETAKE? {txts[i][0]:.2f} and {txts[j][0]:.2f}: "{txts[i][1][:12]}"')
    U = [[W[0]]]
    for w in W[1:]:
        brk = any(U[-1][-1]['e'] < p <= w['s'] + .05 for p in a.para)
        (U[-1].append(w) if w['s'] - U[-1][-1]['e'] < 0.8 and not brk else U.append([w]))
    isp = lambda t: any(abs(t - p) < .35 for p in a.para)
    clips = []
    for i, u in enumerate(U):
        ps = i == 0 or isp(u[0]['s']); pe = i == len(U) - 1 or isp(U[i + 1][0]['s'])
        s = u[0]['s'] - (.30 if ps else .15); e = u[-1]['e'] + (.45 if pe else .25)
        if clips: s = max(s, clips[-1]['end'])
        if i < len(U) - 1: e = min(e, U[i + 1][0]['s'] - .05)
        clips.append({'start': round(max(0, s), 3), 'end': round(e, 3), 'zoom': 1.0})
    fixes = [f.split('=', 1) for f in a.fix]
    def fx(t):
        for x, y in fixes: t = t.replace(x, y)
        return re.sub(r'[，,。、]+$', '', t).replace(',', '，').replace('?', '？')
    vlen = lambda t: len(re.sub(r'[，,。？?、！!]', '', t.replace('AI', 'A')))
    def split(ph):
        t = ''.join(x['w'] for x in ph)
        if vlen(t) <= a.maxlen or len(ph) < 2: return [ph]
        ok = word_bounds(t)
        cands = [k for k in range(1, len(ph)) if len(''.join(x['w'] for x in ph[:k])) in ok] or list(range(1, len(ph)))
        k = min(cands, key=lambda k: abs(vlen(''.join(x['w'] for x in ph[:k])) - vlen(t) / 2))
        return split(ph[:k]) + split(ph[k:])
    subs = []
    for u in U:
        phs = [[]]
        for w in u:
            if phs[-1] and w['s'] - phs[-1][-1]['e'] > .5: phs.append([])
            phs[-1].append(w)
            if re.search(r'[，,。？?！!、]$', w['w']): phs.append([])
        for ph in phs:
            if ph:
                for q in split(ph): subs.append({'text': fx(''.join(x['w'] for x in q)), 'start': round(q[0]['s'], 2), 'end': round(q[-1]['e'], 2)})
    plan = {'source': a.source, 'workdir': a.workdir, 'output': 'out/edit.mp4', 'size': [1080, 1920], 'fps': 30,
            'zoom_center_y': 900, 'opener_fx': False, 'sfx': True, 'loudness': -14,
            'clips': clips, 'subtitles': subs, 'cards': []}
    json.dump(plan, open(a.out, 'w'), ensure_ascii=False, indent=1)
    dur = sum(c['end'] - c['start'] for c in clips)
    print(f'{len(clips)} clips -> {dur:.1f}s, {len(subs)} subtitle lines -> {a.out}')
    for s in subs: print(f"  {s['start']:7.2f}-{s['end']:7.2f} {s['text']}")

if __name__ == '__main__': main()
