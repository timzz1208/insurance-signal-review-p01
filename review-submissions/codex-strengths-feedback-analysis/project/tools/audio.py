"""Original score (minimal modern piano + light percussion), sound effects, narration ducking and
loudness normalisation. Everything is synthesised here.
Sound-effect times come from build/events.json, which tools/render.js exports from the same timing
functions that draw the picture (render/scenes.js EVENTS), so every tick, drip and pen stroke lands
on its frame."""
import json, numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy.signal import resample_poly, butter, sosfilt, fftconvolve
from scipy.ndimage import minimum_filter1d

SR = 48000
TL = json.load(open("build/timeline.json")); EV = json.load(open("build/events.json"))
T = TL["duration"]; N = int(np.ceil(T * SR)) + SR
SC = {s["id"]: s for s in TL["scenes"]}
rs = np.random.RandomState(11)

def st(sid): return SC[sid]["start"]
def en(sid): return SC[sid]["end"]
def L(sid, i): return SC[sid]["lines"][i]["start"]

music = np.zeros((N, 2)); sfx = np.zeros((N, 2)); amb = np.zeros((N, 2))
def put(buf, t, x, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[:N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.414; buf[i:i + len(x), 1] += x * gain * r * 1.414

def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)
def env(n, a, r):
    e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na); nr = min(n, max(1, int(r * SR))); e[-nr:] *= np.linspace(1, 0, nr) ** 2; return e
def tsec(d): return np.arange(int(d * SR)) / SR
def noise(d): return rs.randn(int(d * SR))
def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

# ---------------- instruments ----------------
_pn = {}
def piano(m, d=2.5, vel=0.8):
    """Additive piano: slightly inharmonic partials, faster decay for upper partials, hammer thump."""
    k = (m, round(d, 2), round(vel, 2))
    if k in _pn: return _pn[k]
    t = tsec(d); f = hz(m); B = 0.0004; x = np.zeros(len(t))
    for n in range(1, 9):
        fn = f * n * np.sqrt(1 + B * n * n)
        if fn > 16000: break
        a = (1 / n ** 1.15) * (0.6 + 0.4 * vel) ** (n * 0.5)
        dec = 0.9 + 0.55 * n + f / 900
        x += a * (np.sin(2 * np.pi * fn * t) + 0.5 * np.sin(2 * np.pi * fn * 1.0012 * t + n)) * np.exp(-t * dec)
    x += lp(rs.randn(len(t)), 1500) * np.exp(-t * 90) * 0.12 * vel
    x *= env(len(t), 0.003, 0.25) * 0.22 * vel
    _pn[k] = x; return x
def kick(g=1.0, d=0.4):
    t = tsec(d); f = 45 + 85 * np.exp(-t * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * g
def rim(g=1.0):
    t = tsec(0.12); return (bp(noise(0.12), 1500, 5000) * np.exp(-t * 45) + np.sin(2 * np.pi * 1700 * t) * np.exp(-t * 60) * 0.3) * 0.5 * g
def hat(g=1.0, d=0.05):
    t = tsec(d); return hp(noise(d), 7000) * np.exp(-t * 70) * 0.35 * g
def shaker(g=1.0):
    t = tsec(0.09); return hp(noise(0.09), 5000) * np.sin(np.pi * t / 0.09) ** 2 * 0.25 * g
def bass(m, d, g=1.0):
    t = tsec(d); f = hz(m); x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return lp(x, 400) * env(len(t), 0.01, 0.15) * np.exp(-t * 0.8) * 0.35 * g
def pad(ms, d, g=1.0):
    t = tsec(d); x = sum(np.sin(2 * np.pi * hz(m) * t * (1 + 0.002 * np.sin(t * 0.5 + i))) for i, m in enumerate(ms))
    return lp(x, 1200) * env(len(t), 1.2, 1.5) * 0.05 * g
def bell(m, g=1.0, d=2.5):
    t = tsec(d); f = hz(m); return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 3)) * np.exp(-t * 1.6) * 0.22 * g

# ---------------- score ----------------
BPM = 104; B = 60 / BPM; BAR = 4 * B
PROG = [  # (bass, voicing) — Am7, Fmaj7, C(add9), G(sus)
    (45, [57, 60, 64, 67]), (41, [53, 57, 60, 64]), (48, [55, 60, 64, 74]), (43, [55, 59, 62, 69])]
def chord_at(t): return PROG[int(t // BAR) % 4]
ARP = [0, 2, 1, 3, 2, 1, 3, 2]

def groove(t0, t1, kick_on=True, rim_on=True, hats=True, arp=True, g=1.0, arp_oct=12):
    b = int(np.ceil(t0 / (B / 2)))
    while b * B / 2 < t1:
        t = b * B / 2; beat = b // 2; eighth = b % 2
        bs, v = chord_at(t)
        if arp: put(music, t, piano(v[ARP[b % 8]] + arp_oct, 1.6, 0.55 + 0.15 * (eighth == 0)), 0.9 * g, -0.25 + 0.5 * (b % 8) / 7)
        if eighth == 0 and beat % 4 == 0:
            put(music, t, bass(bs, BAR * 0.95), 1.0 * g, 0)
            put(music, t, sum(np.pad(piano(m, 2.8, 0.55), (0, 0)) for m in v), 0.5 * g, 0)
        if kick_on and eighth == 0 and beat % 2 == 0: put(music, t, kick(0.9), 0.8 * g, 0)
        if rim_on and eighth == 0 and beat % 2 == 1: put(music, t, rim(0.8), 0.6 * g, 0.15)
        if hats: put(music, t, hat(0.8 if eighth else 0.5), 0.55 * g, 0.35)
        b += 1

# 1. cover: a firm hook, then a light pulse under the question.
s, e = st('cover'), en('cover')
put(music, 0.0, sum(piano(m, 3.0, 0.9) for m in [45, 57, 60, 64, 69]), 0.9, 0)
for t in np.arange(0.0, min(1.7, e), B / 4): put(music, t, hat(0.6), 0.5, 0.3)
groove(1.7, e, g=0.85)
# 2-3. reframe + feedback: steady forward motion, with a gentle lift at the method.
s, e = st('reframe'), en('feedback')
groove(s, e, g=0.92)
for t in np.arange(np.ceil(s / BAR) * BAR, e - 1, BAR * 2):
    bs, v = chord_at(t)
    for j, m in enumerate([v[3] + 12, v[2] + 12, v[1] + 12]): put(music, t + 3 * B + j * B / 3, piano(m, 2.0, 0.6), 0.5, 0.3)
# 4. pattern: open space so the repeated pattern can land.
s, e = st('pattern'), en('pattern')
put(music, s, pad([57, 64, 69], e - s + 2), 0.9, 0)
for t in np.arange(np.ceil(s / BAR) * BAR, e, BAR / 2):
    bs, v = chord_at(t)
    put(music, t, bass(bs, BAR * 0.5), 0.62, 0)
    put(music, t, sum(piano(m, 3.5, 0.45) for m in v), 0.45, 0)
    put(music, t + B, piano(v[3] + 12, 3.0, 0.4), 0.38, 0.35)
# 5. close: rebuild softly, then land on the saveable question.
s, e = st('close'), en('close')
cta = L('close', 4) + SC['close']['lines'][4]['dur']
groove(s, L('close', 3), kick_on=False, rim_on=False, g=0.72)
groove(L('close', 3), cta, kick_on=True, rim_on=True, g=0.78)
put(music, cta + 0.1, sum(piano(m, 5.0, 0.75) for m in [36, 48, 55, 60, 64, 71, 74]), 0.82, 0)
put(music, cta + 0.1, bell(84, 0.7, 3.5), 1.0, 0.2)
put(music, cta + 0.1, pad([60, 64, 67, 71], e - cta + 1), 1.1, 0)

# ---------------- sound effects (from events.json) ----------------
def scribble(d, g=1.0):
    t = tsec(d); m = np.abs(np.sin(2 * np.pi * (9 + 5 * rs.rand()) * t)) ** 0.6 * (0.6 + 0.4 * rs.rand(len(t)) ** 4)
    return bp(noise(d), 2000, 7000) * m * env(len(t), 0.02, 0.08) * 0.35 * g
def sweep(d, lo, hi, up=True):
    x = noise(d); n = len(x); out = np.zeros(n); seg = 12
    for k in range(seg):
        a, b = k * n // seg, (k + 1) * n // seg; u = k / (seg - 1) if up else 1 - k / (seg - 1)
        fc = lo * (hi / lo) ** u; out[a:b] = bp(x, fc * 0.7, min(fc * 1.4, 20000))[a:b]
    return out * np.sin(np.pi * np.arange(n) / n)
def fx(k, e):
    g = e.get('g', 1.0); d = e.get('d', 0.5)
    if k == 'tick': t = tsec(0.03); return (np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 200) + hp(noise(0.03), 3000) * np.exp(-t * 250) * 0.4) * 0.5 * g
    if k == 'thump': t = tsec(0.3); return (np.sin(2 * np.pi * np.cumsum(60 + 60 * np.exp(-t * 25)) / SR) * np.exp(-t * 14) + lp(noise(0.3), 500) * np.exp(-t * 30) * 0.3) * 0.8 * g
    if k == 'punch': t = tsec(0.9); return (kick(1.4, 0.9) + lp(noise(0.9), 300) * np.exp(-t * 7) * 0.4 + hp(noise(0.9), 5000) * np.exp(-t * 5) * 0.1) * 0.9 * g
    if k == 'scribble': return scribble(d, g)
    if k == 'zip': return sweep(d, 400, 6000) * 0.4 * g
    if k == 'whoosh': return sweep(0.6, 600, 3000) * 0.35 * g
    if k == 'blip': t = tsec(0.25); m = [72, 76, 79][e.get('n', 0)]; return np.sin(2 * np.pi * hz(m + 12) * t) * np.exp(-t * 14) * 0.25 * g
    if k == 'pop': t = tsec(0.12); return np.sin(2 * np.pi * np.cumsum(300 + 700 * np.exp(-t * 40)) / SR) * np.exp(-t * 35) * 0.6 * g
    if k == 'clack': t = tsec(0.08); return (bp(noise(0.08), 1200, 5000) * np.exp(-t * 70) + np.sin(2 * np.pi * 1300 * t) * np.exp(-t * 60) * 0.5) * 0.5 * g
    if k == 'click': t = tsec(0.06); return (np.sin(2 * np.pi * 3200 * t) + np.sin(2 * np.pi * 4700 * t)) * np.exp(-t * 90) * 0.3 * g
    if k == 'clock': t = tsec(0.05); f = 2000 if int(e['t'] * 2) % 2 else 1500; return (np.sin(2 * np.pi * f * t) * np.exp(-t * 150) + bp(noise(0.05), 2000, 6000) * np.exp(-t * 200) * 0.4) * 0.45 * g
    if k == 'stop': t = tsec(0.5); return (np.sin(2 * np.pi * np.cumsum(90 + 40 * np.exp(-t * 20)) / SR) * np.exp(-t * 10) + bp(noise(0.5), 400, 1600) * np.exp(-t * 25) * 0.4) * 0.8 * g
    if k == 'chime': return bell(88, g) + np.concatenate([np.zeros(int(0.09 * SR)), bell(91, g * 0.7)])[:len(bell(88))]
    if k == 'umbrella': t = tsec(1.1); return (lp(noise(1.1), 900) * np.sin(np.pi * np.clip(t / 1.1, 0, 1)) ** 2 * 0.6 + np.concatenate([np.zeros(int(0.85 * SR)), kick(0.5, 0.25)])[:len(t)]) * 0.7 * g
    if k == 'plink':  # drop into the bucket: pitch rises as the bucket fills
        t = tsec(0.35); f0 = 700 + 700 * e.get('lvl', 0.3); f = f0 * (1 + 0.8 * (1 - np.exp(-t * 60)))
        return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) + bp(noise(0.35), 1500, 6000) * np.exp(-t * 80) * 0.3) * 0.35 * g
    if k == 'drip': t = tsec(0.15); return bp(noise(0.15), 800, 3500) * np.exp(-t * 50) * 0.4 * g
    if k == 'page':
        d = 0.55; t = tsec(d); crk = (rs.rand(len(t)) > 0.9993) * 6.0
        return (bp(noise(d), 1500, 8000) * (np.sin(np.pi * t / d) ** 1.5) * 0.35 + bp(crk, 1000, 6000)) * 0.6 * g
    if k == 'strike': d = 0.4; t = tsec(d); return (sweep(d, 2500, 7000) * 1.2 + scribble(d, 0.6)) * env(len(t), 0.01, 0.06) * 0.8 * g
    if k == 'write': return scribble(d, 1.1 * g) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 3.2 * tsec(d))))
    return None

for e in EV:
    k = e['kind']
    if k == 'rain':  # ambience: steady hiss + low body + random close droplets, fades at scene edges
        d = e['d'] + 1.0; t = tsec(d)
        x = hp(noise(d), 2500) * 0.5 + bp(noise(d), 300, 1500) * 0.35
        x += bp((rs.rand(len(t)) > 0.9985) * rs.randn(len(t)) * 5, 1500, 7000)
        put(amb, e['t'] - 0.4, x * env(len(t), 0.6, 0.8), 0.22, 0)
        continue
    x = fx(k, e)
    if x is not None: put(sfx, e['t'], x, 1.0, 0.25 if k in ('plink', 'tick') else (-0.3 if k == 'drip' else 0))

# light paper-turn swish on every scene cut
for sc in TL['scenes'][1:]: put(sfx, sc['start'] - 0.2, sweep(0.45, 800, 5000) * 0.18, 1.0, 0)

# ---------------- narration & ducking ----------------
vo = np.zeros(N)
for sc in TL["scenes"]:
    for l in sc["lines"]:
        x, sr = sf.read(l["wav"], dtype="float64"); x = resample_poly(x, SR, sr); x = hp(x, 70)
        i = int(l["start"] * SR); vo[i:i + len(x)] += x[:N - i]
voice_on = np.zeros(N)
for sc in TL["scenes"]:
    for l in sc["lines"]: voice_on[int((l["start"] - 0.2) * SR):int((l["start"] + l["dur"] + 0.25) * SR)] = 1
k = int(0.3 * SR); w = np.hanning(2 * k); w /= w.sum()
duck = np.clip(fftconvolve(voice_on, w, mode="same"), 0, 1)
gm = 10 ** (-10 * duck / 20); gs = 10 ** (-5 * duck / 20)

def reverb(x, d=2.2, wet=0.25):
    t = tsec(d); ir = np.stack([rs.randn(len(t)) * np.exp(-t * 3.2), rs.randn(len(t)) * np.exp(-t * 3.2)], 1); ir[:, 0] = lp(ir[:, 0], 6000); ir[:, 1] = lp(ir[:, 1], 6000)
    ir /= np.sqrt((ir ** 2).sum(0))
    y = np.stack([fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    return x * (1 - wet) + y * wet * 1.2
music = reverb(music, 2.2, 0.26); sfx = reverb(sfx, 1.0, 0.1)

meter = pyln.Meter(SR)
vo_st = np.stack([vo, vo], 1)
lv = meter.integrated_loudness(vo_st); music *= 10 ** ((lv - 9 - meter.integrated_loudness(music)) / 20)
mix = vo_st + music * gm[:, None] + sfx * gs[:, None] * 0.9 + amb * gs[:, None]
fo = int(0.6 * SR); endi = int(T * SR); mix[endi - fo:endi] *= np.linspace(1, 0, fo)[:, None]; mix = mix[:endi]
mix[:int(0.005 * SR)] *= np.linspace(0, 1, int(0.005 * SR))[:, None]
mix *= 10 ** ((-15.0 - meter.integrated_loudness(mix)) / 20)
def limiter(x, ceiling=10 ** (-4.2 / 20), look=int(0.005 * SR), rel=0.08):
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
print("integrated LUFS:", round(meter.integrated_loudness(mix), 2), " sample peak dBFS:", round(20 * np.log10(np.max(np.abs(mix))), 2), " events:", len(EV))
sf.write("build/mix.wav", mix.astype(np.float32), SR, subtype="PCM_24")
