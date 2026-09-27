"""Original score (guzheng, dizi, drums, gongs), sound effects, narration ducking and loudness
normalisation. All sounds are synthesised here; event times mirror render/scenes.js."""
import json, numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import resample_poly, butter, sosfilt, fftconvolve
from scipy.ndimage import minimum_filter1d

SR = 48000
TL = json.load(open("build/timeline.json"))
T = TL["duration"]; N = int(np.ceil(T * SR)) + SR
SC = {s["id"]: s for s in TL["scenes"]}
rs = np.random.RandomState(7)

def st(sid): return SC[sid]["start"]
def dur(sid): return SC[sid]["end"] - SC[sid]["start"]
def L(sid, i): return SC[sid]["lines"][i]["start"] - SC[sid]["start"]

music = np.zeros((N, 2)); sfx = np.zeros((N, 2)); amb = np.zeros((N, 2))
def put(buf, t, x, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[:N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414

def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)
def env(n, a, r):
    e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na); nr = min(n, int(r * SR)); e[-nr:] *= np.linspace(1, 0, nr) ** 2; return e
def tsec(d): return np.arange(int(d * SR)) / SR

# ---------------- instruments ----------------
def hz(midi): return 440.0 * 2 ** ((midi - 69) / 12)
def guzheng(f, d=2.5, bright=0.5):
    """Karplus-Strong plucked string with a touch of body resonance."""
    n = int(d * SR); P = max(2, int(SR / f)); buf = rs.uniform(-1, 1, P)
    buf = lp(buf, 2000 + 5000 * bright, 1) if P > 8 else buf
    out = np.zeros(n); decay = 0.4985 + 0.0012 * min(1, 200 / f)
    b = buf.copy(); idx = 0
    for i in range(n):
        v = b[idx]; nxt = b[(idx + 1) % P]; b[idx] = decay * (v + nxt); out[i] = v; idx = (idx + 1) % P
    t = tsec(d)[:n]
    out += 0.25 * np.sin(2 * np.pi * f * t) * np.exp(-t * 2.5)
    return out * env(n, 0.002, 0.3) * 0.5
_gz = {}
def gz(m, d=2.5, bright=0.5):
    k = (m, round(d, 2), bright)
    if k not in _gz: _gz[k] = guzheng(hz(m), d, bright)
    return _gz[k]
def dizi(m, d, vib=5.5, breath=0.12, bend=0.0):
    t = tsec(d); f = hz(m) * (1 + 0.006 * np.sin(2 * np.pi * vib * t) * np.clip(t / 0.35, 0, 1))
    if bend: f = f * (1 + bend * np.exp(-t * 18))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.12 * np.sin(3 * ph) + 0.05 * np.sin(4 * ph)
    nz = bp(rs.randn(len(t)), hz(m) * 0.8, min(hz(m) * 3, 20000)) * breath
    return (x * 0.5 + nz) * env(len(t), 0.06, min(0.35, d * 0.4)) * 0.4
def drum(d=0.9, f0=110, f1=52, g=1.0):
    t = tsec(d); f = f1 + (f0 - f1) * np.exp(-t * 18); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 5.5) + lp(rs.randn(len(t)), 900) * np.exp(-t * 40) * 0.5) * g
def gong(d=4.0, base=210, g=1.0, glide=-0.06):
    t = tsec(d); x = np.zeros(len(t))
    for k, (m, a, dec) in enumerate([(1, 1, 0.9), (1.52, 0.6, 1.3), (2.13, 0.45, 1.8), (2.9, 0.3, 2.4), (3.7, 0.22, 3.2), (4.9, 0.12, 4)]):
        f = base * m * (1 + glide * (1 - np.exp(-t * 1.5))) if k == 0 else base * m
        x += a * np.sin(2 * np.pi * np.cumsum(np.full(len(t), 1.0) * f) / SR + k) * np.exp(-t * dec)
    x += hp(rs.randn(len(t)), 2500) * np.exp(-t * 12) * 0.25
    return x * np.clip(t / 0.004, 0, 1) * 0.35 * g
def small_gong(g=1.0): return gong(1.8, 620, g, glide=0.12)
def cymbal(d=1.2, g=1.0):
    t = tsec(d); return hp(rs.randn(len(t)), 4000) * np.exp(-t * 4) * 0.35 * g
def woodblock(f=880, g=1.0):
    t = tsec(0.25); return (np.sin(2 * np.pi * f * t) * np.exp(-t * 38) + 0.3 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t * 60)) * 0.5 * g
def chime(m, g=1.0, d=3.0):  # qing (磬) / bright bell
    t = tsec(d); f = hz(m); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 2) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 4)) * np.exp(-t * 1.4) * 0.25 * g
def drone(m, d, g=1.0):
    t = tsec(d); x = sum(np.sin(2 * np.pi * hz(m) * k * t * (1 + 0.0015 * np.sin(t * 0.7 * k))) / k ** 1.6 for k in (1, 2, 3, 4))
    return lp(x, 1400) * env(len(t), 1.5, 2.0) * 0.12 * g

# D gong-mode pentatonic
SCALE = [0, 2, 4, 7, 9]  # D E F# A B relative to D
def deg(i, base=62):  # scale degree -> midi
    o, k = divmod(i, 5); return base + 12 * o + SCALE[k]
MOTIF = [(0, 1), (1, 1), (3, 1.5), (4, 0.5), (3, 1), (2, 1), (1, 1), (0, 2)]  # Mazu leitmotif (degree, beats)

def play_melody(t0, notes, beat, inst='dizi', base=74, g=1.0, pan=0.1):
    t = t0
    for d_, b in notes:
        if d_ is not None:
            m = deg(d_, base)
            if inst == 'dizi': put(music, t, dizi(m, b * beat * 1.05, bend=0.02 if rs.rand() < 0.3 else 0), 0.55 * g, pan)
            else: put(music, t, gz(m, max(1.2, b * beat * 2), 0.6), 0.8 * g, pan)
        t += b * beat
    return t
def arpeggio(t0, t1, beat, degs, base=50, g=1.0, pan=-0.25, bright=0.45):
    t, i = t0, 0
    while t < t1:
        put(music, t, gz(deg(degs[i % len(degs)], base), 2.5, bright), 0.55 * g, pan + 0.1 * np.sin(i)); t += beat; i += 1
def gliss(t0, up=True, n=10, g=1.0, base=55):
    for k in range(n):
        i = k if up else n - 1 - k
        put(music, t0 + k * 0.045, gz(deg(i, base), 2.2, 0.7), 0.45 * g * (0.6 + 0.4 * k / n), -0.3 + 0.6 * k / n)
def drum_pattern(t0, t1, beat, pat, g=1.0):
    t, i = t0, 0
    while t < t1:
        c = pat[i % len(pat)]
        if c == 'B': put(music, t, drum(0.9, 120, 55, 1.0), 0.9 * g, -0.1)
        elif c == 'b': put(music, t, drum(0.5, 160, 80, 0.6), 0.7 * g, 0.1)
        elif c == 'x': put(music, t, woodblock(1000), 0.35 * g, 0.35)
        elif c == 'c': put(music, t, cymbal(0.5), 0.5 * g, 0.3)
        t += beat; i += 1
def rand_melody(n, start=5, lo=2, hi=9, rests=0.15, lens=(1, 1, 2, 0.5, 0.5)):
    out, d_ = [], start
    for _ in range(n):
        d_ = int(np.clip(d_ + rs.choice([-2, -1, -1, 1, 1, 2, 0]), lo, hi))
        out.append((None if rs.rand() < rests else d_, rs.choice(lens)))
    return out

# ---------------- score, scene by scene ----------------
s = st('opening'); D = dur('opening')
put(music, s + 0.5, drone(38, D + 5.0), 1.0, 0)
arpeggio(s + 1.0, s + D, 0.75, [0, 2, 4, 5, 7, 5, 4, 2], base=50, g=0.8)
play_melody(s + 3.0, MOTIF, 0.7, 'dizi', base=74)
play_melody(s + 9.5, [(5, 1), (4, 1), (3, 2), (1, 1), (2, 1), (0, 3)], 0.7, 'dizi', base=74, g=0.9)

s = st('title')
gliss(s + 0.1, True, 12, 1.0)
put(music, s + 2.7, gong(5, 180, 1.0), 0.9, 0)
put(music, s + 2.7, drum(1.2, 90, 45), 1.0, 0)
play_melody(s + 3.0, [(7, 1), (5, 1), (4, 2)], 0.6, 'guzheng', base=62, g=0.8)

s = st('rain'); D = dur('rain')
put(music, s, drone(36, D + 2, 0.8), 1.0, 0)
for k, t_ in enumerate(np.arange(s + 1.0, s + D, 1.6)): put(music, t_, gz(deg([0, 3, 1, 4, 2, 0, 3, 1][k % 8], 38), 3.5, 0.3), 0.6, -0.3)
play_melody(s + L('rain', 1) + 0.8, [(3, 1), (4, 1), (5, 2), (7, 2), (5, 1), (4, 3)], 0.55, 'dizi', base=74, g=0.9)
put(music, s + 6.0, chime(86, 0.8), 1.0, 0.2); put(music, s + 6.3, chime(93, 0.5), 1.0, -0.2)

s = st('villages'); D = dur('villages')
put(music, s, drone(38, D + 2, 0.7), 1.0, 0)
arpeggio(s + 0.3, s + D, 0.42, [0, 2, 4, 2, 5, 4, 2, 4], base=50, g=0.75, pan=-0.3)
drum_pattern(s + 0.3, s + D - 0.5, 0.42, 'x.x.x.xx', 0.6)
play_melody(s + 1.5, rand_melody(18, 5), 0.42, 'guzheng', base=62, g=0.9, pan=0.25)

s = st('altar'); D = dur('altar')
put(music, s, drone(38, D + 2, 1.1), 1.0, 0); put(music, s, drone(45, D + 2, 0.6), 1.0, 0)
for t_ in (1.0, 4.6, L('altar', 1) + 0.4, 9.4): put(music, s + t_, chime(81, 0.9), 1.0, 0)
play_melody(s + 2.4, [(0, 2), (2, 1), (3, 1), (4, 2), (3, 2), (2, 3)], 0.7, 'dizi', base=74, g=0.75)

s = st('poe'); D = dur('poe')
put(music, s, drone(38, D + 1, 0.8), 1.0, 0)
for t_ in np.arange(s + 0.3, s + 2.2, 0.5): put(music, t_, drum(0.5, 80, 50, 0.5), 0.7, 0)
gliss(s + 3.45, True, 10, 0.9, base=62); put(music, s + 3.5, small_gong(1.0), 0.8, 0.2)
play_melody(s + 4.2, [(5, 1), (7, 1), (5, 1), (4, 2)], 0.45, 'dizi', base=74, g=0.9)

s = st('dawn'); D = dur('dawn')
put(music, s, drone(38, D + 2, 0.7), 1.0, 0)
for k, t_ in enumerate(np.arange(s + 0.8, s + D, 0.9)): put(music, t_, gz(deg([0, 4, 2, 5, 3, 7, 4, 2][k % 8], 50), 3.0, 0.35), 0.5, 0.3 * np.sin(k))
play_melody(s + 1.5, [(4, 2), (3, 1), (2, 1), (0, 2), (None, 1), (2, 1), (3, 1), (4, 1), (5, 3)], 0.65, 'dizi', base=74, g=0.75)
for i, t_ in enumerate(np.arange(s + D - 3.0, s + D, 0.12)): put(music, t_, drum(0.3, 140, 90, 0.3 + 0.7 * i / 25), 0.55, 0)  # roll into the procession

s = st('procession'); D = dur('procession')
drum_pattern(s, s + D + 0.2, 0.3, 'B.b.Bbb.B.b.Bcbb', 1.0)
for h in [0.6, 2.2, 3.8, 5.4, 7.0, 8.6, 10.2]: put(music, s + h, gong(2.5, 240, 0.9), 0.75, 0.3)
arpeggio(s, s + D, 0.3, [0, 2, 4, 5, 4, 2], base=62, g=0.6, bright=0.7)
play_melody(s + 0.6, rand_melody(26, 7, 4, 11, 0.05, (1, 1, 0.5, 0.5, 2)), 0.3, 'dizi', base=74, g=1.0)

s = st('crawl'); D = dur('crawl')
drum_pattern(s, s + D + 0.2, 0.3, 'B...b...B.b.b...', 0.8)
for h in (0.8, 3.2, 5.6): put(music, s + h, gong(2.5, 240, 0.7), 0.6, 0.3)
play_melody(s + 0.4, MOTIF + [(2, 1), (4, 2)], 0.45, 'dizi', base=74, g=0.9)

s = st('feast'); D = dur('feast')
drum_pattern(s, s + D, 0.25, 'x.xxx.x.', 0.7)
arpeggio(s, s + D, 0.25, [0, 2, 4, 7, 4, 2, 5, 4], base=62, g=0.65, pan=-0.3, bright=0.7)
play_melody(s + 0.5, rand_melody(22, 7, 5, 12, 0.05, (1, 1, 0.5, 0.5)), 0.25, 'guzheng', base=62, g=1.0, pan=0.3)
put(music, s + 3.3, small_gong(0.7), 0.6, 0)

s = st('transfer'); D = dur('transfer')
put(music, s, drone(38, D + 2, 0.8), 1.0, 0)
for i, t_ in enumerate(np.arange(s + 0.2, s + 5.6, 0.16)): put(music, t_, drum(0.35, 150, 80, 0.2 + 0.8 * (i / 34) ** 2), 0.55, 0)
put(music, s + 5.6, drum(1.4, 100, 45, 1.2), 1.0, 0); put(music, s + 6.2, gong(5, 200, 1.0), 0.9, 0)
gliss(s + 6.2, True, 12, 0.9, base=55)

s = st('heritage'); D = dur('heritage')
put(music, s, drone(38, D + 2, 0.9), 1.0, 0)
arpeggio(s + 0.2, s + D, 0.6, [0, 4, 7, 9, 7, 4], base=50, g=0.65)
play_melody(s + 1.2, MOTIF, 0.6, 'dizi', base=74)
play_melody(s + 7.5, [(7, 1), (5, 1), (4, 1), (3, 1), (4, 2), (2, 1), (1, 1), (0, 3)], 0.6, 'guzheng', base=74, g=0.85, pan=0.3)
put(music, s + 3.8, drum(1.0, 90, 45, 0.9), 1.0, 0)

s = st('closing'); D = dur('closing')
put(music, s, drone(38, D + 6, 1.1), 1.0, 0); put(music, s, drone(45, D + 6, 0.5), 1.0, 0)
arpeggio(s + 0.3, s + D + 1, 0.55, [0, 2, 4, 7, 9, 7, 4, 2], base=50, g=0.7)
t_ = play_melody(s + 1.0, MOTIF, 0.75, 'dizi', base=74, g=1.05)
t_ = play_melody(t_ + 0.4, [(5, 1), (7, 1), (9, 2), (7, 1), (5, 1), (4, 2), (3, 1), (2, 1), (1, 2)], 0.75, 'dizi', base=74, g=1.05)
play_melody(t_ + 0.3, MOTIF, 0.8, 'guzheng', base=74, g=0.9, pan=0.25)

s = st('end')
put(music, s + 0.3, gong(6, 170, 0.8), 0.7, 0)
for k, d_ in enumerate([0, 4, 7, 9, 12]): put(music, s + 0.4 + k * 0.12, gz(deg(d_, 50), 5.0, 0.4), 0.6, -0.4 + k * 0.2)
play_melody(s + 1.8, [(4, 1), (3, 1), (1, 1), (0, 4)], 0.8, 'dizi', base=74, g=0.8)

# ---------------- sound effects & ambience ----------------
def noise(d): return rs.randn(int(d * SR))
def region(buf, sid, x_fn, gain, pad=0.6, pan=0.0):
    a = max(0, st(sid) - pad); d = SC[sid]['end'] + pad - a
    x = x_fn(d) * env(int(d * SR), pad, pad); put(buf, a, x, gain, pan)
wind = lambda d: lp(noise(d), 500) * (0.6 + 0.4 * np.sin(tsec(d) * 0.4))
stream = lambda d: bp(noise(d), 300, 2500) * (0.7 + 0.3 * np.abs(np.sin(tsec(d) * 3.1) * np.sin(tsec(d) * 1.7)))
region(amb, 'opening', wind, 0.05, 1.0); region(amb, 'opening', stream, 0.035, 1.0, 0.3)
for t_ in np.arange(st('opening') + 3, SC['opening']['end'] - 2, 1.7):  # bird chirps
    t = tsec(0.12); f = 3000 + 1200 * np.sin(np.linspace(0, np.pi, len(t))); put(amb, t_ + rs.rand() * 0.6, np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.01, 0.05), 0.03, rs.uniform(-0.6, 0.6))
rainf = lambda d: hp(noise(d), 800) * 0.8 + lp(noise(d), 400) * 0.4
region(amb, 'rain', rainf, 0.035, 0.8)
thunder = lp(noise(3.5), 180, 3) * env(int(3.5 * SR), 0.15, 2.5); put(sfx, st('rain') + 0.7, thunder, 0.3)
for t_ in np.arange(st('rain') + 0.4, st('rain') + 6.2, 0.36): put(sfx, t_, bp(noise(0.09), 200, 1500) * env(int(0.09 * SR), 0.005, 0.07), 0.12, -0.3)

# villages: soft tick as the route reaches each village (mirrors the arc-length maths in scenes.js)
V = [(700, 330), (980, 420), (1260, 360), (1480, 480), (1320, 640), (1040, 700), (760, 620), (560, 480), (820, 860)]
seg = [np.hypot(V[i + 1][0] - V[i][0], V[i + 1][1] - V[i][1]) for i in range(8)]; cum = np.cumsum([0] + seg) / sum(seg)
a0 = L('villages', 0) + 0.3; dd = dur('villages') - L('villages', 0) - 2.2
xs = np.linspace(0, 1, 2001); ss = xs * xs * (3 - 2 * xs)
for c in cum:
    put(sfx, st('villages') + a0 + dd * np.interp(c, ss, xs), chime(93, 0.5, 1.5), 0.5, 0.2)

creak = lambda d: bp(noise(d), 300, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * tsec(d)) ** 2)
put(sfx, st('altar') + 0.2, creak(2.0) * env(int(2.0 * SR), 0.2, 0.8), 0.10)
candle_amb = lambda d: bp(noise(d), 100, 600) * 0.4
region(amb, 'altar', candle_amb, 0.03)
clack = lambda g: (bp(noise(0.12), 900, 4000) * np.exp(-tsec(0.12) * 50) + np.sin(2 * np.pi * 700 * tsec(0.12)) * np.exp(-tsec(0.12) * 40) * 0.6) * g
for t_, g in [(2.25, 1.0), (2.29, 0.8), (2.62, 0.5), (2.7, 0.35), (2.95, 0.2)]: put(sfx, st('poe') + t_, clack(g), 0.55, 0.1)
put(sfx, st('poe') + 1.3, bp(noise(0.3), 1500, 6000) * env(int(0.3 * SR), 0.05, 0.2), 0.05)  # whoosh of the toss

crick = lambda d: bp(noise(d), 4200, 5200) * (np.sin(2 * np.pi * 28 * tsec(d)) > 0.6) * (np.sin(2 * np.pi * 0.7 * tsec(d)) > -0.2)
region(amb, 'dawn', crick, 0.05, 1.0, 0.4); region(amb, 'closing', crick, 0.04, 1.0, -0.4)
for t_ in np.arange(st('dawn') + 1.0, st('dawn') + 9.0, 0.28): put(sfx, t_ + rs.rand() * 0.1, lp(noise(0.06), 800) * env(int(0.06 * SR), 0.005, 0.05), 0.05, rs.uniform(-0.7, 0.7))

def crackers(t0, d, g=1.0, pan=0.0):
    for k in range(int(d * 26)):
        tt = t0 + rs.uniform(0, d); x = (hp(noise(0.05), 1200) + 0.6 * lp(noise(0.05), 600)) * np.exp(-tsec(0.05) * 70)
        put(sfx, tt, x, 0.55 * g * rs.uniform(0.4, 1.0), pan + rs.uniform(-0.2, 0.2))
    put(sfx, t0, lp(noise(d + 1.5), 300) * env(int((d + 1.5) * SR), 0.1, 1.2), 0.12 * g, pan)
crowd = lambda d: bp(noise(d), 250, 1800) * (0.6 + 0.4 * np.sin(tsec(d) * 2.3) * np.sin(tsec(d) * 0.9))
s = st('procession')
crackers(s + 1.2, 2.2, 1.0, 0.3); crackers(s + L('procession', 1) - 0.2, 2.2, 0.9, 0.5)
region(amb, 'procession', crowd, 0.04); region(amb, 'crawl', crowd, 0.035); region(amb, 'feast', crowd, 0.06)
for t_ in np.arange(s, SC['crawl']['end'], 0.19): put(sfx, t_, lp(noise(0.05), 700) * env(int(0.05 * SR), 0.004, 0.04), 0.04, rs.uniform(-0.5, 0.5))
s = st('feast')
region(amb, 'feast', lambda d: hp(noise(d), 3000) * (0.5 + 0.5 * np.abs(np.sin(tsec(d) * 3.2))), 0.02, 0.5, 0.6)  # wok sizzle
for k in range(6): put(sfx, s + 3.3 + k * 0.05, chime(100 + k % 3, 0.35, 0.8), 0.5, rs.uniform(-0.5, 0.5))  # cups clink
s = st('transfer')
region(amb, 'transfer', lambda d: bp(noise(d), 300, 3000) * (rs.rand(int(d * SR)) > 0.9985) * 8 + lp(noise(d), 250) * 0.5, 0.05)
put(sfx, s + 3.0, lp(noise(1.2), 900) * env(int(1.2 * SR), 0.3, 0.7), 0.25)  # fire whoosh
crackers(s + 6.0, 2.0, 1.0, 0.6)
s = st('heritage')
put(sfx, s + 0.2, bp(noise(1.8), 1500, 7000) * env(int(1.8 * SR), 0.2, 0.8) * (0.6 + 0.4 * np.sin(tsec(1.8) * 40)), 0.06)  # paper unroll
put(sfx, s + 3.8, lp(noise(0.25), 300) * np.exp(-tsec(0.25) * 20), 0.5)  # seal stamp
s = st('closing')
for i, (t0, x) in enumerate([(2.0, 1250), (3.1, 820), (4.6, 1550), (6.4, 1050), (7.6, 700), (9.4, 1380), (10.6, 980), (12.1, 1600), (13.0, 860), (14.2, 1250), (15.0, 600), (15.9, 1500)]):
    if t0 + 0.9 > dur('closing'): continue  # burst would happen after the scene has faded out: no picture, so no sound
    pan = (x - 960) / 960 * 0.7
    tw = tsec(0.9); f = 900 + 1400 * tw / 0.9
    put(sfx, s + t0, np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tw), 0.05, 0.3) * 0.3 + hp(noise(0.9), 3000) * 0.1, 0.09, pan)
    boom = lp(noise(2.2), 220, 2) * np.exp(-tsec(2.2) * 2.4) * 1.6; boom[:int(1.2 * SR)] += drum(1.2, 70, 38, 0.8)
    put(sfx, s + t0 + 0.9, boom, 0.5, pan)
    for k in range(18): put(sfx, s + t0 + 1.1 + rs.uniform(0, 1.3), hp(noise(0.03), 2500) * np.exp(-tsec(0.03) * 90), 0.18 * rs.rand(), pan + rs.uniform(-0.2, 0.2))

# ---------------- narration & ducking ----------------
vo = np.zeros(N)
for sc in TL["scenes"]:
    for l in sc["lines"]:
        x, sr = sf.read(l["wav"], dtype="float64"); x = resample_poly(x, SR, sr); x = hp(x, 70)
        i = int(l["start"] * SR); vo[i:i + len(x)] += x[:N - i]
voice_on = np.zeros(N)
for sc in TL["scenes"]:
    for l in sc["lines"]: voice_on[int((l["start"] - 0.25) * SR):int((l["start"] + l["dur"] + 0.3) * SR)] = 1
k = int(0.35 * SR); w = np.hanning(2 * k); w /= w.sum()
duck = np.convolve(voice_on, w, mode="same")
gm = 10 ** (-10 * duck / 20); gs = 10 ** (-5 * duck / 20)

# reverb (stereo exponential-noise impulse response)
def reverb(x, d=2.4, wet=0.28):
    t = tsec(d); ir = np.stack([rs.randn(len(t)) * np.exp(-t * 3.0), rs.randn(len(t)) * np.exp(-t * 3.0)], 1); ir[:, 0] = lp(ir[:, 0], 5000); ir[:, 1] = lp(ir[:, 1], 5000)
    ir /= np.sqrt((ir ** 2).sum(0))
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet * 1.2
music = reverb(music, 2.6, 0.32); sfx = reverb(sfx, 1.6, 0.15)

def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
meter = pyln.Meter(SR)
# balance stems: narration clearly on top
vo_st = np.stack([vo, vo], 1)
lv = meter.integrated_loudness(vo_st); music *= 10 ** ((lv - 8 - meter.integrated_loudness(music)) / 20)
mix = vo_st + music * gm[:, None] + sfx * gs[:, None] * 0.9 + amb * gs[:, None] * 0.9
# fades
fi = int(0.8 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
fo = int(2.0 * SR); endi = int(T * SR); mix[endi - fo:endi] *= np.linspace(1, 0, fo)[:, None]; mix[endi:] = 0
mix = mix[:endi]
# loudness normalise to -15 LUFS, then a gentle peak limiter to keep true peak below -1 dBTP
mix *= 10 ** ((-15.0 - meter.integrated_loudness(mix)) / 20)
def limiter(x, ceiling=10 ** (-1.5 / 20), look=int(0.005 * SR), rel=0.08):
    a = np.max(np.abs(x), 1); need = np.minimum(1, ceiling / np.maximum(a, 1e-9))
    g = minimum_filter1d(need, size=2 * look + 1)
    out = np.empty_like(g); cur = 1.0; coef = np.exp(-1 / (rel * SR))
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else g[i] + (cur - g[i]) * coef
        out[i] = cur
    return x * out[:, None]
for _ in range(4):  # the limiter shaves a little loudness; iterate until it converges on -15 LUFS
    mix = limiter(mix)
    mix *= 10 ** ((-15.0 - meter.integrated_loudness(mix)) / 20)
mix = limiter(mix)
vo_l = meter.integrated_loudness(vo_st * 10 ** ((-15.0 - meter.integrated_loudness(mix)) / 20))
print("integrated LUFS:", round(meter.integrated_loudness(mix), 2), " sample peak dBFS:", round(20 * np.log10(np.max(np.abs(mix))), 2))
sf.write("build/mix.wav", mix.astype(np.float32), SR, subtype="PCM_24")
sf.write("build/music_only.wav", (music * gm[:, None])[:endi].astype(np.float32) * 0.5, SR, subtype="PCM_16")
