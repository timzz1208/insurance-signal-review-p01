/*
 * 房貸責任流：房貸還有 20 年，萬一主要收入中斷？
 * 製作者：林彥廷（timzz1208@gmail.com）｜paper-ink-flow skill｜版面 B「家庭日報」
 *
 * 時間全部用真實秒數（旁白 1.2 倍速，關鍵字的秒數見 STORYBOARD.md）。
 * TIME_MAP 是恆等對應，sound.py 用同一張表。
 */
(function () {
  'use strict';
  const { COL, keys, seg, clamp, lerp, easeBack, easeOut, hash } = FF;
  const TIME_MAP = [[0, 0], [50, 50]];
  const DURATION = TIME_MAP[TIME_MAP.length - 1][0];
  const W = 1080, CX = 540;
  const ctx = document.getElementById('stage').getContext('2d');

  // ---------- 時間點（真實秒數，對齊旁白關鍵字） ----------
  const T = {
    YEARS: 1.3,      // 「二十年」
    CUT: 4.5,        // 「斷了」
    L2: 5.7,         // 陳家每個月
    SLAM: 7.4,       // 「房貸三萬」
    NOSTOP: 8.45,    // 一個月都不能停
    L3: 10.4,        // 收入停了
    DEBIT: 11.6,     // 銀行的扣款（扣款章開始）
    L4: 14.55,       // 這時候，只能選
    PILLS: 15.35,
    C1: 16.85, DRAIN: 18.4, DRAIN_END: 20.4,
    C2: 21.25, CLEAR: 22.65, GONE: 23.75,
    C3: 25.45, GAP: 26.8, IOU: 27.9,
    L8: 30.2, REMAIN: 33.3, MATCH: 36.1,
    L9: 37.6, CATCH: 39.45, STAY: 41.1,
    END: 43.0
  };
  const CHOICES = [{ s: T.C1, label: '動用存款' }, { s: T.C2, label: '賣掉房子' }, { s: T.C3, label: '跟家人借' }];
  const PILL = { y: 560, h: 76, w: 262, xs: [110, 409, 708] };

  // ---------- 版面 ----------
  const HOUSE = { x: 400, base: 1260, w: 280, h: 290 };
  const INC = { x: 220, y: 920 };
  const PAY = { x: 860, y: 920 };
  const GRID = { x: 777, y: 1035, cw: 50, ch: 40, gap: 8 };
  const TANK = { x: 220, top: 1040, w: 92, h: 180 };
  const FAM = { x: 220, y: 1100 };
  function P(ax, ay, c1x, c1y, c2x, c2y, bx, by) {
    return { a: { x: ax, y: ay }, c1: { x: c1x, y: c1y }, c2: { x: c2x, y: c2y }, b: { x: bx, y: by } };
  }
  const PATH = {
    inc: P(220, 975, 220, 1060, 330, 1095, 450, 1100),
    out: P(680, 1240, 780, 1248, 890, 1250, 900, 1306),
    tank: P(266, 1130, 320, 1125, 350, 1150, 400, 1165),
    fam: P(256, 1100, 320, 1100, 350, 1140, 400, 1150),
    drip: P(470, 1262, 470, 1280, 472, 1300, 474, 1330)
  };

  // 剩餘房貸（示意：20 年本息平均攤還，年利率 2%）
  const rem = (y) => (1 - Math.pow(1.02, -(20 - y))) / (1 - Math.pow(1.02, -20));

  // ---------- 小工具 ----------
  const text = (s, x, y, o) => FF.text(ctx, s, x, y, o);
  const measure = (s, o) => FF.measure(ctx, s, o);
  function marker(x, y, w, h, alpha, p) {   // 螢光筆底：p 0..1 由左往右刷上
    if (alpha <= 0 || p <= 0) return;
    ctx.save();
    ctx.globalAlpha *= 0.88 * alpha;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = COL.acc;
    const ww = (w + 14) * clamp(p);
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 4); ctx.lineTo(x - 6 + ww, y); ctx.lineTo(x - 10 + ww, y + h); ctx.lineTo(x - 2, y + h + 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // 置中文字＋可選螢光筆底
  function headline(s, y, o) {
    const w = measure(s, o);
    if (o.mark) marker(CX - w / 2, y - o.size * 0.55, w, o.size * 0.5, o.alpha == null ? 1 : o.alpha, o.mark);
    text(s, CX, y, Object.assign({ align: 'center' }, o));
  }
  function halftone(x0, y0, w, h, col, dens, step) {
    const s = step || 14;
    ctx.fillStyle = col;
    for (let y = y0 + s / 2; y < y0 + h; y += s) {
      const row = Math.round((y - y0) / s);
      for (let x = x0 + s / 2 + (row % 2 ? s / 2 : 0); x < x0 + w; x += s) {
        const k = typeof dens === 'function' ? dens(x, y) : dens;
        if (k <= 0.02) continue;
        ctx.beginPath(); ctx.arc(x, y, s * 0.5 * Math.min(1, k), 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  function housePath(x, b, w, h) {
    const roof = h * 0.42;
    ctx.beginPath();
    ctx.moveTo(x, b); ctx.lineTo(x, b - h + roof); ctx.lineTo(x + w / 2, b - h); ctx.lineTo(x + w, b - h + roof); ctx.lineTo(x + w, b);
    ctx.closePath();
  }
  // 房子：網點牆面；pressure 時出現芥末色斜線陰影（套色錯位）；dashed = 已經賣掉
  function house(o) {
    const { x, base, w, h } = HOUSE;
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    const pr = o.pressure || 0;
    if (pr > 0.01) {
      ctx.save();
      housePath(x + 14, base + 12, w, h); ctx.clip();
      ctx.strokeStyle = FF.rgba(COL.verm, 0.6 * pr); ctx.lineWidth = 2.4;
      for (let k = -h; k < w + h; k += 11) { ctx.beginPath(); ctx.moveTo(x + 14 + k, base + 12 - h); ctx.lineTo(x + 14 + k - h, base + 12); ctx.stroke(); }
      ctx.restore();
    }
    ctx.save();
    housePath(x, base, w, h); ctx.clip();
    ctx.fillStyle = COL.paper; ctx.fillRect(x, base - h, w, h);
    const fill = o.fill == null ? 1 : o.fill;
    if (fill > 0) {
      ctx.globalCompositeOperation = 'multiply';
      halftone(x, base - h, w, h, COL.ink, (px, py) => fill * (0.3 + (py - (base - h)) / h * 0.55));
    }
    ctx.restore();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 7; ctx.lineJoin = 'round';
    if (o.dashed) { ctx.setLineDash([14, 14]); ctx.lineWidth = 4; ctx.strokeStyle = COL.inkSoft; }
    housePath(x, base, w, h); ctx.stroke();
    ctx.setLineDash([]);
    if (!o.dashed) {
      ctx.fillStyle = COL.paper; ctx.lineWidth = 5;
      const dw = w * 0.2, dh = h * 0.34;
      ctx.fillRect(x + w / 2 - dw / 2, base - dh, dw, dh); ctx.strokeRect(x + w / 2 - dw / 2, base - dh, dw, dh);
      const ww = w * 0.17;
      for (const sx of [x + w * 0.14, x + w - w * 0.14 - ww]) { ctx.fillRect(sx, base - h * 0.5, ww, ww); ctx.strokeRect(sx, base - h * 0.5, ww, ww); }
    }
    ctx.restore();
  }
  // 搬家紙箱
  function box(x, y, s, a) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = COL.paper; ctx.strokeStyle = COL.ink; ctx.lineWidth = 4;
    ctx.fillRect(x, y - s, s * 1.3, s); ctx.strokeRect(x, y - s, s * 1.3, s);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y - s, s * 1.3, s); ctx.clip();
    ctx.globalCompositeOperation = 'multiply'; halftone(x, y - s, s * 1.3, s, COL.acc, 0.7, 10); ctx.restore();
    ctx.beginPath(); ctx.moveTo(x + s * 0.65, y - s); ctx.lineTo(x + s * 0.65, y - s * 0.55); ctx.stroke();
    ctx.restore();
  }
  // 人情欠條：輕輕擺動的小紙條
  function iou(x, y, a, t) {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.rotate(Math.sin(t * 2.2) * 0.08 - 0.05);
    ctx.fillStyle = '#F4F0E4'; ctx.strokeStyle = COL.ink; ctx.lineWidth = 3;
    ctx.fillRect(-70, 0, 140, 92); ctx.strokeRect(-70, 0, 140, 92);
    ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, 0); ctx.stroke();
    text('欠 條', 0, 40, { size: 30, weight: 900, serif: true, align: 'center' });
    text('人情 ＋1', 0, 76, { size: 22, weight: 700, color: COL.inkSoft, align: 'center' });
    ctx.restore();
  }
  function srcNode(x, y, mode, color, alpha, ring) {
    FF.node(ctx, x, y, 22, { mode, color, alpha, ring });
  }

  // ---------- 20 年刻度尺／剩餘房貸圖 ----------
  // k = 0：底部的刻度尺；k = 1：轉折時放大成主畫面的圖
  function chartGeom(k) {
    const kk = easeOut(clamp(k));
    return { x0: 140, x1: 940, base: lerp(1380, 1250, kk), hmax: lerp(44, 330, kk), k: kk };
  }
  function chart(t, S) {
    const g = chartGeom(S.k);
    const xw = (g.x1 - g.x0) / 20;
    const X = (y) => g.x0 + y * xw;
    ctx.save();
    ctx.globalAlpha *= S.alpha;
    // 剩餘房貸：每年一階，墨色網點
    const clearK = S.clear || 0;   // 賣房：由右往左清掉
    for (let i = 0; i < 20; i++) {
      const hh = g.hmax * rem(i) * (1 - clamp(clearK * 1.6 - (19 - i) / 20 * 0.6));
      if (hh < 1) continue;
      const x = X(i), y = g.base - 6 - hh;
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 1, y, xw - 2, hh); ctx.clip();
      ctx.globalCompositeOperation = 'multiply';
      halftone(x, y, xw, hh, COL.ink, 0.42 + 0.22 * (1 - i / 20), g.k > 0.5 ? 16 : 12);
      ctx.restore();
    }
    // 墨綠緩衝：沿著剩餘房貸由左往右填滿
    const fillP = S.buffer || 0;
    if (fillP > 0) {
      const xe = X(20 * fillP);
      ctx.save();
      ctx.beginPath(); ctx.rect(g.x0, g.base - 6 - g.hmax - 4, xe - g.x0, g.hmax + 4); ctx.clip();
      for (let i = 0; i < 20; i++) {
        const hh = g.hmax * rem(i);
        ctx.fillStyle = FF.rgba(COL.blue, 0.78);
        ctx.fillRect(X(i), g.base - 6 - hh, xw, hh);
      }
      ctx.restore();
    }
    // 墨綠描邊：「準備就對應多少」
    const trace = S.trace || 0;
    if (trace > 0) {
      ctx.save();
      ctx.strokeStyle = COL.blue; ctx.lineWidth = 5 + 2 * g.k; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      const steps = 20 * trace;
      ctx.moveTo(X(0), g.base - 6);
      for (let i = 0; i < 20; i++) {
        if (i > steps) break;
        const hh = g.hmax * rem(i);
        const e = Math.min(1, steps - i);
        ctx.lineTo(X(i), g.base - 6 - hh);
        ctx.lineTo(X(i) + xw * e, g.base - 6 - hh);
      }
      ctx.stroke();
      ctx.restore();
    }
    // 尺
    ctx.fillStyle = COL.ink;
    ctx.fillRect(g.x0, g.base, g.x1 - g.x0, 4);
    for (let i = 0; i <= 20; i++) {
      const big = i % 5 === 0;
      ctx.fillRect(X(i) - 1.5, g.base, 3, big ? 24 : 12);
      if (big) text(String(i), X(i), g.base + 56, { size: 26, weight: 700, color: COL.inkSoft, align: 'center' });
    }
    text('年', g.x1 + 26, g.base + 56, { size: 26, weight: 700, color: COL.inkSoft });
    text(S.label || '剩餘房貸', g.x0, g.base - 18 - g.hmax, { size: 26 + 4 * g.k, weight: 700, color: COL.inkSoft });
    // 「今天」指標＋剩下多少年
    if (S.pointer != null) {
      const px = X(S.pointer);
      ctx.save();
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(px, g.base - 6 - g.hmax - 10); ctx.lineTo(px, g.base); ctx.stroke();
      ctx.restore();
      const n = Math.round(S.pointer);
      const lab = `第 ${n} 年｜還剩 ${20 - n} 年`;
      const lw = measure(lab, { size: 30, weight: 800 });
      const lx = clamp(px - lw / 2, g.x0, g.x1 - lw);
      ctx.fillStyle = COL.ink; ctx.fillRect(lx - 14, g.base - g.hmax - 88, lw + 28, 50);
      text(lab, lx, g.base - g.hmax - 52, { size: 30, weight: 800, color: COL.paper });
    }
    ctx.restore();
  }

  // ---------- 震動（固定公式） ----------
  function shake(t) {
    let x = 0, y = 0;
    const hit = (t0, amp, dur) => {
      const a = t - t0;
      if (a < 0 || a > dur) return;
      const k = amp * Math.exp(-a * 14);
      x += Math.sin(a * 95) * k; y += Math.cos(a * 71) * k;
    };
    hit(T.CUT, 14, 0.5);
    hit(T.SLAM + 0.2, 10, 0.5);
    hit(T.GONE, 6, 0.4);
    return { x, y };
  }

  // ---------- 版頭：報紙報頭（全程保留） ----------
  function masthead() {
    ctx.fillStyle = COL.ink;
    ctx.fillRect(90, 200, 900, 6); ctx.fillRect(90, 212, 900, 2);
    text('家 庭 日 報', CX, 292, { size: 64, weight: 900, serif: true, align: 'center' });
    text('第 2 號　｜　責任流專題　｜　@timzz1208', CX, 340, { size: 24, weight: 500, color: COL.inkSoft, align: 'center' });
    ctx.fillStyle = COL.ink; ctx.fillRect(90, 362, 900, 2);
  }

  // ---------- 上半：標題區（y 400～820） ----------
  function fadeIO(t, a, b, fi, fo) { return seg(t, a, a + (fi || 0.22)) * (1 - seg(t, b - (fo || 0.2), b)); }
  function slideIn(t, a) { return 18 * (1 - seg(t, a, a + 0.3)); }

  function headArea(t) {
    // 封面（第 0 格就完整）
    if (t < T.L2) {
      const a = 1 - seg(t, T.L2 - 0.2, T.L2);
      const pulse = 1 + 0.07 * Math.sin(Math.PI * clamp((t - T.YEARS) / 0.5)) * (t > T.YEARS ? 1 : 0);
      headline('房貸還有', 520, { size: 120, weight: 900, serif: true, alpha: a, mark: 1 });
      ctx.save(); ctx.translate(CX, 700); ctx.scale(pulse, pulse);
      text('20 年', 0, 0, { size: 188, weight: 900, serif: true, align: 'center', alpha: a });
      ctx.restore();
      headline('萬一，主要收入斷了？', 800, { size: 46, weight: 800, alpha: a, mark: seg(t, T.CUT, T.CUT + 0.25) });
      return;
    }
    // 每月房貸 −30,000 砸下
    if (t < T.L3) {
      const a = fadeIO(t, T.L2, T.L3, 0.2, 0.2);
      headline('陳家每個月的房貸', 470 + slideIn(t, T.L2), { size: 44, weight: 800, color: COL.inkSoft, alpha: a });
      if (t >= T.SLAM) {
        const k = clamp((t - T.SLAM) / 0.26);
        const sc = 1 + 0.9 * (1 - easeBack(k));
        const w = measure('−30,000', { size: 188, weight: 900, serif: true });
        ctx.save(); ctx.translate(CX, 670); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(k * 3) * a;
        marker(-w / 2 - 20, -100, w + 40, 90, 1, seg(t, T.SLAM + 0.3, T.SLAM + 0.6));
        text('−30,000', -36, 0, { size: 188, weight: 900, serif: true, align: 'center' });
        text('元', w / 2 - 20, -8, { size: 56, weight: 900, serif: true });
        ctx.restore();
      }
      headline('一個月都不能停。', 790, { size: 46, weight: 800, alpha: a * seg(t, T.NOSTOP, T.NOSTOP + 0.3) });
      return;
    }
    // 收入停了，扣款照樣準時來
    if (t < T.L4) {
      const a = fadeIO(t, T.L3, T.L4, 0.2, 0.2);
      headline('收入停了，', 560 + slideIn(t, T.L3), { size: 100, weight: 900, serif: true, alpha: a * seg(t, T.L3, T.L3 + 0.3) });
      headline('扣款照樣準時來。', 700 + slideIn(t, T.L3 + 0.6), { size: 100, weight: 900, serif: true, alpha: a * seg(t, T.L3 + 0.6, T.L3 + 0.9), mark: seg(t, 12.9, 13.3) });
      return;
    }
    // 三個選擇
    if (t < T.L8) {
      const a = fadeIO(t, T.L4, T.L8, 0.2, 0.25);
      headline('這時候，只能選。', 490 + slideIn(t, T.L4), { size: 80, weight: 900, serif: true, alpha: a });
      const pillA = seg(t, T.PILLS, T.PILLS + 0.35) * (1 - seg(t, T.L8 - 0.3, T.L8));
      if (pillA > 0) {
        CHOICES.forEach((c, i) => {
          const end = i < 2 ? CHOICES[i + 1].s : T.L8 - 0.3;
          const act = seg(t, c.s + 0.25, c.s + 0.4) * (1 - seg(t, end - 0.15, end));
          FF.pill(ctx, PILL.xs[i], PILL.y, PILL.w, PILL.h, c.label, act, pillA, i + 1);
        });
        CHOICES.forEach((c, i) => FF.tap(ctx, PILL.xs[i] + PILL.w * 0.66, PILL.y + PILL.h * 0.62, (t - c.s) / 0.7));
      }
      // 每個選擇的代價
      if (t >= T.C1 && t < T.C2) {
        const a1 = fadeIO(t, T.C1 + 0.3, T.C2, 0.25, 0.2);
        const m = Math.floor(16 * clamp((t - T.DRAIN) / (T.DRAIN_END - T.DRAIN)));
        if (t < T.DRAIN_END) {
          headline(`存款 50 萬，撐到第 ${m} 個月`, 760, { size: 58, weight: 900, serif: true, alpha: a1 });
        } else {
          const k = clamp((t - T.DRAIN_END) / 0.22);
          ctx.save(); ctx.translate(CX, 760); const sc = 1 + 0.5 * (1 - easeBack(k)); ctx.scale(sc, sc);
          ctx.translate(-CX, -760);
          headline('16 個月，存款見底。', 760, { size: 64, weight: 900, serif: true, alpha: a1, mark: 1 });
          ctx.restore();
        }
      }
      if (t >= T.C2 && t < T.C3) {
        const a2 = fadeIO(t, T.C2 + 0.3, T.C3, 0.25, 0.2);
        headline('貸款清了，', 740, { size: 60, weight: 900, serif: true, alpha: a2 * seg(t, T.CLEAR, T.CLEAR + 0.25) });
        headline('家也沒了。', 812, { size: 60, weight: 900, serif: true, alpha: a2 * seg(t, T.GONE, T.GONE + 0.25), mark: seg(t, T.GONE + 0.2, T.GONE + 0.5) });
      }
      if (t >= T.C3 && t < T.L8) {
        const a3 = fadeIO(t, T.C3 + 0.3, T.L8 - 0.2, 0.25, 0.25);
        headline('缺口還在，', 740, { size: 60, weight: 900, serif: true, alpha: a3 * seg(t, T.GAP, T.GAP + 0.25) });
        headline('人情也欠下了。', 812, { size: 60, weight: 900, serif: true, alpha: a3 * seg(t, T.IOU, T.IOU + 0.25), mark: seg(t, T.IOU + 0.2, T.IOU + 0.5) });
      }
      return;
    }
    // 轉折：房貸是有期限的責任
    if (t < T.L9) {
      const a = fadeIO(t, T.L8, T.L9, 0.25, 0.2);
      headline('其實，房貸', 500 + slideIn(t, T.L8), { size: 72, weight: 900, serif: true, alpha: a * seg(t, T.L8, T.L8 + 0.3) });
      headline('是有期限的責任。', 610 + slideIn(t, T.L8 + 0.4), { size: 92, weight: 900, serif: true, alpha: a * seg(t, T.L8 + 0.4, T.L8 + 0.7), mark: seg(t, 31.6, 32.0) });
      headline('剩下多少，準備就對應多少。', 720, { size: 48, weight: 800, color: COL.blue, alpha: a * seg(t, T.MATCH, T.MATCH + 0.3) });
      return;
    }
    if (t < T.END) {
      const a = fadeIO(t, T.L9, T.END, 0.25, 0.3);
      headline('事先準備好緩衝，', 520 + slideIn(t, T.L9), { size: 80, weight: 900, serif: true, alpha: a * seg(t, T.L9, T.L9 + 0.3) });
      headline('接住剩下的房貸。', 640 + slideIn(t, T.CATCH), { size: 80, weight: 900, serif: true, color: COL.blue, alpha: a * seg(t, T.CATCH, T.CATCH + 0.3) });
      headline('家，就能留在原地。', 760, { size: 50, weight: 800, alpha: a * seg(t, T.STAY, T.STAY + 0.3), mark: seg(t, T.STAY + 0.3, T.STAY + 0.7) });
    }
  }

  // ---------- 下半：場景（y 880～1460） ----------
  function scene(t, rt) {
    const sceneA = (1 - seg(t, T.L8 + 0.1, T.L8 + 0.8) + seg(t, T.CATCH - 0.1, T.CATCH + 0.5)) * (1 - seg(t, T.END - 0.1, T.END + 0.5));
    const inC1 = t >= T.C1 && t < T.C2, inC2 = t >= T.C2 && t < T.C3, inC3 = t >= T.C3 && t < T.L8;
    const buffer = t >= T.CATCH;
    const cutOn = t >= T.CUT;

    ctx.save();
    ctx.globalAlpha *= sceneA;
    ctx.fillStyle = COL.ink; ctx.fillRect(90, 850, 900, 2);

    // 收入來源（或轉折後的保障緩衝）
    const incA = 1 - seg(t, T.C1, T.C1 + 0.3) * (1 - seg(t, T.L8 - 0.3, T.L8));   // 選擇時收入整個退場
    const incCol = buffer ? COL.blue : COL.ink;
    FF.pipe(ctx, PATH.inc, cutOn && !buffer ? COL.inkSoft : incCol, cutOn && !buffer ? 0.45 * incA : 0.5 * incA, 2, cutOn && !buffer ? [4, 10] : null);
    FF.stream(ctx, PATH.inc, rt, { rate: 30, travel: 1.0, color: incCol, seed: 11, spread: 26,
      dens: (ts) => (ts < T.CUT || ts > T.CATCH + 0.2 ? 1 : 0) });
    const bk = buffer ? easeOut(clamp((t - T.CATCH) / 0.5)) : 0;
    if (!buffer) {
      text('主要收入', INC.x, INC.y, { size: 34, weight: 800, align: 'center', alpha: incA });
      if (cutOn) text('中斷', INC.x, INC.y + 42, { size: 28, weight: 800, color: COL.verm, align: 'center', alpha: incA * seg(t, T.CUT + 0.1, T.CUT + 0.4) });
    } else {
      text('保障緩衝', INC.x, INC.y - 40 * (1 - bk), { size: 34, weight: 800, color: COL.blue, align: 'center', alpha: bk });
      text('事先準備', INC.x, INC.y + 42 - 40 * (1 - bk), { size: 28, weight: 700, color: COL.blue, align: 'center', alpha: bk });
    }
    // 劃斷
    const sp = FF.bez(PATH.inc, 0.3);
    FF.spray(ctx, sp.x, sp.y, T.CUT, t, COL.ink, 46, 9);
    FF.spray(ctx, sp.x, sp.y, T.CUT + 0.03, t, COL.verm, 18, 19);
    if (cutOn && t < T.CATCH && incA > 0.01) { ctx.save(); ctx.globalAlpha *= incA; FF.slash(ctx, sp.x, sp.y, clamp((t - T.CUT) / 0.12) * 0.9 * (1 - seg(t, T.CATCH - 0.4, T.CATCH)), COL.ink); ctx.restore(); }

    // 房貸出口：房子 → 刻度尺（每月扣款把剩餘房貸往下繳）
    const sold = inC2 ? seg(t, T.CLEAR, T.CLEAR + 0.4) : 0;
    const outA = 1 - sold;
    FF.pipe(ctx, PATH.out, COL.verm, 0.5 * outA, 2);
    FF.stream(ctx, PATH.out, rt, { rate: 24, travel: 0.9, color: COL.verm, seed: 51, spread: 18,
      dens: (ts) => (ts >= T.C2 + 1.2 && ts < T.C3 ? 0 : 1) });
    text('每月房貸', PAY.x, PAY.y, { size: 34, weight: 800, align: 'center', alpha: outA });
    const pw = measure('30,000', { size: 52, weight: 900, serif: true });
    marker(PAY.x - pw / 2, 962, pw, 46, outA, 1);
    text('30,000', PAY.x, 1006, { size: 52, weight: 900, serif: true, align: 'center', alpha: outA });

    // 扣款月曆：12 格一格一格蓋上「扣」
    const gridA = seg(t, T.NOSTOP, T.NOSTOP + 0.3) * (1 - seg(t, T.L4 + 0.2, T.L4 + 0.6));
    if (gridA > 0) {
      ctx.save(); ctx.globalAlpha *= gridA;
      for (let i = 0; i < 12; i++) {
        const cx = GRID.x + (i % 3) * (GRID.cw + GRID.gap), cy = GRID.y + Math.floor(i / 3) * (GRID.ch + GRID.gap);
        ctx.strokeStyle = COL.ink; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, GRID.cw, GRID.ch);
        const st = T.DEBIT + i * 0.24;
        if (t >= st) {
          const k = clamp((t - st) / 0.12), sc = 1 + 0.6 * (1 - k);
          ctx.save(); ctx.translate(cx + GRID.cw / 2, cy + GRID.ch / 2); ctx.scale(sc, sc); ctx.globalAlpha *= k;
          ctx.fillStyle = COL.ink; ctx.fillRect(-18, -16, 36, 32);
          text('扣', 0, 1, { size: 24, weight: 900, serif: true, color: COL.paper, align: 'center', baseline: 'middle' });
          ctx.restore();
        } else {
          text(`${i + 1}月`, cx + GRID.cw / 2, cy + GRID.ch / 2 + 1, { size: 18, weight: 600, color: COL.mute, align: 'center', baseline: 'middle' });
        }
      }
      ctx.restore();
    }

    // 選擇一：存款水槽
    if (inC1) {
      const ta = seg(t, T.C1 + 0.2, T.C1 + 0.6) * (1 - seg(t, T.C2 - 0.25, T.C2));
      const lvl = 1 - clamp((t - T.DRAIN) / (T.DRAIN_END - T.DRAIN));
      FF.L.TANK = TANK;
      FF.pipe(ctx, PATH.tank, COL.ink, 0.35 * ta, 2, [4, 10]);
      ctx.save(); ctx.globalAlpha *= ta;
      FF.stream(ctx, PATH.tank, rt, { rate: 26, travel: 0.8, color: COL.ink, seed: 37, spread: 14, size: 3.6,
        dens: (ts) => (ts > T.DRAIN && ts < T.DRAIN_END ? 1 : 0) });
      FF.tank(ctx, rt, { level: lvl, sub: `${Math.round(50 * lvl)} 萬`, low: lvl < 0.12 });
      ctx.restore();
    }
    // 選擇三：家人借的細流＋欠條
    if (inC3) {
      const fa = seg(t, T.C3 + 0.2, T.C3 + 0.6) * (1 - seg(t, T.L8 - 0.3, T.L8));
      ctx.save(); ctx.globalAlpha *= fa;
      FF.pipe(ctx, PATH.fam, COL.ink, 0.4, 2);
      FF.stream(ctx, PATH.fam, rt, { rate: 9, travel: 0.9, color: COL.ink, seed: 61, spread: 10, size: 3.4, dens: () => 1 });
      srcNode(FAM.x, FAM.y, 'solid', COL.ink, 1);
      text('家人', FAM.x, FAM.y - 44, { size: 30, weight: 800, align: 'center' });
      iou(FAM.x, FAM.y + 60, seg(t, T.IOU, T.IOU + 0.3), rt);
      ctx.restore();
      // 缺口：房子底下一直滴
      ctx.save(); ctx.globalAlpha *= fa * seg(t, T.GAP - 0.4, T.GAP);
      FF.stream(ctx, PATH.drip, rt, { rate: 8, travel: 0.6, color: COL.verm, seed: 71, spread: 4, size: 5, dens: () => 1 });
      text('缺口', 500, 1330, { size: 26, weight: 800, color: COL.verm });
      ctx.restore();
    }

    // 房子
    const goneK = inC2 ? seg(t, T.GONE, T.GONE + 0.35) : 0;
    const pressure = t >= T.L3 && t < T.CATCH ? seg(t, T.L3, T.L3 + 0.5) * (1 - seg(t, T.CATCH - 0.2, T.CATCH + 0.4)) : 0;
    if (goneK < 1) house({ alpha: 1 - goneK, pressure: pressure * (1 - goneK) });
    if (goneK > 0) {
      house({ alpha: goneK, dashed: true, fill: 0 });
      text('已賣出', HOUSE.x + HOUSE.w / 2, HOUSE.base - 110, { size: 34, weight: 900, serif: true, color: COL.inkSoft, align: 'center', alpha: goneK });
      box(HOUSE.x + HOUSE.w + 20, HOUSE.base - 4, 54, goneK);
      box(HOUSE.x + HOUSE.w + 40, HOUSE.base - 62, 44, seg(t, T.GONE + 0.2, T.GONE + 0.5));
    }
    // 家留在原地：印章蓋在門上
    if (t >= T.STAY + 0.3) {
      const k = clamp((t - T.STAY - 0.3) / 0.18);
      FF.stamp(ctx, HOUSE.x + HOUSE.w / 2, HOUSE.base - 190, 78 * (1 + 0.5 * (1 - k)), '家', k, COL.blue);
    }
    ctx.restore();
  }

  function chartState(t) {
    const zoom = seg(t, T.L8 + 0.3, T.L8 + 1.3) * (1 - seg(t, T.CATCH - 0.2, T.CATCH + 0.7));
    const S = {
      k: zoom,
      alpha: 1 - seg(t, T.END - 0.1, T.END + 0.5),
      clear: t >= T.C2 && t < T.C3 ? seg(t, T.CLEAR, T.CLEAR + 0.6) * (1 - seg(t, T.C3 - 0.3, T.C3)) : 0,
      trace: t >= T.MATCH ? seg(t, T.MATCH, T.MATCH + 1.1) : 0,
      buffer: t >= T.L9 ? seg(t, T.L9 + 0.2, T.CATCH) : 0,
      label: t >= T.CATCH ? '剩餘房貸｜有緩衝接住' : '剩餘房貸'
    };
    if (t >= T.REMAIN - 0.2 && t < T.L9) S.pointer = 14 * seg(t, T.REMAIN, T.REMAIN + 2.4);
    if (t < T.L8 + 0.3) S.pointer = null;
    return S;
  }

  // 下方說明（y 1500）
  const CAPS = [
    [T.C1 + 0.4, T.C2, '存款流去繳房貸，水位一個月一個月往下掉。'],
    [T.C2 + 0.4, T.C3, '少了房貸，也少了家：搬家、孩子可能轉學。'],
    [T.C3 + 0.4, T.L8, '缺口還在，每個月都要再開口一次。'],
    [T.CATCH + 0.3, T.END, '房貸越繳越少，需要接住的也越來越少。']
  ];

  function renderAt(rt) {
    const t = rt;
    ctx.save();
    FF.background(ctx);
    const sh = shake(t);
    ctx.translate(sh.x, sh.y);

    masthead();
    headArea(t);
    chart(t, chartState(t));
    scene(t, rt);

    for (const [a, b, s] of CAPS) {
      if (t < a || t >= b) continue;
      text(s, CX, 1516, { size: 30, weight: 700, color: COL.ink, align: 'center', alpha: fadeIO(t, a, b, 0.3, 0.25) });
    }
    if (t < T.END + 0.3) text('虛構家庭與數字，僅為示意', CX, 1580, { size: 24, weight: 500, color: COL.mute, align: 'center', alpha: 1 - seg(t, T.END, T.END + 0.3) });

    // ---------- 結尾 ----------
    if (t >= T.END + 0.2) {
      const E = T.END + 0.2;
      const lines = [['先算清楚', null, 80], ['剩下的責任，', 'mark', 96], ['再確認', null, 80], ['正式的保障方向。', 'turn', 96]];
      let y = 540;
      lines.forEach(([s, kind, size], i) => {
        const ki = seg(t, E + i * 0.18, E + 0.55 + i * 0.18);
        headline(s, y + 26 * (1 - ki), { size, weight: 900, serif: true, alpha: ki, color: kind === 'turn' ? COL.blue : COL.ink,
          mark: kind === 'mark' ? seg(t, E + 0.7, E + 1.1) : 0 });
        y += size + 38;
      });
      const k2 = seg(t, E + 1.3, E + 1.9);
      ctx.fillStyle = COL.ink;
      ctx.fillRect(CX - 430 * k2, 1080, 860 * k2, 3); ctx.fillRect(CX - 430 * k2, 1087, 860 * k2, 1);
      FF.stamp(ctx, CX, 1210, 120, '家', k2, COL.ink);
      text('@timzz1208', CX, 1350, { size: 48, weight: 800, align: 'center', alpha: k2 });
      text('虛構家庭與數字｜示意動畫\n不代表特定商品、核保結果或給付承諾', CX, 1420, { size: 27, weight: 500, color: COL.inkSoft, align: 'center', alpha: k2, lh: 1.55 });
    }
    ctx.restore();
    FF.finish(ctx, rt);
  }

  window.renderAt = renderAt;
  window.DURATION = DURATION;
  window.TIME_MAP = TIME_MAP;
})();
