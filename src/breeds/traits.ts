/**
 * Visual traits that drive the procedural dog portrait.
 *
 * A breed is described by its *shape* (head proportions, ears, eyes, coat
 * texture, tail, build) plus one or more coat *variants* (colours + markings).
 *
 * Shape is given in two layers:
 *  1. coarse categories (`head`, `snout`, `size`, `ears`…) that are easy to
 *     write for 120+ breeds, and
 *  2. optional numeric refinements (`geo`, `earSize`, `earAngle`…) for the
 *     breeds whose silhouette needs it — a Bull Terrier's egg head or a
 *     Corgi's enormous ears.
 *
 * Markings are composable flags rather than one enum, so a Bernese (black +
 * white blaze + rust cheeks/brows + white collar) needs no special case.
 */

export type EarStyle =
  | 'pointy' // erect triangle (GSD, husky, westie)
  | 'bat' // big rounded erect (frenchie, chihuahua, corgi-ish)
  | 'semi' // erect with tipped-over tip (collie, sheltie)
  | 'button' // folded forward, V flap (JRT, schnauzer, pug)
  | 'rose' // small, folded back (greyhound, pit bull)
  | 'floppy' // triangular drop ear (lab, golden, vizsla)
  | 'long'; // long pendulous (beagle, basset, spaniels, poodle)

export type SnoutStyle = 'flat' | 'short' | 'medium' | 'long';
export type HeadShape = 'round' | 'broad' | 'narrow';
export type CoatTexture = 'smooth' | 'fluffy' | 'curly' | 'wiry';
export type DogSize = 'toy' | 'small' | 'medium' | 'large' | 'giant';
export type EyeShape = 'round' | 'almond' | 'small';
export type TailStyle = 'curl' | 'plume' | 'otter' | 'whip' | 'sickle' | 'stub';
export type Build = 'slim' | 'medium' | 'stocky';

export interface Markings {
  /** Darker muzzle + around-eye mask (pug, boxer, malinois). Uses `accent`. */
  mask?: boolean;
  /** White stripe down the forehead + white muzzle and chest. */
  blaze?: boolean;
  /** Tan brow dots + lower muzzle + chest (rottweiler, doberman). Uses `points`. */
  points?: boolean;
  /** Tan cheeks between dark head and white/tan muzzle (bernese, tricolour aussie). */
  cheeks?: boolean;
  /** Round spots (dalmatian, ticking). Uses `accent`. */
  spots?: boolean;
  /** Large irregular merle patches. Uses `accent`. */
  merle?: boolean;
  /** Coloured patch over one eye. Uses `accent`. */
  patch?: boolean;
  /** Coloured patches over both eyes + ears (JRT, cavalier). Uses `accent`. */
  hood?: boolean;
  /** Dark saddle on the back/shoulders (beagle, GSD, airedale). Uses `accent`. */
  saddle?: boolean;
  /** Spitz/husky facial mask: pale cheeks, muzzle, brows; dark cap. */
  spitzMask?: boolean;
  /** Tiger stripes. Uses `accent`. */
  brindle?: boolean;
  /** White ring round the neck (collies, aussies, corgis, bernese). */
  collar?: boolean;
  /** Small dark forehead mark (pug "thumb mark"); cavalier "lozenge" uses white=false. */
  thumbMark?: boolean;
}

export interface CoatColors {
  base: string;
  /** Muzzle; defaults to a subtly lightened base. */
  muzzle?: string;
  /** Chest; defaults to the muzzle colour. */
  chest?: string;
  /** Mask / spots / patch / saddle / brindle colour. */
  accent?: string;
  /** Tan points colour. */
  points?: string;
  /** Ears, when they differ from the head (beagle, cavalier). */
  ears?: string;
  /** Blaze / spitz mask / collar colour; defaults to white. */
  white?: string;
  /** Nose leather; defaults to near-black. */
  nose?: string;
}

export interface CoatVariant {
  label: string;
  colors: CoatColors;
  markings?: Markings;
}

export interface Extras {
  beard?: boolean;
  /** Moustache lobes beside the nose (schnauzer, westie, doodles). */
  mustache?: boolean;
  /** Fluffy top-of-head pouf (poodle, bichon). */
  topknot?: boolean;
  /** Top-knot gathered in a bow (yorkie, shih tzu, maltese). */
  bow?: boolean;
  wrinkles?: boolean;
  jowls?: boolean;
  /** Bushy eyebrows (schnauzer, scottie, wolfhound). */
  eyebrows?: boolean;
  /** Hair fringe over the eyes (old english sheepdog, bearded collie). */
  fringe?: boolean;
  /** Undershot jaw with little teeth (bulldog, boxer). */
  underbite?: boolean;
}

/** Numeric head proportions in the 200×200 viewBox (all half-widths). */
export interface HeadGeometry {
  /** Height of the skull above the eye line. */
  skullH: number;
  /** Half-width at the temples. */
  skullW: number;
  /** Half-width at the cheeks (just below the eyes). */
  cheekW: number;
  /** Half-width of the muzzle at nose level. */
  muzzleW: number;
  /** Distance eye line → nose (front-view foreshortened snout length). */
  muzzleLen: number;
  /** Distance nose → chin. */
  chinDrop: number;
  eyeR: number;
  /** Half the distance between the eyes. */
  eyeGap: number;
  /** Half-width of the nose leather. */
  noseW: number;
}

export interface BreedShape {
  ears: EarStyle;
  snout: SnoutStyle;
  head: HeadShape;
  coat: CoatTexture;
  size: DogSize;
  eyes?: string;
  eyeShape?: EyeShape;
  extras?: Extras;
  tail?: TailStyle;
  build?: Build;
  /** Ear size multiplier (default 1). */
  earSize?: number;
  /** Outward tilt of the ears in degrees (default per style). */
  earAngle?: number;
  /** Where on the skull the ears attach: 0 = top centre, 1 = side (default per style). */
  earSet?: number;
  /** Feathered (long-haired) ears and chest. */
  feathered?: boolean;
  /** Neck/cheek mane 0..1 (pomeranian 1, husky 0.5). */
  ruff?: number;
  /** Fine-tuning of the computed head proportions. */
  geo?: Partial<HeadGeometry>;
}

export interface BreedEntry {
  name: string;
  aliases: string[];
  shape: BreedShape;
  variants: CoatVariant[];
}

/** Fully resolved traits for rendering. */
export interface DogTraits extends Omit<BreedShape, 'geo'> {
  eyes: string;
  eyeShape: EyeShape;
  tail: TailStyle;
  build: Build;
  earSize: number;
  earAngle: number;
  earSet: number;
  ruff: number;
  geo: HeadGeometry;
  colors: Required<CoatColors>;
  markings: Markings;
  extras: Extras;
  /** Deterministic seed for procedural details (spot placement etc). */
  seed: number;
}

// ---------------------------------------------------------------------------
// Palette of natural coat colours
// ---------------------------------------------------------------------------

export const C = {
  black: '#2F2826',
  chocolate: '#5E3B27',
  liver: '#7B4A32',
  red: '#B4602F',
  rust: '#A65A2C',
  tan: '#C98B4D',
  gold: '#E2A65A',
  yellow: '#EDCB8E',
  cream: '#F4E3C3',
  white: '#FBF8F3',
  grey: '#8D9099',
  silver: '#BCC0C7',
  blue: '#717F93',
  fawn: '#DDB78A',
  apricot: '#EFB07A',
  sable: '#9C6A3C',
  wheaten: '#E6C893',
  brindle: '#7D5636',
  brindleDark: '#3D2A1D',
  merle: '#A2AAB6',
  merleDark: '#3A3F4A',
  redMerle: '#D9A27E',
  lemon: '#F1D47F',
  steel: '#5C6878',
} as const;

export const EYE = {
  brown: '#3B2416',
  amber: '#9A6324',
  blue: '#4E8FD6',
  hazel: '#6E5427',
} as const;

export const NOSE = {
  black: '#2A201D',
  liver: '#7A4535',
  grey: '#6F6466',
  pink: '#C98A86',
} as const;

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

export const lighten = (c: string, t: number) => mix(c, '#FFFFFF', t);
export const darken = (c: string, t: number) => mix(c, '#000000', t);

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Outline colour that reads against a given coat. */
export function outlineFor(base: string): string {
  return luminance(base) < 0.08 ? lighten(base, 0.22) : darken(base, 0.38);
}

// ---------------------------------------------------------------------------
// Proportions
// ---------------------------------------------------------------------------

const HEAD_PRESET: Record<HeadShape, Pick<HeadGeometry, 'skullH' | 'skullW' | 'cheekW'>> = {
  round: { skullH: 44, skullW: 46, cheekW: 45 },
  broad: { skullH: 40, skullW: 50, cheekW: 54 },
  narrow: { skullH: 42, skullW: 40, cheekW: 36 },
};

const SNOUT_PRESET: Record<SnoutStyle, Pick<HeadGeometry, 'muzzleW' | 'muzzleLen' | 'chinDrop'>> = {
  flat: { muzzleW: 25, muzzleLen: 22, chinDrop: 15 },
  short: { muzzleW: 21, muzzleLen: 28, chinDrop: 14 },
  medium: { muzzleW: 19, muzzleLen: 35, chinDrop: 14 },
  long: { muzzleW: 15, muzzleLen: 44, chinDrop: 12 },
};

const EYE_R: Record<DogSize, number> = { toy: 9.5, small: 8.6, medium: 7.8, large: 7.3, giant: 7 };
/** Small dogs get relatively bigger heads (cuter, and true to life). */
const HEAD_SCALE: Record<DogSize, number> = { toy: 1.08, small: 1.04, medium: 1, large: 0.98, giant: 0.97 };

export function computeGeometry(shape: BreedShape): HeadGeometry {
  const k = HEAD_SCALE[shape.size];
  const head = HEAD_PRESET[shape.head];
  const snout = SNOUT_PRESET[shape.snout];
  const flatFace = shape.snout === 'flat';
  const base: HeadGeometry = {
    skullH: head.skullH * k,
    skullW: head.skullW * k,
    cheekW: head.cheekW * k,
    muzzleW: snout.muzzleW * k,
    muzzleLen: snout.muzzleLen * k,
    chinDrop: snout.chinDrop * k,
    eyeR: EYE_R[shape.size] * (shape.eyeShape === 'small' ? 0.72 : flatFace ? 1.15 : 1),
    eyeGap: head.skullW * k * (flatFace ? 0.5 : 0.43),
    noseW: Math.max(9, Math.min(16, snout.muzzleW * k * 0.62)),
  };
  return { ...base, ...shape.geo };
}

function defaultTail(shape: BreedShape, markings: Markings): TailStyle {
  if (markings.spitzMask) return 'curl';
  if (shape.coat === 'fluffy' || shape.feathered) return 'plume';
  if (shape.coat === 'curly') return 'plume';
  return 'sickle';
}

const EAR_DEFAULTS: Record<EarStyle, { angle: number; set: number; size: number }> = {
  pointy: { angle: 14, set: 0.5, size: 1 },
  bat: { angle: 26, set: 0.55, size: 1 },
  semi: { angle: 12, set: 0.5, size: 1 },
  button: { angle: 0, set: 0.62, size: 0.9 },
  rose: { angle: 0, set: 0.62, size: 1 },
  floppy: { angle: 0, set: 0.84, size: 0.86 },
  long: { angle: 0, set: 0.84, size: 1 },
};

export function resolveTraits(shape: BreedShape, variant: CoatVariant, seed: number): DogTraits {
  const { colors } = variant;
  const markings = variant.markings ?? {};
  const isDark = luminance(colors.base) < 0.06;
  const muzzle = colors.muzzle ?? (isDark ? lighten(colors.base, 0.1) : lighten(colors.base, 0.14));
  const ear = EAR_DEFAULTS[shape.ears];
  return {
    ...shape,
    eyes: shape.eyes ?? EYE.brown,
    eyeShape: shape.eyeShape ?? 'round',
    tail: shape.tail ?? defaultTail(shape, markings),
    build: shape.build ?? (shape.head === 'broad' ? 'stocky' : shape.head === 'narrow' ? 'slim' : 'medium'),
    earSize: shape.earSize ?? ear.size,
    earAngle: shape.earAngle ?? ear.angle,
    earSet: shape.earSet ?? ear.set,
    ruff: shape.ruff ?? 0,
    geo: computeGeometry(shape),
    extras: shape.extras ?? {},
    markings,
    colors: {
      base: colors.base,
      muzzle,
      chest: colors.chest ?? muzzle,
      accent: colors.accent ?? C.black,
      points: colors.points ?? C.rust,
      ears: colors.ears ?? colors.base,
      white: colors.white ?? C.white,
      nose: colors.nose ?? NOSE.black,
    },
    seed,
  };
}
