// Scene compositions. Each scene is f(tl, sc) -> SVG string, where tl is the scene-local time in
// seconds and sc is the timeline entry (lines carry absolute start times). Draw order is back to
// front, and every solid object carries an occluding fill so nothing behind shows through it.

const ZH = 'LXGW WenKai TC';
const ls = (sc, i) => sc.lines[i] ? sc.lines[i].start - sc.start : 0;
const dur = sc => sc.end - sc.start;

// Slow camera move: zoom z0 -> z1 and pan (dx, dy) about the frame centre.
function cam(tl, D, z0, z1, dx0 = 0, dx1 = 0, dy0 = 0, dy1 = 0) {
  const k = smooth01(tl / D) * 0.6 + (tl / D) * 0.4;
  const z = lerp(z0, z1, k), dx = lerp(dx0, dx1, k), dy = lerp(dy0, dy1, k);
  return `translate(960 540) scale(${f3(z)}) translate(${f1(-960 + dx)} ${f1(-540 + dy)})`;
}
function txt(x, y, str, o = {}) {
  const op = o.op ?? 1;
  return `<text x="${f1(x)}" y="${f1(y)}" font-family="${o.font || ZH}" font-size="${o.size || 32}" ${o.weight ? `font-weight="${o.weight}"` : ''} ${o.italic ? 'font-style="italic"' : ''} text-anchor="${o.anchor || 'middle'}" fill="${o.fill || TH.ink}" opacity="${f3(op)}" ${o.ls ? `letter-spacing="${o.ls}"` : ''}>${str}</text>`;
}
function vtxt(x, y, str, o = {}) { // vertical text, one glyph per row
  return [...str].map((c, i) => txt(x, y + i * (o.size || 40) * 1.12, c, o)).join('');
}
// Left-to-right brush-wipe reveal of any content.
function wipe(id, x, y, w, h, p, inner) {
  return `<clipPath id="${id}"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(0, w * p))}" height="${f1(h)}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
}
const ground = (y, p = 1, seed = 9) => S(handLine([[-300, y], [700, y + 3], [1300, y - 2], [2220, y + 2]], 2, seed, 60), p, { w: 2.4 });

const SCENES = {
  // 1. Mountain town of Xinshe at sunrise; nine villages appear on the river terraces.
  opening(tl, sc) {
    const D = dur(sc), L1 = ls(sc, 1);
    let o = '';
    const sunY = lerp(360, 250, smooth01(tl / D));
    const sunP = prog(tl, 0.3, 2);
    o += glow(1460, sunY, 230, 0.35 * sunP) + wash(ell(1460, sunY, 62, 62, 2), TH.gold, sunP, 0.45) + S(ell(1460, sunY, 62, 62, 2), sunP, { w: 2.4 });
    let rays = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + tl * 0.05; rays += `M${f1(1460 + Math.cos(a) * 80)} ${f1(sunY + Math.sin(a) * 80)}l${f1(Math.cos(a) * 22)} ${f1(Math.sin(a) * 22)}`; }
    o += S(rays, prog(tl, 1.5, 1.5), { w: 1.8, stroke: TH.gold });
    o += cloud(250 + tl * 14, 210, 1.1, prog(tl, 0.6, 1.5), 3) + cloud(1000 + tl * 9, 150, 0.8, prog(tl, 1, 1.5), 4);
    o += mountains(560, 230, 1, prog(tl, 0.2, 2.8), { op: 0.55, w: 1.8, n: 18 });
    o += cloud(1700 - tl * 7, 420, 0.9, prog(tl, 1.3, 1.5), 5);
    o += mountains(680, 200, 7, prog(tl, 0.8, 2.8), { hatch: true, n: 14 });
    o += mist(600, tl, 3, 0.5, 16);
    // river terraces (河階): stepped ledges
    const terr = [[720, 2], [785, 3], [845, 4]];
    terr.forEach(([y, sd], i) => {
      const pts = [[-300, y + 30], [200, y], [700, y + 10], [1200, y - 6], [1700, y + 8], [2220, y - 4]];
      o += S(spline(pts) + 'L2220 1400L-300 1400Z', 1, { fill: true, w: 0, op: prog(tl, 1 + i * 0.4, 1.2) }) + S(handLine(pts, 2, sd, 70), prog(tl, 1 + i * 0.4, 2), { w: 2.2 });
      for (let k = 0; k < 9; k++) o += S(`M${-200 + k * 260 + i * 60} ${y + 22}l24 10`, prog(tl, 2 + i * 0.4, 1.5), { w: 1.3, op: 0.5 });
    });
    for (let i = 0; i < 6; i++) o += tree(120 + i * 360 + (i % 2) * 70, 732 + (i % 3) * 8, 0.32, prog(tl, 1.8 + i * 0.15, 1.2), tl, 10 + i);
    // nine villages, one after another
    const vp = [[260, 790], [520, 800], [780, 788], [1040, 796], [1300, 782], [1560, 800], [400, 858], [900, 856], [1420, 862]];
    vp.forEach(([x, y], i) => { const pp = prog(tl, L1 + 0.6 + i * 0.42, 0.9); o += hut(x, y, 0.95, pp, 30 + i, { roof: TH.fill }) + wash(`M${x - 28} ${y - 20}L${x} ${y - 40}L${x + 28} ${y - 20}Z`, TH.red, pp, 0.6); });
    o += river([[-300, 905], [300, 890], [800, 912], [1300, 894], [1800, 908], [2220, 896]], 54, tl, prog(tl, 0.5, 2));
    o += birds(-200 + tl * 150, 300 - tl * 4, tl, 5, 2, 1.1);
    return G(cam(tl, D, 1.0, 1.08, 0, -40, 0, 10), o);
  },

  // 2. Title card: calligraphy wipe, English title, vermilion seal drops in.
  title(tl, sc) {
    const D = dur(sc); let o = '';
    o += xiangyun(380 + Math.sin(tl) * 8, 300, 1.4, prog(tl, 0, 1.4), TH.gold) + xiangyun(1540 - Math.sin(tl) * 8, 760, 1.3, prog(tl, 0.3, 1.4), TH.gold);
    o += smoke(360, 1000, tl, { h: 360, n: 3, amp: 22, op: 0.4 }) + smoke(1560, 1000, tl + 1, { h: 330, n: 3, amp: 22, op: 0.4 });
    const p = prog(tl, 0.2, 2.2);
    o += wipe('tw', 300, 380, 1320, 190, p, txt(960, 530, '新社九庄媽進香', { size: 150, weight: 700, ls: 10 }));
    o += S(handLine([[520, 585], [960, 578], [1400, 590]], 2, 4, 50), prog(tl, 1.8, 0.8), { w: 5, stroke: TH.red });
    o += txt(960, 660, 'The Nine-Village Mazu of Xinshe', { font: 'EB Garamond', italic: true, size: 50, op: prog(tl, 2.0, 1) });
    o += txt(960, 720, '臺中新社　遊庄・過爐・遶境', { size: 32, op: prog(tl, 2.5, 1), fill: TH.faint, ls: 6 });
    if (tl > 2.7) o += seal(1560, 440, 0.95, '九庄', prog(tl, 2.7, 0.35));
    return G(cam(tl, D, 1.0, 1.04), o);
  },

  // 3. Rainy forest: the camphor worker finds the rain-soaked statue and lifts it.
  rain(tl, sc) {
    const D = dur(sc), L1 = ls(sc, 1); let o = '';
    o += mountains(520, 160, 3, prog(tl, 0, 2), { op: 0.45, w: 1.6 });
    for (let i = 0; i < 5; i++) o += tree(100 + i * 430, 760, 0.8, prog(tl, 0.2 + i * 0.15, 1.5), tl, 20 + i);
    o += S('M-300 800 L2220 800 L2220 1300 L-300 1300Z', 1, { fill: true, w: 0 }) + ground(800, prog(tl, 0, 1.5), 3);
    o += tree(1180, 840, 1.75, prog(tl, 0.4, 2), tl, 7, { r: 90 });
    for (let i = 0; i < 12; i++) o += grass(80 + i * 170 + (i % 3) * 30, 842 + (i % 2) * 40, 1.2, prog(tl, 0.5, 1), tl, i);
    o += S('M-300 842 Q400 836 900 846 T2220 840', prog(tl, 0.2, 1.5), { w: 1.6, op: 0.5 });
    // statue beside the trunk; lifted after the second line starts
    const walkEnd = 6.2, liftK = prog(tl, L1 + 0.9, 2.2);
    const px = lerp(-120, 1010, smooth01(clamp(tl / walkEnd))), walking = tl < walkEnd;
    const kneelK = prog(tl, walkEnd, 0.6);
    const found = prog(tl, walkEnd - 0.2, 1.2);
    const sx = lerp(1110, px + 44, liftK), sy = lerp(840, 840 - 64, liftK);
    const pose = walking ? 'walk' : 'lift';
    o += person(px, 840, 1.55, prog(tl, 0.3, 1), { pose, phase: tl * 5.5, hat: 'dou', seed: 3, lift: walking ? 0 : (liftK > 0 ? liftK : 1 - kneelK), face: 1 });
    o += mazu(sx, sy, 0.62, prog(tl, 0.8, 1.6), { halo: found * (0.75 + 0.25 * Math.sin(tl * 3)), t: tl });
    o += wash('M-300 -300H2220V1400H-300Z', '#4c5563', 1, 0.10);
    for (let i = 0; i < 8; i++) o += ripples(150 + i * 240, 900 + (i % 3) * 30, tl, 0.9 + (i % 3) * 0.2, 1.2, i);
    o += rain(tl, { n: 190 });
    return G(cam(tl, D, 1.02, 1.1, 0, -60, 0, 20), o);
  },

  // 4. Hand-drawn map: the route links the nine villages one by one.
  villages(tl, sc) {
    const D = dur(sc), L0 = ls(sc, 0); let o = '';
    o += txt(250, 300, '新社', { size: 64, weight: 700, op: prog(tl, 0, 1) }) + txt(250, 346, 'XINSHE', { font: 'EB Garamond', italic: true, size: 30, op: prog(tl, 0.3, 1), fill: TH.faint });
    o += river([[-300, 120], [400, 150], [900, 110], [1400, 160], [2220, 120]], 70, tl, prog(tl, 0, 1.5));
    o += txt(1640, 100, '大甲溪', { size: 30, op: prog(tl, 0.8, 1), fill: TH.faint });
    for (let k = 0; k < 4; k++) { o += S(ell(1560, 620, 120 + k * 60, 70 + k * 36, 50 + k, 3), prog(tl, 0.3 + k * 0.2, 1.4), { w: 1.3, op: 0.45 }); o += S(ell(420, 760, 100 + k * 55, 60 + k * 30, 60 + k, 3), prog(tl, 0.4 + k * 0.2, 1.4), { w: 1.3, op: 0.45 }); }
    // compass
    const cp = prog(tl, 0.5, 1.2);
    o += G('translate(1750 880)', S(ell(0, 0, 44, 44, 7, 1), cp, { w: 1.8 }) + S('M0 -60L10 0L0 60L-10 0Z', cp, { w: 1.8, fill: true }) + wash('M0 -60L10 0L-10 0Z', TH.red, cp, 0.8) + txt(0, -70, '北', { size: 26, op: cp }));
    const V = [['山頂', 700, 330], ['新社', 980, 420], ['土城', 1260, 360], ['畚箕湖', 1480, 480], ['擺頭店', 1320, 640], ['鳥銃頭', 1040, 700], ['水底寮', 760, 620], ['大南', 560, 480], ['馬力埔', 820, 860]];
    const pts = V.map(v => [v[1], v[2]]);
    // arc-length parametrisation of the route
    const segL = []; let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segL.push(L); tot += L; }
    const rp = prog(tl, L0 + 0.3, D - L0 - 2.2);
    const route = spline(pts, false, 0.6);
    o += `<path d="${route}" pathLength="1" fill="none" stroke="${TH.red}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="0.012 0.01" opacity="0.9" mask="url(#routeMask)"/>`;
    o = `<mask id="routeMask"><path d="${route}" pathLength="1" fill="none" stroke="#fff" stroke-width="8" stroke-dasharray="1 1" stroke-dashoffset="${f3(1 - rp)}"/></mask>` + o;
    let acc = 0, mk = pts[0];
    const target = rp * tot;
    for (let i = 0; i < segL.length; i++) { if (acc + segL[i] >= target) { const k = (target - acc) / segL[i]; mk = [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)]; break; } acc += segL[i]; mk = pts[i + 1]; }
    let a2 = 0;
    V.forEach((v, i) => {
      const reach = i === 0 ? 0 : (a2 += segL[i - 1]) / tot;
      const pv = clamp((rp - reach) * 8 + (i === 0 ? prog(tl, L0, 0.6) : 0));
      const hp = i === 0 ? prog(tl, L0 - 0.2, 0.8) : pv;
      o += hut(v[1], v[2], 1.1, hp, 70 + i, { roof: TH.fill }) + wash(`M${v[1] - 33} ${v[2] - 22}L${v[1]} ${v[2] - 46}L${v[1] + 33} ${v[2] - 22}Z`, TH.red, hp, 0.65);
      o += txt(v[1], v[2] + 42, v[0], { size: 34, op: hp });
      const pulse = clamp((rp - reach) * 3);
      if (pulse > 0 && pulse < 1) o += `<circle cx="${v[1]}" cy="${v[2] - 18}" r="${f1(20 + pulse * 60)}" fill="none" stroke="${TH.gold}" stroke-width="3" opacity="${f3(1 - pulse)}"/>`;
    });
    if (rp > 0 && rp < 1) o += glow(mk[0], mk[1], 60, 0.9) + `<circle cx="${f1(mk[0])}" cy="${f1(mk[1])}" r="9" fill="${TH.red}" stroke="${TH.ink}" stroke-width="2"/>`;
    return G(cam(tl, D, 1.0, 1.06, 0, 0, 0, -10), o);
  },

  // 5. Red altar in the host's home: doors swing open, candles flicker, plaque reveals 有神無廟.
  altar(tl, sc) {
    const D = dur(sc), L1 = ls(sc, 1); let o = '';
    // back wall with beams
    o += S(handLine([[-300, 150], [2220, 150]], 2, 1, 80), 1, { w: 3 }) + S(handLine([[-300, 190], [2220, 190]], 2, 2, 80), 1, { w: 1.6, op: 0.7 });
    for (let i = 0; i < 6; i++) o += S(`M${140 + i * 330} 190V120`, 1, { w: 2 });
    // couplets on the walls
    const cL = poly([[250, 260], [330, 260], [330, 820], [250, 820]], true), cR = poly([[1590, 260], [1670, 260], [1670, 820], [1590, 820]], true);
    o += wash(cL, TH.red, 1, 0.85) + wash(cR, TH.red, 1, 0.85) + S(cL, 1, { w: 1.6 }) + S(cR, 1, { w: 1.6 });
    o += vtxt(290, 330, '九庄同沐恩', { size: 52, fill: TH.ink, weight: 700 }) + vtxt(1630, 330, '四季保平安', { size: 52, fill: TH.ink, weight: 700 });
    // plaque with 有神無廟
    const pl = poly([[700, 190], [1220, 190], [1220, 300], [700, 300]], true);
    o += S(pl, 1, { fill: true, w: 3 }) + wash(pl, TH.red, 1, 0.9) + S(poly([[716, 204], [1204, 204], [1204, 286], [716, 286]], true), 1, { stroke: TH.gold, w: 2 });
    const pk = prog(tl, L1 + 0.4, 1.6);
    o += wipe('plq', 720, 200, 480, 100, pk, txt(960, 272, '有神無廟', { size: 76, weight: 700, fill: '#fbf1d8', ls: 16 }));
    // hanging lanterns
    o += lantern(560, 180, 1.5, 1, { lit: 0.6, swing: Math.sin(tl * 1.3) * 5, string: 40, glowOp: 0.6 }) + lantern(1360, 180, 1.5, 1, { lit: 0.6, swing: Math.sin(tl * 1.3 + 1) * 5, string: 40, glowOp: 0.6 });
    // altar table with red skirt
    const top = poly([[520, 700], [1400, 700], [1440, 730], [480, 730]], true);
    const skirt = handPoly([[490, 730], [1430, 730], [1420, 960], [500, 960]], 1.5, 3);
    o += mazu(960, 700, 1.75, 1, { halo: 0.35 + 0.1 * Math.sin(tl * 2), t: tl });
    o += candle(700, 700, 1.3, 1, tl, 1) + candle(1220, 700, 1.3, 1, tl, 2);
    o += SS(skirt, 1, { fill: true }) + wash(skirt, TH.red, 1, 0.8) + S(top, 1, { fill: true, w: 2.6 });
    o += S(handLine([[500, 760], [1420, 760]], 1.5, 5, 60), 1, { stroke: TH.gold, w: 4 }) + S('M600 800 q 40 60 0 120M1320 800 q -40 60 0 120M960 790 q-60 40 0 90 q60 -40 0 -90', 1, { stroke: TH.gold, w: 2.2 });
    o += burner(960, 715, 0.9, 1, { smoke: 0.7, t: tl, smokeH: 240 });
    o += S('M-300 960 L2220 960 L2220 1300 L-300 1300Z', 1, { fill: true, w: 0 }) + S(handLine([[-300, 960], [2220, 960]], 1.5, 8, 80), 1, { w: 2.4 });
    // wooden doors swinging open toward the viewer
    const dp = prog(tl, 0.2, 2.2);
    const door = (side) => {
      const w = lerp(960, 110, dp), x0 = side < 0 ? 0 : 1920 - w;
      const skew = side < 0 ? `M${x0} -40L${x0 + w} ${f1(dp * 40)}L${x0 + w} ${f1(1080 - dp * 40)}L${x0} 1120Z` : `M${x0} ${f1(dp * 40)}L${x0 + w} -40L${x0 + w} 1120L${x0} ${f1(1080 - dp * 40)}Z`;
      let studs = '';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { const cx = x0 + w * (0.2 + c * 0.2), cy = 220 + r * 150; studs += `<ellipse cx="${f1(cx)}" cy="${cy}" rx="${f1(Math.max(1.5, 12 * w / 960))}" ry="12" fill="${TH.gold}" stroke="${TH.ink}" stroke-width="1.4"/>`; }
      return S(skew, 1, { fill: true, w: 3 }) + wash(skew, TH.red, 1, 0.75) + studs;
    };
    o += door(-1) + door(1);
    return G(cam(tl, D, 1.12, 1.0, 0, 0, -20, 0), o);
  },

  // 6. Casting moon blocks: the pair falls, bounces and lands as a divine "yes".
  poe(tl, sc) {
    const D = dur(sc); let o = '';
    // floor tiles in perspective
    const hz = 470;
    o += S(`M-300 ${hz}L2220 ${hz}`, 1, { w: 2.4 });
    for (let i = -8; i <= 8; i++) o += S(`M${960 + i * 70} ${hz}L${960 + i * 330} 1300`, 1, { w: 1.2, op: 0.45 });
    for (let k = 1; k < 7; k++) { const y = hz + Math.pow(k / 6, 1.8) * 700; o += S(`M-300 ${f1(y)}L2220 ${f1(y)}`, 1, { w: 1.2, op: 0.45 }); }
    // altar table edge above
    const sk = handPoly([[300, -60], [1620, -60], [1600, 330], [320, 330]], 1.5, 4);
    o += S(sk, 1, { fill: true }) + wash(sk, TH.red, 1, 0.8) + S(handLine([[320, 290], [1600, 290]], 1.2, 9, 50), 1, { stroke: TH.gold, w: 4 });
    o += burner(960, 250, 0.9, 1, { smoke: 0.6, t: tl, smokeH: 200 }) + candle(560, 250, 1, 1, tl, 3) + candle(1360, 250, 1, 1, tl, 4);
    // devotee
    const bow = prog(tl, 4.2, 0.8) - prog(tl, 5.6, 0.8);
    o += person(360, 900, 2.6, 1, { pose: 'bow', lean: 12 + bow * 30, seed: 6, hat: 'bun', accent: TH.pink });
    // blocks: thrown at 1.3s, land ~2.25s, bounce, rest by ~3.0s
    const throwT = 1.3, flight = 0.95;
    const blockPos = (k) => {
      const tx = [900, 1080][k], land = [880, 860][k];
      const u = tl - throwT;
      if (u < 0) return { x: 470 + k * 40, y: 620 - 30 * Math.sin(tl * 2) , r: -20 + k * 10, flat: false };
      if (u < flight) { const q = u / flight; return { x: lerp(470 + k * 40, tx, q), y: lerp(620, land, q) - Math.sin(q * Math.PI) * 330, r: q * (540 + k * 180), flat: false }; }
      const v = u - flight; const bh = Math.max(0, Math.sin(Math.min(v / 0.45, 1) * Math.PI)) * 60 * (1 - k * 0.3);
      const settle = clamp(v / 0.6);
      return { x: tx + 30 * settle * (k ? 1 : -1), y: land - bh, r: lerp(k ? 180 + 720 : 540, k ? 180 + 720 : 720, settle) % 360, flat: settle >= 1 && k === 1 };
    };
    for (let k = 0; k < 2; k++) { const b = blockPos(k); o += `<ellipse cx="${f1(b.x)}" cy="${f1([880, 860][k] + 6)}" rx="40" ry="7" fill="${TH.ink}" opacity="0.15"/>` + moonBlock(b.x, b.y, 1.6, b.r, { flat: b.flat }); }
    // impact marks
    const iu = tl - (throwT + flight);
    if (iu > 0 && iu < 0.5) { let d = ''; for (let i = 0; i < 8; i++) { const a = Math.PI + i / 7 * Math.PI; d += `M${f1(990 + Math.cos(a) * (60 + iu * 80))} ${f1(870 + Math.sin(a) * (20 + iu * 30))}l${f1(Math.cos(a) * 16)} ${f1(Math.sin(a) * 6)}`; } o += S(d, 1, { w: 2, op: 1 - iu / 0.5 }); }
    if (tl > 3.4) o += glow(990, 840, 220, 0.55 * prog(tl, 3.4, 0.6)) + seal(1420, 700, 1.1, '聖筊', prog(tl, 3.5, 0.35), 5);
    o += txt(1420, 810, '一平一凸', { size: 34, op: prog(tl, 3.9, 0.6), fill: TH.ink });
    return G(cam(tl, D, 1.0, 1.07, 0, 20, 0, 10), o);
  },

  // 7. Pre-dawn (night): lanterns light up one by one while devotees gather.
  dawn(tl, sc) {
    const D = dur(sc), L1 = ls(sc, 1); let o = '';
    o += stars(tl, 5, 60, 460);
    const moon = 'M1600 170 a60 60 0 1 0 50 95 a48 48 0 1 1 -50 -95Z';
    o += glow(1620, 220, 160, 0.35) + wash(moon, TH.gold, 1, 0.6) + S(moon, 1, { w: 2 });
    o += mountains(600, 170, 12, 1, { op: 0.6, w: 1.8 });
    o += mist(620, tl, 9, 0.35, 14);
    const hs = [[260, 740], [760, 730], [1260, 740], [1740, 730]];
    hs.forEach(([x, y], i) => o += house(x, y, 0.95, 1, { seed: 80 + i, lit: prog(tl, 1 + i * 0.7, 1.5) }));
    o += S('M-300 740 L2220 740 L2220 1300 L-300 1300Z', 1, { fill: true, w: 0 }) + ground(742, 1, 5);
    // lantern string (catenary) lights up one by one
    const N = 13; let rope = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40; rope.push([lerp(-40, 1960, u), 200 + Math.sin(u * Math.PI) * 120]); }
    o += S(spline(rope), 1, { w: 1.6 });
    for (let i = 0; i < N; i++) { const u = (i + 0.5) / N, x = lerp(-40, 1960, u), y = 200 + Math.sin(u * Math.PI) * 120; o += lantern(x, y + 18, 0.9, 1, { lit: prog(tl, 0.8 + i * 0.28, 0.5), swing: Math.sin(tl * 1.4 + i) * 6, string: 18, seed: i }); }
    // devotees with hand lanterns converge on the centre
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
      const x0 = side < 0 ? -120 - k * 160 : 2040 + k * 160, x1 = 960 + side * (90 + k * 105);
      const t0 = 0.8 + k * 0.5, tt = clamp((tl - t0) / (L1 + 2.5 - t0));
      const x = lerp(x0, x1, smooth01(tt)), mv = tt > 0 && tt < 0.98;
      o += person(x, 880 + (k % 2) * 34, 1.25, 1, { pose: 'lantern', phase: tl * 5 + i, moving: mv, face: -side, seed: 90 + i, t: tl, hat: k % 3 === 0 ? 'bun' : null, lit: 1 });
    }
    return G(cam(tl, D, 1.0, 1.06, 0, 0, 20, 0), G('translate(0 -50)', o));
  },

  // 8. The procession sets off: gongs, flags, firecrackers along a mountain lane.
  procession(tl, sc) {
    const D = dur(sc), L1 = ls(sc, 1); let o = '';
    const far = -tl * 18, mid = -tl * 45, near = -tl * 90;
    o += G(`translate(${f1(far)} 0)`, mountains(520, 160, 21, 1, { op: 0.5, w: 1.7, x1: 2800 }) + cloud(400, 180, 0.9, 1, 8) + cloud(1500, 240, 0.7, 1, 9));
    o += G(`translate(${f1(mid)} 0)`, mountains(660, 110, 22, 1, { hatch: true, x1: 3000 }) + [0, 1, 2, 3, 4, 5].map(i => tree(150 + i * 420, 700, 0.55, 1, tl, 30 + i)).join(''));
    o += S('M-300 700 L2220 700 L2220 1300 L-300 1300Z', 1, { fill: true, w: 0 }) + ground(700, 1, 7);
    // road ruts (scrolling)
    let ruts = ''; for (let i = 0; i < 16; i++) { const x = ((i * 190 + near) % 3040 + 3040) % 3040 - 400; ruts += `M${f1(x)} 960l70 0`; }
    o += S(ruts, 1, { w: 1.6, op: 0.5 });
    // roadside firecracker poles (world x moves with near layer)
    const fc = (wx, tb, seed) => { const x = wx + near; if (x < -300 || x > 2300) return ''; return S(`M${f1(x)} 900 L${f1(x)} 470 L${f1(x + 90)} 480`, 1, { w: 3 }) + firecrackers(x + 90, 500, tl, tb, { n: 14, seed, dur: 2.2 }); };
    o += fc(1500, 1.2, 1) + fc(2350, L1 - 0.2, 2);
    // flag bearers, gong player, palanquin, followers (all walking right, camera tracking)
    const bx = 520 + tl * 20;
    const hits = [0.6, 2.2, 3.8, 5.4, 7.0, 8.6, 10.2];
    const strike = hits.reduce((m, h) => { const u = tl - h; return u > -0.25 && u < 0.2 ? Math.max(m, 1 - Math.abs(u) / 0.25) : m; }, 0);
    for (let i = 0; i < 4; i++) o += person(bx - 380 - i * 110, 960 + (i % 2) * 20, 1.05, 1, { pose: i % 2 ? 'lantern' : 'walk', phase: tl * 5 + i * 1.3, seed: 120 + i, face: 1, t: tl, lit: 0.7, hat: i === 2 ? 'dou' : null });
    o += procession(bx + 40, 945, 1.1, 1, tl, { phase: 0 });
    o += person(bx + 360, 950, 1.1, 1, { pose: 'gong', phase: tl * 5 + 2, strike, seed: 111, face: 1, hat: 'band' }) + gong(bx + 405, 790, 0.9, 1, tl, hits);
    o += person(bx + 520, 945, 1.1, 1, { pose: 'flag', phase: tl * 5 + 1, seed: 112, face: 1, t: tl, hat: 'band' }) + person(bx + 640, 960, 1.1, 1, { pose: 'flag', phase: tl * 5 + 3.3, seed: 113, face: 1, t: tl + 1, flagColor: TH.gold });
    o += mist(420, tl, 17, 0.3, 30);
    return G(cam(tl, D, 1.04, 1.1, 0, -120, 0, 0), G('translate(0 -110)', o));
  },

  // 9. Kneeling devotees pass beneath the palanquin (鑽轎腳).
  crawl(tl, sc) {
    const D = dur(sc); let o = '';
    o += mountains(480, 120, 31, 1, { op: 0.45, w: 1.6 });
    for (let i = 0; i < 5; i++) o += house(200 + i * 400, 640, 0.7, 1, { seed: 150 + i });
    o += S('M-300 640 L2220 640 L2220 1300 L-300 1300Z', 1, { fill: true, w: 0 }) + ground(642, 1, 11);
    // onlookers holding incense
    for (let i = 0; i < 7; i++) { const x = 180 + i * 260; o += person(x, 760, 0.95, 1, { pose: 'bow', lean: 8 + 6 * Math.sin(tl * 1.5 + i), seed: 160 + i, face: i % 2 ? -1 : 1, hat: i % 3 ? null : 'bun' }) + smoke(x + (i % 2 ? -24 : 24), 660, tl + i, { h: 90, n: 2, amp: 8, op: 0.5 }); }
    // kneeling row facing the incoming palanquin
    const px = lerp(2350, -500, clamp((tl - 0.2) / (D - 0.3)));
    for (let i = 0; i < 6; i++) {
      const x = 420 + i * 220, under = Math.abs(px - x) < 240;
      o += person(x, 960, 1.3, 1, { pose: 'kneel', lean: under ? 72 : 58, seed: 170 + i, face: 1, hat: i % 2 ? 'bun' : null, accent: i % 3 === 0 ? TH.pink : null });
    }
    o += procession(px, 985, 1.28, 1, tl, { dir: -1, phase: 1 });
    o += smoke(1800, 1000, tl, { h: 300, n: 3, amp: 30, op: 0.35 });
    return G(cam(tl, D, 1.0, 1.05, 30, -30), G('translate(0 -100)', o));
  },

  // 10. The host village's banquet: steaming dishes and a toast.
  feast(tl, sc) {
    const D = dur(sc); let o = '';
    o += house(560, 560, 1.3, 1, { seed: 190 }) + house(1500, 560, 1.3, 1, { seed: 191, flip: -1 });
    o += S('M-300 560 L2220 560 L2220 1300 L-300 1300Z', 1, { fill: true, w: 0 }) + ground(562, 1, 13);
    let rope = []; for (let i = 0; i <= 30; i++) { const u = i / 30; rope.push([lerp(-40, 1960, u), 120 + Math.sin(u * Math.PI) * 80]); }
    o += S(spline(rope), 1, { w: 1.5 });
    for (let i = 0; i < 9; i++) { const u = (i + 0.5) / 9; o += lantern(lerp(-40, 1960, u), 138 + Math.sin(u * Math.PI) * 80, 0.8, 1, { lit: 0.4, swing: Math.sin(tl * 1.2 + i) * 5, string: 16, seed: i }); }
    const raise = prog(tl, 2.6, 0.7) - prog(tl, 5.4, 0.8);
    const table = (cx, cy, s, seed) => {
      let t = '';
      // diners behind the table (legs hidden by the tablecloth)
      [-150, -60, 40, 130].forEach((dx, i) => t += person(cx + dx * s, cy + 10 * s, s * 1.05, 1, { pose: 'sit', seed: seed + i, face: i < 2 ? 1 : -1, raise: i % 2 ? raise : raise * 0.8, hat: i === 1 ? 'bun' : null }));
      const cloth = handPoly([[cx - 210 * s, cy - 50 * s], [cx + 210 * s, cy - 50 * s], [cx + 200 * s, cy + 70 * s], [cx - 200 * s, cy + 70 * s]], 1.2, seed);
      const top = ell(cx, cy - 50 * s, 215 * s, 34 * s, seed + 1, 1);
      t += SS(cloth, 1, { fill: true }) + wash(cloth, TH.red, 1, 0.8) + S(top, 1, { fill: true, w: 2.4 });
      [-110, -30, 50, 130].forEach((dx, i) => {
        const bx = cx + dx * s, by = cy - 54 * s;
        const bowl = `M${f1(bx - 26 * s)} ${f1(by)} Q${f1(bx)} ${f1(by + 26 * s)} ${f1(bx + 26 * s)} ${f1(by)}Z`;
        t += S(bowl, 1, { fill: true, w: 2 }) + (i % 2 ? wash(bowl, TH.gold, 1, 0.5) : '') + smoke(bx, by - 4 * s, tl + i + seed, { h: 70 * s, n: 2, amp: 7, op: 0.45, w: 1.4 });
      });
      return t;
    };
    o += table(560, 830, 1.15, 200) + table(1320, 860, 1.25, 210);
    if (raise > 0.6) { let d = ''; [[560, 640], [1320, 660]].forEach(([cx, cy]) => { for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; d += `M${f1(cx + Math.cos(a) * 40)} ${f1(cy + Math.sin(a) * 26)}l${f1(Math.cos(a) * 16)} ${f1(Math.sin(a) * 10)}`; } }); o += S(d, 1, { stroke: TH.gold, w: 2.4, op: (raise - 0.6) / 0.4 }); }
    // chef tossing a wok at the right
    const toss = Math.max(0, Math.sin(tl * 3.2));
    o += person(1760, 1000, 1.3, 1, { pose: 'hold', moving: false, seed: 220, face: -1, hat: 'band' });
    o += G(`translate(1700 ${f1(870 - toss * 10)}) rotate(${f1(-toss * 12)})`, S('M-60 0 Q0 40 60 0Z', 1, { fill: true, w: 2.4 }) + S('M60 0 L110 -8', 1, { w: 3 }));
    for (let i = 0; i < 5; i++) { const u = pmod(tl * 1.6 + i / 5, 1); o += `<circle cx="${f1(1700 + (i - 2) * 12)}" cy="${f1(860 - Math.sin(u * Math.PI) * 60)}" r="4" fill="${TH.gold}" stroke="${TH.ink}" stroke-width="1"/>`; }
    const fl = 1 + 0.15 * Math.sin(tl * 20);
    o += glow(1700, 920, 120, 0.7) + `<path d="M1660 930 Q1670 ${f1(900 - 20 * fl)} 1685 915 Q1695 ${f1(880 - 30 * fl)} 1705 915 Q1718 ${f1(895 - 24 * fl)} 1740 930Z" fill="${TH.glow}" stroke="${TH.red}" stroke-width="2"/>` + S(poly([[1640, 930], [1760, 930], [1750, 1010], [1650, 1010]], true), 1, { fill: true });
    return G(cam(tl, D, 1.0, 1.06, 0, -20), G('translate(0 -80)', o));
  },

  // 11. 過爐: the incense burner is carried over the flame and set on the new host's altar.
  transfer(tl, sc) {
    const D = dur(sc); let o = '';
    o += house(1450, 720, 1.55, 1, { seed: 230 });
    o += S('M-300 720 L2220 720 L2220 1300 L-300 1300Z', 1, { fill: true, w: 0 }) + ground(722, 1, 17);
    o += lantern(1180, 330, 1.2, 1, { lit: 0.5, swing: Math.sin(tl * 1.4) * 4, string: 30 }) + lantern(1720, 330, 1.2, 1, { lit: 0.5, swing: Math.sin(tl * 1.4 + 1) * 4, string: 30 });
    // new red altar table in front of the house
    const sk = handPoly([[1270, 800], [1630, 800], [1620, 960], [1280, 960]], 1.2, 5);
    const top = poly([[1250, 780], [1650, 780], [1670, 800], [1230, 800]], true);
    const placeT = 5.6;
    o += candle(1300, 780, 0.9, 1, tl, 5) + candle(1600, 780, 0.9, 1, tl, 6);
    // brazier with flames at centre
    const surge = Math.max(0, 1 - Math.abs(tl - 3.4) / 1.0);
    const fl = 1 + 0.18 * Math.sin(tl * 19) + 0.1 * Math.sin(tl * 31) + surge * 0.8;
    o += glow(820, 900, 200 + surge * 120, 0.8);
    let flames = '';
    for (let i = 0; i < 5; i++) { const x = 760 + i * 30, h = (60 + (i % 2) * 30) * fl * (0.8 + 0.2 * Math.sin(tl * 13 + i)); flames += `<path d="M${x - 16} 905 Q${x - 10} ${f1(905 - h * 0.6)} ${x} ${f1(905 - h)} Q${x + 10} ${f1(905 - h * 0.6)} ${x + 16} 905Z" fill="${TH.glow}" stroke="${TH.red}" stroke-width="2" opacity="0.95"/>`; }
    o += flames + S(poly([[730, 900], [910, 900], [890, 960], [750, 960]], true), 1, { fill: true }) + wash(poly([[730, 900], [910, 900], [890, 960], [750, 960]], true), TH.ink, 1, 0.25);
    // carrier walks in, lifts the burner high over the flame, then places it
    const walkK = clamp(tl / placeT);
    const cx = lerp(-100, 1250, smooth01(walkK));
    const moving = tl < placeT;
    const bodyS = 1.45;
    o += person(cx, 1000, bodyS, 1, { pose: 'hold', phase: tl * 5, moving, seed: 240, face: 1, hat: 'band', accent: TH.pink });
    const hx = cx + 34 * bodyS, hy = 1000 - 90 * bodyS;
    const lift = Math.max(0, 1 - Math.abs(cx - 820) / 260) * 40;
    const bx = tl < placeT ? hx + 10 : lerp(hx + 10, 1450, prog(tl, placeT, 0.7)), by = tl < placeT ? hy + 30 - lift : lerp(hy + 30, 790, prog(tl, placeT, 0.7));
    o += SS(sk, 1, { fill: true }) + wash(sk, TH.red, 1, 0.8) + S(top, 1, { fill: true, w: 2.4 });
    o += burner(bx, by, 0.75, 1, { smoke: 0.4 + 0.4 * prog(tl, placeT + 0.5, 1), t: tl, smokeH: 120 + 180 * prog(tl, placeT + 0.5, 1) });
    if (tl > placeT + 0.6) o += glow(1450, 740, 200, 0.5 * prog(tl, placeT + 0.6, 0.8));
    o += S('M1880 980 L1880 520 L1800 530', 1, { w: 3 }) + firecrackers(1800, 550, tl, placeT + 0.4, { n: 14, seed: 5, dur: 2 });
    return G(cam(tl, D, 1.03, 1.1, 0, -60), G('translate(0 -110)', o));
  },

  // 12. Heritage: a scroll unrolls with the 2009 registration, then the nine-village wheel turns.
  heritage(tl, sc) {
    const D = dur(sc), L1 = ls(sc, 1); let o = '';
    const switchT = L1 - 0.6, A = 1 - prog(tl, switchT, 0.8), B = prog(tl, switchT + 0.2, 0.9);
    if (A > 0.001) {
      const up = prog(tl, 0.2, 1.8), half = lerp(20, 700, up);
      const paper = poly([[960 - half, 230], [960 + half, 230], [960 + half, 820], [960 - half, 820]], true);
      let s = S(paper, 1, { fill: '#efe3c6', w: 2.4 });
      let inner = procession(960, 520, 0.6, prog(tl, 1.2, 2.2), tl, { moving: false }) + S(handLine([[500, 525], [1420, 525]], 1.5, 4, 50), prog(tl, 1.4, 1.5), { w: 2 });
      inner += txt(960, 640, '新社九庄媽遶境', { size: 64, weight: 700, op: prog(tl, 2.2, 1) });
      inner += txt(960, 710, '臺中市民俗文化資產　２００９', { size: 40, op: prog(tl, 2.8, 1), ls: 4 });
      inner += txt(960, 765, 'Registered Taichung Folk Cultural Heritage, 2009', { font: 'EB Garamond', italic: true, size: 30, op: prog(tl, 3.2, 1), fill: TH.faint });
      s += `<clipPath id="scr"><path d="${paper}"/></clipPath><g clip-path="url(#scr)">${inner}</g>`;
      const roller = x => S(poly([[x - 16, 210], [x + 16, 210], [x + 16, 840], [x - 16, 840]], true), 1, { fill: true, w: 2.6 }) + wash(poly([[x - 16, 210], [x + 16, 210], [x + 16, 840], [x - 16, 840]], true), TH.red, 1, 0.8) + S(`M${x} 190V210M${x} 840V860`, 1, { w: 5, stroke: TH.gold });
      s += roller(960 - half - 16) + roller(960 + half + 16);
      if (tl > 3.8) s += seal(1480, 330, 0.9, '登錄', prog(tl, 3.8, 0.35), 6);
      o += `<g opacity="${f3(A)}">${s}</g>`;
    }
    if (B > 0.001) {
      const names = ['山頂', '新社', '土城', '畚箕湖', '擺頭店', '鳥銃頭', '水底寮', '大南', '馬力埔'];
      const rot = (tl - switchT) * 9, R = 300, cx = 960, cy = 540;
      let w = S(ell(cx, cy, R + 60, R + 60, 5, 1.5), 1, { fill: true, w: 2.6 }) + S(ell(cx, cy, 120, 120, 6, 1), 1, { w: 2 });
      const swap = prog(tl, L1 + 2.2, 1.2);
      names.forEach((n, i) => {
        const a = (i / 9 * 360 + rot - 90) * Math.PI / 180, a2 = ((i + 0.5) / 9 * 360 + rot - 90) * Math.PI / 180;
        w += S(`M${f1(cx + Math.cos(a2) * 120)} ${f1(cy + Math.sin(a2) * 120)}L${f1(cx + Math.cos(a2) * (R + 60))} ${f1(cy + Math.sin(a2) * (R + 60))}`, 1, { w: 1.6, op: 0.7 });
        const x = cx + Math.cos(a) * (R - 40), y = cy + Math.sin(a) * (R - 40);
        if (n === '水底寮') {
          w += txt(x, y + 12, n, { size: 38, op: 1 - swap, fill: TH.faint }) + S(`M${f1(x - 60)} ${f1(y)}L${f1(x + 60)} ${f1(y)}`, prog(tl, L1 + 1.0, 0.8), { stroke: TH.red, w: 3, op: 1 - swap });
          w += glow(x, y, 90, swap * 0.6) + txt(x, y + 12, '新社', { size: 44, weight: 700, op: swap, fill: TH.red });
        } else w += txt(x, y + 12, n, { size: n === '新社' ? 44 : 38, weight: n === '新社' ? 700 : null, fill: n === '新社' ? TH.red : TH.ink });
      });
      w += txt(cx, cy + 22, '九年一輪', { size: 56, weight: 700 });
      // pointer
      w += S(`M${cx} ${cy - R - 110}l-18 -36h36Z`, 1, { fill: TH.red, w: 2 });
      o += `<g opacity="${f3(B)}">${w}</g>`;
    }
    return G(cam(tl, D, 1.0, 1.05), o);
  },

  // 13. Night finale: lantern procession winds up the hill, fireworks bloom, a family watches.
  closing(tl, sc) {
    const D = dur(sc), L1 = ls(sc, 1); let o = '';
    o += stars(tl, 8, 70, 520);
    const moon = 'M300 150 a56 56 0 1 0 46 88 a44 44 0 1 1 -46 -88Z';
    o += glow(320, 200, 150, 0.35) + wash(moon, TH.gold, 1, 0.6) + S(moon, 1, { w: 2 });
    const fw = [[2.0, 1250, 260, TH.gold], [3.1, 820, 220, TH.pink], [4.6, 1550, 300, TH.red], [6.4, 1050, 200, TH.gold], [7.6, 700, 280, TH.pink], [9.4, 1380, 230, TH.gold], [10.6, 980, 300, TH.red], [12.1, 1600, 220, TH.pink], [13.0, 860, 240, TH.gold], [14.2, 1250, 190, TH.gold], [15.0, 600, 260, TH.pink], [15.9, 1500, 260, TH.red]];
    fw.forEach(([t0, x, y, c], i) => o += firework(x, y, tl, t0, { color: c, groundY: 640, n: 16 + (i % 3) * 4, r: 120 + (i % 3) * 40, rot: i, glowColor: c === TH.red ? 'red' : null }));
    o += mountains(560, 150, 41, 1, { op: 0.7, w: 1.8 });
    o += mist(560, tl, 13, 0.3, 10);
    // hillside with village
    const hill = [[-300, 900], [300, 760], [800, 640], [1300, 620], [1800, 700], [2220, 760]];
    o += S(spline(hill) + 'L2220 1400L-300 1400Z', 1, { fill: true, w: 2.4 });
    const hv = [[520, 715], [760, 660], [1040, 640], [1290, 636], [1540, 660], [1780, 706], [640, 800], [1150, 740], [1430, 760]];
    hv.forEach(([x, y], i) => o += hut(x, y, 1.1, 1, 300 + i, { lit: 0.6 + 0.4 * Math.sin(tl * 2 + i) * 0.3 }));
    // winding path with moving lantern lights
    const path = [[-200, 1060], [300, 980], [700, 930], [1000, 880], [1300, 850], [1650, 820], [2100, 800]];
    o += S(spline(path), 1, { w: 1.6, op: 0.6 });
    const segs = []; for (let i = 0; i < path.length - 1; i++) segs.push(Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]));
    const tot = segs.reduce((a, b) => a + b, 0);
    const posAt = u => { let d = u * tot; for (let i = 0; i < segs.length; i++) { if (d <= segs[i]) { const k = d / segs[i]; return [lerp(path[i][0], path[i + 1][0], k), lerp(path[i][1], path[i + 1][1], k)]; } d -= segs[i]; } return path[path.length - 1]; };
    for (let i = 0; i < 22; i++) { const u = pmod((i / 22) + tl * 0.018, 1); const [x, y] = posAt(u); o += glow(x, y - 14, 40, 0.8) + `<circle cx="${f1(x)}" cy="${f1(y - 14)}" r="5" fill="${TH.glow}"/>`; }
    // family in the foreground watching
    const point = prog(tl, L1 + 0.5, 1.0);
    o += S('M-300 1000 Q200 930 700 1010 L700 1400 L-300 1400Z', 1, { fill: true, w: 2.4 });
    o += person(250, 985, 1.7, 1, { pose: 'stand', seed: 330, face: 1, hat: 'bun', lean: -4 });
    o += person(380, 990, 1.05, 1, { pose: 'lantern', moving: false, seed: 331, face: 1, t: tl, lit: 1 });
    o += S(`M${f1(250 + 5 * 1.7)} ${f1(985 - 112 * 1.7)} L${f1(250 + 36 * 1.7)} ${f1(985 - (100 + 30 * point) * 1.7)}`, point, { w: 2.4 });
    return G(cam(tl, D, 1.12, 1.0, 0, 0, -20, 0), o);
  },

  // 14. End card.
  end(tl, sc) {
    const D = dur(sc); let o = '';
    o += stars(tl, 21, 40, 1080);
    o += lantern(960, 120, 1.6, 1, { lit: 1, swing: Math.sin(tl * 1.2) * 5, string: 120 });
    o += txt(960, 430, '新社九庄媽進香', { size: 96, weight: 700, op: prog(tl, 0.3, 1.2), ls: 8 });
    o += txt(960, 500, 'The Nine-Village Mazu of Xinshe', { font: 'EB Garamond', italic: true, size: 40, op: prog(tl, 0.6, 1.2) });
    const lines = [
      '旁白：VoAI 子墨　畫面・配樂：程式原創繪製與合成',
      '資料來源：臺中市文化資產處、國家文化資產網、臺中市政府新聞、',
      '臺中學資料庫、自由時報、ETtoday、聯合新聞網',
      '謹向新社九庄媽信眾與九庄庄頭致敬'
    ];
    lines.forEach((l, i) => o += txt(960, 600 + i * 56, l, { size: 32, op: prog(tl, 1.2 + i * 0.35, 1), fill: i === 3 ? TH.gold : TH.ink }));
    o += burner(960, 1000, 0.7, prog(tl, 0.5, 1.5), { smoke: 0.6, t: tl, smokeH: 160 });
    return G(cam(tl, D, 1.0, 1.03), o);
  }
};
