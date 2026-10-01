"""
房貸責任流 — 音效與配樂合成
製作者：林彥廷（timzz1208@gmail.com）｜paper-ink-flow skill
所有聲音都用程式合成，時間點對齊 video.html 的時間軸。
聲音語言配合「紙與墨」：紙張、筆劃、木質敲擊、印章落下＋低調的環境和弦。

用法：python3 sound.py [音效.wav] [--voice 旁白.wav --mix 混音.wav]
"""
import sys
import wave
import numpy as np
from scipy import signal

SR = 48000
# 房貸責任流：畫面直接用真實秒數排，TIME_MAP 是恆等對應（與 scene.js 相同）
TIME_MAP = [(0, 0), (50, 50)]
DUR = TIME_MAP[-1][0]


def real_t(tau):
    """劇情時間 → 真實時間"""
    return float(np.interp(tau, [b for a, b in TIME_MAP], [a for a, b in TIME_MAP]))


def story_t(t):
    """真實時間 → 劇情時間"""
    return float(np.interp(t, [a for a, b in TIME_MAP], [b for a, b in TIME_MAP]))


N = int(SR * DUR)
rng = np.random.default_rng(314159)
L = np.zeros(N)
R = np.zeros(N)
DRY_L = np.zeros(N)   # 不進殘響的低頻
DRY_R = np.zeros(N)


# ---------- 工具 ----------
def ts(d):
    return np.arange(int(d * SR)) / SR


def place(x, t0, gain=1.0, pan=0.0, dry=False, real=False):
    """t0 預設是劇情時間，real=True 時是真實時間"""
    i = int((t0 if real else real_t(t0)) * SR)
    if i >= N:
        return
    x = x[: N - i]
    a = (pan + 1) * np.pi / 4
    tl, tr = (DRY_L, DRY_R) if dry else (L, R)
    tl[i:i + len(x)] += x * gain * np.cos(a)
    tr[i:i + len(x)] += x * gain * np.sin(a)


def sos(kind, f, order=2):
    return signal.butter(order, f, kind, fs=SR, output='sos')


def bp(x, lo, hi, order=2):
    return signal.sosfilt(sos('bandpass', [lo, hi], order), x)


def lp(x, f, order=2):
    return signal.sosfilt(sos('lowpass', f, order), x)


def hp(x, f, order=2):
    return signal.sosfilt(sos('highpass', f, order), x)


def expdec(n, d):
    return np.exp(-np.arange(n) / SR / d)


def attack(n, a):
    e = np.ones(n)
    k = max(1, int(a * SR))
    e[:k] = np.linspace(0, 1, k)
    return e


def noise(d):
    return rng.standard_normal(int(d * SR))


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------- 音色 ----------
def tick(f=2600, d=0.03):
    n = int(d * SR)
    t = ts(d)
    x = bp(noise(d), f * 0.6, min(f * 1.8, 20000)) * expdec(n, 0.004)
    x += 0.5 * np.sin(2 * np.pi * f * 0.7 * t) * expdec(n, 0.008)
    return x


def wood(f, d=0.25):
    """木質敲擊：基音＋木琴泛音，短促"""
    t = ts(d)
    n = len(t)
    x = np.sin(2 * np.pi * f * t) * expdec(n, 0.06)
    x += 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * expdec(n, 0.025)
    x += 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * expdec(n, 0.012)
    x += 0.3 * bp(noise(d), 1500, 6000) * expdec(n, 0.003)
    return x * attack(n, 0.001)


def marimba(f, d=1.4, soft=1.0):
    t = ts(d)
    n = len(t)
    x = np.sin(2 * np.pi * f * t) * expdec(n, 0.55)
    x += 0.25 * np.sin(2 * np.pi * f * 3.93 * t) * expdec(n, 0.12)
    x += 0.08 * np.sin(2 * np.pi * f * 9.2 * t) * expdec(n, 0.04)
    x += 0.1 * soft * lp(noise(d), 2500) * expdec(n, 0.004)
    return x * attack(n, 0.003)


def bell(f, d=3.0):
    t = ts(d)
    n = len(t)
    parts = [(1.0, 1.0, 1.8), (2.0, 0.5, 1.1), (2.76, 0.35, 0.8), (5.4, 0.15, 0.35), (8.9, 0.06, 0.2)]
    x = sum(a * np.sin(2 * np.pi * f * r * t) * expdec(n, dec) for r, a, dec in parts)
    return x * attack(n, 0.004)


def sub(f0, f1, d, dec):
    """音高下墜的低頻重擊"""
    t = ts(d)
    f = f1 + (f0 - f1) * np.exp(-t / 0.08)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * expdec(len(t), dec) * attack(len(t), 0.002)


def swish(d=0.4, lo=500, hi=4500, up=True):
    """紙張翻動：濾波噪音＋漸強漸弱"""
    n = int(d * SR)
    x = noise(d)
    segs = 10
    out = np.zeros(n)
    win = np.hanning(n)
    for k in range(segs):
        c = k / (segs - 1)
        c = c if up else 1 - c
        f = lo * (hi / lo) ** c
        band = bp(x, f * 0.7, min(f * 1.4, 20000))
        w = np.clip(1 - abs(np.linspace(0, segs - 1, n) - k), 0, 1)
        out += band * w
    return out * win


def slash(d=0.16):
    """筆用力劃過紙：高頻刮擦，頻率由高往低"""
    n = int(d * SR)
    x = swish(d, 1200, 9000, up=False)
    e = attack(n, 0.004) * expdec(n, 0.06)
    return x * e * 2.2


def slam():
    """−40,000 砸下：深沉低頻＋紙面拍擊"""
    d = 1.8
    n = int(d * SR)
    body = sub(95, 38, d, 0.5)
    slap = bp(noise(0.12), 700, 3200) * expdec(int(0.12 * SR), 0.02)
    thud = lp(noise(0.4), 350) * expdec(int(0.4 * SR), 0.08)
    out = np.zeros(n)
    out += body * 1.0
    out[:len(thud)] += thud * 0.9
    out[:len(slap)] += slap * 0.8
    return out


def stamp_hit():
    """印章落在紙上：悶、短、帶一點木頭聲"""
    d = 0.5
    n = int(d * SR)
    out = sub(170, 90, d, 0.07) * 0.8
    s = bp(noise(0.08), 300, 1800) * expdec(int(0.08 * SR), 0.015)
    out[:len(s)] += s * 0.9
    w = wood(420, 0.2) * 0.25
    out[:len(w)] += w
    return out


def heartbeat():
    d = 0.4
    n = int(d * SR)
    out = np.zeros(n)
    a = sub(62, 45, 0.3, 0.05)
    out[:len(a)] += a
    j = int(0.13 * SR)
    b = sub(58, 42, 0.27, 0.045) * 0.7
    out[j:j + len(b)] += b[: n - j]
    # 中頻敲擊，讓手機喇叭也聽得到心跳
    for k, g in ((0, 0.5), (j, 0.35)):
        kn = bp(noise(0.06), 140, 700) * expdec(int(0.06 * SR), 0.012)
        out[k:k + len(kn)] += kn * g
    return out


def glide(f0, f1, d, dec=None):
    t = ts(d)
    f = f0 * (f1 / f0) ** (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.25 * np.sin(2 * ph)
    e = np.hanning(len(t)) if dec is None else expdec(len(t), dec) * attack(len(t), 0.01)
    return x * e


def pad(notes, t0, t1, fade_in, fade_out, gain, hard_stop=False):
    """溫和的和弦墊底：每個音 3 個略微失諧的聲部（t0、t1 為劇情時間）"""
    t0, t1 = real_t(t0), real_t(t1)
    d = t1 - t0
    t = ts(d)
    n = len(t)
    x = np.zeros(n)
    for m in notes:
        f = midi(m)
        for det in (-0.12, 0.0, 0.13):
            ff = f * 2 ** (det / 12)
            ph = rng.uniform(0, 2 * np.pi)
            x += np.sin(2 * np.pi * ff * t + ph) + 0.18 * np.sin(4 * np.pi * ff * t + ph)
    x = hp(lp(x, 1600), 75)
    trem = 1 + 0.08 * np.sin(2 * np.pi * 0.23 * t)
    e = np.ones(n)
    fi = int(fade_in * SR)
    fo = int((0.02 if hard_stop else fade_out) * SR)
    if fi:
        e[:fi] = np.linspace(0, 1, fi) ** 2
    if fo:
        e[-fo:] = np.linspace(1, 0, fo) ** (1 if hard_stop else 2)
    x = x * e * trem / (len(notes) * 3)
    place(x, t0, gain, 0.0, real=True)


def flow_texture(rate_fn, t0, t1, gain=0.05, seed=1):
    """墨點流動：大量細小的點擊聲，密度跟著畫面的粒子流（真實時間）"""
    r = np.random.default_rng(seed)
    t = t0
    while t < t1:
        rate = rate_fn(story_t(t))
        if rate <= 0:
            t += 0.02
            continue
        t += r.exponential(1 / rate)
        if t >= t1:
            break
        f = r.uniform(2200, 6500)
        place(tick(f, 0.02), t, gain * r.uniform(0.3, 1.0), r.uniform(-0.6, 0.6), real=True)


# ---------- 時間軸（對齊 scene.js，真實秒數） ----------
CUT, SLAM = 4.5, 7.4
C1, C2, C3 = 16.85, 21.25, 25.45
L8, MATCH, L9, CATCH, STAY, END = 30.2, 36.1, 37.6, 39.45, 41.1, 43.0

# 0–4.5 鉤子：小調和弦＋時鐘滴答（二十年的時間感），「斷了」時整個抽掉
pad([45, 52, 57, 60], 0.0, CUT, 0.0, 0.0, 0.5, hard_stop=True)
tt = 0.0
while tt < CUT - 0.1:
    place(wood(1850 if int(tt * 2) % 2 == 0 else 1550, 0.1), tt, 0.3, 0.3)
    place(tick(3200, 0.03), tt, 0.2, 0.3)
    tt += 0.5
place(marimba(midi(64), 1.2), 1.3, 0.22)   # 「二十年」數字輕輕一跳


def rate_fn(t):
    inc = 1.0 if (t < CUT or t > CATCH + 0.2) else 0.0
    out = 0.0 if (C2 + 1.2 <= t < C3) else 0.8
    tank = 0.8 if 18.4 < t < 20.4 else 0.0
    fam = 0.3 if C3 < t < L8 else 0.0
    vis = 1 - min(1, max(0, (t - L8) / 0.7)) + min(1, max(0, (t - CATCH) / 0.5))
    closing = 1 - min(1, max(0, (t - END) / 0.5))
    return 55 * (inc + out + tank + fam) * min(1, vis) * closing


flow_texture(rate_fn, 0.0, END + 0.6, 0.045)

# 4.5 劃斷：兩道筆劃＋低頻一沉，墨點噴散
place(slash(), CUT, 0.9, -0.2)
place(slash(0.13), CUT + 0.07, 0.7, 0.15)
place(sub(80, 45, 0.5, 0.12), CUT, 0.6, dry=True)
for i in range(14):
    place(tick(rng.uniform(1800, 5000), 0.025), CUT + 0.02 + rng.uniform(0, 0.35), 0.35 * rng.uniform(0.3, 1), rng.uniform(-0.8, 0.8))

# 緊張的持續音：斷裂後一直到轉折
pad([45, 45.07, 52, 57], CUT + 0.6, L8 + 0.4, 1.2, 0.8, 0.3)

# 標題換頁：翻報紙
for tt in (5.7, 10.4, 14.55, L8, L9):
    place(swish(0.35), tt - 0.05, 0.24, 0.1)

# 7.4 −30,000 砸下
place(bp(noise(0.25), 200, 900) * np.hanning(int(0.25 * SR)), SLAM - 0.05, 0.25)
place(slam(), SLAM + 0.22, 1.0, dry=True)

# 11.6 起：扣款章一格一格蓋下（12 格，每 0.24 秒）
for i in range(12):
    tt = 11.6 + i * 0.24
    place(wood(700 + 15 * (i % 3), 0.14), tt, 0.32, -0.2 + 0.04 * (i % 3))
    place(tick(2400, 0.02), tt, 0.18, 0.2)
place(heartbeat(), 12.9, 0.45, dry=True)
place(heartbeat(), 13.42, 0.45, dry=True)

# 15.35 三個選項出現；三次點擊
for k in range(3):
    place(wood(1200 + 150 * k, 0.12), 15.35 + 0.08 * k, 0.3, -0.5 + 0.5 * k)
for k, c in enumerate((C1, C2, C3)):
    place(wood(900, 0.2), c + 0.28, 0.5, -0.5 + 0.5 * k)
    place(tick(4200, 0.03), c + 0.28, 0.3, -0.5 + 0.5 * k)

# 選擇一：存款一個月一個月地少，16 下往下走；見底時空洞的一聲
for k in range(1, 17):
    tt = 18.4 + k * 2.0 / 16
    place(wood(1500 * (0.55 ** (k / 16)), 0.1), tt, 0.28, 0.0)
place(marimba(midi(45), 2.0), 20.4, 0.45)
place(marimba(midi(51), 2.0), 20.42, 0.3)
place(sub(70, 40, 1.0, 0.25), 20.4, 0.5, dry=True)

# 選擇二：「貸款清了」往下滑，「家也沒了」一沉＋紙箱落地
place(glide(520, 170, 0.65), 22.65, 0.18)
place(sub(90, 50, 0.4, 0.15), 23.75, 0.45, dry=True)
place(wood(380, 0.25), 23.95, 0.4, 0.3)
place(wood(430, 0.22), 24.2, 0.35, 0.35)

# 選擇三：缺口一滴一滴；欠條翻出來
tt = 26.8
while tt < L8 - 0.3:
    place(marimba(midi(76), 0.5, 0.6), tt, 0.1, -0.1)
    tt += 0.6
place(swish(0.3, 1200, 6000), 27.9, 0.22, -0.3)

# 轉折：圖表放大（往上滑的音），指標一年一年走，「準備就對應多少」鐘聲＋大調
place(glide(200, 420, 0.9), L8 + 0.3, 0.12)
for k in range(1, 15):
    place(tick(2800 + 60 * k, 0.025), 33.3 + k * 2.4 / 14, 0.22, -0.4 + 0.06 * k)
for k, m in enumerate([65, 69, 72, 77]):
    place(bell(midi(m), 3.2), MATCH + 0.06 * k, 0.16, -0.3 + 0.2 * k)
pad([41, 48, 57, 60, 64], MATCH, END + 0.4, 1.4, 0.8, 0.45)
for k in range(8):   # 墨綠緩衝由左往右填滿
    place(marimba(midi([60, 64, 67, 72, 64, 67, 72, 76][k]), 1.2), L9 + 0.2 + k * 0.22, 0.14, -0.6 + 0.17 * k)
place(glide(260, 520, 0.6), CATCH, 0.12)
place(stamp_hit(), STAY + 0.3, 0.6, dry=True)

# 結尾：四行字各一道筆劃，印章落下，和弦收在 C
for i in range(4):
    place(swish(0.28, 1500, 7000), END + 0.2 + 0.18 * i, 0.16, -0.2 + 0.13 * i)
pad([36, 43, 50, 52, 55], END, DUR, 1.0, 1.8, 0.45)
place(stamp_hit(), END + 1.55, 0.9, dry=True)
place(bell(midi(72), 2.8), END + 1.6, 0.1, 0.4)

# ---------- 混音 ----------
ir_n = int(1.9 * SR)
ir = lp(rng.standard_normal(ir_n), 4500) * np.exp(-np.arange(ir_n) / SR / 0.45)
ir /= np.sqrt(np.sum(ir ** 2))
ir_r = np.roll(ir, 331)
wet_l = signal.fftconvolve(L, ir)[:N]
wet_r = signal.fftconvolve(R, ir_r)[:N]
mix_l = L + DRY_L + 0.22 * wet_l
mix_r = R + DRY_R + 0.22 * wet_r
mix = np.stack([mix_l, mix_r])
mix = hp(mix, 28)
target_rms = 10 ** (-17 / 20)
rms = np.sqrt(np.mean(mix ** 2))
mix *= target_rms / (rms + 1e-12)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)                    # 柔和限幅
mix *= 10 ** (-1 / 20) / max(1e-9, np.max(np.abs(mix)))    # 峰值 −1 dBFS
fade = int(0.05 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade)

args = sys.argv[1:]


def opt(k, d=None):
    return args[args.index(k) + 1] if k in args else d


def write_wav(path, st):
    pcm = (np.clip(st.T, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def report(name, st):
    sec = [20 * np.log10(np.sqrt(np.mean(st[:, i * SR:(i + 1) * SR] ** 2)) + 1e-9) for i in range(int(DUR))]
    print('wrote', name)
    print('  每秒音量 dBFS:', ' '.join(f'{v:.0f}' for v in sec))
    print('  峰值 dBFS:', round(20 * np.log10(np.max(np.abs(st))), 2))


out = args[0] if args and not args[0].startswith('--') else 'sfx.wav'
write_wav(out, mix)
report(out, mix)

# ---------- 旁白 ----------
# 原始旁白音檔中每句的位置（秒），與放進影片的真實時間
VOICE_LINES = [
    # (來源開始, 來源結束, 放置時間)  句子｜來源：voice/narration_x1.2.wav（VoAI 原檔 1.2 倍速）
    (0.27, 5.10, 0.27),  # 房貸還有二十年，如果主要收入，明天斷了？
    (5.80, 9.93, 5.80),  # 陳家每個月，房貸三萬，一個月都不能停。
    (10.48, 14.10, 10.48),  # 收入停了，銀行的扣款，還是準時來。
    (14.64, 16.13, 14.64),  # 這時候，只能選。
    (16.85, 20.63, 16.85),  # 動用存款？五十萬，只夠繳十六個月。
    (21.29, 24.85, 21.29),  # 賣掉房子？貸款清了，家也沒了。
    (25.48, 29.55, 25.48),  # 跟家人借？缺口還在，人情也欠下了。
    (30.26, 37.15, 30.26),  # 其實房貸是有期限的責任，剩下多少年、多少錢，準備就對應多少。
    (37.68, 42.62, 37.68),  # 事先準備好緩衝，接住剩下的房貸，家就能留在原地。
    (43.17, 47.41, 43.17),  # 先算清楚還剩下的責任，再確認正式的保障方向。
]

vpath = opt('--voice')
if vpath:
    with wave.open(vpath) as w:
        vsr, ch = w.getframerate(), w.getnchannels()
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(float) / 32768
    if ch > 1:
        raw = raw.reshape(-1, ch).mean(axis=1)
    from math import gcd
    g = gcd(SR, vsr)
    src = signal.resample_poly(raw, SR // g, vsr // g)
    V = np.zeros(N)
    edge = int(0.015 * SR)
    for a, b, at in VOICE_LINES:
        seg = src[int(a * SR):int(b * SR)].copy()
        seg[:edge] *= np.linspace(0, 1, edge)
        seg[-edge:] *= np.linspace(1, 0, edge)
        i = int(at * SR)
        seg = seg[: N - i]
        V[i:i + len(seg)] += seg
    V = hp(V, 85)
    # 輕度壓縮：讓音量穩定
    env = np.maximum(signal.sosfilt(sos('lowpass', 12), np.abs(V)), 0)
    thr = np.percentile(env[env > 1e-4], 70) if np.any(env > 1e-4) else 1
    V = V / np.maximum(1, (env / thr) ** 0.4)
    active = env > thr * 0.25
    V *= 10 ** (-17 / 20) / (np.sqrt(np.mean(V[active] ** 2)) + 1e-12)

    # 旁白說話時把音效與配樂壓低約 11 dB（ducking）
    speech = (signal.sosfilt(sos('lowpass', 6), active.astype(float)) > 0.15).astype(float)
    att, rel = np.exp(-1 / (0.04 * SR)), np.exp(-1 / (0.35 * SR))
    duck_env = signal.lfilter([1 - rel], [1, -rel], speech)            # 緩放
    duck_env = np.maximum(duck_env, signal.lfilter([1 - att], [1, -att], speech))
    duck_env = np.clip(duck_env * 1.4, 0, 1)
    duck = 1 - duck_env * (1 - 10 ** (-11 / 20))
    final = mix * 0.72 * duck + V[None, :] * np.array([[1.0], [1.0]])
    final *= 10 ** (-1 / 20) / max(1e-9, np.max(np.abs(final)))
    bg = mix * 0.72 * duck
    on = speech > 0.5
    snr = 20 * np.log10(np.sqrt(np.mean(V[on] ** 2)) / (np.sqrt(np.mean(bg[:, on] ** 2)) + 1e-12))
    print(f'  說話時人聲比背景大 {snr:.1f} dB')
    mpath = opt('--mix', 'mix.wav')
    write_wav(mpath, final)
    report(mpath, final)
