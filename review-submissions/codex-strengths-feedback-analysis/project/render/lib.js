// Hand-drawn line-art toolkit: math helpers, stroke primitives and reusable SVG components.
// Every component returns an SVG string. Coordinates are local: (x, y) is the base/ground point,
// s is the scale, p is the "draw-on" progress (0 = nothing drawn, 1 = fully drawn).

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth01 = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const prog = (t, start, dur) => smooth01((t - start) / dur);
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const pmod = (a, n) => ((a % n) + n) % n; // modulo that stays positive for negative (pre-roll) times
const f1 = n => Math.round(n * 10) / 10;
const f3 = n => Math.round(n * 1000) / 1000;

// Staggered sub-progress: part i of n, each part occupies a window of width k/n.
function st(p, i, n, k = 2) {
  if (n <= 1) return clamp(p);
  const w = Math.min(1, k / n), s = (1 - w) * i / (n - 1);
  return clamp((p - s) / w);
}

function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const hashf = (i, s = 1) => { const r = rng(i * 9301 + s * 49297 + 233); r(); return r(); };

// ---------- theme: warm paper, deep ink, one teal accent + vermilion reserved for 自費 / 缺口 ----------
const TH = { ink: '#26211c', fill: '#f4eee1', faint: '#877e70', teal: '#1d6b66', tealL: '#9cc7c0', red: '#cc3b25', redL: '#eea593', paper2: '#ebe3d1' };
// ---------- path construction ----------
// Catmull-Rom spline through points -> cubic Bezier path.
function spline(pts, closed = false, tension = 1) {
  const n = pts.length;
  if (n < 2) return '';
  const P = i => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6 * tension, p1[1] + (p2[1] - p0[1]) / 6 * tension];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6 * tension, p2[1] - (p3[1] - p1[1]) / 6 * tension];
    d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}
const poly = (pts, closed = false) => 'M' + pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L') + (closed ? 'Z' : '');
// Add small hand jitter to points (static per seed; temporal boil comes from the SVG filter).
function wig(pts, amp, seed) {
  const r = rng(seed);
  return pts.map(p => [p[0] + (r() - 0.5) * amp, p[1] + (r() - 0.5) * amp]);
}
// Densify a polyline so jitter reads as hand wobble.
function dens(pts, step = 18) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const handLine = (pts, amp = 1.6, seed = 7, step = 22) => spline(wig(dens(pts, step), amp, seed));
const handPoly = (pts, amp = 1.6, seed = 7, step = 22) => spline(wig(dens([...pts, pts[0]], step), amp, seed).slice(0, -1), true);
function ellPts(cx, cy, rx, ry, n = 16, a0 = 0) {
  const o = []; for (let i = 0; i < n; i++) { const a = a0 + i / n * Math.PI * 2; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o;
}
const ell = (cx, cy, rx, ry, seed = 3, amp = 1.2) => spline(wig(ellPts(cx, cy, rx, ry, Math.max(10, Math.round((rx + ry) / 6))), amp, seed), true);

// ---------- stroke primitives ----------
// S: one ink stroke that "draws itself" as p goes 0 -> 1; closed shapes can carry an occluding fill.
function S(d, p = 1, o = {}) {
  if (p <= 0.001) return '';
  const stroke = o.stroke || TH.ink, w = o.w ?? 2.6;
  const fill = o.fill === true ? TH.fill : (o.fill || 'none');
  const dash = p < 0.999 ? ` stroke-dasharray="1 1" stroke-dashoffset="${f3(1 - p)}"` : '';
  const fo = fill === 'none' ? '' : ` fill-opacity="${f3(clamp((p - 0.25) / 0.5) * (o.fo ?? 1))}"`;
  const op = o.op != null ? ` opacity="${f3(o.op)}"` : '';
  return `<path d="${d}" pathLength="1"${dash} fill="${fill}"${fo} stroke="${w > 0 ? stroke : 'none'}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op}/>`;
}
// SS: stroke plus a faint second sketch pass, the way a pen retraces an outline.
function SS(d, p = 1, o = {}) {
  return S(d, p, o) + (p > 0.02 ? `<g transform="translate(1.3 0.9)">${S(d, p, { w: (o.w ?? 2.6) * 0.45, op: 0.35, stroke: o.stroke })}</g>` : '');
}
// Flat colour wash (watercolour-like accent), fades in with p.
function wash(d, color, p = 1, op = 0.55) {
  if (p <= 0.01) return '';
  return `<path d="${d}" fill="${color}" opacity="${f3(op * smooth01(p))}" stroke="none"/>`;
}
const G = (tf, inner, extra = '') => `<g transform="${tf}"${extra}>${inner}</g>`;
const at = (x, y, s = 1, flip = 1, rot = 0) => `translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f3(s * flip)} ${f3(s)})`;

// ---------- text ----------
// 芫荽 Iansui: handwriting-style, Taiwan MOE standard glyph forms (為/真/內/值). One weight only, so
// bold (700) is rendered as the same glyphs plus a same-colour outline stroke.
const ZH = 'Iansui';
const boldW = size => f1(size * 0.035);
const mctx = document.createElement('canvas').getContext('2d');
const measure = (str, size, weight = 700) => { mctx.font = `400 ${size}px "${ZH}"`; return mctx.measureText(str).width + (weight >= 700 ? size * 0.035 : 0); };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
// Rich text line: spans = string | [[text, colour], ...]. o: size, weight, anchor, op, rise (px of upward slide still to go).
function T(x, y, spans, o = {}) {
  if ((o.op ?? 1) <= 0.002) return '';
  if (typeof spans === 'string') spans = [[spans]];
  const bold = (o.weight ?? 700) >= 700, size = o.size || 48;
  const inner = spans.map(([s, c, extra]) => { const col = c || o.fill || TH.ink; return `<tspan fill="${col}"${bold ? ` stroke="${col}"` : ''}${extra || ''}>${esc(s)}</tspan>`; }).join('');
  return `<text x="${f1(x)}" y="${f1(y + (o.rise || 0))}" font-family="${ZH}" font-size="${size}" font-weight="400"${bold ? ` stroke-width="${boldW(size)}" stroke-linejoin="round" paint-order="stroke"` : ''} text-anchor="${o.anchor || 'middle'}" opacity="${f3(o.op ?? 1)}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${inner}</text>`;
}
const spanText = spans => typeof spans === 'string' ? spans : spans.map(s => s[0]).join('');
// Handwriting-style reveal: a left-to-right wipe with a soft leading edge, plus a small rise.
let WIPE_ID = 0;
function Tw(x, y, spans, p, o = {}) {
  if (p <= 0.001) return '';
  const size = o.size || 48, w = measure(spanText(spans), size, o.weight ?? 700) + 20;
  const x0 = (o.anchor === 'start' ? x : o.anchor === 'end' ? x - w : x - w / 2) - 10;
  const id = `w${o.id || ''}${WIPE_ID++}`, k = easeOut(p);
  const body = T(x, y, spans, { ...o, rise: (1 - k) * 10, op: (o.op ?? 1) * clamp(p * 3) });
  if (p >= 0.999) return body;
  return `<defs><linearGradient id="${id}g" x1="0" x2="1"><stop offset="${f3(Math.max(0, k * 1.15 - 0.15))}" stop-color="#fff"/><stop offset="${f3(Math.min(1, k * 1.15))}" stop-color="#000"/></linearGradient>` +
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="${f1(x0)}" y="${f1(y - size * 1.2)}" width="${f1(w + 20)}" height="${f1(size * 1.7)}"><rect x="${f1(x0)}" y="${f1(y - size * 1.2)}" width="${f1(w + 20)}" height="${f1(size * 1.7)}" fill="url(#${id}g)"/></mask></defs><g mask="url(#${id})">${body}</g>`;
}
// Hand-drawn underline / circle / strike used for emphasis.
const underline = (x0, x1, y, p, o = {}) => S(handLine([[x0, y], [lerp(x0, x1, 0.5), y + 5], [x1, y - 3]], 2.5, o.seed ?? 3, 30), p, { w: o.w ?? 5, stroke: o.stroke || TH.red });
function scribbleRing(cx, cy, rx, ry, p, o = {}) {
  const pts = []; for (let i = 0; i <= 30; i++) { const a = -2.2 + i / 30 * Math.PI * 2.25; const k = 1 + 0.06 * Math.sin(i * 1.7); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return S(spline(wig(pts, 3, o.seed ?? 5)), p, { w: o.w ?? 4.5, stroke: o.stroke || TH.red });
}
// Small rounded "tag" chip: outline + text in one colour.
function tag(x, y, str, p, o = {}) {
  if (p <= 0.01) return '';
  const size = o.size || 30, w = measure(str, size) + 34, h = size + 20, c = o.color || TH.red;
  const box = handPoly([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]], 1.4, o.seed ?? 2, 26);
  return G(`translate(${f1(x)} ${f1(y)}) scale(${f3(o.pulse ?? 1)}) translate(${f1(-x)} ${f1(-y)})`,
    wash(box, c, p, 0.12) + S(box, p, { w: 2.6, stroke: c }) + T(x, y + size * 0.36, str, { size, fill: c, op: clamp(p * 2 - 0.6) }));
}

// ---------- objects (local coords: (0,0) = centre unless noted; p = draw-on progress) ----------
function roundRect(x, y, w, h, r, seed = 1, amp = 1.2) {
  const pts = [];
  const corner = (cx, cy, a0) => { for (let i = 0; i <= 4; i++) { const a = a0 + i / 4 * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
  return spline(wig(dens([...pts, pts[0]], 26), amp, seed).slice(0, -1), true);
}

// Big hand-drawn arrow pointing up; grows from base (0,0) to height h.
function upArrow(h, p, o = {}) {
  if (h < 4) return '';
  const w = o.w ?? 26, hw = o.hw ?? 58, hh = Math.min(o.hh ?? 70, h * 0.6);
  const d = handPoly([[-w / 2, 0], [-w / 2, -h + hh], [-hw / 2, -h + hh], [0, -h], [hw / 2, -h + hh], [w / 2, -h + hh], [w / 2, 0]], 1.4, o.seed ?? 4, 24);
  return wash(d, o.color || TH.teal, p, 0.55) + S(d, p, { w: 3, stroke: o.color || TH.teal });
}

// Wallet seen from the front; thick 1..0 (fat with notes -> flat).
function wallet(p, thick, o = {}) {
  const W = 250, H = 150 + 60 * thick;
  let notes = '';
  const n = Math.round(1 + thick * 5);
  for (let i = 0; i < n; i++) {
    const y = -H / 2 - 10 - i * 7 * thick, x = -W / 2 + 18 + (i % 2) * 6;
    const d = handPoly([[x, y], [x + W - 40, y - 2], [x + W - 40, y + 50], [x, y + 50]], 1, 30 + i);
    notes += S(d, st(p, 1, 3), { fill: TH.paper2, w: 1.8 }) + wash(d, TH.teal, st(p, 1, 3), 0.18);
  }
  const body = roundRect(-W / 2, -H / 2, W, H, 22, 11);
  const flap = spline([[-W / 2 + 4, -H / 2 + 36], [0, -H / 2 + 46 + 10 * thick], [W / 2 - 4, -H / 2 + 36]]);
  const clasp = roundRect(W / 2 - 58, -8, 50, 40, 12, 12);
  let seams = ''; for (let i = 0; i < Math.round(1 + thick * 3); i++) seams += `M${-W / 2 + 14} ${f1(H / 2 - 14 - i * 12)}L${W / 2 - 14} ${f1(H / 2 - 14 - i * 12)}`;
  return notes + S(body, st(p, 0, 3), { fill: true }) + wash(body, TH.ink, st(p, 0, 3), 0.08) + S(flap, st(p, 1, 3), { w: 2.2 }) +
    S(clasp, st(p, 2, 3), { fill: true, w: 2.2 }) + S(ell(W / 2 - 33, 12, 6, 6, 2), st(p, 2, 3), { w: 2 }) + S(seams, st(p, 2, 3), { w: 1.2, op: 0.5 });
}
// A banknote flying away (for the thinning wallet).
function note(p, o = {}) {
  const d = handPoly([[-60, -28], [60, -30], [62, 28], [-58, 30]], 1, o.seed ?? 3);
  return S(d, p, { fill: TH.paper2, w: 2 }) + wash(d, TH.teal, p, 0.18) + S(ell(0, 0, 14, 14, 4), p, { w: 1.6 }) + T(0, 8, '$', { size: 22, op: p });
}

// Pill bottle with a capsule; capsule pops out at k (0..1) and wobbles with t.
function pillBottle(p, t, k, o = {}) {
  const body = roundRect(-62, -70, 124, 150, 18, 3);
  const cap = roundRect(-70, -110, 140, 44, 10, 4);
  let ridges = ''; for (let i = 0; i < 9; i++) ridges += `M${-58 + i * 14.5} -104v32`;
  const label = handPoly([[-50, -30], [50, -30], [50, 44], [-50, 44]], 1, 5);
  const cx = lerp(0, 118, easeOut(k)), cy = lerp(-100, 58, k < 0.5 ? 0 : (k - 0.5) * 2) - Math.sin(Math.PI * clamp(k * 1.2)) * 90;
  const rot = lerp(0, 380, easeOut(k)) + (k >= 1 ? Math.sin(t * 5) * 6 * Math.exp(-(t % 3)) : 0);
  const capsule = G(at(cx, cy, 1, 1, rot), S(roundRect(-40, -16, 80, 32, 16, 6), 1, { fill: true, w: 2.4 }) + wash(roundRect(0, -16, 40, 32, 14, 7), TH.teal, 1, 0.7) + S('M0 -16V16', 1, { w: 2 }));
  return S(body, st(p, 0, 4), { fill: true }) + S(cap, st(p, 1, 4), { fill: true }) + S(ridges, st(p, 1, 4), { w: 1.3, op: 0.7 }) +
    S(label, st(p, 2, 4), { fill: TH.paper2, w: 1.8 }) + T(0, 18, 'Rx', { size: 44, op: st(p, 3, 4) }) + (k > 0 ? capsule : '');
}

// Stent (特殊醫材): a mesh tube that expands with e (0..1).
function stent(p, e, o = {}) {
  const L = 230, r = lerp(22, 46, e);
  const top = handLine([[-L / 2, -r], [L / 2, -r]], 1, 2, 30), bot = handLine([[-L / 2, r], [L / 2, r]], 1, 3, 30);
  let mesh = ''; const n = 8;
  for (let i = 0; i < n; i++) { const x0 = -L / 2 + i * L / n, x1 = x0 + L / n; mesh += `M${f1(x0)} ${f1(-r)}L${f1((x0 + x1) / 2)} ${f1(r)}L${f1(x1)} ${f1(-r)}`; }
  const endL = ell(-L / 2, 0, r * 0.32, r, 4, 0.6), endR = ell(L / 2, 0, r * 0.32, r, 5, 0.6);
  return G('rotate(-16)', wash(`M${-L / 2} ${-r}H${L / 2}V${r}H${-L / 2}Z`, TH.tealL, p, 0.35) + S(top, st(p, 0, 3)) + S(bot, st(p, 0, 3)) + S(mesh, st(p, 1, 3), { w: 2, stroke: TH.teal }) +
    S(endL, st(p, 2, 3), { w: 2.2 }) + S(endR, st(p, 2, 3), { w: 2.2 }));
}
// Hanging price tag that swings.
function priceTag(p, swing, str = '$') {
  const d = handPoly([[-26, 0], [26, 0], [26, 56], [0, 74], [-26, 56]], 1, 8);
  return G(`rotate(${f1(swing)})`, S('M0 -40V0', p, { w: 1.6 }) + S(d, p, { fill: true, w: 2.2 }) + S(ell(0, 12, 5, 5, 3), p, { w: 1.6 }) + T(0, 50, str, { size: 26, op: p, fill: TH.red }));
}

// Hospital bed in a single room: room outline, bed, pillow, blanket, door plaque with "1".
function bedRoom(p, t, o = {}) {
  const room = handPoly([[-150, -120], [150, -120], [150, 90], [-150, 90]], 1.4, 9);
  const head = roundRect(-128, -40, 20, 110, 6, 3);
  const frame = handPoly([[-110, 20], [128, 20], [128, 44], [-110, 44]], 1, 4);
  const legs = 'M-104 44V86M122 44V86';
  const pillow = roundRect(-104, -8, 62, 28, 12, 5);
  const blanket = spline([[-44, 20], [-40, -2], [10, -10], [70, -6], [126, 4], [128, 20]], false) + 'Z';
  const win = handPoly([[40, -100], [120, -100], [120, -48], [40, -48]], 1, 7);
  const sw = Math.sin(t * 3.2) * 10 * Math.exp(-((t % 4)) * 0.6);
  const plaque = G(`translate(-60 -120) rotate(${f1(sw)})`, S('M0 0V16', p, { w: 1.4 }) + S(ell(0, 40, 24, 24, 6), st(p, 2, 3), { fill: true, w: 2.4 }) + T(0, 54, '1', { size: 36, op: st(p, 2, 3), fill: TH.teal }));
  return S(room, st(p, 0, 3), { w: 2, op: 0.55 }) + S(win, st(p, 0, 3), { w: 1.6, op: 0.6 }) + S('M80 -100V-48M40 -74H120', st(p, 0, 3), { w: 1.2, op: 0.5 }) +
    S(legs, st(p, 1, 3)) + S(head, st(p, 1, 3), { fill: true }) + S(frame, st(p, 1, 3), { fill: true }) + S(pillow, st(p, 2, 3), { fill: true, w: 2.2 }) +
    S(blanket, st(p, 2, 3), { fill: TH.paper2, w: 2.2 }) + wash(blanket, TH.tealL, st(p, 2, 3), 0.4) + plaque;
}

// Empty payslip + clock whose second hand stops (收入中斷).
function payClock(p, t, stopT, o = {}) {
  const slip = handPoly([[-150, -110], [30, -110], [30, 110], [-150, 110]], 1.2, 12);
  let lines = ''; for (let i = 0; i < 3; i++) lines += `M-130 ${-40 + i * 32}h${100 - i * 18}`;
  const amt = handPoly([[-130, 56], [10, 56], [10, 94], [-130, 94]], 1, 13);
  const cx = 72, cy = 6, R = 70, face = ell(cx, cy, R, R, 14, 1.2);
  let ticks = ''; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ticks += `M${f1(cx + Math.cos(a) * (R - 12))} ${f1(cy + Math.sin(a) * (R - 12))}L${f1(cx + Math.cos(a) * (R - 4))} ${f1(cy + Math.sin(a) * (R - 4))}`; }
  const sec = Math.floor(Math.min(t, stopT) * 2) / 2;            // ticks twice a second until it stops
  const a = -Math.PI / 2 + sec * Math.PI / 5;
  const hand = `M${cx} ${cy}L${f1(cx + Math.cos(a) * (R - 16))} ${f1(cy + Math.sin(a) * (R - 16))}`;
  const pz = clamp((t - stopT) / 0.5);
  const pause = G(`translate(${cx + 8} ${cy + 20}) scale(0.8)`, S(roundRect(-15, -20, 10, 40, 3, 2), pz, { fill: TH.ink, w: 1.5 }) + S(roundRect(5, -20, 10, 40, 3, 3), pz, { fill: TH.ink, w: 1.5 }));
  return S(slip, st(p, 0, 3), { fill: true }) + T(-60, -68, '薪資單', { size: 30, op: st(p, 0, 3) }) + S(lines, st(p, 1, 3), { w: 1.6, op: 0.6 }) +
    S(amt, st(p, 1, 3), { w: 2, stroke: TH.red }) + T(-60, 86, '$ — —', { size: 28, op: st(p, 1, 3), fill: TH.red }) +
    S(face, st(p, 2, 3), { fill: true }) + S(ticks, st(p, 2, 3), { w: 1.6 }) + S(`M${cx} ${cy}L${cx - 30} ${cy - 30}`, st(p, 2, 3), { w: 3 }) +
    (pz < 1 ? S(hand, st(p, 2, 3) * (1 - pz), { w: 2, stroke: TH.red }) : '') + pause;
}

// Frontal family figure. h = height, o.hair, o.skirt; arms may reach sideways to hold hands.
function figure(x, y, h, p, t, o = {}) {
  const s = h / 230, seed = o.seed ?? 1, sway = Math.sin(t * 1.3 + seed) * 1.6;
  const head = ell(0, -196, 22, 24, seed, 0.8);
  const body = o.skirt ? handPoly([[-24, -164], [24, -164], [42, -64], [-42, -64]], 1, seed + 1) : handPoly([[-26, -164], [26, -164], [30, -70], [-30, -70]], 1, seed + 1);
  const legs = o.skirt ? 'M-14 -64L-16 0M14 -64L16 0' : 'M-16 -70L-20 0M16 -70L20 0';
  const armL = spline([[-24, -156], [-40 - (o.reachL ?? 0) * 0.4, -120], [-44 - (o.reachL ?? 0), -86 + (o.reachLy ?? 0)]]);
  const armR = spline([[24, -156], [40 + (o.reachR ?? 0) * 0.4, -120], [44 + (o.reachR ?? 0), -86 + (o.reachRy ?? 0)]]);
  let hair = '';
  if (o.hair === 'long') hair = S(spline([[-24, -186], [-20, -214], [0, -224], [22, -212], [26, -180], [30, -150]]), 1, { w: 2.2 });
  else if (o.hair === 'bun') hair = S(ell(0, -226, 11, 9, seed + 3), 1, { fill: TH.ink, w: 1.2 }) + S(spline([[-22, -198], [-10, -218], [12, -218], [22, -198]]), 1, { w: 2.2 });
  else hair = S(spline([[-22, -196], [-14, -216], [10, -220], [22, -200]]), 1, { w: 2.4 });
  const eyes = `M-8 -198h1M8 -198h1`, mouth = o.look === 'up' ? 'M-6 -186q6 4 12 0' : 'M-6 -184q6 5 12 0';
  const parts = S(legs, st(p, 0, 4), { w: 2.6 }) + S(body, st(p, 1, 4), { fill: true, w: 2.6 }) + (o.accent ? wash(body, o.accent, st(p, 1, 4), 0.45) : '') +
    S(armL, st(p, 2, 4), { w: 2.4 }) + S(armR, st(p, 2, 4), { w: 2.4 }) + S(head, st(p, 2, 4), { fill: true, w: 2.4 }) +
    (p > 0.75 ? hair + S(eyes, 1, { w: 3 }) + S(mouth, 1, { w: 1.8 }) : '');
  return G(`translate(${f1(x + sway * 0.3)} ${f1(y)}) scale(${f3(s)}) rotate(${f1(sway * 0.4)} 0 0)`, parts);
}

// Umbrella. k = how open (0 folded .. 1 open). Canopy rim sits at y=0; shaft to handle at y=len.
// surf(x) gives the canopy's upper surface height for rain collisions (same maths as the drawing).
function umbrellaGeom(k, W = 340, Hh = 210) {
  const w = lerp(W * 0.1, W, k), h = lerp(Hh * 1.9, Hh, k);
  const surf = x => { const u = clamp(Math.abs(x) / w); return -h * Math.pow(1 - u * u, 0.62); };
  return { w, h, surf };
}
function umbrella(k, len, p, t, o = {}) {
  const { w, h, surf } = umbrellaGeom(k, o.W, o.H), n = 8;
  const top = []; for (let i = 0; i <= 40; i++) { const x = -w + 2 * w * i / 40; top.push([x, surf(x)]); }
  let rim = ''; // scalloped lower edge between rib tips
  for (let i = 0; i < n; i++) { const x0 = -w + 2 * w * i / n, x1 = x0 + 2 * w / n; rim += `Q${f1((x0 + x1) / 2)} ${f1(-18 * k)} ${f1(x1)} 0`; }
  // build canopy closed path explicitly: top curve left->right, then scallops right->left
  let d = spline(top);
  for (let i = n - 1; i >= 0; i--) { const x1 = -w + 2 * w * i / n, x0 = x1 + 2 * w / n; d += `Q${f1((x0 + x1) / 2)} ${f1(-18 * k)} ${f1(x1)} 0`; }
  d += 'Z';
  let ribs = '';
  for (let i = 1; i < n; i++) { const x = -w + 2 * w * i / n; ribs += `M0 ${f1(-h)}Q${f1(x * 0.55)} ${f1(surf(x * 0.6) * 0.95)} ${f1(x)} 0`; }
  const shaft = `M0 ${f1(-h - 26)}L0 ${f1(o.stand ? len : len - 30)}`;
  const handle = o.stand ? '' : `M0 ${f1(len - 30)}q0 40 -28 40q-22 0 -22 -22`;
  return S(d, st(p, 1, 3), { fill: true, w: 3 }) + wash(d, TH.teal, st(p, 1, 3), 0.28) + S(ribs, st(p, 2, 3), { w: 1.6, op: 0.7 }) +
    S(shaft, st(p, 0, 3), { w: 4 }) + (handle ? S(handle, st(p, 0, 3), { w: 4 }) : '');
}

// Bucket with a rising water level (0..1). (0,0) = bottom centre.
function bucket(p, level, t, o = {}) {
  const Wt = 70, Wb = 52, H = 120;
  const body = handPoly([[-Wt, -H], [Wt, -H], [Wb, 0], [-Wb, 0]], 1.2, 21);
  const ly = -H * level * 0.9, lw = lerp(Wb, Wt, level * 0.9);
  const water = `M${f1(-lw)} ${f1(ly)}Q0 ${f1(ly + 6)} ${f1(lw)} ${f1(ly)}L${Wb} 0L${-Wb} 0Z`;
  const handle = `M${-Wt + 4} ${-H}Q0 ${-H - 80} ${Wt - 4} ${-H}`;
  let rings = '';
  for (const r of (o.rings || [])) { const u = r; rings += `<ellipse cx="${f1(o.ringX || 0)}" cy="${f1(ly)}" rx="${f1(8 + u * 48)}" ry="${f1(3 + u * 9)}" fill="none" stroke="${TH.ink}" stroke-width="1.6" opacity="${f3((1 - u) * 0.8)}"/>`; }
  return S(handle, st(p, 0, 3), { w: 2.4 }) + S(body, st(p, 0, 3), { fill: true, w: 3 }) + (level > 0.02 ? wash(water, TH.red, st(p, 1, 3), 0.42) + S(`M${f1(-lw)} ${f1(ly)}Q0 ${f1(ly + 6)} ${f1(lw)} ${f1(ly)}`, st(p, 1, 3), { w: 1.8, stroke: TH.red }) : '') + rings +
    S(ell(0, -H, Wt, 12, 22), st(p, 1, 3), { w: 2.4 }) + S(`M${-Wt + 6} ${-H + 34}L${Wt - 9} ${-H + 34}`, st(p, 2, 3), { w: 1.2, op: 0.5 });
}

// Insurance policy booklet. open 0..1: the cover swings over the spine (x = 0).
function policy(p, open, o = {}) {
  const PW = 300, PH = 400;
  const page = side => handPoly([[0, -PH / 2], [side * PW, -PH / 2], [side * PW, PH / 2], [0, PH / 2]], 1, side > 0 ? 31 : 32, 30);
  let out = '';
  // right page (always there, under the cover)
  out += S(page(1), st(p, 0, 3), { fill: true, w: 2.6 });
  if (open > 0.5 || o.showInside) out += o.inside || '';
  // left page appears as the cover passes the spine
  const a = open * Math.PI, c = Math.cos(a);
  if (open > 0.5) out = S(page(-1), 1, { fill: true, w: 2.6 }) + (o.insideLeft || '') + out;
  // the cover itself, squashed horizontally by cos(angle)
  if (open < 0.999) {
    const cov = handPoly([[0, -PH / 2 - 6], [PW + 8, -PH / 2 - 6], [PW + 8, PH / 2 + 6], [0, PH / 2 + 6]], 1.2, 33, 30);
    const front = c > 0;
    const inner = S(cov, st(p, 1, 3), { fill: front ? TH.fill : TH.paper2, w: 2.8 }) + (front ? wash(cov, TH.teal, st(p, 1, 3), 0.2) +
      T(PW / 2, -40, '保 單', { size: 64, op: st(p, 2, 3) }) + S(handLine([[PW / 2 - 90, 0], [PW / 2 + 90, 0]], 1.5, 4), st(p, 2, 3), { w: 2 }) +
      S(`M${PW / 2 - 70} 60h140M${PW / 2 - 70} 96h110`, st(p, 2, 3), { w: 1.6, op: 0.5 }) : '');
    out += `<g transform="scale(${f3(Math.abs(c) < 0.02 ? 0.02 * Math.sign(c || 1) : c)} 1)">${inner}</g>`;
  }
  return out;
}
// A pen: tip at (0,0), pointing down-left.
function pen(o = {}) {
  const b = handPoly([[0, 0], [14, -26], [150, -110], [166, -92], [30, -8]], 1, 41);
  return S(b, 1, { fill: true, w: 2.4 }) + wash(b, TH.teal, 1, 0.35) + S('M0 0L14 -26M22 -18L158 -101', 1, { w: 1.4, op: 0.6 });
}
// Hospital icon (for the public-spending side).
function hospital(p) {
  const b = handPoly([[-70, 0], [-70, -110], [70, -110], [70, 0]], 1.2, 51), roof = handPoly([[-84, -108], [0, -150], [84, -108]], 1.2, 52);
  const cross = 'M-12 -86h24v-0M0 -98v24';
  let win = ''; for (let i = 0; i < 3; i++) win += `M${-50 + i * 38} -52h20v20h-20z`;
  return S(b, st(p, 0, 3), { fill: true }) + S(roof, st(p, 0, 3), { fill: true }) + S('M-12 -80h24M0 -92v24', st(p, 1, 3), { w: 5, stroke: TH.teal }) + S(win, st(p, 2, 3), { w: 1.6 }) + S('M-14 0v-30h28v30', st(p, 2, 3), { w: 2 });
}
