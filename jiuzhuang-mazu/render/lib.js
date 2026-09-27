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

// ---------- themes ----------
const DAY = { ink: '#2b2520', fill: '#f3ecdc', faint: '#8a7f70', red: '#c23b27', pink: '#e39a98', gold: '#c29434', glow: '#ffd27a', night: false };
const NIGHT = { ink: '#eadcaa', fill: '#14223f', faint: '#6f7a92', red: '#e0654c', pink: '#f0aeb0', gold: '#f0c865', glow: '#ffd98a', night: true };
let TH = DAY;
const setTheme = night => { TH = night ? NIGHT : DAY; };

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

// Soft light halo (used for lanterns, candles, fireworks at night).
function glow(x, y, r, op = 1, color) {
  return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="url(#glow${color === 'red' ? 'R' : ''})" opacity="${f3(op)}"/>`;
}

// ---------- nature ----------
function mountains(baseY, amp, seed, p = 1, o = {}) {
  const r = rng(seed), pts = [];
  const x0 = o.x0 ?? -300, x1 = o.x1 ?? 2220, n = o.n ?? 22;
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n);
    const h = amp * (0.3 + 0.7 * Math.pow(Math.abs(Math.sin(i * 0.83 + seed * 1.7)), 1.6) * (0.55 + 0.45 * r())) * (i % 2 ? 0.78 : 1);
    pts.push([x, baseY - h]);
  }
  const ridge = spline(pts);
  const body = ridge + `L${x1} ${baseY + 900}L${x0} ${baseY + 900}Z`;
  // shading hatch strokes on slopes
  let hatch = '';
  if (o.hatch) {
    const rr = rng(seed + 5);
    for (let i = 0; i < n; i += 1) {
      const [x, y] = pts[i];
      if (rr() < 0.55) hatch += S(handLine([[x + 10, y + 18], [x + 34, y + 58 + rr() * 30]], 1.2, seed + i), st(p, i, n, 6) * 0.9, { w: 1.4, op: 0.55 });
    }
  }
  return S(body, 1, { fill: true, w: 0, fo: 1, op: p > 0 ? smooth01(p * 3) : 0 }) + S(ridge, p, { w: o.w ?? 2.4, op: o.op }) + hatch;
}

function cloud(x, y, s = 1, p = 1, seed = 1) {
  const r = rng(seed), w = 190, n = 4 + (seed % 2), step = w / n;
  let d = `M${-w / 2} 12`, xs = -w / 2, ys = 12;
  for (let i = 0; i < n; i++) {
    const nx = xs + step, ny = i === n - 1 ? 12 : -4 - r() * 12, rr = step * (0.62 + r() * 0.25);
    d += `A${f1(rr)} ${f1(rr * (1.05 + r() * 0.3))} 0 0 1 ${f1(nx)} ${f1(ny)}`; xs = nx; ys = ny;
  }
  d += `Q0 26 ${-w / 2} 12Z`;
  const curl = `M${f1(-w / 4)} 2 q 18 -16 36 -2`;
  return G(at(x, y, s), S(d, p, { fill: true, w: 2.2 }) + S(curl, st(p, 1, 2), { w: 1.6, op: 0.55 }));
}

// Auspicious curl cloud (祥雲) ornament.
function xiangyun(x, y, s = 1, p = 1, color) {
  const d = 'M-60 10 C-60 -20 -20 -30 -10 -8 C-4 -30 36 -34 40 -6 C66 -10 72 20 48 22 L-44 22 C-58 22 -62 16 -60 10 Z';
  const c1 = 'M-10 -8 c 2 12 16 14 18 2', c2 = 'M40 -6 c -4 10 -18 10 -16 -2';
  return G(at(x, y, s), S(d, p, { stroke: color, w: 2.2 }) + S(c1, st(p, 1, 2), { stroke: color, w: 1.8 }) + S(c2, st(p, 1, 2), { stroke: color, w: 1.8 }));
}

function tree(x, y, s = 1, p = 1, t = 0, seed = 1, o = {}) {
  const r = rng(seed);
  const sway = Math.sin(t * 0.9 + seed) * 2.2;
  const trunk = handPoly([[-10, 0], [-7, -60], [-18, -100], [-4, -92], [0, -120], [6, -95], [20, -108], [9, -58], [12, 0]], 1.2, seed);
  const pts = []; const R = o.r ?? 78, cy = -150;
  for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2; const k = 0.85 + r() * 0.3; pts.push([Math.cos(a) * R * 1.25 * k + sway, cy + Math.sin(a) * R * 0.82 * k]); }
  // bumpy canopy: make scalloped edge by inserting outward bumps
  const sc = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; sc.push(a); const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const dx = m[0] - sway, dy = m[1] - cy; const L = Math.hypot(dx, dy); sc.push([m[0] + dx / L * 12, m[1] + dy / L * 12]); }
  const canopy = spline(sc, true);
  let leaves = '';
  for (let i = 0; i < 7; i++) {
    const lx = (r() - 0.5) * R * 1.6 + sway, ly = cy + (r() - 0.5) * R * 0.9;
    leaves += S(`M${f1(lx)} ${f1(ly)} q 8 -7 16 0`, st(p, 2 + i, 10), { w: 1.5, op: 0.6 });
  }
  return G(at(x, y, s), S(trunk, st(p, 0, 3), { fill: true }) + SS(canopy, st(p, 1, 3), { fill: true }) + leaves +
    (o.accent ? wash(canopy, o.accent, p, 0.15) : ''));
}

function grass(x, y, s = 1, p = 1, t = 0, seed = 1) {
  const sw = Math.sin(t * 1.6 + seed) * 3;
  let o = '';
  for (let i = 0; i < 4; i++) o += `M${-9 + i * 6} 0 q ${2 + sw / 2} -12 ${-2 + i * 2 + sw} ${-16 - (i % 2) * 8}`;
  return G(at(x, y, s), S(o, p, { w: 1.6, op: 0.8 }));
}

function birds(x, y, t, n = 4, seed = 1, s = 1) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const r = rng(seed + i);
    const bx = x + i * 46 * s + r() * 20, by = y + Math.sin(i * 1.7) * 26 * s + r() * 10;
    const flap = Math.sin(t * 9 + i * 1.3) * 7;
    out += S(`M${f1(bx - 12 * s)} ${f1(by - flap * s)} Q${f1(bx - 5 * s)} ${f1(by - 4 * s)} ${f1(bx)} ${f1(by)} Q${f1(bx + 5 * s)} ${f1(by - 4 * s)} ${f1(bx + 12 * s)} ${f1(by - flap * s)}`, 1, { w: 1.8 });
  }
  return out;
}

// Drifting mist bands.
function mist(y, t, seed = 1, op = 0.5, speed = 12, w = 1.5) {
  const r = rng(seed); let out = '';
  for (let i = 0; i < 4; i++) {
    const L = 180 + r() * 220, x = pmod(r() * 2400 + t * speed * (0.7 + r() * 0.6), 2600) - 340, yy = y + i * 14 + r() * 8;
    out += S(`M${f1(x)} ${f1(yy)} q ${f1(L / 4)} -6 ${f1(L / 2)} 0 t ${f1(L / 2)} 0`, 1, { w, op: op * (0.5 + r() * 0.5) });
  }
  return out;
}

// Flowing water: bank lines plus moving current dashes.
function river(pts, width, t, p = 1, seed = 2) {
  const top = pts.map(q => [q[0], q[1] - width / 2]), bot = pts.map(q => [q[0], q[1] + width / 2]);
  const body = spline(top) + 'L' + spline(bot.slice().reverse()).slice(1) + 'Z';
  let flow = '';
  for (let k = 0; k < 3; k++) {
    const line = pts.map(q => [q[0], q[1] - width * 0.28 + k * width * 0.28]);
    flow += `<path d="${spline(line)}" pathLength="100" fill="none" stroke="${TH.ink}" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="${3 + k} ${9 + k * 2}" stroke-dashoffset="${f1(-t * (2.2 + k * 0.5))}" opacity="${f3(0.55 * smooth01(p * 2 - 1))}"/>`;
  }
  return S(body, 1, { fill: true, w: 0, op: smooth01(p * 2) }) + S(spline(top), p, { w: 2.2 }) + S(spline(bot), p, { w: 2.2 }) + flow;
}

// Rising smoke / steam: several curling strands with flowing dashes.
function smoke(x, y, t, o = {}) {
  const H = o.h ?? 160, n = o.n ?? 3, amp = o.amp ?? 14, stroke = o.stroke || TH.ink;
  let out = '';
  for (let i = 0; i < n; i++) {
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const u = k / 12, yy = -u * H;
      pts.push([(i - (n - 1) / 2) * 5 + Math.sin(u * 5.5 - t * 1.6 + i * 2.1) * amp * u * (1 + i * 0.25), yy]);
    }
    out += `<path d="${spline(pts)}" pathLength="100" fill="none" stroke="${stroke}" stroke-width="${o.w ?? 1.6}" stroke-linecap="round" stroke-dasharray="${o.dash ?? '14 8'}" stroke-dashoffset="${f1(t * 18 + i * 13)}" opacity="${f3((o.op ?? 0.55) * (1 - i * 0.18))}"/>`;
  }
  return G(`translate(${f1(x)} ${f1(y)}) scale(${o.s ?? 1})`, out);
}

function rain(t, o = {}) {
  const n = o.n ?? 170, r = rng(o.seed ?? 11); let d = '';
  for (let i = 0; i < n; i++) {
    const x0 = r() * 2300 - 200, sp = 900 + r() * 500, L = 26 + r() * 30, ph = r() * 1400;
    const y = pmod(ph + t * sp, 1300) - 160, x = x0 - y * 0.18;
    d += `M${f1(x)} ${f1(y)}l${f1(-L * 0.18)} ${f1(L)}`;
  }
  return `<path d="${d}" stroke="${TH.ink}" stroke-width="1.3" stroke-linecap="round" opacity="${o.op ?? 0.45}" fill="none"/>`;
}

function ripples(x, y, t, period = 1.2, s = 1, seed = 1) {
  let out = '';
  for (let k = 0; k < 2; k++) {
    const u = pmod(t + k * period / 2 + hashf(seed) * period, period) / period;
    out += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1((6 + u * 30) * s)}" ry="${f1((2 + u * 8) * s)}" fill="none" stroke="${TH.ink}" stroke-width="1.2" opacity="${f3((1 - u) * 0.6)}"/>`;
  }
  return out;
}

function stars(t, seed = 3, n = 40, yMax = 480) {
  const r = rng(seed); let out = '';
  for (let i = 0; i < n; i++) {
    const x = r() * 1920, y = r() * yMax, s = 2 + r() * 4, tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.8 + r() * 1.5) + i));
    out += `<path d="M${f1(x - s)} ${f1(y)}h${f1(2 * s)}M${f1(x)} ${f1(y - s)}v${f1(2 * s)}" stroke="${TH.ink}" stroke-width="1.3" opacity="${f3(tw)}"/>`;
  }
  return out;
}

// ---------- architecture ----------
// Hakka farmhouse with curved ridge, tiled roof, door couplets.
function house(x, y, s = 1, p = 1, o = {}) {
  const seed = o.seed ?? 5, W = 120, H = 104;
  const wall = handPoly([[-W, 0], [-W, -H], [W, -H], [W, 0]], 1.4, seed);
  const roof = handPoly([[-W - 26, -H + 2], [-W + 6, -H - 52], [W - 6, -H - 52], [W + 26, -H + 2]], 1.2, seed + 1);
  const ridge = spline([[-W - 4, -H - 50], [-W + 10, -H - 62], [0, -H - 58], [W - 10, -H - 62], [W + 4, -H - 50]]);
  let tiles = '';
  for (let i = -5; i <= 5; i++) tiles += `M${f1(i * 22)} ${-H - 50}l${f1(i * 2.2)} 46`;
  const door = handPoly([[-24, 0], [-24, -70], [24, -70], [24, 0]], 1, seed + 2);
  const doorMid = 'M0 -70L0 0';
  const win = sx => handPoly([[sx - 20, -76], [sx + 20, -76], [sx + 20, -40], [sx - 20, -40]], 1, seed + 3 + sx);
  const lattice = sx => `M${sx - 20} -58h40M${sx} -76v36M${sx - 10} -76v36M${sx + 10} -76v36`;
  const coupL = poly([[-38, -66], [-30, -66], [-30, -8], [-38, -8]], true), coupR = poly([[30, -66], [38, -66], [38, -8], [30, -8]], true);
  let lit = '';
  if (o.lit) lit = glow(0, -35, 90 * (o.lit), 0.9) + `<path d="${door}" fill="${TH.glow}" opacity="${f3(0.55 * o.lit)}"/>`;
  const parts = [
    SS(wall, st(p, 0, 6), { fill: true }),
    SS(roof, st(p, 1, 6), { fill: true }) + S(ridge, st(p, 1, 6), { w: 3.4 }),
    S(tiles, st(p, 2, 6), { w: 1.3, op: 0.7 }),
    lit + S(door, st(p, 3, 6), { fill: o.lit ? 'none' : true }) + S(doorMid, st(p, 3, 6), { w: 1.6 }),
    S(win(-72), st(p, 4, 6), { fill: true }) + S(lattice(-72), st(p, 4, 6), { w: 1.2, op: 0.8 }) + S(win(72), st(p, 4, 6), { fill: true }) + S(lattice(72), st(p, 4, 6), { w: 1.2, op: 0.8 }),
    wash(coupL, TH.red, st(p, 5, 6), 0.85) + wash(coupR, TH.red, st(p, 5, 6), 0.85) + S(coupL, st(p, 5, 6), { w: 1.2 }) + S(coupR, st(p, 5, 6), { w: 1.2 })
  ];
  return G(at(x, y, s, o.flip ?? 1), parts.join(''));
}

// Tiny map/landscape house icon.
function hut(x, y, s = 1, p = 1, seed = 1, o = {}) {
  const body = handPoly([[-22, 0], [-22, -22], [22, -22], [22, 0]], 0.8, seed);
  const roof = handPoly([[-30, -20], [0, -42], [30, -20]], 0.8, seed + 1);
  const door = poly([[-5, 0], [-5, -12], [5, -12], [5, 0]]);
  return G(at(x, y, s), S(body, st(p, 0, 3), { fill: true, w: 2 }) + S(roof, st(p, 1, 3), { fill: o.roof || true, w: 2 }) + S(door, st(p, 2, 3), { w: 1.6 }) +
    (o.lit ? glow(0, -8, 30 * o.lit, 0.9) + `<path d="${door}" fill="${TH.glow}" opacity="${f3(o.lit)}"/>` : ''));
}

// Lantern (燈籠). swing in degrees, lit 0..1.
function lantern(x, y, s = 1, p = 1, o = {}) {
  const lit = o.lit ?? 0, body = ell(0, 26, 20, 26, o.seed ?? 4, 0.8);
  const ribs = 'M-10 3 Q-16 26 -10 49M0 0V52M10 3 Q16 26 10 49';
  const caps = poly([[-10, -2], [10, -2], [10, 3], [-10, 3]], true) + poly([[-10, 49], [10, 49], [10, 54], [-10, 54]], true);
  const tassel = 'M0 54V70M-3 58V70M3 58V70';
  const hang = `M0 -${o.string ?? 20}V-2`;
  const color = o.color || TH.red;
  const inner = (lit > 0 ? glow(0, 26, 70 * (0.6 + 0.4 * lit), lit * (o.glowOp ?? 1)) : '') + S(hang, p, { w: 1.4 }) +
    wash(body, color, p, TH.night ? 0.55 + 0.3 * lit : 0.8) + (lit > 0 ? `<ellipse cx="0" cy="26" rx="11" ry="16" fill="${TH.glow}" opacity="${f3(lit * 0.75)}"/>` : '') +
    S(body, p, { w: 2 }) + S(ribs, st(p, 1, 2), { w: 1.2, op: 0.8 }) + S(caps, p, { w: 1.4, fill: TH.gold, fo: 0.9 }) + S(tassel, st(p, 1, 2), { w: 1.2, stroke: TH.red });
  return G(`translate(${f1(x)} ${f1(y)}) scale(${f3(s)}) rotate(${f1(o.swing ?? 0)})`, inner);
}

// ---------- figures ----------
// Person in side view. pose: walk | stand | kneel | carry | lantern | bow | sit | lift | flag
// o.phase drives the walk cycle, o.face = 1 (right) or -1 (left).
function person(x, y, s = 1, p = 1, o = {}) {
  const pose = o.pose || 'stand', ph = o.phase ?? 0, seed = o.seed ?? 1;
  const walking = ['walk', 'carry', 'lantern', 'flag', 'gong', 'hold'].includes(pose) && o.moving !== false;
  const a = walking ? 0.42 * Math.sin(ph) : (pose === 'stand' || pose === 'bow' || pose === 'hold' || pose === 'lantern' ? 0.1 : 0);
  const bob = walking ? -2.5 * Math.abs(Math.cos(ph)) : 0;
  let hip = [0, -62 + bob], lean = o.lean ?? (walking ? 4 : 0);
  if (pose === 'kneel') { hip = [0, -30]; lean = o.lean ?? 58; }
  if (pose === 'sit') { hip = [0, -44]; lean = o.lean ?? 2; }
  if (pose === 'bow') lean = o.lean ?? 12;
  if (pose === 'lift') { const k = o.lift ?? 0; hip = [0, lerp(-34, -62, k)]; lean = lerp(50, 4, k); }
  const rad = lean * Math.PI / 180;
  const up = [Math.sin(rad), -Math.cos(rad)];
  const sh = [hip[0] + up[0] * 50, hip[1] + up[1] * 50];         // shoulder
  const hd = [hip[0] + up[0] * 72, hip[1] + up[1] * 72];         // head centre
  const ink = { w: 2.4 };
  // legs
  const leg = (ang, back) => {
    if (pose === 'kneel' || (pose === 'lift' && (o.lift ?? 0) < 0.5)) {
      const knee = [hip[0] + (back ? 18 : 24), -4], foot = [hip[0] - 22, 0];
      return spline([hip, [hip[0] + 14, hip[1] + 18], knee, [knee[0] - 16, -3], foot]);
    }
    if (pose === 'sit') { const kx = hip[0] + 30 + (back ? -4 : 0); return poly([hip, [kx, hip[1] + 2], [kx + 2, 0], [kx + 12, 0]]); }
    const knee = [hip[0] + Math.sin(ang) * 32 + 4 * Math.abs(Math.sin(ph)), hip[1] + Math.cos(ang) * 31];
    const fa = ang - (ang < 0 ? 0.45 * Math.abs(ang) : 0);
    const foot = [knee[0] + Math.sin(fa) * 31, 0];
    return poly([hip, knee, foot, [foot[0] + 9, 0]]);
  };
  // arms
  const arm = (back) => {
    let hand, elbow;
    if (pose === 'carry' && !back) { elbow = [sh[0] + 14, sh[1] + 14]; hand = [sh[0] + 6, sh[1] - 12]; }
    else if (pose === 'lantern' && !back) { elbow = [sh[0] + 16, sh[1] + 18]; hand = [sh[0] + 36, sh[1] + 2]; }
    else if (pose === 'flag' && !back) { elbow = [sh[0] + 12, sh[1] + 16]; hand = [sh[0] + 22, sh[1] - 4]; }
    else if (pose === 'gong' && !back) { const k = o.strike ?? 0; elbow = [sh[0] + 16, sh[1] + 6 - k * 10]; hand = [sh[0] + 32 + k * 8, sh[1] - 8 - k * 18]; }
    else if (pose === 'hold') { elbow = [sh[0] + 10 + (back ? -4 : 0), sh[1] + 26]; hand = [sh[0] + 30 + (back ? -4 : 0), sh[1] + 22]; }
    else if (pose === 'kneel') { hand = [sh[0] + 30, -2]; elbow = [sh[0] + 18, sh[1] + 18]; }
    else if (pose === 'lift') { const k = o.lift ?? 0; hand = [sh[0] + 26 - k * 6, sh[1] + 26 - k * 30]; elbow = [sh[0] + 16, sh[1] + 16 - k * 6]; }
    else if (pose === 'bow') { hand = [sh[0] + 20, sh[1] + 12]; elbow = [sh[0] + 8, sh[1] + 22]; }
    else if (pose === 'sit' && !back && o.raise != null) { const k = o.raise; elbow = [sh[0] + 16, sh[1] + 20 - k * 16]; hand = [sh[0] + 30, sh[1] + 10 - k * 36]; }
    else if (pose === 'sit') { elbow = [sh[0] + 10, sh[1] + 24]; hand = [sh[0] + 30, sh[1] + 30]; }
    else { const sw = walking ? -a * (back ? -0.9 : 0.9) : 0.08; elbow = [sh[0] + Math.sin(sw) * 24, sh[1] + Math.cos(sw) * 24]; hand = [elbow[0] + Math.sin(sw + 0.25) * 22, elbow[1] + Math.cos(sw + 0.25) * 22]; }
    return { d: spline([sh, elbow, hand]), hand };
  };
  // torso (tunic) as a closed occluding shape, built in torso-local coords then rotated about the hip
  const rot = (px, py) => [hip[0] + px * Math.cos(rad) - py * Math.sin(rad), hip[1] + px * Math.sin(rad) + py * Math.cos(rad)];
  const hem = pose === 'sit' ? 6 : 16;
  const torso = handPoly([rot(-15, hem), rot(-14, -44), rot(-8, -52), rot(8, -52), rot(15, -44), rot(18, hem)], 0.9, seed);
  const belt = spline([rot(-15, -6), rot(16, -6)]);
  const head = ell(hd[0], hd[1], 12.5, 13.5, seed + 3, 0.8);
  let hat = '';
  if (o.hat === 'dou') hat = S(handPoly([[hd[0] - 30, hd[1] - 4], [hd[0], hd[1] - 26], [hd[0] + 30, hd[1] - 4]], 0.8, seed + 4), 1, { fill: true, w: 2 });
  else if (o.hat === 'band') hat = S(spline([[hd[0] - 12, hd[1] - 7], [hd[0] + 12, hd[1] - 7]]), 1, { stroke: TH.red, w: 3.2 }) + S(`M${f1(hd[0] - 12)} ${f1(hd[1] - 7)}l-10 6`, 1, { stroke: TH.red, w: 2.2 });
  else if (o.hat === 'bun') hat = S(ell(hd[0] - 9, hd[1] - 10, 7, 6, seed + 5, 0.5), 1, { fill: TH.ink, w: 1.5 });
  else hat = S(spline([[hd[0] - 12, hd[1] - 2], [hd[0] - 6, hd[1] - 12], [hd[0] + 8, hd[1] - 12], [hd[0] + 12, hd[1] - 4]]), 1, { w: 2.2 });
  const face = `M${f1(hd[0] + 6)} ${f1(hd[1] - 1)}l1.5 0`;
  const A1 = arm(true), A2 = arm(false);
  let held = '';
  if (pose === 'lantern') held = S(`M${f1(A2.hand[0])} ${f1(A2.hand[1])}l26 -26`, 1, { w: 2 }) + lantern(A2.hand[0] + 26, A2.hand[1] - 22, 0.62, p, { lit: o.lit ?? 1, swing: Math.sin((o.t ?? 0) * 3 + seed) * 6, string: 8, seed });
  if (pose === 'flag') { const fx = A2.hand[0], fy = A2.hand[1]; const wv = Math.sin((o.t ?? 0) * 4 + seed) * 5;
    const flag = spline([[fx + 2, fy - 118], [fx + 30, fy - 112 + wv], [fx + 62, fy - 118 - wv], [fx + 58, fy - 76 + wv], [fx + 28, fy - 72 - wv], [fx + 2, fy - 76]], true);
    held = S(`M${f1(fx)} ${f1(fy + 40)}V${f1(fy - 122)}`, 1, { w: 2.2 }) + wash(flag, o.flagColor || TH.red, p, 0.75) + S(flag, p, { w: 1.8 }); }
  const accent = o.accent ? wash(torso, o.accent, p, 0.5) : '';
  const parts =
    S(A1.d, st(p, 0, 5), ink) + S(leg(-a, true), st(p, 0, 5), ink) + S(leg(a, false), st(p, 1, 5), ink) +
    S(torso, st(p, 2, 5), { fill: true, w: 2.4 }) + accent + S(belt, st(p, 2, 5), { w: 1.4, op: 0.7 }) +
    S(head, st(p, 3, 5), { fill: true, w: 2.2 }) + (p > 0.7 ? hat + S(face, 1, { w: 2 }) : '') +
    S(A2.d, st(p, 4, 5), ink) + held;
  return G(at(x, y, s, o.face ?? 1), parts);
}

// Seated Mazu statue, frontal. Gold accents.
function mazu(x, y, s = 1, p = 1, o = {}) {
  const seed = 21;
  const base = handPoly([[-46, 0], [-52, -16], [52, -16], [46, 0]], 0.8, seed);
  const robe = spline([[-40, -16], [-44, -60], [-30, -96], [-18, -104], [18, -104], [30, -96], [44, -60], [40, -16]], true);
  const sleeves = 'M-30 -70 Q-10 -56 -4 -74M30 -70 Q10 -56 4 -74';
  const hu = poly([[-4, -60], [-3, -100], [3, -100], [4, -60]], true);
  const face = ell(0, -122, 15, 18, seed + 1, 0.6);
  const crown = poly([[-24, -140], [24, -140], [20, -150], [-20, -150]], true);
  const crest = 'M-12 -150 Q0 -170 12 -150M-20 -150 L-24 -160M20 -150 L24 -160';
  let beads = '';
  for (let i = -3; i <= 3; i++) beads += `M${i * 7} -140v${10 + (i % 2 === 0 ? 4 : 0)}`;
  const eyes = 'M-7 -124 q3 2 6 0M1 -124 q3 2 6 0M-2 -113 q2 1.5 4 0';
  const halo = o.halo ? glow(0, -110, 150, o.halo) + S(ell(0, -122, 44 + 4 * Math.sin((o.t ?? 0) * 2), 44 + 4 * Math.sin((o.t ?? 0) * 2), seed + 9, 0.6), 1, { stroke: TH.gold, w: 2, op: 0.8 * o.halo }) : '';
  return G(at(x, y, s), halo + S(base, st(p, 0, 5), { fill: true }) + SS(robe, st(p, 1, 5), { fill: true }) + wash(robe, TH.red, st(p, 1, 5), 0.35) +
    S(sleeves, st(p, 2, 5), { w: 1.8 }) + S(hu, st(p, 2, 5), { fill: TH.gold, fo: 0.8, w: 1.6 }) +
    S(face, st(p, 3, 5), { fill: true }) + S(eyes, st(p, 3, 5), { w: 1.4 }) +
    S(crown, st(p, 4, 5), { fill: TH.gold, fo: 0.85, w: 1.8 }) + S(crest, st(p, 4, 5), { w: 1.6 }) + S(beads, st(p, 4, 5), { w: 1.2, stroke: TH.red }));
}

// Deity palanquin (神轎), side view, anchored at pole height (y = pole line).
function palanquin(x, y, s = 1, p = 1, o = {}) {
  const seed = 31, rk = o.rock ?? 0;
  const poles = `M-190 0L190 0`;
  const body = handPoly([[-52, -8], [-52, -96], [52, -96], [52, -8]], 1, seed);
  const skirt = handPoly([[-58, 8], [-52, -8], [52, -8], [58, 8]], 1, seed + 1);
  const panel = handPoly([[-34, -20], [-34, -82], [34, -82], [34, -20]], 0.8, seed + 2);
  const roof1 = spline([[-78, -94], [-60, -104], [-40, -116], [40, -116], [60, -104], [78, -94], [70, -100], [0, -106], [-70, -100]], true);
  const roof2 = spline([[-56, -128], [-40, -136], [-24, -148], [24, -148], [40, -136], [56, -128], [48, -132], [0, -138], [-48, -132]], true);
  const neck = poly([[-26, -116], [-26, -130], [26, -130], [26, -116]], true);
  const finial = ell(0, -160, 9, 12, seed + 3, 0.5);
  const tassels = 'M-78 -94v14M78 -94v14M-56 -128v10M56 -128v10';
  const curtain = spline([[-34, -82], [-20, -60], [0, -64], [20, -60], [34, -82]]);
  const parts = S(poles, st(p, 0, 6), { w: 4 }) + SS(skirt, st(p, 1, 6), { fill: true }) + SS(body, st(p, 1, 6), { fill: true }) +
    wash(body, TH.red, st(p, 2, 6), 0.55) + S(panel, st(p, 2, 6), { fill: true, fo: 0.85 }) +
    G('translate(0 -22) scale(0.34)', mazu(0, 0, 1, st(p, 3, 6))) + wash(curtain + 'L34 -82Z', TH.pink, st(p, 3, 6), 0.7) + S(curtain, st(p, 3, 6), { w: 1.6 }) +
    S(neck, st(p, 4, 6), { fill: true }) + SS(roof1, st(p, 4, 6), { fill: true }) + wash(roof1, TH.gold, st(p, 4, 6), 0.5) +
    SS(roof2, st(p, 5, 6), { fill: true }) + wash(roof2, TH.gold, st(p, 5, 6), 0.5) + S(finial, st(p, 5, 6), { fill: TH.gold, fo: 0.9, w: 1.8 }) + S(tassels, st(p, 5, 6), { stroke: TH.red, w: 2 });
  return G(`translate(${f1(x)} ${f1(y)}) scale(${f3(s)}) rotate(${f1(rk)})`, parts);
}

// Palanquin with four bearers (two far-side, two near-side) walking. dir = 1 right, -1 left.
function procession(x, y, s, p, t, o = {}) {
  const ph = t * 5.2 + (o.phase ?? 0), dir = o.dir ?? 1;
  const bob = Math.sin(ph * 2) * 2.2;
  const bearer = (bx, k, far) => person(bx, 0, 1, p, { pose: 'carry', phase: ph + k * Math.PI * 0.5, face: dir, seed: 40 + k, hat: 'band', accent: far ? null : TH.pink, moving: o.moving });
  const far = G('translate(-14 -3)', bearer(-150, 1, true) + bearer(150, 3, true));
  const near = bearer(-130, 0, false) + bearer(130, 2, false);
  return G(at(x, y, s), `<g opacity="0.85">${far}</g>` + palanquin(0, -120 + bob, 1, p, { rock: Math.sin(ph) * 0.8 }) + near);
}

// Incense burner (香爐), a tripod ding with handles.
function burner(x, y, s = 1, p = 1, o = {}) {
  const seed = 51;
  const bowl = spline([[-44, -70], [-40, -40], [-26, -22], [26, -22], [40, -40], [44, -70]], false) + 'Z';
  const rim = ell(0, -70, 44, 8, seed, 0.6);
  const legs = 'M-24 -24 L-30 0M24 -24 L30 0M0 -22V-2';
  const ears = 'M-36 -70 v-18 h10 v18M26 -70 v-18 h10 v18';
  const band = spline([[-42, -52], [0, -46], [42, -52]]);
  const sticks = 'M-8 -72l-4 -40M0 -72v-46M8 -72l4 -40';
  const inner = S(legs, st(p, 0, 4), { w: 3 }) + SS(bowl, st(p, 1, 4), { fill: true }) + wash(bowl, TH.gold, st(p, 1, 4), 0.6) + S(band, st(p, 1, 4), { w: 1.6 }) +
    S(ears, st(p, 2, 4), { w: 2.2 }) + S(rim, st(p, 2, 4), { fill: true, w: 2 }) + (o.sticks !== false ? S(sticks, st(p, 3, 4), { w: 2, stroke: TH.red }) : '') +
    (o.smoke ? smoke(0, -118, o.t ?? 0, { h: o.smokeH ?? 150, n: 3, op: o.smoke }) : '');
  return G(at(x, y, s), inner);
}

function candle(x, y, s = 1, p = 1, t = 0, seed = 1) {
  const body = poly([[-7, 0], [-7, -54], [7, -54], [7, 0]], true);
  const fl = 1 + Math.sin(t * 17 + seed) * 0.12 + Math.sin(t * 29 + seed * 2) * 0.08;
  const flame = `M0 -58 C-6 -64 -5 ${f1(-72 * fl)} 0 ${f1(-82 * fl)} C5 ${f1(-72 * fl)} 6 -64 0 -58Z`;
  const holder = poly([[-14, 0], [-10, -6], [10, -6], [14, 0]], true);
  return G(at(x, y, s), glow(0, -70, 70, 0.75 * p) + wash(body, TH.red, p, 0.85) + S(body, p, { w: 1.8 }) + S(holder, p, { fill: TH.gold, fo: 0.8, w: 1.6 }) +
    (p > 0.5 ? `<path d="${flame}" fill="${TH.glow}" stroke="${TH.red}" stroke-width="1.4"/>` : ''));
}

// Moon blocks (筊杯): a crescent; flat = flat side facing down.
function moonBlock(x, y, s = 1, rot = 0, o = {}) {
  const d = 'M-34 0 C-30 -26 30 -26 34 0 C20 -6 -20 -6 -34 0Z';
  return G(at(x, y, s, 1, rot), wash(d, TH.red, 1, 0.85) + S(d, 1, { w: 2.4 }) + (o.flat ? S('M-26 -3 Q0 -9 26 -3', 1, { w: 1.2, op: 0.7 }) : ''));
}

function gong(x, y, s = 1, p = 1, t = 0, hits = []) {
  const disc = ell(0, 0, 44, 44, 61, 0.6), boss = ell(0, 0, 14, 14, 62, 0.4);
  let rings = '', shake = 0;
  for (const h of hits) {
    const u = t - h; if (u < 0 || u > 1.6) continue;
    shake += Math.sin(u * 60) * 3 * (1 - u / 1.6);
    for (let k = 0; k < 3; k++) { const r = 50 + (u * 160) + k * 22; rings += `<circle cx="0" cy="0" r="${f1(r)}" fill="none" stroke="${TH.gold}" stroke-width="2" opacity="${f3(clamp(0.8 - u / 1.6) * (1 - k * 0.25))}"/>`; }
  }
  return G(at(x + shake, y, s), rings + S(disc, p, { fill: true, w: 2.6 }) + wash(disc, TH.gold, p, 0.55) + S(boss, p, { w: 2 }) + S('M0 -44V-70', p, { w: 1.6 }));
}

// Firecracker string that bursts at time tb.
function firecrackers(x, y, t, tb, o = {}) {
  const n = o.n ?? 12, burnDur = o.dur ?? 1.8, s = o.s ?? 1;
  const burned = clamp((t - tb) / burnDur) * n;
  let out = S(`M0 -20V${n * 12}`, 1, { w: 1.2, op: 0.7 });
  for (let i = 0; i < n; i++) {
    const idx = n - 1 - i; // burns from the bottom up
    if (idx >= n - burned) continue;
    const yy = i * 12, side = i % 2 ? 1 : -1;
    const d = poly([[side * 3, yy], [side * 18, yy - 4], [side * 19, yy + 2], [side * 4, yy + 6]], true);
    out += wash(d, TH.red, 1, 0.9) + S(d, 1, { w: 1.1 });
  }
  const r = rng(o.seed ?? 71);
  for (let k = 0; k < n; k++) {
    const te = tb + (k / n) * burnDur, u = t - te; if (u < 0 || u > 0.9) { r(); r(); r(); continue; }
    const yy = (n - 1 - k) * 12, ang0 = r() * 6.28, sz = 16 + r() * 16; r();
    let sp = '';
    for (let j = 0; j < 7; j++) { const a = ang0 + j * 0.9; sp += `M${f1(Math.cos(a) * sz * u * 1.4)} ${f1(yy + Math.sin(a) * sz * u * 1.4)}l${f1(Math.cos(a) * 8)} ${f1(Math.sin(a) * 8)}`; }
    out += `<path d="${sp}" stroke="${TH.gold}" stroke-width="2.2" stroke-linecap="round" opacity="${f3(1 - u / 0.9)}"/>`;
    if (u < 0.12) out += glow(0, yy, 50, 0.8);
    // smoke puff and red paper bits
    out += `<circle cx="${f1(Math.sin(k) * 8)}" cy="${f1(yy - u * 30)}" r="${f1(8 + u * 26)}" fill="none" stroke="${TH.ink}" stroke-width="1.2" opacity="${f3(0.5 * (1 - u / 0.9))}"/>`;
  }
  // confetti on ground from burned segments
  const rc = rng(77); let conf = '';
  for (let i = 0; i < burned * 4; i++) { const cx = (rc() - 0.5) * 110, cy = n * 12 + 30 + rc() * 24; conf += `M${f1(cx)} ${f1(cy)}l${f1(4 + rc() * 3)} ${f1(rc() * 3 - 1.5)}`; }
  out += `<path d="${conf}" stroke="${TH.red}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`;
  return G(at(x, y, s), out);
}

// Firework burst launched at t0 from ground (x, groundY) exploding at (x, y).
function firework(x, y, t, t0, o = {}) {
  const u = t - t0, rise = o.rise ?? 0.9, groundY = o.groundY ?? 1000, color = o.color || TH.gold, n = o.n ?? 18, R = o.r ?? 150;
  if (u < 0) return '';
  let out = '';
  if (u < rise) {
    const k = easeOut(u / rise), cy = lerp(groundY, y, k);
    out += `<path d="M${f1(x)} ${f1(cy)}l0 ${f1(40)}" stroke="${TH.ink}" stroke-width="2" opacity="0.8"/>` + glow(x, cy, 22, 0.8);
    return out;
  }
  const v = u - rise, life = o.life ?? 2.4; if (v > life) return '';
  const k = easeOut(v / 0.9), fade = clamp(1 - v / life), g = 40 * v * v;
  out += glow(x, y + g * 0.3, R * 1.6 * (0.4 + 0.6 * k), fade * 0.6 * (v < 0.3 ? 1.5 : 1), o.glowColor);
  let d = '', dots = '';
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + (o.rot ?? 0), r1 = R * k * 0.55, r2 = R * k;
    d += `M${f1(x + Math.cos(a) * r1)} ${f1(y + Math.sin(a) * r1 + g * 0.5)}L${f1(x + Math.cos(a) * r2)} ${f1(y + Math.sin(a) * r2 + g)}`;
    dots += `<circle cx="${f1(x + Math.cos(a) * r2 * 1.1)}" cy="${f1(y + Math.sin(a) * r2 * 1.1 + g * 1.3)}" r="2.6" fill="${color}" opacity="${f3(fade * (0.5 + 0.5 * Math.sin(v * 30 + i)))}"/>`;
  }
  out += `<path d="${d}" stroke="${color}" stroke-width="2.4" stroke-linecap="round" opacity="${f3(fade)}"/>` + dots;
  return out;
}

// Vermilion seal stamp with text.
function seal(x, y, s, txt, p = 1, rot = -4) {
  const k = easeOut(p);
  const sc = s * (1 + (1 - k) * 0.8);
  const box = 'M-50 -50 L50 -50 L50 50 L-50 50Z';
  const inner = `<path d="${box}" fill="${TH.red}" opacity="${f3(0.9 * k)}" stroke="${TH.red}" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="M-40 -40 L40 -40 L40 40 L-40 40Z" fill="none" stroke="${TH.fill}" stroke-width="2.5" opacity="${f3(k)}"/>` +
    `<text x="0" y="${txt.length > 2 ? 14 : 16}" text-anchor="middle" font-family="LXGW WenKai TC" font-weight="700" font-size="${txt.length > 2 ? 34 : 44}" fill="${TH.fill}" opacity="${f3(k)}" ${txt.length > 2 ? 'textLength="72" lengthAdjust="spacingAndGlyphs"' : ''}>${txt}</text>`;
  return G(at(x, y, sc, 1, rot), inner);
}
