// Scene compositions for a 1080x1920 Reel. Each scene is f(tl, sc, M) -> { art, txt, abs? }, where tl is
// scene-local seconds, sc the timeline entry and M the layout mode (M.card = 4:5 carousel still).
// Coordinates are authored for the Reel: important content stays inside the IG safe area
// (y 220..1540, x < 960), centred on CX. The carousel re-lays the same drawing into 1080x1350
// (main.js shifts the content block and adds card-only text); a scene may return abs:true to
// supply its own card layout instead.
// EVENTS[id](sc) lists the scene's sound cues with the same timing maths as the drawing.
// Colour roles: teal = the learner's own path / autonomy; vermilion = dependency (等答案、答案機器、卡點).

const CX = 510;
const ls = (sc, i) => sc.lines[i] ? sc.lines[i].start - sc.start : 0;          // line i start (scene-local)
const le = (sc, i) => sc.lines[i] ? sc.lines[i].start + sc.lines[i].dur - sc.start : 0;
const ld = (sc, i) => sc.lines[i] ? sc.lines[i].dur : 0;
const dur = sc => sc.end - sc.start;
const tIn = (tl, a, d = 0.7) => clamp((tl - a) / d);                             // linear 0..1 ramp for text wipes
const fadeOut = (tl, a, d = 0.4) => 1 - smooth01((tl - a) / d);
function zoom(tl, D, z0, z1, cx = CX, cy = 960) {
  const z = lerp(z0, z1, smooth01(tl / D) * 0.5 + (tl / D) * 0.5);
  return `translate(${cx} ${cy}) scale(${f3(z)}) translate(${-cx} ${-cy})`;
}
const opG = (op, inner) => op <= 0.002 ? '' : op >= 0.998 ? inner : `<g opacity="${f3(op)}">${inner}</g>`;
// point at fraction u along a polyline
function along(pts, u) {
  const L = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); tot += d; }
  let r = clamp(u) * tot;
  for (let i = 0; i < L.length; i++) { if (r <= L[i] || i === L.length - 1) { const k = L[i] ? r / L[i] : 0; return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; } r -= L[i]; }
  return pts[pts.length - 1];
}
const squiggle = (x0, x1, y, seed) => { const r = rng(seed), pts = []; for (let x = x0; x <= x1; x += 14) pts.push([x, y + Math.sin(x * 0.09 + seed) * 5 + (r() - 0.5) * 4]); return pts; };
const tick = (x, y, s, p, c) => S(`M${f1(x - s)} ${f1(y)}L${f1(x - s * 0.3)} ${f1(y + s * 0.7)}L${f1(x + s)} ${f1(y - s)}`, p, { w: 4.5, stroke: c || TH.teal });
const cross = (x, y, s, p, o = {}) => S(handLine([[x - s, y - s], [x + s, y + s]], 2, o.seed ?? 3), st(p, 0, 2), { w: o.w ?? 7, stroke: o.stroke }) + S(handLine([[x + s, y - s], [x - s, y + s]], 2, (o.seed ?? 3) + 1), st(p, 1, 2), { w: o.w ?? 7, stroke: o.stroke });

// ---------------------------------------------------------------- 1. hook
function hookTimes(sc) {
  const L0 = ls(sc, 0), L1 = ls(sc, 1), D1 = ld(sc, 1), r = rng(12);
  const emits = []; for (let t = 0.15; t < L1 - 0.3; t += 0.36) emits.push(t);
  const pile = emits.map((_, i) => [620 + r() * 270, 560 + r() * 330]);
  return { L0, L1, emits, pile, fly: 0.55, card: L1 + 0.25, cut: L1 + D1 * 0.35, split: L1 + D1 * 0.62, bang: L1 + D1 * 0.55, checks: [0, 1, 2, 3].map(i => L1 + D1 * 0.72 + i * 0.2) };
}
const SCENES = {
  hook(tl, sc, M) {
    const D = dur(sc), K = hookTimes(sc);
    let art = '', txt = '';
    // title is already half written on frame 0 (thumbnail + first-second hook)
    txt += Tw(CX, 318, '好的老師，', clamp((tl + 0.5) / 0.8), { size: 76, id: 'h1' });
    txt += Tw(CX, 420, [['最後會讓學生慢慢'], ['不需要你', TH.teal]], clamp((tl + 0.1) / 0.9), { size: 66, id: 'h2' });
    // figures behind a table
    const back = 40 * smooth01((tl - K.L1) / 1.4);
    art += figure(290, 1290, 262, clamp((tl + 0.6) / 1.0), tl, { seed: 3, hair: 'bun', look: 'up', accent: TH.tealL, reachR: 20 });
    art += figure(740 + back, 1290, 280, clamp((tl + 0.4) / 1.0), tl, { seed: 1, reachL: 8 });
    const table = handPoly([[140, 1168], [890, 1166], [890, 1190], [140, 1192]], 1.2, 9, 40);
    art += S(table, clamp((tl + 0.8) / 0.8), { fill: true, w: 2.8 }) + S('M170 1190V1300M860 1190V1300', clamp((tl + 0.8) / 0.8), { w: 2.8 });
    // "?" bubbles: the student asks about every step; they pile up around the teacher
    K.emits.forEach((t0, i) => {
      const u = (tl - t0) / K.fly; if (u < 0) return;
      const [px, py] = K.pile[i], popAt = K.L1 + i * 0.04, pop = clamp((tl - popAt) / 0.18);
      if (pop >= 1) { if (tl - popAt < 0.45) { const k = (tl - popAt - 0.18) / 0.27; for (let a = 0; a < 6; a++) { const an = a / 6 * 6.283; art += S(`M${f1(px + Math.cos(an) * (26 + 18 * k))} ${f1(py + Math.sin(an) * (26 + 18 * k))}l${f1(Math.cos(an) * 10)} ${f1(Math.sin(an) * 10)}`, 1, { w: 2, stroke: TH.red, op: 1 - k }); } } return; }
      const k = easeOut(clamp(u)), sx = 340, sy = 990;
      const x = lerp(sx, px, k), y = lerp(sy, py, k) - Math.sin(Math.PI * k) * 160, s = lerp(0.7, 1.05, k) * (1 - pop);
      art += G(`translate(${f1(x)} ${f1(y)}) scale(${f3(s)})`, bubble(0, 0, 70, 62, 1, { color: TH.red, tx: -18, ty: 44, seed: i }) + T(0, 17, '?', { size: 44, fill: TH.red }));
    });
    // then: a problem card — cut into four, pieces checked off one by one
    const cp = prog(tl, K.card, 0.5), cut = clamp((tl - K.cut) / 0.5), spl = easeOut(clamp((tl - K.split) / 0.4)) * 18;
    if (cp > 0) {
      const Wc = 320, Hc = 220, X0 = CX - Wc / 2, Y0 = 690 + (1 - easeOut(cp)) * 40, mx = X0 + Wc / 2, my = Y0 + Hc / 2;
      if (spl <= 0) {
        art += S(roundRect(X0, Y0, Wc, Hc, 14, 31), cp, { fill: true, w: 3 }) + T(mx, my + 20, '問題', { size: 60, op: cp * (1 - cut) });
      } else {
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => {
          const x = sx < 0 ? X0 : mx, y = sy < 0 ? Y0 : my;
          art += S(roundRect(x + sx * spl, y + sy * spl, Wc / 2, Hc / 2, 10, 40 + i), 1, { fill: true, w: 2.8 }) + tick(x + sx * spl + Wc / 4, y + sy * spl + Hc / 4, 20, prog(tl, K.checks[i], 0.25));
        });
      }
      if (spl <= 0) art += S(handLine([[mx, Y0 - 6], [mx, Y0 + Hc + 6]], 1.5, 5), st(cut, 0, 2), { w: 3, stroke: TH.teal }) + S(handLine([[X0 - 6, my], [X0 + Wc + 6, my]], 1.5, 6), st(cut, 1, 2), { w: 3, stroke: TH.teal });
      const bp = prog(tl, K.bang, 0.3);
      art += bubble(230, 960, 66, 66, bp, { color: TH.teal, tx: 30, ty: 60 }) + T(230, 978, '!', { size: 48, fill: TH.teal, op: bp });
    }
    return { art: G(zoom(tl, D, 1, 1.03, CX, 1000), art), txt };
  },

  // ---------------------------------------------------------------- 2. four boxes: 現況／目標／障礙／限制
  four(tl, sc, M) {
    const D = dur(sc), K = fourTimes(sc);
    let art = '', txt = '';
    txt += Tw(CX, 300, [['他開始'], ['自己拆問題', TH.teal]], tIn(tl, 0, 0.6), { size: 58, id: 'f0' });
    const sp = prog(tl, 0.05, 0.6);
    art += S(roundRect(100, 370, 820, 720, 20, 3), sp, { fill: TH.paper2, w: 3 });
    art += S(handLine([[510, 385], [512, 1075]], 2, 4), prog(tl, 0.3, 0.6), { w: 2.6 }) + S(handLine([[115, 730], [905, 728]], 2, 5), prog(tl, 0.45, 0.6), { w: 2.6 });
    QUADS.forEach(([qx, qy, t1, t2], i) => {
      txt += Tw(qx, qy + 62, t1, tIn(tl, 0.5 + i * 0.15, 0.5), { size: 46, id: 'fq' + i, fill: i === 3 ? TH.faint : TH.ink });
      txt += T(qx, qy + 104, t2, { size: 27, weight: 400, fill: TH.faint, op: prog(tl, 0.7 + i * 0.15, 0.5) });
    });
    // the student writes into 現況, 目標, 障礙 as the narration names them
    let pen = null;
    K.write.forEach(([q, t0], i) => {
      const [qx, qy] = QUADS[q], rows = q === 2 ? 2 : 3;
      for (let r = 0; r < rows; r++) {
        const pts = squiggle(qx - 150, qx + 150 - r * 50, qy + 160 + r * 42, 10 * i + r), a = t0 + r * 0.3, p = clamp((tl - a) / 0.32);
        if (p > 0) art += S(spline(pts), p, { w: 2.4 });
        if (p > 0 && p < 1) pen = along(pts, p);
      }
    });
    // stickies: sorted into 能動 (障礙) and 暫時不能動 (限制)
    K.stick.forEach(([t0, tx, ty, lab, locked], i) => {
      const u = easeOut(clamp((tl - t0) / 0.6)); if (tl < t0 - 0.2) return;
      const x = lerp(510, tx, u), y = lerp(728, ty, u) - Math.sin(Math.PI * u) * 40, s = locked ? 150 : 104;
      art += sticky(x, y, s, prog(tl, t0 - 0.2, 0.25), { color: locked ? TH.paper2 : TH.tealL, rot: (i % 2 ? 4 : -3) * (1 - 0.5 * u), seed: 50 + i });
      txt += T(x, y + (locked ? 30 : 10), lab, { size: locked ? 26 : 28, fill: locked ? TH.faint : TH.teal, op: prog(tl, t0 + 0.2, 0.3) });
      if (locked) art += lockIcon(x, y - 30, 1.2, prog(tl, t0 + 0.3, 0.3));
      else art += tick(x - 26, y - 22, 10, prog(tl, t0 + 0.4, 0.25));
    });
    if (pen) art += G(`translate(${f1(pen[0])} ${f1(pen[1])})`, pen_());
    // the teacher's pen comes in once, leaves one hint, and goes
    const tin = easeOut(clamp((tl - K.hint + 0.6) / 0.6)), tout = smooth01((tl - K.hint - 0.4) / 0.6);
    const hx = lerp(1060, 478, tin) + 620 * tout, hy = 920 - 60 * tout;
    if (tl > K.hint - 0.6 && tout < 1) art += G(`translate(${f1(hx)} ${f1(hy)})`, pen_(TH.red));
    const hp = prog(tl, K.hint, 0.3);
    art += sticky(458, 915, 80, hp, { color: '#f3d98a', rot: 6, seed: 70 }) + T(458, 925, '提示', { size: 26, op: hp });
    txt += Tw(CX, 1180, '不是不找老師，', tIn(tl, K.L2, 0.6), { size: 50, id: 'f5' });
    txt += Tw(CX, 1262, [['而是'], ['不用每一步都等指示', TH.teal]], tIn(tl, K.L2 + K.D2 * 0.45, 0.7), { size: 54, id: 'f6' });
    return { art: G(zoom(tl, D, 1, 1.02, CX, 900), art), txt };
  },

  // ---------------------------------------------------------------- 3. knowing a lot vs teaching this person
  know(tl, sc, M) {
    const D = dur(sc), K = knowTimes(sc);
    let art = '', txt = '';
    const f0 = M.card ? 0 : fadeOut(tl, K.L1 - 0.1, 0.4);
    txt += opG(f0, Tw(CX, 330, [['教學能力 ＝ '], ['知道很多', TH.red], ['？']], tIn(tl, K.L0, 0.7), { size: 62, id: 'k0' }));
    txt += Tw(CX, 290, '難的不是把知識講完，', tIn(tl, K.L1 + 0.2, 0.7), { size: 48, id: 'k1' });
    txt += Tw(CX, 372, [['而是教成'], ['眼前這個人用得上', TH.teal], ['的方法']], tIn(tl, K.L2, 0.9), { size: 52, id: 'k2' });
    const pk = M.card ? 1 : prog(tl, K.L2 + 1.4, 0.6);
    txt += T(CX, 426, 'Shulman（1986）稱這類能力為「學科教學知識」（PCK）：', { size: 24, weight: 400, fill: TH.faint, op: pk });
    txt += T(CX, 456, '懂得用什麼方式表達，讓特定的學生能理解。', { size: 24, weight: 400, fill: TH.faint, op: pk });
    // left: knows a lot — books pile up, papers bury the student
    txt += Tw(270, 545, '知道很多', tIn(tl, K.L0 + 0.3, 0.5), { size: 36, fill: TH.faint, id: 'k3' });
    art += figure(150, 1080, 300, prog(tl, 0.1, 0.9), tl, { seed: 1, reachR: 14 });
    art += figure(425, 1080, 250, prog(tl, 0.3, 0.9), tl, { seed: 3, hair: 'bun', look: 'up', accent: TH.tealL });
    const nb = Math.floor(clamp((tl - K.L0) / 2.4) * 8 + 0.0001);
    for (let i = 0; i < Math.min(8, nb + 1); i++) {
      const bt = K.L0 + i * 0.3, bp = prog(tl, bt, 0.25); if (bp <= 0) continue;
      const drop = (1 - easeOut(clamp((tl - bt) / 0.25))) * -60;
      art += book(290 + (i % 2 ? 5 : -4), 1080 - i * 38 + drop, 130, 38, bp, { seed: 80 + i, color: i % 3 === 0 ? TH.tealL : TH.paper2 });
    }
    const pile = clamp((tl - K.L1) / (K.L2 - K.L1));
    if (pile > 0) art += S(handPoly([[358, 1080], [358, 1080 - 200 * pile], [496, 1082 - 200 * pile], [496, 1080]], 1, 91), 1, { fill: TH.fill, w: 2.4 }) +
      S(Array.from({ length: Math.floor(pile * 10) }, (_, i) => `M364 ${1072 - i * 19}h126`).join(''), 1, { w: 1.2, op: 0.5 });
    K.sheets.forEach((t0, i) => {
      const u = (tl - t0) / 0.6; if (u < 0 || u > 1) return;
      const x = lerp(290, 427, u), y = lerp(780, 1060 - 200 * pile, u) - Math.sin(Math.PI * u) * 80;
      art += G(at(x, y, 1, 1, lerp(-20, 25, u) + i * 7), S(handPoly([[-26, -18], [26, -18], [26, 18], [-26, 18]], 0.8, 100 + i), 1, { fill: true, w: 1.8 }) + S('M-18 -6h36M-18 4h28', 1, { w: 1, op: 0.5 }));
    });
    // right: teaching this person — circle the one stuck step, re-explain it, then it clicks
    const rp = prog(tl, K.L2 - 0.2, 0.7);
    txt += Tw(750, 545, '教給這個人', tIn(tl, K.L2, 0.5), { size: 36, fill: TH.teal, id: 'k4' });
    if (rp > 0) {
      art += S(roundRect(585, 580, 330, 480, 16, 5), rp, { fill: TH.paper2, w: 2.6 });
      ['①', '②', '③', '④'].forEach((n, i) => {
        const y = 660 + i * 100;
        txt += T(625, y + 12, n, { size: 34, op: rp, weight: 400 });
        art += S(spline(squiggle(660, 800 - (i % 2) * 30, y, 30 + i)), rp, { w: 2 });
      });
      art += tick(862, 660, 14, prog(tl, K.L2 + 0.3, 0.25)) + tick(862, 760, 14, prog(tl, K.L2 + 0.5, 0.25));
      const solved = clamp((tl - K.fix) / 0.3);
      txt += T(862, 872, '?', { size: 48, fill: TH.red, op: rp * (1 - solved) });
      art += tick(862, 860, 14, solved) + tick(862, 960, 14, prog(tl, K.fix + 0.4, 0.25));
      art += scribbleRing(745, 860, 175, 50, prog(tl, K.ring, 0.6), { stroke: TH.teal, seed: 7, w: 4 });
      const ap = prog(tl, K.alt, 0.5);
      txt += tag(760, 1110, '換一種說法', ap, { size: 28, color: TH.teal });
    }
    // bottom: everyone gets stuck somewhere different
    K.paths.forEach(([y, fx, t0], i) => {
      const p = prog(tl, t0, 0.5); if (p <= 0) return;
      const x0 = 170, x1 = 890, kx = lerp(x0, x1, fx);
      art += S(ell(128, y, 18, 18, 60 + i), p, { fill: true, w: 2.4 }) + S(handLine([[x0, y], [x1, y + 2]], 1.5, 70 + i, 40), p, { w: 2.2, op: 0.7 });
      const u = easeOut(clamp((tl - t0 - 0.3) / 0.9)), dx = lerp(x0, kx - 26, u) + (u >= 1 ? Math.sin(tl * 9 + i) * 2 : 0);
      art += `<circle cx="${f1(dx)}" cy="${y}" r="9" fill="${TH.teal}" opacity="${f3(p)}"/>` + cross(kx, y, 13, prog(tl, t0 + 0.9, 0.3), { stroke: TH.red, w: 5, seed: 80 + i });
    });
    return { art: G(zoom(tl, D, 1, 1.02, CX, 900), art), txt };
  },

  // ---------------------------------------------------------------- 4. ask instead of answer; the loop travels
  loop(tl, sc, M) {
    const D = dur(sc), K = loopTimes(sc);
    let art = '', txt = '';
    txt += Tw(CX, 305, [['先不急著給'], ['答案', TH.red]], tIn(tl, K.L0 + 0.1, 0.7), { size: 66, id: 'l0' });
    txt += tag(CX, 378, '考照教學・AI 陪跑', prog(tl, K.L0 + ld(sc, 0) * 0.3, 0.5), { size: 28, color: TH.teal });
    // an answer card, turned face-down: not yet
    const fl = clamp((tl - K.flip) / 0.5), cf = M.card ? 0 : fadeOut(tl, K.qs[0][3] - 0.2, 0.4), cA = prog(tl, K.L0 + 0.2, 0.5);
    if (cA > 0 && cf > 0) {
      const c = Math.cos(fl * Math.PI), front = c > 0, slide = 260 * smooth01((tl - K.flip - 0.6) / 0.6);
      const face = S(roundRect(-150, -100, 300, 200, 16, 77), cA, { fill: front ? TH.fill : TH.tealL, w: 3, stroke: front ? TH.red : TH.teal }) +
        (front ? T(0, 22, '答案', { size: 64, fill: TH.red, op: cA }) : T(0, 26, '?', { size: 76, fill: TH.teal }));
      art += opG(cf, G(`translate(${f1(CX + slide)} ${f1(820 + 40 * Math.sin(fl * Math.PI) + Math.sin(tl * 2.2) * 6)}) scale(${f3(Math.max(0.03, Math.abs(c)))} 1) rotate(${f1(-4 + 8 * fl)})`, face));
    }
    // three questions pop up as they are asked, then make room
    const qf = M.card ? 0 : fadeOut(tl, K.L2, 0.4);
    K.qs.forEach(([x, y, s, t0], i) => {
      const p = easeOut(clamp((tl - t0) / 0.3)), w = measure(s, 34) + 44;
      if (p <= 0) return;
      const by = y + Math.sin(tl * 2 + i * 1.7) * 5;
      art += opG(qf, G(`translate(${x} ${f1(by - y)}) translate(0 ${y}) scale(${f3(0.6 + 0.4 * p)})`, bubble(0, 0, w, 70, p, { color: TH.teal, wash: TH.teal, tx: i === 1 ? 0 : (i ? -w * 0.2 : w * 0.2), ty: 58, seed: 20 + i })));
      txt += opG(qf, T(x, by + 12, s, { size: 34, fill: TH.teal, op: p }));
    });
    // "not: ask the teacher next time"
    const nb = M.card ? 1 : tIn(tl, K.L2 + 0.2, 0.8);
    txt += Tw(CX, 575, [['練到的不是「'], ['下次再問老師', TH.red], ['」']], nb, { size: 50, id: 'l1' });
    const sw = measure('下次再問老師', 50), sx0 = CX - measure('練到的不是「下次再問老師」', 50) / 2 + measure('練到的不是「', 50);
    art += S(handLine([[sx0 - 4, 560], [sx0 + sw + 6, 556]], 2, 9, 30), prog(tl, K.strike, 0.35), { w: 5 });
    // 「一開始比較慢」: a snail crawls along until the strike-through
    const sn = M.card ? 0 : prog(tl, K.L2 + 0.1, 0.4) * fadeOut(tl, K.L3, 0.4);
    if (sn > 0) {
      const u = clamp((tl - K.L2) / (K.strike - K.L2 + 0.6)), x = lerp(230, 740, u), y = 820, st_ = Math.sin(tl * 6) * 3;
      art += opG(sn, S(handLine([[150, y + 42], [870, y + 44]], 1.5, 12, 40), 1, { w: 2, op: 0.5 }) + S(handLine([[200, y + 42], [x - 70, y + 42]], 1, 13), 1, { w: 4, stroke: TH.tealL }) +
        G(`translate(${f1(x)} ${y}) scale(1.7)`, S(`M-52 24Q-40 ${f1(10 + st_)} 20 22Q40 22 44 10L50 -8M40 4L46 -12`, 1, { w: 2.6 }) + S(ell(-14, 2, 30, 24, 5), 1, { fill: TH.fill, w: 2.6 }) +
          S('M-14 2m-18 0a18 18 0 1 1 18 18a11 11 0 1 1 -8 -16a5 5 0 1 1 6 6', 1, { w: 2, stroke: TH.teal })));
      txt += opG(sn, T(820, y - 40, '慢慢來', { size: 32, fill: TH.faint, weight: 400 }));
    }
    // the loop: 拆問題 → 判斷 → 試做 → 修正
    const R = 175, cx = CX, cy = 900;
    K.nodes.forEach(([lab, a, t0], i) => {
      const p = prog(tl, t0, 0.35), x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      art += S(ell(x, y, 70, 46, 40 + i), p, { fill: TH.fill, w: 2.8, stroke: TH.teal }) + wash(ell(x, y, 70, 46, 40 + i), TH.tealL, p, 0.35);
      txt += T(x, y + 11, lab, { size: 32, op: p });
      // arrow to the next node
      const a0 = a + 0.42, a1 = a + Math.PI / 2 - 0.42, ap = prog(tl, t0 + 0.2, 0.4);
      const arc = []; for (let k = 0; k <= 10; k++) { const aa = lerp(a0, a1, k / 10); arc.push([cx + Math.cos(aa) * R, cy + Math.sin(aa) * R]); }
      const e = arc[10], e2 = arc[9], dx = e[0] - e2[0], dy = e[1] - e2[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      art += S(spline(arc), ap, { w: 3, stroke: TH.teal }) + S(`M${f1(e[0] - ux * 16 - uy * 9)} ${f1(e[1] - uy * 16 + ux * 9)}L${f1(e[0])} ${f1(e[1])}L${f1(e[0] - ux * 16 + uy * 9)} ${f1(e[1] - uy * 16 - ux * 9)}`, clamp(ap * 2 - 1), { w: 3, stroke: TH.teal });
    });
    const run = tl - K.run;
    if (run > 0) { const a = -Math.PI / 2 + run / 2.4 * Math.PI * 2; art += `<circle cx="${f1(cx + Math.cos(a) * R)}" cy="${f1(cy + Math.sin(a) * R)}" r="11" fill="${TH.teal}" opacity="${f3(clamp(run * 3))}"/>`; }
    // ...and it carries over to the next problem, the next job
    K.cards.forEach(([lab, x, t0], i) => {
      const u = easeOut(clamp((tl - t0) / 0.5)); if (u <= 0) return;
      const xx = x, dy = (1 - u) * 90, w = measure(lab, 36) + 110;   // rises into place (never passes the IG button column)
      art += opG(clamp(u * 2), S(roundRect(xx - w / 2, 1180 + dy, w, 110, 14, 60 + i), 1, { fill: true, w: 2.6 }));
      txt += opG(clamp(u * 2), T(xx + 26, 1248 + dy, lab, { size: 36 }));
      const ip = prog(tl, t0 + 0.55, 0.4), ix = xx - w / 2 + 38;  // loop icon stamped once the card has landed
      art += S(spline(Array.from({ length: 13 }, (_, k) => { const aa = -1.2 + k / 12 * 5.2; return [ix + Math.cos(aa) * 18, 1235 + Math.sin(aa) * 18]; })), ip, { w: 3, stroke: TH.teal }) +
        S(`M${ix + 13} ${1225}l6 -9l5 10`, ip, { w: 3, stroke: TH.teal });
    });
    return { art: G(zoom(tl, D, 1, 1.02, CX, 900), art), txt };
  },

  // ---------------------------------------------------------------- 5. hold on, then let go; CTA checklist
  scaffold(tl, sc, M) {
    const D = dur(sc), K = scafTimes(sc), card = M.card;
    let art = '', txt = '';
    if (card) {
      txt += T(540, 150, '那不是老師失去價值，', { size: 48 });
      txt += T(540, 228, [['而是'], ['教學真的留下來了', TH.teal]], { size: 56 });
      return { art: G('translate(30 0)', ctaCard(0, 300, 1, 1)), txt: txt + G('translate(30 0)', ctaText(0, 300, 1, 1, 40, 1100)), abs: true };
    }
    // top lines change with the narration
    const tA = fadeOut(tl, K.L1 - 0.1), tB = clamp((tl - K.L1) / 0.4) * fadeOut(tl, K.L3 - 0.1);
    txt += opG(tA, Tw(CX, 300, [['不是永遠在線的'], ['答案機器', TH.red]], tIn(tl, K.L0, 0.7), { size: 56, id: 's0' }));
    txt += opG(tA, Tw(CX, 382, [['也不是'], ['丟著不管', TH.red]], tIn(tl, K.L0 + ld(sc, 0) * 0.6, 0.6), { size: 56, id: 's1' }));
    txt += opG(tB, Tw(CX, 320, [['先扶一段，'], ['站穩了再慢慢放手', TH.teal]], tIn(tl, K.L1, 0.9), { size: 54, id: 's2' }));
    txt += opG(tB, Tw(CX, 398, '他不再事事需要你，但會帶著具體的問題回來', tIn(tl, K.L2, 1.0), { size: 36, weight: 400, id: 's3' }));
    txt += Tw(CX, 300, '那不是老師失去價值，', tIn(tl, K.L3, 0.7), { size: 50, id: 's4' });
    txt += Tw(CX, 382, [['而是'], ['教學真的留下來了', TH.teal]], tIn(tl, K.L3 + ld(sc, 3) * 0.45, 0.8), { size: 58, id: 's5' });
    const artOp = fadeOut(tl, K.cta, 0.5);
    let a = '';
    // two things good teaching is not: an answer vending machine / walking away
    const iop = tl < K.L1 ? 1 : tl < K.L2 ? 0.25 : fadeOut(tl, K.L2, 0.4) * 0.25;
    let icons = vendingMachine(300, 760, prog(tl, K.L0, 0.8), tl);
    for (let i = 0; i < 5; i++) { const t0 = K.L0 + 0.6 + i * 0.45, u = (tl - t0) / 0.7; if (u < 0 || u > 1) continue;
      icons += G(at(300 + 110 * u, 730 + 60 * u * u, 1, 1, 30 * u), S(roundRect(-24, -16, 48, 32, 5, 90 + i), 1, { fill: TH.fill, w: 2, stroke: TH.red }) + T(0, 8, '答', { size: 20, fill: TH.red })); }
    icons += cross(300, 630, 110, prog(tl, K.x1, 0.35));
    const walk = clamp((tl - K.L0 - ld(sc, 0) * 0.55) / 1.2);
    icons += figure(640, 760, 130, prog(tl, K.L0 + 0.6, 0.6), tl, { seed: 3, hair: 'bun', look: 'up' }) + figure(740 + 110 * walk, 760 - Math.abs(Math.sin(walk * 12)) * 4, 170, prog(tl, K.L0 + 0.5, 0.6), tl, { seed: 1 });
    icons += bubble(640, 560, 56, 54, prog(tl, K.L0 + ld(sc, 0) * 0.6, 0.3), { color: TH.red, tx: -6, ty: 44 }) + T(640, 575, '?', { size: 40, fill: TH.red, op: prog(tl, K.L0 + ld(sc, 0) * 0.6, 0.3) });
    icons += cross(740, 630, 110, prog(tl, K.x2, 0.35), { seed: 7 });
    a += opG(iop, icons);
    // the path: walk together, teacher lets go, student walks on and leaves footprints
    const GY = 1180, W = walkState(tl, K);
    a += S(handLine([[80, GY + 8], [400, GY + 12], [700, GY + 6], [950, GY + 10]], 3, 11, 50), prog(tl, K.L1 - 0.4, 0.8), { w: 2.8 });
    for (const [x, sd] of [[350, 1], [600, 2]]) a += S(`M${x} ${GY + 8}v-40`, prog(tl, K.L1 - 0.2, 0.5), { w: 2.4, op: 0.6 }) + S(handPoly([[x, GY - 32], [x + 30, GY - 26], [x, GY - 20]], 0.6, sd), prog(tl, K.L1, 0.5), { fill: TH.tealL, w: 1.8 });
    const glow = prog(tl, K.L3 + 0.3, 1.2);
    for (let fx = 170, i = 0; fx < W.sx - 20; fx += 38, i++) a += footprint(fx, GY + (i % 2 ? 20 : 34), 1, { left: i % 2 === 0, rot: 90, s: 0.9, color: glow > 0 ? TH.teal : TH.faint });
    if (glow > 0) a += wash(`M150 ${GY + 8}L${f1(W.sx)} ${GY + 8}L${f1(W.sx)} ${GY + 48}L150 ${GY + 48}Z`, TH.tealL, glow, 0.35);
    const fp = prog(tl, K.L1 - 0.3, 0.8);
    a += figure(W.tx, GY - W.tb, 236, fp, tl, { seed: 1, reachR: W.hold ? 22 : 0, reachRy: W.hold ? 4 : 0, reachL: W.point ? 0 : 0 });
    a += figure(W.sx, GY - W.sb, 196, fp, tl, { seed: 3, hair: 'bun', look: 'up', accent: TH.tealL, reachL: W.hold ? 20 : 0 });
    if (W.hold) a += S(`M${f1(W.tx + 60)} ${f1(GY - 75)}Q${f1((W.tx + W.sx) / 2)} ${f1(GY - 60)} ${f1(W.sx - 55)} ${f1(GY - 60)}`, 1, { w: 2.6 });
    if (W.point > 0) a += S(`M${f1(W.tx + 50)} ${f1(GY - 130)}L${f1(W.tx + 120)} ${f1(GY - 150)}`, W.point, { w: 2.6 }) + S(`M${f1(W.tx + 106)} ${f1(GY - 160)}L${f1(W.tx + 122)} ${f1(GY - 150)}L${f1(W.tx + 108)} ${f1(GY - 138)}`, W.point, { w: 2.6 });
    // the specific question comes back
    const q = clamp((tl - K.ask) / 0.9);
    if (q > 0) {
      const k = easeOut(q), x = lerp(W.sx - 40, W.tx + 60, k), y = lerp(GY - 230, GY - 240, k) - Math.sin(Math.PI * k) * 120;
      const lab = '這一步我卡住了', w = measure(lab, 28) + 34;
      a += bubble(x, y, w, 58, 1, { color: TH.teal, wash: TH.teal, tx: 0, ty: 46 });
      a += T(x, y + 10, lab, { size: 28, fill: TH.teal });
      a += tick(W.tx, GY - 330, 14, prog(tl, K.ask + 1.0, 0.3));
    }
    art += opG(artOp, a);
    // CTA: a checklist to save
    if (tl > K.cta - 0.05) {
      const cp = prog(tl, K.cta, 0.6);
      art += ctaCard(K.cta, 520, cp, tl);
      txt += ctaText(K.cta, 520, cp, tl, 64, 1368);
    }
    return { art, txt };
  },
};

// CTA checklist card. t0 = when it starts (scene-local), y0 = card top; tl = time, or 1 for the finished card.
function ctaCard(t0, y0, p, tl, sx, sy) {
  let o = S(roundRect(120, y0, 780, 640, 22, 9), p, { fill: TH.fill, w: 3 }) + wash(roundRect(120, y0, 780, 640, 22, 9), TH.tealL, p, 0.12);
  CTA_ITEMS.forEach((s, i) => { const y = y0 + 262 + i * 98; o += checkbox(190, y, 44, p, tl === 1 ? 1 : prog(tl, t0 + 0.7 + i * 0.4, 0.3), { seed: 30 + i }); });
  return o;
}
function ctaText(t0, y0, p, tl, sx, sy) {
  let o = T(CX, y0 + 86, '下次教人之前，', { size: 44, op: p }) + T(CX, y0 + 146, [['先請他說出：', TH.teal]], { size: 44, op: p });
  CTA_ITEMS.forEach((s, i) => { o += T(262, y0 + 262 + i * 98 - 6, s, { size: 44, anchor: 'start', op: p }); });
  const srcOp = tl === 1 ? 1 : prog(tl, t0 + 0.6, 0.6);
  wrapLines(SOURCES.join(''), 21, 840).forEach((s, i) => { o += T(sx, sy + i * 28, s, { size: 21, weight: 400, fill: TH.faint, anchor: 'start', op: srcOp }); });
  return o;
}
const CTA_ITEMS = ['現在發生什麼？', '想做到哪裡？', '卡在哪裡？', '下一步想試什麼？'];
const QUADS = [[305, 370, '現況', '現在發生什麼？'], [715, 370, '目標', '想做到哪裡？'], [305, 730, '障礙', '卡在哪？（自己能動的）'], [715, 730, '限制', '暫時不能動的']];
function pen_(color) { const b = handPoly([[0, 0], [14, -26], [150, -110], [166, -92], [30, -8]], 1, 41); return S(b, 1, { fill: true, w: 2.4 }) + wash(b, color || TH.teal, 1, 0.35) + S('M0 0L14 -26M22 -18L158 -101', 1, { w: 1.4, op: 0.6 }); }

// clipped left-to-right reveal (for handwriting)
function wipeG(id, x, y, w, h, p, inner) {
  return `<clipPath id="${id}"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(0, w * p))}" height="${f1(h)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
}
function wrapLines(str, size, maxW) {
  // tokens: numbers/latin runs stay whole (never "10,434.4 / 7"); closing punctuation never starts a line
  const toks = str.match(/[0-9A-Za-z.,\/()–-]+|\n|./gu), out = []; let cur = '';
  for (const k of toks) {
    if (k === '\n') { out.push(cur); cur = ''; continue; }
    if (measure(cur + k, size, 400) > maxW && !'，。、；：）」'.includes(k)) { out.push(cur.trimEnd()); cur = k.trimStart(); } else cur += k;
  }
  if (cur) out.push(cur); return out;
}
const SOURCES = [
  '資料來源｜Shulman, L. S. (1986). Those who understand: Knowledge growth in teaching. Educational Researcher, 15(2), 4–14.\n',
  'Shulman, L. S. (1987). Knowledge and teaching: Foundations of the new reform. Harvard Educational Review, 57(1), 1–22.\n',
  '「現況／目標／障礙／限制」拆題架構與教學經驗為作者個人整理；本片為教學觀點分享，非研究結論。',
];

// ---- shared timing (drawing + sound cues use the same numbers) ----
function fourTimes(sc) {
  const L0 = ls(sc, 0), D0 = ld(sc, 0), L1 = ls(sc, 1), D1 = ld(sc, 1), L2 = ls(sc, 2), D2 = ld(sc, 2);
  return { L0, L1, L2, D2, write: [[0, L0 + D0 * 0.05], [1, L0 + D0 * 0.4], [2, L0 + D0 * 0.72]],
    stick: [[L1 + D1 * 0.1, 230, 995, '能動', false], [L1 + D1 * 0.3, 380, 1000, '能動', false], [L1 + D1 * 0.62, 715, 950, '暫時不能動', true]], hint: L2 + D2 * 0.2 };
}
function knowTimes(sc) {
  const L0 = ls(sc, 0), L1 = ls(sc, 1), L2 = ls(sc, 2), D2 = ld(sc, 2), L3 = ls(sc, 3), D3 = ld(sc, 3);
  const sheets = []; for (let t = L1 + 0.1; t < L2 - 0.3; t += 0.32) sheets.push(t);
  return { L0, L1, L2, L3, sheets, ring: L2 + D2 * 0.35, alt: L2 + D2 * 0.55, fix: L2 + D2 * 0.8,
    paths: [[1175, 0.32, L3 + 0.05], [1245, 0.74, L3 + D3 * 0.25], [1315, 0.52, L3 + D3 * 0.5]] };
}
function loopTimes(sc) {
  const L0 = ls(sc, 0), L1 = ls(sc, 1), D1 = ld(sc, 1), L2 = ls(sc, 2), D2 = ld(sc, 2), L3 = ls(sc, 3), D3 = ld(sc, 3), L4 = ls(sc, 4), D4 = ld(sc, 4);
  return { L0, L1, L2, L3, L4, flip: L0 + ld(sc, 0) * 0.62,
    qs: [[230, 520, '你看到什麼？', L1 + D1 * 0.3], [510, 612, '想做到哪？', L1 + D1 * 0.57], [790, 520, '卡在哪一段？', L1 + D1 * 0.8]],
    strike: L2 + D2 * 0.82,
    nodes: [['拆問題', -Math.PI / 2, L3 + D3 * 0.12], ['判斷', 0, L3 + D3 * 0.38], ['試做', Math.PI / 2, L3 + D3 * 0.55], ['修正', Math.PI, L3 + D3 * 0.8]],
    run: L3 + D3 + 0.1,
    cards: [['下一題', 300, L4 + D4 * 0.5], ['下一個工作', 700, L4 + D4 * 0.78]] };
}
function scafTimes(sc) {
  const L0 = ls(sc, 0), D0 = ld(sc, 0), L1 = ls(sc, 1), D1 = ld(sc, 1), L2 = ls(sc, 2), D2 = ld(sc, 2), L3 = ls(sc, 3);
  return { L0, L1, L2, L3, D1, x1: L0 + D0 * 0.5, x2: L0 + D0 * 0.95, w0: L1 + 0.1, w1: L1 + D1 * 0.5, w2: L1 + D1 + 0.2, w3: L2 + D2 * 0.35,
    ask: L2 + D2 * 0.6, cta: le(sc, 3) + 0.35 };
}
// where the teacher (tx) and the student (sx) are; hold = walking hand in hand; point = teacher points ahead
function walkState(tl, K) {
  const seg = (a, b, x0, x1) => lerp(x0, x1, smooth01((tl - a) / (b - a)));
  let sx = 150, tx = 70, hold = true, point = 0;
  if (tl >= K.w0) sx = seg(K.w0, K.w1, 150, 350);
  if (tl >= K.w1) sx = seg(K.w1, K.w2, 350, 600);
  if (tl >= K.w2) sx = seg(K.w2, K.w3, 600, 820);
  tx = tl < K.w1 ? sx - 90 : seg(K.w1, K.w1 + 0.8, 260, 300);
  hold = tl < K.w1;
  point = tl >= K.w1 ? prog(tl, K.w1 + 0.9, 0.4) * (tl < K.w2 + 0.6 ? 1 : fadeOut(tl, K.w2 + 0.6)) : 0;
  const moving = (tl > K.w0 && tl < K.w3) ? 1 : 0;
  return { sx, tx, hold, point, sb: moving * Math.abs(Math.sin(tl * 9)) * 4, tb: (hold && moving) * Math.abs(Math.sin(tl * 9 + 1)) * 4 };
}

// Sound cues per scene (scene-local times). kinds are rendered by tools/audio.py.
const EVENTS = {
  hook(sc) {
    const K = hookTimes(sc), ev = [];
    K.emits.forEach((t, i) => ev.push({ t, kind: 'blip', g: 0.35, n: i % 3 }));
    K.emits.forEach((_, i) => ev.push({ t: K.L1 + i * 0.04 + 0.12, kind: 'pop', g: 0.35 }));
    ev.push({ t: K.card, kind: 'page', g: 0.6 }, { t: K.cut, kind: 'scribble', g: 0.6, d: 0.5 }, { t: K.split, kind: 'click', g: 0.7 }, { t: K.bang, kind: 'chime', g: 0.5 });
    K.checks.forEach(t => ev.push({ t, kind: 'tick', g: 0.6 }));
    return ev;
  },
  four(sc) {
    const K = fourTimes(sc), ev = [{ t: 0.05, kind: 'page', g: 0.5 }];
    K.write.forEach(([q, t0]) => ev.push({ t: t0, kind: 'write', g: 0.6, d: (q === 2 ? 2 : 3) * 0.3 + 0.1 }));
    K.stick.forEach(([t0, , , , locked]) => { ev.push({ t: t0, kind: 'whoosh', g: 0.3 }); ev.push({ t: t0 + 0.55, kind: locked ? 'stop' : 'clack', g: locked ? 0.4 : 0.5 }); });
    ev.push({ t: K.hint, kind: 'pop', g: 0.6 });
    return ev;
  },
  know(sc) {
    const K = knowTimes(sc), ev = [];
    for (let i = 0; i < 8; i++) ev.push({ t: K.L0 + i * 0.3 + 0.25, kind: 'thump', g: 0.35 });
    K.sheets.forEach(t => ev.push({ t, kind: 'whoosh', g: 0.2 }));
    ev.push({ t: K.ring, kind: 'scribble', g: 0.5, d: 0.6 }, { t: K.fix, kind: 'tick', g: 0.7 }, { t: K.fix + 0.4, kind: 'tick', g: 0.6 });
    K.paths.forEach(([, , t0]) => ev.push({ t: t0 + 0.9, kind: 'clack', g: 0.5 }));
    return ev;
  },
  loop(sc) {
    const K = loopTimes(sc), ev = [];
    ev.push({ t: K.flip, kind: 'page', g: 0.6 });
    K.qs.forEach(([, , , t], i) => ev.push({ t, kind: 'blip', g: 0.5, n: i }));
    ev.push({ t: K.strike, kind: 'strike', g: 0.8 });
    K.nodes.forEach(([, , t]) => ev.push({ t, kind: 'pop', g: 0.5 }));
    ev.push({ t: K.run, kind: 'chime', g: 0.4 });
    K.cards.forEach(([, , t]) => { ev.push({ t, kind: 'whoosh', g: 0.4 }); ev.push({ t: t + 0.55, kind: 'tick', g: 0.5 }); });
    return ev;
  },
  scaffold(sc) {
    const K = scafTimes(sc), ev = [{ t: K.x1, kind: 'strike', g: 0.6 }, { t: K.x2, kind: 'strike', g: 0.6 }];
    for (let t = K.w0; t < K.w3; t += 0.34) ev.push({ t, kind: 'step', g: 0.3 });
    ev.push({ t: K.ask, kind: 'whoosh', g: 0.4 }, { t: K.ask + 1.0, kind: 'tick', g: 0.6 }, { t: K.L3 + 0.3, kind: 'chime', g: 0.5 });
    ev.push({ t: K.cta, kind: 'page', g: 0.7 });
    CTA_ITEMS.forEach((_, i) => ev.push({ t: K.cta + 0.7 + i * 0.4, kind: 'write', g: 0.5, d: 0.3 }));
    return ev;
  },
};
