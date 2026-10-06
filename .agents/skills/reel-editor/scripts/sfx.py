#!/usr/bin/env python3
"""Synthesized SFX (no samples, no licensing issues) placed automatically from card timings (OUTPUT seconds).
Override per card with "sfx": false. Gain overall is set in plan.sfx_gain_db at mix time.
"""
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi
from scipy.io import wavfile
SR = 48000; rng = np.random.default_rng(3)
def env(n, a, d): t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def norm(x, db): return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (db / 20)
def sweep_noise(dur, f0, f1, bw=.6):
    n = int(dur * SR); x = rng.standard_normal(n); y = np.zeros(n); B = 256; zi = None
    for i in range(0, n, B):
        f = f0 * (f1 / f0) ** (i / n); sos = butter(2, [f * (1 - bw / 2), min(f * (1 + bw / 2), SR / 2 - 100)], 'band', fs=SR, output='sos')
        if zi is None: zi = sosfilt_zi(sos) * 0
        y[i:i + B], zi = sosfilt(sos, x[i:i + B], zi=zi)
    return y
def boom():
    n = int(.9 * SR); t = np.arange(n) / SR; f = 45 + 110 * np.exp(-t * 9)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .28)
    click = lp(rng.standard_normal(n), 3000) * env(n, .0005, .012); tail = lp(rng.standard_normal(n), 900) * env(n, .005, .18) * .35
    return norm(np.tanh(1.6 * (body + .6 * click + tail)), -3)
def whoosh(d=.42, up=True):
    n = int(d * SR); y = sweep_noise(d, 500, 4500) if up else sweep_noise(d, 3500, 400)
    t = np.arange(n) / n; return norm(y * np.sin(np.pi * t ** (.7 if up else 1.3)) ** 2, -8)
def pop(f0=900, f1=320):
    n = int(.09 * SR); t = np.arange(n) / SR; f = f1 + (f0 - f1) * np.exp(-t * 60)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .001, .03)
    return norm(s + .15 * hp(rng.standard_normal(n), 3000) * env(n, .0003, .004), -9)
def click():
    n = int(.025 * SR); s = bp(rng.standard_normal(n), 1800, 7000) * env(n, .0002, .004)
    s += np.sin(2 * np.pi * rng.uniform(1800, 2400) * np.arange(n) / SR) * env(n, .0002, .003) * .4
    return norm(s, -20 - rng.uniform(0, 4))
def ding():
    n = int(1.4 * SR); t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, a, k in [(1318.5, 1, 3), (1975.5, .5, 4), (2637, .25, 6), (659.25, .3, 3)])
    s2 = np.zeros(n); o = int(.09 * SR); t2 = t[:n - o]
    s2[o:] = sum(a * np.sin(2 * np.pi * f * t2) * np.exp(-t2 * k) for f, a, k in [(1760, 1, 2.6), (2637, .4, 4)])
    return norm((s + s2) * np.minimum(1, t / .004), -9)
def glitch():
    n = int(.3 * SR); x = np.zeros(n)
    for st, ln, f in [(0, .05, 180), (.08, .04, 90), (.15, .07, 260)]:
        a = int(st * SR); b = a + int(ln * SR); tt = np.arange(b - a) / SR
        x[a:b] = (np.sign(np.sin(2 * np.pi * f * tt)) * .5 + np.round(rng.standard_normal(b - a) * 3) / 6) * np.hanning(b - a) ** .3
    return norm(lp(x, 6000), -12)
def thud():
    n = int(.5 * SR); t = np.arange(n) / SR; f = 70 + 60 * np.exp(-t * 20)
    return norm(np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, .002, .12)) + .3 * lp(rng.standard_normal(n), 1500) * env(n, .0005, .02), -6)
def swipe():
    y = sweep_noise(.32, 1200, 5000, .5); t = np.linspace(0, 1, len(y)); return norm(y * np.sin(np.pi * t) ** 1.5, -12)
def buzz():
    n = int(.36 * SR); x = np.zeros(n)
    for st in (0, .18):
        a = int(st * SR); b = a + int(.13 * SR); tt = np.arange(b - a) / SR; x[a:b] = (2 * ((140 * tt) % 1) - 1) * np.hanning(b - a) ** .2
    return norm(lp(x, 2200), -17)

def build(cards, total, path):
    mix = np.zeros(int((total + 2) * SR))
    def put(s, t, g=0):
        a = int(max(0, t) * SR); b = min(len(mix), a + len(s))
        if a < len(mix): mix[a:b] += s[:b - a] * 10 ** (g / 20)
    for c in cards:
        if c.get('sfx') is False: continue
        ty, a = c['type'], c['start']
        if ty == 'hook':
            put(boom(), a); put(whoosh(.3), a, -4)
            if c.get('line2'): put(boom(), a + .74, -4); put(glitch(), a + .95, -2)
            if c.get('tag'): put(pop(1200, 500), a + 1.4, -6)
        elif ty == 'big':
            put(thud() if c.get('underline') else pop(), a)
            if c.get('sub'): put(whoosh(.5, False), c.get('sub_at', a + .5), -6)
        elif ty == 'chips':
            for i, it in enumerate(c['items']): put(pop(800 + 150 * i, 320 + 60 * i), it['at'])
        elif ty == 'strike':
            put(pop(700, 250), a, -2); s = c.get('strike_at', a + .6); put(swipe(), s); put(buzz(), s + .25)
        elif ty == 'list':
            for it in c['items']: put(pop(1000, 600), it['at'], -4)
        elif ty == 'scene_timeline':
            put(whoosh(), a - .12)
            for i, b in enumerate(c['badges']): put(pop(800 + 150 * i, (800 + 150 * i) * .4), b['at'])
            if c.get('end_whip'): put(whoosh(.35, False), c['end'] - .23, -2)
        elif ty == 'scene_prompt':
            put(whoosh(), a - .12)
            if c.get('delete_text'):
                n = len(c['delete_text'])
                for i in range(n): put(click(), c['delete_start'] + i * (c['delete_end'] - c['delete_start']) / n)
            for ln in c['lines']:
                put(pop(1000, 600), ln['at'], -6)
                for j in range(len(ln['text'])): put(click(), ln['at'] + j * .055)
            if c.get('send_at') is not None: put(ding(), c['send_at'])
            if c.get('end_whip'): put(whoosh(.35, False), c['end'] - .23, -2)
        elif ty == 'endcard':
            put(whoosh(), a - .12); put(pop(900, 400), a + .25, -4); put(pop(1100, 500), a + .45, -4); put(pop(1300, 600), a + .8, -2)
    mix = np.tanh(mix * 1.1) / 1.1
    wavfile.write(path, SR, (np.stack([mix, mix], 1) * 32767 * .95).astype(np.int16))

# ---- extra sounds used by the drama flow ----
def _t(d): return np.arange(int(d * SR)) / SR
def tick():
    t = _t(.04); return norm(bp(rng.standard_normal(len(t)), 2500, 7000) * np.exp(-t * 300) + np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 400) * .5, -24)
def knock():
    t = _t(.18); body = np.sin(2 * np.pi * (140 + 80 * np.exp(-t * 60)) * t) * np.exp(-t * 35)
    return norm(np.tanh(2 * (body + .5 * lp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 90))), -8)
def drip():
    t = _t(.25); f = 900 + 1400 * np.exp(-t * 40); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22) * np.minimum(1, t / .002), -16)
def tape_stop():
    t = _t(.45); f = 220 * (1 - t / .45) ** 2 + 30
    y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .3 + np.sin(2 * np.pi * np.cumsum(f * 2) / SR) * .5
    return norm(lp(y * np.linspace(1, .2, len(t)), 2500), -14)
def ping():
    t = _t(.5); y = np.zeros_like(t)
    for st, f in ((0, 1568), (.11, 2093)):
        tt = t - st; m = tt >= 0; y[m] += np.sin(2 * np.pi * f * tt[m]) * np.exp(-tt[m] * 9) * np.minimum(1, tt[m] / .004)
    return norm(y, -14)
def pad(d):
    t = _t(d); y = sum(np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * .13 * t) * .5) for f in (55, 82.4, 110.2, 164.8))
    return norm(lp(y, 900) * np.minimum(1, t / 2.5) * np.minimum(1, (d - t) / .25) * (0.6 + 0.4 * t / d), -30)
def plucks(d):
    t = _t(d); y = np.zeros_like(t); notes = [523.25, 659.25, 783.99, 659.25, 587.33, 783.99, 880.0, 783.99]
    for k, st in enumerate(np.arange(.2, max(.3, d - .8), .9)):
        f = notes[k % len(notes)]; i = int(st * SR); tt = t[:len(t) - i]
        y[i:] += (np.sin(2 * np.pi * f * tt) + .3 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 3.2) * np.minimum(1, tt / .005)
    return norm(lp(y, 3000) * np.minimum(1, (d - t) / 1.2), -31)
SOUNDS = {'boom': boom, 'whoosh': lambda: whoosh(.42, True), 'whoosh_up': lambda: whoosh(.3, True), 'whoosh_down': lambda: whoosh(.45, False),
          'pop': pop, 'click': click, 'ding': ding, 'glitch': glitch, 'thud': thud, 'swipe': swipe, 'buzz': buzz,
          'tick': tick, 'knock': knock, 'drip': drip, 'tape_stop': tape_stop, 'ping': ping}
