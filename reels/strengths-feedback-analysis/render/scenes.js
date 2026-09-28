// Scene compositions for a 1080x1920 Reel and 1080x1350 carousel.
// The visual metaphor moves from a broken board to observable results, then to a repeatable pattern.
// EVENTS[id](sc) uses the same timing as the drawings so sound cues stay aligned.

const CX = 510;
const ls = (sc, i) => sc.lines[i] ? sc.lines[i].start - sc.start : 0;
const le = (sc, i) => sc.lines[i] ? sc.lines[i].start + sc.lines[i].dur - sc.start : 0;
const dur = sc => sc.end - sc.start;
const tIn = (tl, a, d = 0.7) => clamp((tl - a) / d);
function wrapLines(text, maxChars = 20) {
  const out = [];
  for (const line of text.split('\n')) {
    const chars = [...line];
    for (let i = 0; i < chars.length; i += maxChars) out.push(chars.slice(i, i + maxChars).join(''));
  }
  return out;
}
function zoom(tl, D, z0, z1, cx = CX, cy = 960) {
  const z = lerp(z0, z1, smooth01(tl / D) * 0.5 + (tl / D) * 0.5);
  return `translate(${cx} ${cy}) scale(${f3(z)}) translate(${-cx} ${-cy})`;
}

function checkMark(x, y, p, color = TH.teal, w = 8) {
  return S(handLine([[x - 24, y], [x - 4, y + 20], [x + 38, y - 28]], 2, 41, 15), p, { w, stroke: color });
}
function crossMark(x, y, p, color = TH.red, w = 7) {
  return S(handLine([[x - 28, y - 28], [x + 28, y + 28]], 2, 42, 18), p, { w, stroke: color }) +
    S(handLine([[x + 28, y - 28], [x - 28, y + 28]], 2, 43, 18), p, { w, stroke: color });
}
function star(cx, cy, r, p, color = TH.teal) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  const d = handPoly(pts, 2, 71, 18);
  return wash(d, color, p, 0.32) + S(d, p, { w: 3, stroke: color });
}
function noteCard(x, y, w, h, p, seed, label, accent = TH.teal) {
  const d = roundRect(x - w / 2, y - h / 2, w, h, 18, seed, 1.4);
  return wash(d, TH.paper2, p, 0.66) + S(d, p, { fill: TH.paper2, w: 2.6 }) +
    T(x, y + 12, label, { size: 38, fill: accent, op: p });
}
function arrowLine(x0, y0, x1, y1, p, color = TH.teal) {
  const a = Math.atan2(y1 - y0, x1 - x0), h = 24;
  const d = handLine([[x0, y0], [x1, y1]], 1.8, 73, 24);
  return S(d, p, { w: 4, stroke: color }) +
    S(handLine([[x1, y1], [x1 - Math.cos(a - 0.48) * h, y1 - Math.sin(a - 0.48) * h]], 1.2, 74, 12), p, { w: 4, stroke: color }) +
    S(handLine([[x1, y1], [x1 - Math.cos(a + 0.48) * h, y1 - Math.sin(a + 0.48) * h]], 1.2, 75, 12), p, { w: 4, stroke: color });
}
function target(cx, cy, p, color = TH.teal) {
  let out = '';
  [110, 76, 42].forEach((r, i) => out += S(ell(cx, cy, r, r, 80 + i), p, { w: 3 - i * 0.4, stroke: i === 2 ? color : TH.ink, op: 0.78 }));
  out += S(handLine([[cx - 135, cy], [cx + 135, cy]], 1.2, 84, 30), p, { w: 1.8, stroke: TH.faint, op: 0.65 });
  out += S(handLine([[cx, cy - 135], [cx, cy + 135]], 1.2, 85, 30), p, { w: 1.8, stroke: TH.faint, op: 0.65 });
  out += star(cx, cy, 30, p, color);
  return out;
}
function brokenBoard(p) {
  const left = handPoly([[130, 650], [315, 640], [315, 738], [132, 748]], 2, 90, 28);
  const right = handPoly([[390, 638], [540, 645], [540, 742], [390, 735]], 2, 91, 28);
  return wash(left, TH.redL, p, 0.35) + S(left, p, { fill: TH.paper2, w: 3 }) +
    wash(right, TH.redL, p, 0.35) + S(right, p, { fill: TH.paper2, w: 3 }) +
    crossMark(352, 696, p, TH.red, 5) + T(335, 810, '短板', { size: 42, fill: TH.red, op: p });
}

const SCENES = {
  // ---------------------------------------------------------------- 1. hook
  cover(tl, sc, M) {
    const L0 = ls(sc, 0), L1 = ls(sc, 1), L2 = ls(sc, 2), D = dur(sc);
    let art = '', txt = '';
    const p0 = tIn(tl, 0.05, 0.55), p1 = tIn(tl, L1, 0.65), p2 = tIn(tl, L2, 0.75);
    art += brokenBoard(p0);
    art += arrowLine(565, 695, 760, 695, p1, TH.teal);
    art += target(842, 694, p1, TH.teal);
    art += star(842, 694, 30, p2, TH.teal);
    art += figure(270, 1320, 235, tIn(tl, 0.2, 0.9), tl, { seed: 2, reachR: 35, accent: TH.redL });
    art += S(handLine([[270, 1160], [270, 1000], [360, 910]], 2, 93, 24), tIn(tl, L2, 0.8), { w: 3, stroke: TH.teal, op: 0.7 });
    txt += Tw(CX, 355, '別急著補短板', tIn(tl, L0, 0.6), { size: 88, id: 'c1' });
    txt += underline(CX - measure('別急著補短板', 88) / 2, CX + measure('別急著補短板', 88) / 2, 382, tIn(tl, L0 + 0.6, 0.45), { seed: 9, stroke: TH.red });
    txt += Tw(CX, 940, [['先找出你'], ['總是超預期的事', TH.teal]], p1, { size: 66, id: 'c2' });
    txt += Tw(CX, 1040, '不是先證明自己不夠好。', p2, { size: 46, weight: 400, fill: TH.faint, id: 'c3' });
    return { art: G(zoom(tl, D, 1, 1.025, CX, 860), art), txt };
  },

  // ---------------------------------------------------------------- 2. reframe self-assessment
  reframe(tl, sc, M) {
    const L0 = ls(sc, 0), L1 = ls(sc, 1), L2 = ls(sc, 2), D = dur(sc);
    let art = '', txt = '';
    const mirrorP = tIn(tl, L0 + 0.15, 0.9), personP = tIn(tl, L0 + 0.45, 1.0);
    const frame = roundRect(650, 520, 300, 470, 24, 101, 1.5);
    art += wash(frame, TH.tealL, mirrorP, 0.24) + S(frame, mirrorP, { fill: TH.paper2, w: 3 });
    art += S(ell(800, 750, 112, 170, 102), mirrorP, { fill: '#fbf6ea', w: 2.5, stroke: TH.teal });
    art += T(800, 780, '?', { size: 132, fill: TH.faint, op: mirrorP });
    art += figure(350, 1310, 260, personP, tl, { seed: 6, look: 'up', reachR: 30, accent: TH.redL });
    art += arrowLine(500, 810, 650, 810, tIn(tl, L1, 0.6), TH.red);
    art += crossMark(550, 810, tIn(tl, L1 + 0.2, 0.45), TH.red, 5);
    art += target(790, 1130, tIn(tl, L2, 0.8), TH.teal);
    art += arrowLine(630, 1070, 720, 1130, tIn(tl, L2, 0.65), TH.teal);
    txt += Tw(CX, 335, '很多人只記得', tIn(tl, L0, 0.5), { size: 64, id: 'r1' });
    txt += Tw(CX, 420, '哪裡不夠好。', tIn(tl, L0 + 0.55, 0.5), { size: 70, id: 'r2' });
    txt += Tw(800, 1035, '感覺', tIn(tl, L1, 0.5), { size: 42, fill: TH.red, id: 'r3' });
    txt += Tw(790, 1290, '結果', tIn(tl, L2, 0.5), { size: 42, fill: TH.teal, id: 'r4' });
    txt += Tw(CX, M.card ? 1400 : 1470, '自我評估，需要一面外部的鏡子。', tIn(tl, L1 + 0.8, 0.8), { size: 42, weight: 400, fill: TH.faint, id: 'r5' });
    return { art: G(zoom(tl, D, 1, 1.02, CX, 860), art), txt };
  },

  // ---------------------------------------------------------------- 3. feedback analysis
  feedback(tl, sc, M) {
    const L0 = ls(sc, 0), L1 = ls(sc, 1), L2 = ls(sc, 2), D = dur(sc);
    let art = '', txt = '';
    const bookP = tIn(tl, L0 + 0.15, 0.9);
    const left = handPoly([[120, 500], [510, 520], [510, 1160], [120, 1140]], 2, 110, 32);
    const right = handPoly([[510, 520], [900, 500], [900, 1140], [510, 1160]], 2, 111, 32);
    art += wash(left, TH.paper2, bookP, 0.75) + S(left, bookP, { fill: TH.paper2, w: 3 });
    art += wash(right, TH.paper2, bookP, 0.75) + S(right, bookP, { fill: TH.paper2, w: 3 });
    art += S(handLine([[510, 520], [510, 1160]], 1.5, 112, 25), bookP, { w: 4 });
    art += S('M180 670h250M180 740h230M180 810h260M570 670h250M570 740h220M570 810h250', bookP, { w: 2, op: 0.28 });
    art += checkMark(735, 920, tIn(tl, L2, 0.8), TH.teal, 9);
    art += arrowLine(430, 1010, 590, 1010, tIn(tl, L2, 0.8), TH.teal);
    art += scribbleRing(745, 920, 95, 72, tIn(tl, L2 + 0.5, 0.7), { seed: 114, stroke: TH.teal });
    txt += Tw(CX, 310, '德魯克提出一個', tIn(tl, L0, 0.55), { size: 62, id: 'f1' });
    txt += Tw(CX, 395, '簡單的方法。', tIn(tl, L0 + 0.55, 0.55), { size: 70, id: 'f2' });
    txt += Tw(315, 610, '預期', tIn(tl, L1, 0.5), { size: 56, fill: TH.red, id: 'f3' });
    txt += Tw(705, 610, '實際', tIn(tl, L2, 0.5), { size: 56, fill: TH.teal, id: 'f4' });
    txt += T(315, 895, '行動前先寫下', { size: 38, fill: TH.faint, weight: 400, op: tIn(tl, L1 + 0.4, 0.5) });
    txt += T(705, 895, '事後拿回來比', { size: 38, fill: TH.faint, weight: 400, op: tIn(tl, L2 + 0.3, 0.5) });
    txt += Tw(CX, 1310, '讓結果，替你留下紀錄。', tIn(tl, L2 + 0.8, 0.7), { size: 50, fill: TH.teal, id: 'f5' });
    return { art: G(zoom(tl, D, 1, 1.025, CX, 900), art), txt };
  },

  // ---------------------------------------------------------------- 4. pattern extraction
  pattern(tl, sc, M) {
    const L0 = ls(sc, 0), L1 = ls(sc, 1), L2 = ls(sc, 2), D = dur(sc);
    let art = '', txt = '';
    const pCards = tIn(tl, L1 - 0.2, 1.0), pLink = tIn(tl, L2 - 0.15, 1.1);
    const xs = [245, 510, 775], labels = ['任務', '情境', '做法'];
    xs.forEach((x, i) => {
      art += noteCard(x, 650, 220, 170, pCards, 120 + i, labels[i], i === 1 ? TH.red : TH.teal);
      art += checkMark(x, 815, tIn(tl, L1 + 0.3 + i * 0.25, 0.5), i === 1 ? TH.red : TH.teal, 6);
    });
    art += S(handLine([[245, 890], [330, 970], [510, 1010], [690, 970], [775, 890]], 2, 130, 25), pLink, { w: 4, stroke: TH.teal });
    art += star(510, 1085, 62, pLink, TH.teal);
    art += target(510, 1085, tIn(tl, L2 + 0.4, 0.8), TH.teal);
    const orbitA = tl * 2.6, pulse = 0.5 + 0.5 * Math.sin(tl * 4.4);
    art += S(ell(510, 1085, 76 + 8 * pulse, 76 + 8 * pulse, 136), 1, { w: 3, stroke: TH.teal, op: 0.28 + 0.22 * pulse });
    art += S(ell(510 + Math.cos(orbitA) * 118, 1085 + Math.sin(orbitA) * 42, 14, 10, 137), 1, { w: 0, fill: TH.teal, stroke: TH.teal, op: 0.78 });
    art += S(handLine([[510, 1155], [510, 1270]], 1.5, 131, 22), tIn(tl, L2 + 0.8, 0.6), { w: 4, stroke: TH.teal });
    art += star(510, 1295, 28, tIn(tl, L2 + 1.1, 0.6), TH.teal);
    txt += Tw(CX, 330, '不要被一次結果定型。', tIn(tl, L0, 0.65), { size: 64, id: 'p1' });
    txt += Tw(CX, 430, '把幾次紀錄放在一起。', tIn(tl, L1, 0.65), { size: 58, id: 'p2' });
    txt += Tw(CX, 900, '找出重複出現的模式。', tIn(tl, L2, 0.65), { size: 58, fill: TH.teal, id: 'p3' });
    txt += T(CX, 1210, '超預期，不是一次的煙火。', { size: 42, fill: TH.faint, weight: 400, op: tIn(tl, L2 + 0.7, 0.6) });
    return { art: G(zoom(tl, D, 1, 1.02, CX, 900), art), txt };
  },

  // ---------------------------------------------------------------- 5. close + saveable CTA
  close(tl, sc, M) {
    const D = dur(sc), L0 = ls(sc, 0), L1 = ls(sc, 1), L2 = ls(sc, 2), L3 = ls(sc, 3), L4 = ls(sc, 4);
    let art = '', txt = '';
    const p = tIn(tl, L0, 0.8);
    const boxes = [
      [260, 620, '結果', TH.red],
      [510, 620, '模式', TH.teal],
      [760, 620, '下一步', TH.ink],
    ];
    boxes.forEach(([x, y, lab, color], i) => {
      const q = tIn(tl, L0 + i * 0.32, 0.65);
      const d = roundRect(x - 104, y - 68, 208, 136, 20, 140 + i, 1.2);
      art += wash(d, i === 1 ? TH.tealL : TH.paper2, q, i === 1 ? 0.45 : 0.72) + S(d, q, { fill: TH.paper2, w: 3, stroke: color });
      art += T(x, y + 16, lab, { size: 42, fill: color, op: q });
    });
    art += arrowLine(370, 620, 400, 620, tIn(tl, L1, 0.4), TH.teal);
    art += arrowLine(620, 620, 650, 620, tIn(tl, L1 + 0.4, 0.4), TH.teal);
    const lineP = tIn(tl, L2, 0.8);
    art += S(handLine([[510, 760], [510, 840]], 2, 146, 24), lineP, { w: 5, stroke: TH.teal });
    art += S(handLine([[510, 940], [510, 1060]], 2, 147, 24), lineP, { w: 5, stroke: TH.teal });
    art += star(510, 1115, 68, tIn(tl, L2 + 0.35, 0.8), TH.teal);
    art += target(510, 1115, tIn(tl, L2 + 0.55, 0.7), TH.teal);
    const nextY = M.card ? 1240 : 1310, figureY = M.card ? 1300 : 1370;
    art += arrowLine(510, 1215, 510, nextY, tIn(tl, L3, 0.7), TH.teal);
    art += figure(510, figureY, 130, tIn(tl, L3 + 0.25, 0.7), tl, { seed: 7, reachR: 10, accent: TH.tealL });
    txt += Tw(CX, 300, '強項不是自我感覺良好。', p, { size: 58, id: 'e1' });
    txt += Tw(CX, 390, '它是結果反覆驗證的線索。', tIn(tl, L1, 0.7), { size: 54, fill: TH.teal, id: 'e2' });
    txt += Tw(CX, 890, '先把時間放到高槓桿上。', tIn(tl, L2, 0.7), { size: 54, id: 'e3' });
    txt += Tw(CX, 1430, '收藏這套問題，下一次行動前拿出來。', tIn(tl, L4, 0.7), { size: 42, fill: TH.ink, id: 'e4' });
    const sourceP = M.card ? 1 : tIn(tl, le(sc, 4) + 0.25, 0.6);
    wrapLines(SOURCES.join('\n'), 20, 880).forEach((s, i) => {
      txt += T(68, 1510 + i * 26, s, { size: 20, weight: 400, fill: TH.faint, anchor: 'start', op: sourceP });
    });
    return { art: G(zoom(tl, D, 1, 1.015, CX, 930), art), txt };
  },
};

const SOURCES = [
  '來源｜Peter F. Drucker, “Managing Oneself,” Harvard Business Review（1999；2005 重刊）。',
  '研究補充｜Rudolph et al., Applied Research in Quality of Life 20, 753–788（2025），DOI 10.1007/s11482-025-10424-2。',
  '查證註記｜未採用「哈佛 2,000 人／收入 3 倍」：未找到可核對的原始研究來源。',
];

// Sound cues per scene; all times are scene-local and share the drawing's line starts.
const EVENTS = {
  cover(sc) {
    const L0 = ls(sc, 0), L2 = ls(sc, 2);
    return [
      { t: 0.1, kind: 'thump', g: 0.8 },
      { t: L0 + 0.55, kind: 'strike', g: 0.55 },
      { t: L2 + 0.25, kind: 'punch', g: 0.8 },
      { t: L2 + 0.95, kind: 'chime', g: 0.45 },
    ];
  },
  reframe(sc) {
    const L0 = ls(sc, 0), L1 = ls(sc, 1), L2 = ls(sc, 2);
    return [
      { t: L0 + 0.6, kind: 'scribble', g: 0.5, d: 0.55 },
      { t: L1 + 0.3, kind: 'strike', g: 0.6 },
      { t: L2 + 0.4, kind: 'whoosh', g: 0.45, d: 0.65 },
      { t: L2 + 1.0, kind: 'chime', g: 0.45 },
    ];
  },
  feedback(sc) {
    const L0 = ls(sc, 0), L1 = ls(sc, 1), L2 = ls(sc, 2);
    return [
      { t: L0 + 0.25, kind: 'page', g: 0.7 },
      { t: L1 + 0.35, kind: 'write', g: 0.6, d: 0.8 },
      { t: L2 + 0.25, kind: 'click', g: 0.5 },
      { t: L2 + 0.9, kind: 'chime', g: 0.55 },
    ];
  },
  pattern(sc) {
    const L0 = ls(sc, 0), L1 = ls(sc, 1), L2 = ls(sc, 2);
    return [
      { t: L0 + 0.4, kind: 'whoosh', g: 0.45, d: 0.5 },
      { t: L1 + 0.25, kind: 'blip', g: 0.45, n: 0 },
      { t: L1 + 0.55, kind: 'blip', g: 0.45, n: 1 },
      { t: L1 + 0.85, kind: 'blip', g: 0.45, n: 2 },
      { t: L2 + 0.6, kind: 'chime', g: 0.6 },
    ];
  },
  close(sc) {
    const L2 = ls(sc, 2), L3 = ls(sc, 3), L4 = ls(sc, 4);
    return [
      { t: L2 + 0.25, kind: 'click', g: 0.45 },
      { t: L3 + 0.3, kind: 'write', g: 0.6, d: 0.8 },
      { t: L4 + 0.2, kind: 'chime', g: 0.85 },
      { t: L4 + 0.9, kind: 'scribble', g: 0.35, d: 0.45 },
    ];
  },
};
