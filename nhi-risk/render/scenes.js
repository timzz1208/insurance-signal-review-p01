// Scene compositions for a 1080x1920 Reel. Each scene is f(tl, sc, M) -> { art, txt }, where tl is
// scene-local seconds, sc the timeline entry and M the layout mode (M.card = 4:5 carousel still).
// Coordinates are authored for the Reel: important content stays inside the IG safe area
// (y 220..1540, x < 960), centred on CX. The carousel re-lays the same drawing into 1080x1350
// (main.js shifts the content block and adds card-only text); a scene may return abs:true to
// supply its own card layout instead.
// EVENTS[id](sc) lists the scene's sound cues with the same timing maths as the drawing.

const CX = 510;
const ls = (sc, i) => sc.lines[i] ? sc.lines[i].start - sc.start : 0;          // line i start (scene-local)
const le = (sc, i) => sc.lines[i] ? sc.lines[i].start + sc.lines[i].dur - sc.start : 0;
const dur = sc => sc.end - sc.start;
const tIn = (tl, a, d = 0.7) => clamp((tl - a) / d);                             // linear 0..1 ramp for text wipes
function zoom(tl, D, z0, z1, cx = CX, cy = 960) {
  const z = lerp(z0, z1, smooth01(tl / D) * 0.5 + (tl / D) * 0.5);
  return `translate(${cx} ${cy}) scale(${f3(z)}) translate(${-cx} ${-cy})`;
}
const shake = (tl, hits) => { let dx = 0, dy = 0; for (const [t0, a] of hits) { const u = tl - t0; if (u >= 0 && u < 0.45) { const e = Math.exp(-u * 9) * a; dx += Math.sin(u * 95) * e; dy += Math.cos(u * 77) * e * 0.8; } } return [dx, dy]; };

// ---------------------------------------------------------------- 1. cover
const COVER_ROWS = ['$1,043,', '447,000,', '000,000'], COVER_Y = [470, 680, 890], COVER_SIZE = 178;
function coverTimes(sc) {
  const land = COVER_ROWS.map(() => 0.2);   // the whole block slams down together; already falling on frame 0
  const settle = []; let g = 0;
  COVER_ROWS.forEach((row, r) => [...row].forEach((c, i) => { settle.push(/\d/.test(c) ? 0.4 + (g++) * 0.07 : -1); }));
  return { land, settle, punch: 0.4 + g * 0.07 + 0.12, L0: ls(sc, 0), L1: ls(sc, 1) };
}
const SCENES = {
  cover(tl, sc, M) {
    const K = coverTimes(sc), frame = Math.round((tl + sc.start) * 30);
    const [sx, sy] = shake(tl, [[K.land[0], 16], [K.punch, 16]]);
    const punch = tl > K.punch ? 1 + 0.07 * Math.exp(-(tl - K.punch) * 10) : 1;
    let num = '', gi = 0;
    COVER_ROWS.forEach((row, r) => {
      const u = clamp((tl - (K.land[r] - 0.3)) / 0.3), drop = (1 - u * u) * -700, squash = u >= 1 ? 1 + 0.08 * Math.exp(-(tl - K.land[r]) * 14) * Math.cos((tl - K.land[r]) * 30) : 1;
      if (u <= 0) { gi += row.length; return; }
      const ws = [...row].map(c => measure(c, COVER_SIZE)), total = ws.reduce((a, b) => a + b, 0);
      let x = CX - total / 2, g = '';
      [...row].forEach((c, i) => {
        const set = K.settle[gi + i];
        let ch = c, col = TH.ink, sc2 = 1;
        if (set > 0) {
          if (tl < set) { ch = String(Math.floor(hashf(frame * 31 + gi + i, 7) * 10)); col = TH.faint; }
          else sc2 = 1 + 0.28 * Math.exp(-(tl - set) * 16);
        } else if (c === ',') col = TH.faint; else if (c === '$') col = TH.teal;
        const cx = x + ws[i] / 2;
        g += G(`translate(${f1(cx)} ${COVER_Y[r] - 70}) scale(${f3(sc2)}) translate(${f1(-cx)} ${-(COVER_Y[r] - 70)})`, T(cx, COVER_Y[r], ch, { size: COVER_SIZE, fill: col }));
        x += ws[i];
      });
      gi += row.length;
      num += G(`translate(0 ${f1(drop)}) translate(${CX} ${COVER_Y[r]}) scale(1 ${f3(1 / squash)}) translate(${-CX} ${-COVER_Y[r]})`, g);
    });
    // hand-drawn bracket lines framing the number once it lands
    const bp = prog(tl, K.punch - 0.2, 0.6);
    let art = S(handLine([[90, 280], [90, 930]], 2, 3, 40), bp, { w: 3, op: 0.6 }) + S(handLine([[930, 280], [930, 930]], 2, 4, 40), bp, { w: 3, op: 0.6 }) +
      S('M90 280h28M90 930h28M930 280h-28M930 930h-28', bp, { w: 3, op: 0.6 });
    art += wash(`M100 ${COVER_Y[2] + 40}L920 ${COVER_Y[2] + 34}L920 ${COVER_Y[2] + 54}L100 ${COVER_Y[2] + 58}Z`, TH.teal, prog(tl, K.punch, 0.5), 0.35);
    const numG = G(`translate(${f1(sx)} ${f1(sy)}) translate(${CX} 680) scale(${f3(punch)}) translate(${-CX} -680)`, num);
    const w2 = measure('自己準備醫療費', 76), l2x = CX - (w2 + measure('？', 76)) / 2;
    let txt = numG;
    txt += Tw(CX, 1050, [['明年健保總額 首度破 '], ['1 兆', TH.teal]], tIn(tl, K.L0 + 0.1, 0.8), { size: 76, id: 'c1' });
    txt += Tw(CX, 1108, '116 年度健保總額協商共識 10,434.47 億元（待衛福部核定）', tIn(tl, K.L0 + 1.0, 0.8), { size: 26, weight: 400, fill: TH.faint, id: 'c2' });
    txt += Tw(CX, 1222, '為什麼你還是可能要', tIn(tl, K.L1, 0.6), { size: 64, id: 'c3' });
    txt += Tw(CX, 1310, [['自己準備醫療費', TH.red], ['？']], tIn(tl, K.L1 + 0.5, 0.7), { size: 76, id: 'c4' });
    txt += underline(l2x, l2x + w2, 1334, prog(tl, K.L1 + 1.3, 0.45), { seed: 6 });
    return { art: G(`translate(${f1(sx)} ${f1(sy)})`, art), txt };
  },

  // ---------------------------------------------------------------- 2. myth
  myth(tl, sc, M) {
    const D = dur(sc), L0 = ls(sc, 0), L1 = ls(sc, 1);
    let art = '', txt = '';
    // headline:  健保有錢 ≠ 你的醫療全部免費
    txt += Tw(CX, 345, [['健保'], ['有錢', TH.teal]], tIn(tl, L0, 0.6), { size: 96, id: 'm1' });
    const ne = clamp((tl - L0 - 0.42) / 0.55);   // linear: the pen keeps moving
    art += S(handLine([[CX - 60, 402], [CX + 60, 400]], 1.2, 2), st(ne, 0, 3), { w: 7 }) + S(handLine([[CX - 60, 432], [CX + 60, 430]], 1.2, 3), st(ne, 1, 3), { w: 7 }) +
      S(handLine([[CX + 28, 378], [CX - 28, 456]], 1, 4), st(ne, 2, 3), { w: 7 });
    txt += Tw(CX, 540, '你的醫療全部免費', tIn(tl, L0 + 0.95, 0.8), { size: 80, id: 'm2' });
    // the split line
    const sp = prog(tl, L0 + 2.0, 0.8);
    art += S(handLine([[CX, 610], [CX + 6, 900], [CX - 4, 1100], [CX, 1330]], 3, 9, 30), sp, { w: 3.4 });
    // left: public spending grows (real totals, in 億元)
    const vals = [['114', 9286, '9,286'], ['115', 9883, '9,883'], ['116', 10434, '10,434']];
    txt += Tw(270, 690, [['公共醫療支出 '], ['↑', TH.teal]], tIn(tl, L1, 0.6), { size: 42, id: 'm3' });
    vals.forEach(([yr, v, s], i) => {
      const x = 185 + i * 85, g = prog(tl, L1 + 0.2 + i * 0.35, 1.0), h = 400 * v / 10434 * easeOut(g);
      const bar = handPoly([[x - 29, 1230], [x - 29, 1230 - h], [x + 29, 1230 - h], [x + 29, 1230]], 1, 60 + i, 24);
      if (g > 0) art += wash(bar, TH.teal, 1, 0.22 + i * 0.12) + S(bar, 1, { w: 2.6, stroke: TH.teal });
      txt += T(x, 1272, yr, { size: 28, op: clamp(g * 3), fill: TH.faint }) + T(x, 1230 - h - 14, s, { size: 25, op: clamp(g * 2 - 1) });
    });
    txt += T(140, 1312, '年度　（億元）', { size: 22, weight: 400, fill: TH.faint, anchor: 'start', op: prog(tl, L1 + 0.6, 0.6) });
    const ap = prog(tl, L1 + 1.3, 0.7);
    art += S(handLine([[150, 796], [270, 772], [392, 734]], 2, 6), ap, { w: 5, stroke: TH.teal }) + S(handLine([[362, 724], [396, 732], [380, 764]], 1, 7), clamp(ap * 2 - 1), { w: 5, stroke: TH.teal });
    // right: out-of-pocket never went away — the wallet keeps thinning
    txt += Tw(750, 690, [['個人'], ['自費', TH.red], ['仍存在']], tIn(tl, L1 + 0.1, 0.6), { size: 42, id: 'm4' });
    const thin = prog(tl, L1 + 0.6, Math.max(1, D - L1 - 0.9));
    const wp = prog(tl, L1 + 0.1, 0.8);
    art += G('translate(750 1040)', wallet(wp, 1 - 0.8 * thin));
    MYTH_NOTES(sc).forEach((t0, i) => {
      const u = (tl - t0) / 1.1; if (u < 0 || u > 1) return;
      const x = 750 + (i % 2 ? 1 : -1) * 150 * easeOut(u), y = 1000 - 260 * easeOut(u) + 60 * u * u;
      art += `<g opacity="${f3(1 - smooth01((u - 0.6) / 0.4))}">${G(at(x, y, 0.8, 1, (i % 2 ? 1 : -1) * 40 * u), note(1))}</g>`;
      txt += T(x + 70, y - 30, '−', { size: 44, fill: TH.red, op: 1 - u });
    });
    txt += tag(750, 1262, '藥費・差額・自費項目', prog(tl, L1 + 1.6, 0.6), { size: 30 });
    return { art: G(zoom(tl, D, 1, 1.03), art), txt };
  },

  // ---------------------------------------------------------------- 3. costs
  costs(tl, sc, M) {
    const D = dur(sc), K = costTimes(sc);
    let art = '', txt = '';
    const cell = (x, y, inner, lab, tg, t0, tt, pulse) => {
      txt += Tw(x, y + 165, lab, tIn(tl, t0 + 0.2, 0.6), { size: 46, id: 'k' + lab.length + x });
      txt += tag(x, y + 225, tg, prog(tl, tt, 0.5), { size: 32, pulse });
      art += G(`translate(${x} ${y})`, inner);
    };
    const pulse = 1 + 0.12 * Math.sin(Math.PI * clamp((tl - K.band - 1.2) / 0.5));
    cell(280, 450, pillBottle(prog(tl, K.a, 1.0), tl, prog(tl, K.pop, 0.9)), '新藥', '未給付前：自費', K.a, K.a + 1.9, pulse);
    const e = prog(tl, K.expand, 0.8);
    cell(740, 450, stent(prog(tl, K.b, 0.9), e) + G('translate(96 -70)', priceTag(prog(tl, K.expand, 0.5), Math.sin((tl - K.expand) * 4) * 14 * Math.exp(-Math.max(0, tl - K.expand) * 0.8))), '特殊醫材', '自付差額', K.b, K.b + 1.0, pulse);
    cell(280, 1030, bedRoom(prog(tl, K.c, 1.0), Math.max(0, tl - K.c - 0.6)), '單人病房', '病房費差額', K.c, K.c + 1.0, pulse);
    cell(740, 1030, G('translate(40 0)', payClock(prog(tl, K.d, 1.0), Math.max(0, tl - K.d), K.stop - K.d)), '收入中斷', '收入缺口', K.d, K.stop + 0.2, pulse);
    // the line in the middle
    const bp = tIn(tl, K.band, 0.7);
    txt += Tw(CX, 800, '真正落到家庭身上的，', bp, { size: 54, id: 'kb1' });
    txt += Tw(CX, 882, [['不只有「'], ['醫藥費', TH.teal], ['」']], tIn(tl, K.band + 0.6, 0.7), { size: 66, id: 'kb2' });
    const fl = prog(tl, K.band + 0.2, 0.6);
    art += S(handLine([[80, 842], [180, 840]], 1, 3), fl, { w: 2.4, op: 0.6 }) + S(handLine([[840, 842], [940, 840]], 1, 4), fl, { w: 2.4, op: 0.6 });
    return { art: G(zoom(tl, D, 1, 1.025), art), txt };
  },

  // ---------------------------------------------------------------- 4. umbrella (the slow one)
  umbrella(tl, sc, M) {
    const D = dur(sc), U = umbTimes(sc), { UX, UY, GY } = U;
    const k = U.open(tl), { w, h, surf } = umbrellaGeom(k, 330, 200);
    let art = '', txt = '';
    // text
    txt += Tw(CX, 292, '健保處理的是', tIn(tl, U.L0, 0.6), { size: 46, id: 'u1' });
    txt += Tw(CX, 370, [['「社會一起扛的風險」', TH.teal]], tIn(tl, U.L0 + 0.5, 0.8), { size: 62, id: 'u2' });
    txt += Tw(CX, 452, '個人保障處理的是', tIn(tl, U.L1, 0.6), { size: 46, id: 'u3' });
    txt += Tw(CX, 530, [['「掉到你家裡的那一塊」', TH.red]], tIn(tl, U.L1 + 0.6, 0.8), { size: 62, id: 'u4' });
    // ground + puddle
    art += S(handLine([[40, GY], [400, GY + 3], [700, GY - 2], [1040, GY + 1]], 2, 5, 50), prog(tl, 0, 0.8), { w: 2.6 });
    // rain (behind everything, stops on the canopy)
    const rp = clamp(tl / 0.6), r = rng(77);
    let rainD = '', splash = '';
    for (let i = 0; i < 170; i++) {
      const x = 30 + r() * 1020, v = 1500 + r() * 500, L = 34 + r() * 30, ph = r() * 1200;
      const head = pmod(ph + tl * v, 1200) + 470, tail = head - L;
      const stopY = (k > 0.35 && Math.abs(x - UX) < w) ? UY + surf(x - UX) : GY;
      const y0 = Math.max(tail, 575), y1 = Math.min(head, stopY);
      if (y1 > y0) rainD += `M${f1(x)} ${f1(y0)}L${f1(x)} ${f1(y1)}`;
      const since = (head - stopY) / v;                 // seconds since this drop reached its stop
      if (since > 0 && since < 0.12) { const s = 1 - since / 0.12; splash += `M${f1(x - 3)} ${f1(stopY - 2)}l${f1(-9 * s - 4)} ${f1(-10 * s)}M${f1(x + 3)} ${f1(stopY - 2)}l${f1(9 * s + 4)} ${f1(-10 * s)}`; }
    }
    art += `<path d="${rainD}" stroke="${TH.ink}" stroke-width="2.2" stroke-linecap="round" opacity="${f3(0.5 * rp)}" fill="none"/>`;
    art += `<path d="${splash}" stroke="${TH.ink}" stroke-width="1.4" stroke-linecap="round" opacity="${f3(0.5 * rp)}" fill="none"/>`;
    // family under the umbrella
    const fp = i => prog(tl, 0.6 + i * 0.18, 1.0);
    art += figure(368, GY, 232, fp(0), tl, { seed: 1, reachR: 14, accent: TH.tealL });
    art += figure(282, GY, 150, fp(2), tl, { seed: 3, hair: 'bun', look: 'up', reachR: 10, reachRy: 10 });
    art += figure(578, GY, 214, fp(1), tl, { seed: 2, hair: 'long', skirt: true, reachL: 14 });
    art += figure(660, GY, 118, fp(3), tl, { seed: 4, look: 'up', reachL: 8, reachLy: 8 });
    // umbrella (big stand umbrella: 健保)
    art += G(`translate(${UX} ${UY})`, umbrella(k, GY - UY, prog(tl, 0.1, 0.9), tl, { W: 330, H: 200, stand: true }));
    art += S(`M${UX - 40} ${GY}L${UX} ${GY - 22}L${UX + 40} ${GY}`, prog(tl, 0.1, 0.6), { w: 3.4 });
    txt += T(UX - 150, UY - 58, '健保', { size: 64, fill: '#124a46', op: prog(tl, 1.0, 0.6) * clamp((k - 0.7) / 0.3) });
    // water running along the canopy towards both edges
    const flow = clamp((tl - 1.5) / 0.8);
    if (flow > 0) for (const side of [-1, 1]) {
      const pts = []; for (let i = 0; i <= 24; i++) { const x = side * w * (0.12 + 0.86 * i / 24); pts.push([UX + x, UY + surf(x) - 5]); }
      art += `<path d="${spline(pts)}" pathLength="100" fill="none" stroke="${TH.teal}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="3 7" stroke-dashoffset="${f1(-tl * 26)}" opacity="${f3(0.75 * flow)}"/>`;
    }
    // drips forming at the rims, falling into the bucket (right) and onto the ground (left)
    const level = U.level(tl);
    const rings = [];
    for (const d of U.drips) {
      const ex = UX + d.side * w, grow = clamp((tl - (d.td - 0.5)) / 0.5);
      if (tl < d.td - 0.5 || tl > d.tland + 0.9) continue;
      if (tl < d.td) { const rr = 2 + 6 * grow; art += drop(ex, UY + 2 + rr, rr, 1); continue; }
      if (tl < d.tland) { const y = UY + 8 + 0.5 * U.g * (tl - d.td) ** 2; art += drop(ex, y, 8, 1.4); continue; }
      const u = (tl - d.tland) / 0.9;
      if (d.side > 0) rings.push(u);
      else art += `<ellipse cx="${f1(ex)}" cy="${GY}" rx="${f1(8 + u * 40)}" ry="${f1(3 + u * 8)}" fill="none" stroke="${TH.ink}" stroke-width="1.5" opacity="${f3((1 - u) * 0.7)}"/>`;
      if (u < 0.35) { const s = u / 0.35, yy = d.side > 0 ? d.yland : GY; art += S(`M${f1(ex - 4)} ${f1(yy)}q${f1(-10 - 14 * s)} ${f1(-26 + 20 * s)} ${f1(-22 - 14 * s)} ${f1(-6 + 30 * s)}M${f1(ex + 4)} ${f1(yy)}q${f1(10 + 14 * s)} ${f1(-26 + 20 * s)} ${f1(22 + 14 * s)} ${f1(-6 + 30 * s)}`, 1, { w: 1.8, stroke: TH.teal, op: 1 - s }); }
    }
    art += G(`translate(${U.BX} ${GY})`, bucket(prog(tl, 1.0, 0.9), level, tl, { rings, ringX: UX + w - U.BX }));
    txt += T(U.BX, GY + 44, '現金流', { size: 34, op: prog(tl, 1.6, 0.6) });
    art += scribbleRing(U.BX, GY - 40, 112, 118, prog(tl, U.L1 + 1.0, 0.8), { seed: 8 });
    return { art: G(zoom(tl, D, 1, 1.045, CX, 980), art), txt };
  },

  // ---------------------------------------------------------------- 5. close + CTA
  close(tl, sc, M) {
    const D = dur(sc), K = closeTimes(sc), card = M.card;
    let art = '', txt = '';
    const SPX0 = card ? 390 : 360, SPX1 = card ? 540 : CX, PY = card ? 590 : 800;
    // top statements
    if (card) {
      txt += T(540, 150, '健保越完整，不代表商業保險就不重要。', { size: 44 });
      txt += T(540, 218, '而是你更該搞清楚：', { size: 44 });
      txt += T(540, 292, [['哪些已經有人幫你扛，', TH.teal], ['哪些沒有。', TH.red]], { size: 52 });
    } else {
      const sw = smooth01((tl - K.L1 + 0.1) / 0.4);
      txt += Tw(CX, 300, '健保越完整，', tIn(tl, K.L0, 0.5), { size: 56, op: 1 - sw, id: 'e1' });
      txt += Tw(CX, 378, '不代表商業保險就不重要。', tIn(tl, K.L0 + 0.6, 0.8), { size: 56, op: 1 - sw, id: 'e2' });
      txt += Tw(CX, 290, '而是你更該搞清楚：', tIn(tl, K.L1, 0.5), { size: 50, id: 'e3' });
      txt += Tw(CX, 366, [['哪些已經有人幫你扛，', TH.teal]], tIn(tl, K.L1 + 0.7, 0.7), { size: 56, id: 'e4' });
      txt += Tw(CX, 444, [['哪些沒有。', TH.red]], tIn(tl, K.L1 + 2.0, 0.5), { size: 56, id: 'e5' });
    }
    // the policy booklet: drawn, then flipped open, 保多少？ struck out, 誰付？ written in
    const op = K.open(tl), spine = lerp(SPX0, SPX1, easeOut(op)), bob = Math.sin(tl * 1.4) * 3 * (1 - op);
    const strike = prog(tl, K.strike, 0.4), write = clamp((tl - K.write) / 0.9);
    const rx = 150;  // right page centre (relative to spine)
    let inside = T(rx, -110, '保多少？', { size: 66 }) +
      S(handLine([[rx - 115, -128], [rx, -122], [rx + 118, -132]], 2, 9, 30), strike, { w: 6 }) +
      (write > 0 ? wipeG('whopay' + (card ? 'c' : ''), rx - 120, 10, 250, 120, write, T(rx, 96, '誰付？', { size: 92, fill: TH.teal })) : '') +
      S(handLine([[rx - 95, 124], [rx + 100, 120]], 2, 10, 30), prog(tl, K.write + 0.8, 0.4), { w: 4, stroke: TH.teal });
    const insideLeft = T(-150, -120, '保障內容', { size: 32, fill: TH.faint }) + S('M-250 -70h200M-250 -20h170M-250 30h190M-250 80h140M-250 130h180', 1, { w: 1.6, op: 0.45 });
    art += G(`translate(${f1(spine)} ${f1(PY + bob)})`, policy(prog(tl, K.L0 + 0.2, 1.2), op, { inside, insideLeft }));
    // the pen: strikes through, then writes
    let penX = null, penY = null;
    if (tl > K.strike - 0.4 && tl < K.strike + 0.7) { const u = clamp((tl - K.strike) / 0.4); penX = spine + rx - 115 + 233 * u; penY = PY - 128 + Math.sin(u * 20) * 2; }
    if (tl > K.write - 0.4 && tl < K.write + 1.5) { const u = clamp((tl - K.write) / 0.9); penX = spine + rx - 110 + 220 * u; penY = PY + 70 + Math.sin(u * 40) * 14; }
    if (penX != null) art += G(`translate(${f1(penX)} ${f1(penY)})`, pen());
    // CTA
    const cy = card ? 900 : 1115;
    txt += Tw(card ? 540 : CX, cy, [['下一次看保單，先別問「保多少？」']], card ? 1 : tIn(tl, K.L2, 0.8), { size: 44, id: 'e6' });
    txt += Tw(card ? 540 : CX, cy + 84, [['先問：「這筆風險最後'], ['誰付？', TH.teal], ['」']], card ? 1 : tIn(tl, K.L2 + 2.3, 0.8), { size: 58, id: 'e7' });
    // sources, small print on the last frame
    const sp = card ? 1 : prog(tl, K.end + 0.2, 0.6);
    wrapLines(SOURCES.join(''), 21, card ? 940 : 880).forEach((s, i) => { txt += T(card ? 70 : 66, (card ? 1085 : 1398) + i * 28, s, { size: 21, weight: 400, fill: TH.faint, anchor: 'start', op: sp }); });
    return { art, txt, abs: card };
  },
};
// clipped left-to-right reveal (for handwriting)
function wipeG(id, x, y, w, h, p, inner) {
  return `<clipPath id="${id}"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(0, w * p))}" height="${f1(h)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
}
// greedy character wrap to a pixel width (keeps closing punctuation off the start of a line)
function wrapLines(str, size, maxW) {
  // tokens: numbers/latin runs stay whole (never "10,434.4 / 7"); closing punctuation never starts a line
  const toks = str.match(/[0-9A-Za-z.,\/]+|\n|./gu), out = []; let cur = '';
  for (const k of toks) {
    if (k === '\n') { out.push(cur); cur = ''; continue; }
    if (measure(cur + k, size, 400) > maxW && !'，。、；：）」'.includes(k)) { out.push(cur.trimEnd()); cur = k.trimStart(); } else cur += k;
  }
  if (cur) out.push(cur); return out;
}
function drop(x, y, r, stretch = 1) {
  const d = `M${f1(x)} ${f1(y - r * 1.9 * stretch)}Q${f1(x + r * 1.2)} ${f1(y - r * 0.2)} ${f1(x)} ${f1(y + r)}Q${f1(x - r * 1.2)} ${f1(y - r * 0.2)} ${f1(x)} ${f1(y - r * 1.9 * stretch)}Z`;
  return `<path d="${d}" fill="${TH.tealL}" fill-opacity="0.8" stroke="${TH.teal}" stroke-width="2"/>`;
}
const SOURCES = [
  '資料來源｜健保總額：衛福部全民健康保險會 116 年度總額協商結果（2026/9/23，10,434.47 億元，待衛福部核定）；115 年度 9,883.35 億元、114 年度 9,286.25 億元。',
  '自付差額特材：全民健康保險法第 45 條。病房費差額不列入給付：同法第 51 條第 9 款。新藥納入給付：衛福部中央健康保險署藥物給付項目及支付標準。\n',
  '本內容為觀念說明，不推薦任何保險商品。',
];

// ---- shared timing (drawing + sound cues use the same numbers) ----
function MYTH_NOTES(sc) { const L1 = ls(sc, 1); return [0, 1, 2, 3].map(i => L1 + 0.9 + i * 0.75); }
function costTimes(sc) {
  const L0 = ls(sc, 0), L1 = ls(sc, 1), L2 = ls(sc, 2), L3 = ls(sc, 3);
  return { a: L0 - 0.15, pop: L0 + 1.0, b: L1 - 0.15, expand: L1 + 0.6, c: L1 + 1.45, d: L2 - 0.15, stop: L2 + 1.9, band: L3 };
}
function umbTimes(sc) {
  const D = dur(sc), U = { UX: 470, UY: 800, GY: 1290, BX: 822, g: 2600, L0: ls(sc, 0), L1: ls(sc, 1) };
  U.open = tl => { const u = clamp((tl - 0.15) / 1.3); return clamp(1 - Math.pow(1 - u, 3) * Math.cos(u * 4.2) + 0 * u); };
  const ew = umbrellaGeom(1, 330, 200).w;
  const lvl0 = 0.1, step = 0.045;
  U.drips = [];
  for (let t = 2.3; t < D - 0.6; t += 0.85) U.drips.push({ side: 1, td: t });
  for (let t = 2.75; t < D - 0.6; t += 1.4) U.drips.push({ side: -1, td: t });
  let nR = 0;
  U.drips.sort((a, b) => a.td - b.td).forEach(d => {
    const yl = d.side > 0 ? U.GY - 120 * 0.9 * Math.min(0.6, lvl0 + step * nR) : U.GY;
    d.yland = yl; d.tland = d.td + Math.sqrt(2 * (yl - U.UY - 8) / U.g); d.x = U.UX + d.side * ew;
    if (d.side > 0) nR++;
  });
  const lands = U.drips.filter(d => d.side > 0).map(d => d.tland);
  U.level = tl => Math.min(0.6, lvl0 + step * lands.reduce((a, t) => a + smooth01((tl - t) / 0.3), 0));
  return U;
}
function closeTimes(sc) {
  const L0 = ls(sc, 0), L1 = ls(sc, 1), L2 = ls(sc, 2);
  return { L0, L1, L2, end: le(sc, 2), open: tl => prog(tl, L2 + 0.1, 0.8), strike: L2 + 1.55, write: L2 + 2.9 };
}

// Sound cues per scene (scene-local times). kinds are rendered by tools/audio.py.
const EVENTS = {
  cover(sc) {
    const K = coverTimes(sc), ev = [];
    ev.push({ t: K.land[0], kind: 'thump', g: 0.9 });
    K.settle.filter(t => t > 0).forEach((t, i) => ev.push({ t, kind: 'tick', g: 0.5 + i * 0.03 }));
    ev.push({ t: K.punch, kind: 'punch', g: 1 });
    ev.push({ t: K.L1 + 1.3, kind: 'scribble', g: 0.7, d: 0.45 });
    return ev;
  },
  myth(sc) {
    const L0 = ls(sc, 0), L1 = ls(sc, 1), ev = [{ t: L0 + 0.5, kind: 'scribble', g: 0.5, d: 0.5 }, { t: L0 + 2.0, kind: 'zip', g: 0.7, d: 0.8 }];
    [0, 1, 2].forEach(i => ev.push({ t: L1 + 0.2 + i * 0.35, kind: 'blip', g: 0.6, n: i }));
    MYTH_NOTES(sc).forEach(t => ev.push({ t, kind: 'whoosh', g: 0.45 }));
    return ev;
  },
  costs(sc) {
    const K = costTimes(sc), ev = [];
    for (const t of [K.a, K.b, K.c, K.d]) ev.push({ t, kind: 'scribble', g: 0.45, d: 0.8 });
    ev.push({ t: K.pop + 0.05, kind: 'pop', g: 0.8 }, { t: K.pop + 0.8, kind: 'clack', g: 0.5 });
    ev.push({ t: K.expand, kind: 'click', g: 0.6 });
    // the second hand jumps whenever floor(2 * localClock) changes; localClock = tl - K.d
    for (let k = 1; k / 2 < K.stop - K.d; k++) if (K.d + k / 2 > K.d + 0.5) ev.push({ t: K.d + k / 2, kind: 'clock', g: 0.5 });
    ev.push({ t: K.stop, kind: 'stop', g: 0.8 });
    ev.push({ t: K.band + 1.2, kind: 'chime', g: 0.6 });
    return ev;
  },
  umbrella(sc) {
    const U = umbTimes(sc), ev = [{ t: 0.15, kind: 'umbrella', g: 1 }, { t: 0, kind: 'rain', g: 1, d: dur(sc) }];
    for (const d of U.drips) ev.push({ t: d.tland, kind: d.side > 0 ? 'plink' : 'drip', g: d.side > 0 ? 0.9 : 0.4, lvl: U.level(d.tland) });
    ev.push({ t: U.L1 + 1.0, kind: 'scribble', g: 0.5, d: 0.8 });
    return ev;
  },
  close(sc) {
    const K = closeTimes(sc);
    return [{ t: K.L2 + 0.1, kind: 'page', g: 1 }, { t: K.strike, kind: 'strike', g: 1 }, { t: K.write, kind: 'write', g: 0.9, d: 0.9 }, { t: K.write + 0.8, kind: 'scribble', g: 0.4, d: 0.4 }];
  },
};
