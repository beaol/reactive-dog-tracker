import { memo, useId, useMemo } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { traitsFor } from '@/breeds/matchBreed';
import { darken, type DogTraits, EYE, lighten, luminance, mix, outlineFor } from '@/breeds/traits';
import type { Dog } from '@/domain/types';

/**
 * Procedurally drawn, front-facing cartoon portrait (static illustration).
 *
 * Everything is derived from `DogTraits`:
 *  - the head silhouette is a smooth curve through points computed from skull,
 *    cheek and muzzle widths, so wedge heads (collie), square heads (boxer),
 *    apple heads (chihuahua) and flat faces (pug) each read correctly;
 *  - ears attach at a point on the skull and are scaled/rotated per breed;
 *  - markings are composable layers clipped to the head or body.
 *
 * Drawn in a 200×200 viewBox with the head centred on x = 100.
 */

export type PortraitMood = 'calm' | 'happy';

export interface DogPortraitProps {
  traits: DogTraits;
  size?: number;
  mood?: PortraitMood;
  /** Soft circle behind the dog. */
  backdrop?: string;
}

type Pt = [number, number];

const PINK = '#EFA9A6';
const TONGUE = '#EE7A8E';
const PUPIL = '#1A120D';
const CX = 100;

// ── Geometry helpers ───────────────────────────────────────────────────────

const f = (n: number) => Math.round(n * 10) / 10;

/** Closed Catmull-Rom spline through points → cubic Bézier path. */
function smoothClosed(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} Z`;
}

/** Points along the same spline (for bumpy curly/fluffy outlines). */
function sampleClosed(pts: Pt[], perSegment: number): Pt[] {
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (k: 0 | 1) =>
        0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  return out;
}

/** Right-side points + mirrored left side → full symmetric outline. */
function symmetric(top: Pt, right: Pt[], bottom: Pt): Pt[] {
  const left = [...right].reverse().map(([x, y]) => [2 * CX - x, y] as Pt);
  return [top, ...right, bottom, ...left];
}

// ── Fur ───────────────────────────────────────────────────────────────────

interface Fur {
  /** Closed lock shapes (fill only) — each extends slightly inside the base edge. */
  fill: string;
  /** Open outline of the locks (stroke only), so no seam is drawn at the base. */
  stroke: string;
}

const pt = (p: Pt) => `${f(p[0])} ${f(p[1])}`;

/**
 * Long-hair locks along a polyline: soft, pointed, leaf-like tufts that grow
 * outward from `center` and sweep downward with `gravity`, with V-notches
 * between neighbours — straight/silky fur rather than round curls.
 */
function furLocks(
  pts: Pt[],
  center: Pt,
  len: (p: Pt, n: Pt) => number,
  seed: number,
  gravity = 0.6,
  inset = 3,
): Fur {
  const r = rng(seed);
  let fill = '';
  let stroke = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let nx = m[0] - center[0];
    let ny = m[1] - center[1];
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    // Hair falls: side and bottom locks bend downward, top locks stay upright.
    const gx = nx;
    const gy = ny + gravity * Math.max(0, ny + 0.7);
    const gl = Math.hypot(gx, gy) || 1;
    const ux = gx / gl;
    const uy = gy / gl;
    const L = len(m, [nx, ny]) * (0.86 + r() * 0.28);
    if (L < 1) continue;
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    const sway = (r() - 0.5) * 0.25 * L;
    const T: Pt = [m[0] + ux * L + (tx / tl) * sway, m[1] + uy * L + (ty / tl) * sway];
    const c1: Pt = [a[0] + (T[0] - a[0]) * 0.5 + ux * L * 0.26, a[1] + (T[1] - a[1]) * 0.5 + uy * L * 0.26];
    const c2: Pt = [b[0] + (T[0] - b[0]) * 0.5 + ux * L * 0.26, b[1] + (T[1] - b[1]) * 0.5 + uy * L * 0.26];
    const ai: Pt = [a[0] - nx * inset, a[1] - ny * inset];
    const bi: Pt = [b[0] - nx * inset, b[1] - ny * inset];
    fill += `M${pt(ai)} L${pt(a)} Q${pt(c1)} ${pt(T)} Q${pt(c2)} ${pt(b)} L${pt(bi)} Z `;
    stroke += `M${pt(a)} Q${pt(c1)} ${pt(T)} Q${pt(c2)} ${pt(b)} `;
  }
  return { fill, stroke };
}

/** Consecutive runs of points that pass a test (handles wrap-around on closed outlines). */
function runs(points: Pt[], keep: (p: Pt) => boolean): Pt[][] {
  const start = points.findIndex((p) => !keep(p));
  if (start < 0) return [[...points, points[0]]];
  const rotated = [...points.slice(start), ...points.slice(0, start)];
  const out: Pt[][] = [];
  let cur: Pt[] = [];
  for (const p of rotated) {
    if (keep(p)) cur.push(p);
    else if (cur.length) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) out.push(cur);
  return out.filter((r) => r.length > 1);
}

function ellipseArc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as Pt;
  });
}

function cubicPts(p0: Pt, p1: Pt, p2: Pt, p3: Pt, from: number, to: number, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / n;
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ] as Pt;
  });
}

/** Push points `d` units away from `center` (e.g. from a stroke's centre line to its edge). */
function offsetFrom(pts: Pt[], center: Pt, d: number): Pt[] {
  return pts.map(([x, y]) => {
    const nx = x - center[0];
    const ny = y - center[1];
    const l = Math.hypot(nx, ny) || 1;
    return [x + (nx / l) * d, y + (ny / l) * d] as Pt;
  });
}

function FurLayer({ fur, fill, stroke }: { fur: Fur; fill: string; stroke: string }) {
  if (!fur.fill) return null;
  return (
    <>
      <Path d={fur.fill} fill={fill} />
      <Path d={fur.stroke} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </>
  );
}

function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Layout ─────────────────────────────────────────────────────────────────

interface Layout {
  eyeY: number;
  top: number;
  noseY: number;
  chinY: number;
  headPts: Pt[];
  headPath: string;
  muzzlePath: string;
  earBase: Pt;
  bodyW: number;
  neckW: number;
  /** Uniform scale applied to fit tall ears inside the frame. */
  fit: number;
}

const BODY_W = { slim: 46, medium: 54, stocky: 62 } as const;
const SIZE_BODY = { toy: -6, small: -3, medium: 0, large: 2, giant: 6 } as const;

function earHeight(t: DogTraits): number {
  const u = (t.geo.skullW / 46) * t.earSize;
  const h = { pointy: 52, bat: 56, semi: 36, button: 0, rose: 12, floppy: 0, long: 0 }[t.ears];
  return h * u;
}

function layout(t: DogTraits): Layout {
  const g = t.geo;
  const eyeY = 90 + (g.skullH - g.muzzleLen - g.chinDrop) / 2;
  const top = eyeY - g.skullH;
  const noseY = eyeY + g.muzzleLen;
  const jowl = t.extras.jowls ? 4 : 0;
  const chinY = noseY + g.chinDrop + jowl;

  const right: Pt[] = [
    [CX + g.skullW * 0.5, top + g.skullH * 0.05],
    [CX + g.skullW * 0.84, top + g.skullH * 0.22],
    [CX + g.skullW * 0.99, eyeY - g.skullH * 0.28],
    [CX + Math.max(g.skullW, g.cheekW) * 1.0, eyeY + 3],
    [CX + g.cheekW * 0.94, eyeY + g.muzzleLen * 0.42],
    [CX + (g.cheekW * 0.45 + g.muzzleW * 0.55) + 2 + jowl, noseY - g.muzzleLen * 0.05],
    [CX + g.muzzleW + 2 + jowl, noseY + g.chinDrop * 0.45],
    [CX + g.muzzleW * 0.62, chinY - 1.5],
  ];
  const headPts = symmetric([CX, top], right, [CX, chinY]);

  const muzzleRight: Pt[] = [
    [CX + g.muzzleW * 0.42, eyeY + g.muzzleLen * 0.35],
    [CX + g.muzzleW * 0.88, noseY - g.muzzleLen * 0.12],
    [CX + g.muzzleW + 1 + jowl, noseY + g.chinDrop * 0.4],
    [CX + g.muzzleW * 0.6, chinY - 2],
  ];
  const muzzlePts = symmetric([CX, eyeY + g.muzzleLen * 0.18], muzzleRight, [CX, chinY - 1]);

  // Ear attachment: a point on the skull arc, from the crown (0) to the temple (1).
  const theta = (t.earSet * 85 * Math.PI) / 180;
  const earBase: Pt = [CX + g.skullW * 0.96 * Math.sin(theta), eyeY - g.skullH * 0.4 - g.skullH * 0.6 * Math.cos(theta) + 2];

  const earTop = earBase[1] - earHeight(t) * Math.cos((t.earAngle * Math.PI) / 180);
  const fit = earTop < 6 ? (200 - 6) / (200 - earTop) : 1;

  return {
    eyeY,
    top,
    noseY,
    chinY,
    headPts,
    headPath: smoothClosed(headPts),
    muzzlePath: smoothClosed(muzzlePts),
    earBase,
    bodyW: BODY_W[t.build] + SIZE_BODY[t.size],
    neckW: g.cheekW * 0.6,
    fit,
  };
}

// ── Ears (drawn as the RIGHT ear in local space; base at origin, up = -y) ──

function earShape(t: DogTraits): { outer: string; inner?: string; flap?: string } {
  const u = (t.geo.skullW / 46) * t.earSize;
  const p = (x: number, y: number) => `${f(x * u)} ${f(y * u)}`;
  switch (t.ears) {
    case 'pointy':
      return {
        outer: `M${p(-15, 5)} C${p(-14, -18)} ${p(-6, -40)} ${p(1, -52)} C${p(9, -38)} ${p(15, -18)} ${p(16, 5)} Z`,
        inner: `M${p(-8, 2)} C${p(-7, -14)} ${p(-3, -28)} ${p(1, -38)} C${p(6, -27)} ${p(9, -14)} ${p(9, 2)} Z`,
      };
    case 'bat':
      return {
        outer: `M${p(-15, 5)} C${p(-21, -24)} ${p(-13, -54)} ${p(4, -56)} C${p(21, -54)} ${p(25, -24)} ${p(17, 5)} Z`,
        inner: `M${p(-7, 2)} C${p(-12, -18)} ${p(-6, -40)} ${p(3, -42)} C${p(13, -40)} ${p(15, -18)} ${p(10, 2)} Z`,
      };
    case 'semi':
      return {
        outer: `M${p(-14, 5)} C${p(-11, -14)} ${p(-5, -30)} ${p(1, -36)} C${p(8, -27)} ${p(13, -13)} ${p(15, 5)} Z`,
        inner: `M${p(-7, 2)} C${p(-6, -10)} ${p(-2, -20)} ${p(1, -24)} C${p(5, -18)} ${p(8, -9)} ${p(8, 2)} Z`,
        // Tip folding forward and outward.
        flap: `M${p(-6, -26)} C${p(-2, -38)} ${p(8, -38)} ${p(10, -28)} C${p(13, -20)} ${p(16, -12)} ${p(17, -6)} C${p(8, -12)} ${p(0, -16)} ${p(-6, -26)} Z`,
      };
    case 'button':
      // Folded forward: a V flap whose tip points down towards the eye.
      return {
        outer: `M${p(-14, -2)} C${p(-6, -12)} ${p(10, -12)} ${p(17, -3)} C${p(14, 8)} ${p(6, 18)} ${p(-2, 22)} C${p(-6, 12)} ${p(-10, 4)} ${p(-14, -2)} Z`,
      };
    case 'rose':
      return {
        outer: `M${p(-10, 4)} C${p(-6, -10)} ${p(10, -16)} ${p(24, -6)} C${p(18, -2)} ${p(14, 4)} ${p(12, 12)} Z`,
        inner: `M${p(-2, 2)} C${p(0, -6)} ${p(8, -9)} ${p(16, -5)} C${p(12, -1)} ${p(9, 3)} ${p(8, 8)} Z`,
      };
    case 'floppy':
      return {
        outer: `M${p(-10, -4)} C${p(4, -11)} ${p(17, -5)} ${p(19, 8)} C${p(22, 26)} ${p(20, 42)} ${p(12, 50)} C${p(4, 55)} ${p(-4, 47)} ${p(-6, 36)} C${p(-8, 22)} ${p(-12, 8)} ${p(-10, -4)} Z`,
      };
    case 'long':
      return {
        outer: `M${p(-10, -4)} C${p(6, -11)} ${p(21, -4)} ${p(23, 12)} C${p(27, 40)} ${p(27, 64)} ${p(15, 75)} C${p(4, 81)} ${p(-7, 73)} ${p(-9, 58)} C${p(-12, 36)} ${p(-14, 10)} ${p(-10, -4)} Z`,
      };
  }
}

/** Curl bumps covering hanging ears (poodles, doodles) — genuinely curly coats only. */
function earCurls(t: DogTraits): Pt[] {
  if (t.coat !== 'curly' || (t.ears !== 'floppy' && t.ears !== 'long')) return [];
  const u = (t.geo.skullW / 46) * t.earSize;
  const len = t.ears === 'long' ? 74 : 50;
  const w = t.ears === 'long' ? 24 : 19;
  const pts: Pt[] = [];
  for (let y = 6; y <= len; y += 9) {
    const half = w * Math.sin(Math.min(1, y / (len * 0.55)) * Math.PI * 0.5) * (y > len * 0.8 ? 0.8 : 1);
    pts.push([(half - 4) * u, y * u], [(-6 + half * 0.15) * u, y * u]);
  }
  return pts;
}

/** Silky feathering hanging from the outer edge and tip of drop ears (golden, setters, spaniels). */
function earFur(t: DogTraits): Fur {
  const none = { fill: '', stroke: '' };
  if (!t.feathered || t.coat === 'curly' || (t.ears !== 'floppy' && t.ears !== 'long')) return none;
  const u = (t.geo.skullW / 46) * t.earSize;
  const long = t.ears === 'long';
  const len = long ? 74 : 50;
  const w = long ? 23 : 19;
  // Outer edge from mid-height, round the tip, back up the inner edge a little.
  const edge: Pt[] = [
    [w * 0.98, len * 0.32],
    [w * 1.02, len * 0.52],
    [w * 0.92, len * 0.72],
    [w * 0.6, len * 0.92],
    [w * 0.15, len * 1.0],
    [-w * 0.2, len * 0.9],
    [-w * 0.36, len * 0.72],
  ].map(([x, y]) => [x * u, y * u] as Pt);
  return furLocks(edge, [w * 0.25 * u, len * 0.45 * u], () => (long ? 11 : 9) * u, t.seed + 11, 1.4, 3 * u);
}

// ── Component ──────────────────────────────────────────────────────────────

function DogPortraitImpl({ traits: t, size = 160, mood = 'calm', backdrop }: DogPortraitProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const L = useMemo(() => layout(t), [t]);
  const { colors: c, markings: mk, extras: ex, geo: g } = t;

  const outline = outlineFor(c.base);
  const isDark = luminance(c.base) < 0.06;
  const white = c.white;
  const eyeL = CX - g.eyeGap;
  const eyeR = CX + g.eyeGap;
  const fluffy = t.coat === 'fluffy';
  // Husky/malamute mask (white goggles) vs. shiba/akita "urajiro" (white cheeks only).
  const huskyFace = luminance(c.base) < 0.3 && !t.markings.points;
  const curly = t.coat === 'curly';
  const wiry = t.coat === 'wiry';

  /** Light hair colour for beards / brows that must read on dark coats too. */
  const hairLight = isDark ? lighten(c.base, 0.45) : lighten(c.muzzle, 0.25);
  const beardFillFor = (m: string) => (isDark && !mk.blaze ? hairLight : lighten(m, 0.12));
  const muzzleFill = mk.mask
    ? c.accent
    : mk.blaze || mk.spitzMask
      ? white
      : mk.points
        ? c.points
        : c.muzzle;
  const beardFill = beardFillFor(muzzleFill);
  const chestFill = mk.blaze || mk.collar || mk.spitzMask ? white : mk.points ? c.points : c.chest;
  const earFill = mk.hood ? c.accent : c.ears;
  const ruffFill = mk.spitzMask ? lighten(c.base, 0.08) : mk.collar ? white : c.base;
  const innerEar = luminance(earFill) < 0.08 ? mix(earFill, PINK, 0.3) : mix(earFill, PINK, 0.55);
  const earOutline = outlineFor(earFill);

  const ear = earShape(t);
  const curls = earCurls(t);
  const earLocks = earFur(t);
  const earsInFront = t.ears === 'floppy' || t.ears === 'long' || t.ears === 'button';
  const earU = (g.skullW / 46) * t.earSize;

  const spots = useMemo(() => {
    const r = rng(t.seed);
    const head: [number, number, number][] = [];
    const body: [number, number, number][] = [];
    if (mk.spots) {
      for (let i = 0; head.length < 9 && i < 200; i++) {
        const x = CX + (r() * 2 - 1) * g.cheekW;
        const y = L.top + r() * (L.chinY - L.top);
        const nearEye = Math.hypot(Math.abs(x - CX) - g.eyeGap, y - L.eyeY) < g.eyeR + 6;
        const onMuzzle = Math.abs(x - CX) < g.muzzleW + 2 && y > L.noseY - 10;
        if (!nearEye && !onMuzzle) head.push([x, y, 2.5 + r() * 3]);
      }
      for (let i = 0; i < 14; i++) body.push([CX + (r() * 2 - 1) * L.bodyW * 0.9, 152 + r() * 46, 2.5 + r() * 3.5]);
    }
    const merle: string[] = [];
    if (mk.merle) {
      for (let i = 0; i < 6; i++) {
        const x = CX + (r() * 2 - 1) * (g.cheekW + 4);
        const y = L.top + r() * (L.noseY - L.top);
        const rr = 7 + r() * 9;
        const blob: Pt[] = Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * Math.PI * 2;
          const rad = rr * (0.6 + r() * 0.6);
          return [x + Math.cos(a) * rad, y + Math.sin(a) * rad];
        });
        merle.push(smoothClosed(blob));
      }
      for (let i = 0; i < 5; i++) {
        const x = CX + (r() * 2 - 1) * L.bodyW;
        const y = 155 + r() * 40;
        const rr = 8 + r() * 10;
        merle.push(smoothClosed(Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * Math.PI * 2;
          const rad = rr * (0.6 + r() * 0.6);
          return [x + Math.cos(a) * rad, y + Math.sin(a) * rad] as Pt;
        })));
      }
    }
    return { head, body, merle };
  }, [t.seed, mk.spots, mk.merle, g, L]);

  // Outline bumps for curly coats / fluffy cheeks.
  // Curly coats: bumpy outline; poodle-style shaved faces keep a smooth muzzle.
  const headBumps = curly ? sampleClosed(L.headPts, 3).filter(([, y]) => ex.beard || y < L.noseY - 4) : [];

  const bodyW = L.bodyW;
  const furry = fluffy || wiry;
  const furOutline = outlineFor(c.base);

  const fur = useMemo(() => {
    const empty: Fur = { fill: '', stroke: '' };
    const headMid: Pt = [CX, (L.top + L.chinY) / 2];
    // Neck mane (collie, pom, samoyed…): an oval behind the head, longest at the bottom.
    const ruffCy = L.eyeY + g.muzzleLen * 0.55;
    const ruffRx = g.cheekW + 3 + t.ruff * 9;
    const ruffRy = (L.chinY - L.top) / 2 + t.ruff * 7;
    const ruffPts = ellipseArc(CX, ruffCy, ruffRx, ruffRy, -Math.PI / 2, Math.PI * 1.5, 18);
    const ruff = t.ruff > 0
      ? furLocks(ruffPts, [CX, ruffCy - 6], (_, n) => (5 + t.ruff * 13) * (0.35 + 0.65 * Math.max(0, n[1] + 0.35)), t.seed + 1, 0.9)
      : empty;

    // Cheek fur: locks growing from the sides of the face, in front of the head outline.
    const cheekLen = fluffy ? 5 + t.ruff * 5 : wiry ? 4 : 0;
    const cheekRuns = cheekLen
      ? runs(sampleClosed(L.headPts, 2), ([x, y]) => y > L.eyeY - g.skullH * 0.15 && Math.abs(x - CX) > g.muzzleW + 3 && y < L.chinY - 2)
      : [];
    const cheek = cheekRuns.map((run, i) =>
      furLocks(run, headMid, ([, y]) => cheekLen * (0.6 + 0.6 * Math.min(1, Math.max(0, (y - L.eyeY) / (L.chinY - L.eyeY)))), t.seed + 20 + i, 0.8),
    );

    // Chest bib + shoulders for long-haired dogs.
    const bibW = bodyW * 0.42;
    const bib = furry || t.ruff > 0.2
      ? furLocks(ellipseArc(CX, 154, bibW, 9, 0, Math.PI, 6), [CX, 148], () => 6 + t.ruff * 6, t.seed + 3, 1.3)
      : empty;
    const shoulders = fluffy
      ? [1, -1].map((s, i) =>
          furLocks(
            cubicPts([CX, 147], [CX + s * bodyW * 0.62, 150], [CX + s * bodyW, 172], [CX + s * bodyW, 206], 0.3, 0.85, 4),
            [CX, 196],
            () => 5 + t.ruff * 3,
            t.seed + 5 + i,
            0.8,
          ),
        )
      : [];

    // Silky top-knot (afghan) — curly breeds use pom-pom curls instead.
    const tuft = ex.topknot && !curly
      ? furLocks(ellipseArc(CX, L.top + 10, g.skullW * 0.62, 12, -Math.PI * 0.95, -Math.PI * 0.05, 8), [CX, L.top + 22], () => 9, t.seed + 7, 0.2)
      : empty;

    // Fringe hanging over the eyes (sheepdogs, wheaten, lhasa).
    const fringeY = L.eyeY - g.eyeR - 9;
    const fringe = ex.fringe
      ? furLocks(
          Array.from({ length: 9 }, (_, i) => {
            const x = CX - g.skullW * 0.85 + (g.skullW * 1.7 * i) / 8;
            return [x, fringeY + Math.abs(x - CX) * 0.12] as Pt;
          }),
          [CX, fringeY - 60],
          () => 11,
          t.seed + 9,
          1,
          4,
        )
      : empty;

    // Bottom edge of shaggy beards.
    const beardFur = ex.beard
      ? furLocks(
          Array.from({ length: 7 }, (_, i) => {
            const x = CX - g.muzzleW - 4 + ((2 * g.muzzleW + 8) * i) / 6;
            const k = (x - CX) / (g.muzzleW + 4);
            return [x, L.chinY + 4 + 16 * (1 - k * k)] as Pt;
          }),
          [CX, L.noseY],
          () => 6,
          t.seed + 13,
          1.2,
        )
      : empty;

    return { ruff, ruffPts, ruffCy, ruffRx, ruffRy, cheek, bib, shoulders, tuft, fringe, beardFur };
  }, [t, L, g, fluffy, wiry, curly, furry, bodyW, ex.topknot, ex.fringe, ex.beard]);

  const legX = bodyW * 0.36;
  const legW = bodyW * 0.3;
  const bodyPath = `M${CX - bodyW} 206 C${CX - bodyW} 172 ${CX - bodyW * 0.62} 150 ${CX} 147 C${CX + bodyW * 0.62} 150 ${CX + bodyW} 172 ${CX + bodyW} 206 Z`;
  const neckPath = `M${f(CX - L.neckW)} ${f(L.chinY - 14)} L${f(CX - L.neckW * 1.2)} 165 L${f(CX + L.neckW * 1.2)} 165 L${f(CX + L.neckW)} ${f(L.chinY - 14)} Z`;
  const pawFill = mk.blaze || mk.collar || mk.hood || mk.spitzMask ? white : mk.points ? c.points : lighten(c.base, 0.06);

  // Tail (behind body, to the dog's left = viewer's right).
  const tailColor = fluffy || t.tail === 'plume' ? lighten(c.base, 0.04) : c.base;
  const tailTip = mk.blaze && mk.saddle ? white : undefined;
  const tailFur =
    t.tail === 'plume' || (t.tail === 'curl' && fluffy)
      ? furLocks(
          // Locks grow from the tail's outer edge, not its centre line.
          offsetFrom(
            t.tail === 'plume'
              ? cubicPts([136, 182], [159, 178], [171, 163], [172, 136], 0.25, 1, 4)
              : cubicPts([134, 170], [164, 172], [178, 140], [158, 132], 0.2, 0.95, 4),
            t.tail === 'plume' ? [150, 150] : [156, 152],
            (t.tail === 'plume' ? 19 : 16) / 2 - 1,
          ),
          t.tail === 'plume' ? [150, 150] : [156, 152],
          () => (t.tail === 'plume' ? 11 : 8),
          t.seed + 17,
          1.1,
          5,
        )
      : null;
  const tail = {
    sickle: { d: 'M138 182 Q168 172 170 138', w: 10 },
    otter: { d: 'M136 184 Q168 178 172 144', w: 15 },
    whip: { d: 'M138 186 Q180 184 178 128', w: 6 },
    plume: { d: 'M136 182 Q170 176 172 136', w: 19 },
    curl: { d: 'M134 170 C164 172 178 140 158 132 C142 127 140 150 154 152', w: fluffy ? 16 : 12 },
    stub: null,
  }[t.tail];

  // Mouth & nose
  const nW = g.noseW;
  const nH = nW * 0.72;
  const ny = L.noseY;
  const nosePath = `M${f(CX - nW)} ${f(ny - nH * 0.45)} Q${CX} ${f(ny - nH * 0.95)} ${f(CX + nW)} ${f(ny - nH * 0.45)} Q${f(CX + nW * 0.95)} ${f(ny + nH * 0.25)} ${f(CX + nW * 0.28)} ${f(ny + nH * 0.5)} Q${CX} ${f(ny + nH * 0.66)} ${f(CX - nW * 0.28)} ${f(ny + nH * 0.5)} Q${f(CX - nW * 0.95)} ${f(ny + nH * 0.25)} ${f(CX - nW)} ${f(ny - nH * 0.45)} Z`;
  const mouthY = ny + nH * 0.5 + Math.max(4, g.chinDrop * 0.38);
  const mouthW = g.muzzleW * 0.78;
  const happy = mood === 'happy';
  const lip = isDark && !mk.blaze && !mk.points && !mk.spitzMask ? lighten(c.base, 0.45) : darken(muzzleFill, 0.62);

  // Whisker pads (cute cheeks of the muzzle)
  const padRx = g.muzzleW * 0.58;
  const padRy = Math.max(7, g.chinDrop * 0.55);
  const padY = ny + nH * 0.45;

  const headClip = `head${uid}`;
  const bodyClip = `body${uid}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityRole="image">
      <Defs>
        <ClipPath id={headClip}>
          <Path d={L.headPath} />
        </ClipPath>
        <ClipPath id={bodyClip}>
          <Path d={bodyPath} />
          <Path d={neckPath} />
        </ClipPath>
        <ClipPath id={`frame${uid}`}>
          <Circle cx={100} cy={100} r={100} />
        </ClipPath>
        <RadialGradient id={`shade${uid}`} cx="45%" cy="28%" r="70%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={isDark ? 0.16 : 0.22} />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.1} />
        </RadialGradient>
      </Defs>

      <G clipPath={backdrop ? `url(#frame${uid})` : undefined}>
        {backdrop && <Circle cx={100} cy={100} r={100} fill={backdrop} />}

        <G transform={L.fit < 1 ? `translate(${f(100 * (1 - L.fit))} ${f(200 * (1 - L.fit))}) scale(${f(L.fit * 1000) / 1000})` : undefined}>
          {/* ── Tail ── */}
          {tail && (
            <>
              <Path d={tail.d} stroke={outline} strokeWidth={tail.w + 4} strokeLinecap="round" fill="none" />
              <Path d={tail.d} stroke={tailColor} strokeWidth={tail.w} strokeLinecap="round" fill="none" />
              {tailTip && <Circle cx={170} cy={140} r={tail.w / 2} fill={tailTip} />}
              {tailFur && <FurLayer fur={tailFur} fill={tailColor} stroke={outline} />}
            </>
          )}

          {/* ── Body ── */}
          <Path d={bodyPath} fill={c.base} stroke={outline} strokeWidth={2.5} />
          <G clipPath={`url(#${bodyClip})`}>
            {mk.saddle && <Path d={`M${CX - bodyW - 6} 206 L${CX - bodyW - 6} 158 Q${CX} 140 ${CX + bodyW + 6} 158 L${CX + bodyW + 6} 206 L${CX + bodyW * 0.55} 206 Q${CX + bodyW * 0.5} 170 ${CX} 166 Q${CX - bodyW * 0.5} 170 ${CX - bodyW * 0.55} 206 Z`} fill={c.accent} />}
            {mk.brindle &&
              [-56, -40, -24, -8, 8, 24, 40, 56].map((x) => (
                <Path key={x} d={`M${CX + x} 148 Q${CX + x - 8} 176 ${CX + x + 2} 206`} stroke={c.accent} strokeWidth={3} opacity={0.4} fill="none" />
              ))}
            {spots.merle.slice(6).map((d, i) => (
              <Path key={i} d={d} fill={c.accent} opacity={0.9} />
            ))}
            {spots.body.map(([x, y, r], i) => (
              <Circle key={i} cx={x} cy={y} r={r} fill={c.accent} />
            ))}
            {mk.points ? (
              <>
                <Ellipse cx={CX - 11} cy={168} rx={8} ry={11} fill={c.points} />
                <Ellipse cx={CX + 11} cy={168} rx={8} ry={11} fill={c.points} />
              </>
            ) : (
              chestFill !== c.base && (
                <Path d={`M${CX} 150 C${CX + bodyW * 0.42} 156 ${CX + bodyW * 0.34} 190 ${CX} 206 C${CX - bodyW * 0.34} 190 ${CX - bodyW * 0.42} 156 ${CX} 150 Z`} fill={chestFill} />
              )
            )}
          </G>
          {/* front legs + paws */}
          <Path d={`M${f(CX - legX + legW / 2)} 176 L${f(CX - legX + legW / 2)} 194 M${f(CX + legX - legW / 2)} 176 L${f(CX + legX - legW / 2)} 194`} stroke={outline} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
          <Ellipse cx={CX - legX} cy={197} rx={legW * 0.62} ry={8} fill={pawFill} stroke={outline} strokeWidth={2} />
          <Ellipse cx={CX + legX} cy={197} rx={legW * 0.62} ry={8} fill={pawFill} stroke={outline} strokeWidth={2} />
          {fur.shoulders.map((sh, i) => (
            <FurLayer key={i} fur={sh} fill={c.base} stroke={furOutline} />
          ))}
          {fur.bib.fill && (
            <>
              <Ellipse cx={CX} cy={154} rx={bodyW * 0.42} ry={9} fill={chestFill} />
              <FurLayer fur={fur.bib} fill={chestFill} stroke={outlineFor(chestFill)} />
            </>
          )}

          {/* ── Neck (+ collar) ── */}
          <Path d={neckPath} fill={c.base} />
          {mk.collar && (
            <G clipPath={`url(#${bodyClip})`}>
              <Path d={`M${CX - bodyW - 4} 168 Q${CX} 140 ${CX + bodyW + 4} 168 L${CX + bodyW + 4} 150 Q${CX} 118 ${CX - bodyW - 4} 150 Z`} fill={white} />
            </G>
          )}
          <Ellipse cx={CX} cy={L.chinY + 1} rx={L.neckW * 0.8} ry={4} fill="#000000" opacity={0.06} />

          {/* ── Ears behind the head ── */}
          {!earsInFront &&
            (['R', 'L'] as const).map((side) => (
              <G key={side} transform={side === 'L' ? 'translate(200 0) scale(-1 1)' : undefined}>
                <G transform={`translate(${f(L.earBase[0])} ${f(L.earBase[1])}) rotate(${t.earAngle})`}>
                  <Path d={ear.outer} fill={earFill} stroke={earOutline} strokeWidth={2.4} strokeLinejoin="round" />
                  {ear.inner && <Path d={ear.inner} fill={innerEar} />}
                  {ear.flap && <Path d={ear.flap} fill={darken(earFill, 0.1)} stroke={earOutline} strokeWidth={2} strokeLinejoin="round" />}
                </G>
              </G>
            ))}

          {/* ── Mane / ruff ── */}
          {t.ruff > 0 && (
            <>
              <Ellipse cx={CX} cy={fur.ruffCy} rx={fur.ruffRx} ry={fur.ruffRy} fill={ruffFill} />
              <FurLayer fur={fur.ruff} fill={ruffFill} stroke={furOutline} />
              {/* a few strands of texture inside the mane */}
              <G stroke={darken(ruffFill, 0.16)} strokeWidth={1.3} strokeLinecap="round" fill="none" opacity={0.55}>
                {fur.ruffPts.filter((_, i) => i % 2 === 1 && i > 2 && i < 16).map(([x, y], i) => {
                  const nx = (x - CX) / fur.ruffRx;
                  const ny = (y - fur.ruffCy) / fur.ruffRy;
                  return <Path key={i} d={`M${f(x - nx * 6)} ${f(y - ny * 6)} q${f(nx * 4)} ${f(ny * 4 + 3)} ${f(nx * 6)} ${f(ny * 6 + 7)}`} />;
                })}
              </G>
            </>
          )}
          {headBumps.map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={7} fill={c.base} stroke={outline} strokeWidth={2} />
          ))}

          {/* ── Head ── */}
          <Path d={L.headPath} fill={c.base} stroke={curly ? 'none' : outline} strokeWidth={2.5} />

          <G clipPath={`url(#${headClip})`}>
            {mk.brindle &&
              [-44, -30, -16, 0, 16, 30, 44].map((x) => (
                <Path key={x} d={`M${CX + x} ${L.top} Q${CX + x - 6} ${L.eyeY} ${CX + x + 2} ${L.chinY}`} stroke={c.accent} strokeWidth={2.6} opacity={0.35} fill="none" />
              ))}
            {spots.merle.slice(0, 6).map((d, i) => (
              <Path key={i} d={d} fill={c.accent} opacity={0.9} />
            ))}
            {spots.head.map(([x, y, r], i) => (
              <Circle key={i} cx={x} cy={y} r={r} fill={c.accent} />
            ))}
            {mk.spitzMask && (
              <>
                <Path d={`M${CX - g.cheekW - 4} ${f(L.eyeY + g.eyeR * (huskyFace ? 0.6 : 1.8))} Q${CX} ${f(L.eyeY + g.muzzleLen * 0.25)} ${CX + g.cheekW + 4} ${f(L.eyeY + g.eyeR * (huskyFace ? 0.6 : 1.8))} L${CX + g.cheekW + 4} ${L.chinY + 4} L${CX - g.cheekW - 4} ${L.chinY + 4} Z`} fill={white} />
                {huskyFace && (
                  <>
                    <Ellipse cx={eyeL} cy={L.eyeY + 1} rx={g.eyeR + 7} ry={g.eyeR + 5} fill={white} />
                    <Ellipse cx={eyeR} cy={L.eyeY + 1} rx={g.eyeR + 7} ry={g.eyeR + 5} fill={white} />
                  </>
                )}
                <Ellipse cx={eyeL + 1} cy={L.eyeY - g.eyeR - 8} rx={5.5} ry={4} fill={white} />
                <Ellipse cx={eyeR - 1} cy={L.eyeY - g.eyeR - 8} rx={5.5} ry={4} fill={white} />
                {luminance(c.base) < 0.2 && (
                  // Dark stripe down the nose bridge (husky / malamute).
                  <Path d={`M${CX - 6} ${L.top} L${CX + 6} ${L.top} L${CX + 3.5} ${f(L.noseY - 6)} L${CX - 3.5} ${f(L.noseY - 6)} Z`} fill={c.base} />
                )}
              </>
            )}
            {mk.hood && (
              <>
                <Ellipse cx={eyeL - 2} cy={L.eyeY - 2} rx={g.eyeR + 11} ry={g.eyeR + 12} fill={c.accent} />
                <Ellipse cx={eyeR + 2} cy={L.eyeY - 2} rx={g.eyeR + 11} ry={g.eyeR + 12} fill={c.accent} />
                <Path d={`M${CX - g.skullW} ${L.top - 4} L${CX + g.skullW} ${L.top - 4} L${CX + g.skullW} ${L.eyeY - 6} L${CX + 7} ${L.eyeY - 6} L${CX + 4} ${L.top + 4} L${CX - 4} ${L.top + 4} L${CX - 7} ${L.eyeY - 6} L${CX - g.skullW} ${L.eyeY - 6} Z`} fill={c.accent} />
              </>
            )}
            {mk.patch && (
              <Ellipse cx={(t.seed & 1) === 1 ? eyeR + 2 : eyeL - 2} cy={L.eyeY - 1} rx={g.eyeR + 10} ry={g.eyeR + 10} fill={c.accent} />
            )}
            {mk.mask && (
              <>
                <Path d={L.muzzlePath} fill={c.accent} />
                <Path d={`M${CX - g.muzzleW * 0.5} ${f(L.eyeY + g.muzzleLen * 0.3)} Q${CX} ${f(L.eyeY - g.skullH * 0.35)} ${CX + g.muzzleW * 0.5} ${f(L.eyeY + g.muzzleLen * 0.3)} Z`} fill={c.accent} opacity={0.85} />
                <Ellipse cx={eyeL} cy={L.eyeY + 1} rx={g.eyeR + 6} ry={g.eyeR + 5} fill={c.accent} opacity={0.9} />
                <Ellipse cx={eyeR} cy={L.eyeY + 1} rx={g.eyeR + 6} ry={g.eyeR + 5} fill={c.accent} opacity={0.9} />
              </>
            )}
            {mk.cheeks && (
              <>
                <Ellipse cx={CX - g.muzzleW - 6} cy={L.noseY - 4} rx={11} ry={10} fill={c.points} />
                <Ellipse cx={CX + g.muzzleW + 6} cy={L.noseY - 4} rx={11} ry={10} fill={c.points} />
              </>
            )}
            {mk.points && (
              <>
                <Ellipse cx={eyeL} cy={L.eyeY - g.eyeR - 6} rx={g.eyeR * 0.75} ry={g.eyeR * 0.5} fill={c.points} />
                <Ellipse cx={eyeR} cy={L.eyeY - g.eyeR - 6} rx={g.eyeR * 0.75} ry={g.eyeR * 0.5} fill={c.points} />
                <Ellipse cx={CX - g.muzzleW - 3} cy={L.noseY - 2} rx={8} ry={7} fill={c.points} />
                <Ellipse cx={CX + g.muzzleW + 3} cy={L.noseY - 2} rx={8} ry={7} fill={c.points} />
              </>
            )}
            {mk.blaze && (
              <Path
                d={`M${CX - 3.5} ${L.top - 2} L${CX + 3.5} ${L.top - 2} Q${CX + 5} ${L.eyeY - 4} ${f(CX + g.muzzleW * 0.75)} ${f(L.eyeY + g.muzzleLen * 0.42)} L${f(CX - g.muzzleW * 0.75)} ${f(L.eyeY + g.muzzleLen * 0.42)} Q${CX - 5} ${L.eyeY - 4} ${CX - 3.5} ${L.top - 2} Z`}
                fill={white}
              />
            )}
            {mk.thumbMark && <Ellipse cx={CX} cy={L.eyeY - g.skullH * 0.45} rx={5} ry={7} fill={c.accent} opacity={0.75} />}
            {/* soft volume */}
            <Path d={L.headPath} fill={`url(#shade${uid})`} />
          </G>

          {/* long-haired cheeks blend over the head outline */}
          {fur.cheek.map((ck, i) => (
            <FurLayer key={i} fur={ck} fill={c.base} stroke={furOutline} />
          ))}

          {/* curly pom-pom or silky top-knot */}
          {ex.topknot && !curly && <FurLayer fur={fur.tuft} fill={lighten(c.base, 0.06)} stroke={furOutline} />}
          {ex.topknot && curly && (
            <G fill={lighten(c.base, 0.06)} stroke={outline} strokeWidth={2}>
              {[[-18, 8, 10], [18, 8, 10], [-9, -2, 12], [9, -2, 12], [0, 8, 11], [0, -8, 10]].map(([dx, dy, r], i) => (
                <Circle key={i} cx={CX + dx * (g.skullW / 46)} cy={L.top + dy} r={r} />
              ))}
            </G>
          )}
          {ex.bow && (
            <G transform={`translate(${CX} ${L.top - 6})`}>
              <Path d="M0 0 L-12 -7 L-12 7 Z M0 0 L12 -7 L12 7 Z" fill="#E8607A" stroke="#B5435A" strokeWidth={1.5} strokeLinejoin="round" />
              <Circle cx={0} cy={0} r={3.5} fill="#E8607A" stroke="#B5435A" strokeWidth={1.5} />
            </G>
          )}

          {/* ── Ears in front of the head ── */}
          {earsInFront &&
            (['R', 'L'] as const).map((side) => (
              <G key={side} transform={side === 'L' ? 'translate(200 0) scale(-1 1)' : undefined}>
                <G transform={`translate(${f(L.earBase[0])} ${f(L.earBase[1])}) rotate(${t.ears === 'button' ? -12 : t.earAngle})`}>
                  {curls.map(([x, y], i) => (
                    <Circle key={i} cx={x} cy={y} r={6.5 * earU} fill={earFill} stroke={earOutline} strokeWidth={2} />
                  ))}
                  <Path d={ear.outer} fill={earFill} stroke={earOutline} strokeWidth={2.4} strokeLinejoin="round" />
                  <FurLayer fur={earLocks} fill={earFill} stroke={earOutline} />
                  {t.ears !== 'button' && (
                    <Path d={`M${f(-4 * earU)} ${f(2 * earU)} C${f(2 * earU)} ${f(16 * earU)} ${f(2 * earU)} ${f((t.ears === 'long' ? 50 : 32) * earU)} ${f(-2 * earU)} ${f((t.ears === 'long' ? 62 : 40) * earU)}`} stroke={darken(earFill, 0.18)} strokeWidth={1.6} fill="none" opacity={0.6} strokeLinecap="round" />
                  )}
                  {t.ears === 'button' && (
                    <Path d={`M${f(-13 * earU)} ${f(-2 * earU)} C${f(-5 * earU)} ${f(-10 * earU)} ${f(9 * earU)} ${f(-10 * earU)} ${f(16 * earU)} ${f(-3 * earU)}`} stroke={darken(earFill, 0.25)} strokeWidth={2} fill="none" strokeLinecap="round" />
                  )}
                </G>
              </G>
            ))}

          {/* ── Muzzle ── */}
          {ex.beard && (
            <Path
              d={`M${f(CX - g.muzzleW - 3)} ${f(ny)} C${f(CX - g.muzzleW - 6)} ${f(L.chinY + 10)} ${f(CX - 8)} ${f(L.chinY + 20)} ${CX} ${f(L.chinY + 22)} C${f(CX + 8)} ${f(L.chinY + 20)} ${f(CX + g.muzzleW + 6)} ${f(L.chinY + 10)} ${f(CX + g.muzzleW + 3)} ${f(ny)} Z`}
              fill={beardFill}
              stroke={outline}
              strokeWidth={2}
            />
          )}
          {ex.beard && <FurLayer fur={fur.beardFur} fill={beardFill} stroke={outline} />}
          {!mk.mask && muzzleFill !== c.base && <Path d={L.muzzlePath} fill={muzzleFill} />}
          {ex.jowls && (
            <>
              <Path d={`M${f(CX - 2)} ${f(mouthY)} C${f(CX - g.muzzleW * 0.6)} ${f(mouthY + 2)} ${f(CX - g.muzzleW - 4)} ${f(mouthY + 2)} ${f(CX - g.muzzleW - 3)} ${f(L.chinY + 4)} C${f(CX - g.muzzleW * 0.6)} ${f(L.chinY + 8)} ${f(CX - 6)} ${f(L.chinY + 4)} ${f(CX - 2)} ${f(mouthY)} Z`} fill={muzzleFill} stroke={outline} strokeWidth={1.8} />
              <Path d={`M${f(CX + 2)} ${f(mouthY)} C${f(CX + g.muzzleW * 0.6)} ${f(mouthY + 2)} ${f(CX + g.muzzleW + 4)} ${f(mouthY + 2)} ${f(CX + g.muzzleW + 3)} ${f(L.chinY + 4)} C${f(CX + g.muzzleW * 0.6)} ${f(L.chinY + 8)} ${f(CX + 6)} ${f(L.chinY + 4)} ${f(CX + 2)} ${f(mouthY)} Z`} fill={muzzleFill} stroke={outline} strokeWidth={1.8} />
            </>
          )}
          <Ellipse cx={CX - padRx * 0.82} cy={padY} rx={padRx} ry={padRy} fill={mk.mask ? c.accent : muzzleFill} />
          <Ellipse cx={CX + padRx * 0.82} cy={padY} rx={padRx} ry={padRy} fill={mk.mask ? c.accent : muzzleFill} />
          {[-1, 1].map((s) =>
            [0, 1, 2].map((k) => (
              <Circle key={`${s}${k}`} cx={CX + s * (padRx * (0.55 + k * 0.32))} cy={padY - 1 + (k % 2) * 3} r={0.9} fill={darken(muzzleFill, 0.4)} opacity={0.6} />
            )),
          )}
          {ex.mustache && (
            <G fill={isDark && !mk.blaze ? hairLight : lighten(muzzleFill, 0.15)} stroke={outline} strokeWidth={1.8}>
              <Path d={`M${CX - 2} ${f(ny + 2)} C${f(CX - g.muzzleW * 0.8)} ${f(ny - 2)} ${f(CX - g.muzzleW - 8)} ${f(ny + 10)} ${f(CX - g.muzzleW - 6)} ${f(ny + 18)} C${f(CX - g.muzzleW * 0.5)} ${f(ny + 16)} ${f(CX - 6)} ${f(ny + 14)} ${CX - 2} ${f(ny + 2)} Z`} />
              <Path d={`M${CX + 2} ${f(ny + 2)} C${f(CX + g.muzzleW * 0.8)} ${f(ny - 2)} ${f(CX + g.muzzleW + 8)} ${f(ny + 10)} ${f(CX + g.muzzleW + 6)} ${f(ny + 18)} C${f(CX + g.muzzleW * 0.5)} ${f(ny + 16)} ${f(CX + 6)} ${f(ny + 14)} ${CX + 2} ${f(ny + 2)} Z`} />
            </G>
          )}
          {ex.wrinkles && (
            <G stroke={darken(mk.mask ? c.accent : c.base, 0.35)} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.6}>
              <Path d={`M${f(CX - nW - 4)} ${f(ny - nH - 3)} Q${CX} ${f(ny - nH - 9)} ${f(CX + nW + 4)} ${f(ny - nH - 3)}`} />
              <Path d={`M${f(CX - 9)} ${f(L.eyeY - g.eyeR - 10)} Q${CX} ${f(L.eyeY - g.eyeR - 14)} ${f(CX + 9)} ${f(L.eyeY - g.eyeR - 10)}`} />
              <Path d={`M${f(CX - 6)} ${f(L.eyeY - g.eyeR - 16)} Q${CX} ${f(L.eyeY - g.eyeR - 19)} ${f(CX + 6)} ${f(L.eyeY - g.eyeR - 16)}`} />
            </G>
          )}

          {/* nose */}
          <Path d={nosePath} fill={c.nose} />
          <Ellipse cx={CX - nW * 0.42} cy={ny + nH * 0.05} rx={nW * 0.17} ry={nH * 0.14} fill={darken(c.nose, 0.5)} />
          <Ellipse cx={CX + nW * 0.42} cy={ny + nH * 0.05} rx={nW * 0.17} ry={nH * 0.14} fill={darken(c.nose, 0.5)} />
          <Ellipse cx={CX - nW * 0.3} cy={ny - nH * 0.48} rx={nW * 0.28} ry={nH * 0.14} fill="#FFFFFF" opacity={0.45} />

          {/* mouth */}
          {happy ? (
            <>
              <Path d={`M${f(CX - mouthW)} ${f(mouthY - 3)} Q${CX} ${f(mouthY + 2)} ${f(CX + mouthW)} ${f(mouthY - 3)} Q${f(CX + mouthW * 0.6)} ${f(mouthY + 13)} ${CX} ${f(mouthY + 14)} Q${f(CX - mouthW * 0.6)} ${f(mouthY + 13)} ${f(CX - mouthW)} ${f(mouthY - 3)} Z`} fill="#5A2A2E" />
              <Path d={`M${f(CX - mouthW * 0.5)} ${f(mouthY + 5)} Q${f(CX - mouthW * 0.5)} ${f(mouthY + 20)} ${CX} ${f(mouthY + 20)} Q${f(CX + mouthW * 0.5)} ${f(mouthY + 20)} ${f(CX + mouthW * 0.5)} ${f(mouthY + 5)} Q${CX} ${f(mouthY + 1)} ${f(CX - mouthW * 0.5)} ${f(mouthY + 5)} Z`} fill={TONGUE} />
              <Path d={`M${CX} ${f(mouthY + 7)} L${CX} ${f(mouthY + 15)}`} stroke={darken(TONGUE, 0.25)} strokeWidth={1.2} strokeLinecap="round" />
            </>
          ) : null}
          <Path
            d={`M${CX} ${f(ny + nH * 0.55)} L${CX} ${f(mouthY)} M${f(CX - mouthW)} ${f(mouthY - 3)} Q${f(CX - mouthW * 0.45)} ${f(mouthY + 4)} ${CX} ${f(mouthY)} Q${f(CX + mouthW * 0.45)} ${f(mouthY + 4)} ${f(CX + mouthW)} ${f(mouthY - 3)}`}
            stroke={lip}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {ex.underbite && !happy && (
            <G fill="#FFFFFF" stroke={darken(muzzleFill, 0.4)} strokeWidth={0.8}>
              <Path d={`M${f(CX - mouthW * 0.55)} ${f(mouthY + 1)} l2.5 -5 l2.5 5 Z`} />
              <Path d={`M${f(CX + mouthW * 0.55 - 5)} ${f(mouthY + 1)} l2.5 -5 l2.5 5 Z`} />
            </G>
          )}

          {/* ── Eyes ── */}
          {[eyeL, eyeR].map((x, i) => {
            const r = g.eyeR;
            const almond = t.eyeShape === 'almond';
            const tilt = almond ? (i === 0 ? 12 : -12) : 0;
            const coloured = t.eyes !== EYE.brown;
            const rim = isDark || (mk.mask && luminance(c.accent) < 0.06) ? lighten(c.base, 0.3) : undefined;
            return (
              <G key={i} transform={tilt ? `rotate(${tilt} ${f(x)} ${f(L.eyeY)})` : undefined}>
                {rim && <Ellipse cx={x} cy={L.eyeY} rx={(almond ? r * 1.2 : r) + 1.6} ry={(almond ? r * 0.82 : r) + 1.6} fill={rim} opacity={0.55} />}
                <Ellipse cx={x} cy={L.eyeY} rx={almond ? r * 1.2 : r} ry={almond ? r * 0.82 : r} fill={coloured ? t.eyes : PUPIL} />
                {coloured && <Circle cx={x} cy={L.eyeY} r={r * 0.5} fill={PUPIL} />}
                <Circle cx={x + r * 0.32} cy={L.eyeY - r * 0.32} r={r * 0.32} fill="#FFFFFF" />
                <Circle cx={x - r * 0.35} cy={L.eyeY + r * 0.38} r={r * 0.13} fill="#FFFFFF" opacity={0.85} />
              </G>
            );
          })}
          {ex.eyebrows && (
            <G stroke={hairLight} strokeWidth={2.6} strokeLinecap="round" fill="none">
              {[eyeL, eyeR].flatMap((x, side) =>
                [-1, 0, 1].map((k) => {
                  const dir = side === 0 ? -1 : 1;
                  const bx = x + k * g.eyeR * 0.7;
                  const by = L.eyeY - g.eyeR - 4;
                  return <Path key={`${side}${k}`} d={`M${f(bx)} ${f(by)} Q${f(bx + dir * 4)} ${f(by - 7)} ${f(bx + dir * 9)} ${f(by - 5 + k)}`} />;
                }),
              )}
            </G>
          )}
          {ex.fringe && (
            <FurLayer fur={fur.fringe} fill={lighten(c.base, 0.05)} stroke={furOutline} />
          )}

          {/* blush */}
          <Ellipse cx={CX - g.cheekW * 0.62} cy={L.noseY - 2} rx={6.5} ry={4.5} fill="#FF8FA3" opacity={0.25} />
          <Ellipse cx={CX + g.cheekW * 0.62} cy={L.noseY - 2} rx={6.5} ry={4.5} fill="#FF8FA3" opacity={0.25} />
        </G>
      </G>
    </Svg>
  );
}

export const DogPortrait = memo(DogPortraitImpl);

/** Convenience wrapper that derives traits from a dog profile. */
export function DogAvatar({ dog, ...rest }: Omit<DogPortraitProps, 'traits'> & { dog: Pick<Dog, 'id' | 'breed' | 'coatVariant'> }) {
  const traits = useMemo(() => traitsFor(dog.breed, dog.coatVariant, dog.id), [dog.breed, dog.coatVariant, dog.id]);
  return <DogPortrait traits={traits} {...rest} />;
}
