import { BREEDS } from './breedData';
import {
  type BreedEntry,
  type BreedShape,
  C,
  type CoatTexture,
  type CoatVariant,
  type DogSize,
  type DogTraits,
  type EarStyle,
  EYE,
  type HeadShape,
  resolveTraits,
  type SnoutStyle,
} from './traits';

/**
 * Turns free-text breed input ("golden doodle", "husky x lab", "labradore",
 * "street dog from Romania") into portrait traits.
 *
 * Strategy, in order:
 *  1. exact alias match on the whole (normalised) phrase
 *  2. scan for alias n-grams inside the phrase → one breed, or a mix of two
 *  3. fuzzy (edit-distance) match for typos
 *  4. a deterministic "one of a kind" dog generated from the text itself
 */

export type MatchKind = 'exact' | 'contains' | 'mix' | 'fuzzy' | 'unique';

export interface BreedMatch {
  kind: MatchKind;
  /** Human label, e.g. "Siberian Husky × Labrador Retriever". */
  label: string;
  breeds: BreedEntry[];
  variants: CoatVariant[];
  shape: BreedShape;
}

const FILLER = new Set(['dog', 'dogs', 'the', 'a', 'an', 'breed', 'puppy', 'pup', 'my', 'is', 'purebred', 'pure', 'of']);
const MIX_WORDS = new Set(['mix', 'mixed', 'cross', 'crossbreed', 'x', 'and', 'with', 'mutt', 'blend']);
const GENERIC_MIX = new Set(['mix', 'mixed', 'mutt', 'mongrel', 'crossbreed', 'cross', 'rescue', 'unknown', 'street', 'stray', 'village', 'pariah', 'heinz', '57', 'shelter']);

export function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[×*+/&\-_.,()]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .filter((t) => t && !FILLER.has(t))
    .join(' ');
}

interface AliasEntry {
  alias: string;
  tokens: number;
  breed: BreedEntry;
}

const ALIASES: AliasEntry[] = BREEDS.flatMap((breed) => {
  const all = new Set([normalise(breed.name), ...breed.aliases.map(normalise)]);
  return [...all].filter(Boolean).map((alias) => ({ alias, tokens: alias.split(' ').length, breed }));
});
const BY_ALIAS = new Map(ALIASES.map((a) => [a.alias, a.breed]));
const MAX_ALIAS_TOKENS = Math.max(...ALIASES.map((a) => a.tokens));

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

function similarity(a: string, b: string): number {
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Greedy longest-first scan for known aliases inside a token list. */
function findBreedsIn(tokens: string[]): BreedEntry[] {
  const found: BreedEntry[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (let len = Math.min(MAX_ALIAS_TOKENS, tokens.length - i); len >= 1; len--) {
      const phrase = tokens.slice(i, i + len).join(' ');
      // Very short aliases (e.g. "ig", "bc") only count as whole-phrase matches.
      if (len === 1 && phrase.length < 3 && tokens.length > 1) continue;
      const breed = BY_ALIAS.get(phrase) ?? fuzzyToken(phrase, len);
      if (breed) {
        if (!found.includes(breed)) found.push(breed);
        i += len;
        matched = true;
        break;
      }
    }
    if (!matched) i++;
  }
  return found;
}

/** Tolerate typos inside multi-word input ("huskey lab mix"). */
function fuzzyToken(phrase: string, tokenCount: number): BreedEntry | undefined {
  if (phrase.length < 5 || MIX_WORDS.has(phrase) || GENERIC_MIX.has(phrase)) return undefined;
  let best: AliasEntry | undefined;
  let bestScore = 0;
  for (const a of ALIASES) {
    if (a.tokens !== tokenCount || a.alias.length < 4) continue;
    const s = similarity(phrase, a.alias);
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  return bestScore >= 0.8 ? best?.breed : undefined;
}

function fuzzyWhole(phrase: string): BreedEntry | undefined {
  let best: AliasEntry | undefined;
  let bestScore = 0;
  for (const a of ALIASES) {
    if (a.alias.length < 4) continue;
    const s = similarity(phrase, a.alias);
    if (s > bestScore) {
      bestScore = s;
      best = a;
    }
  }
  return bestScore >= 0.72 ? best?.breed : undefined;
}

// ---------------------------------------------------------------------------
// Mixing & procedural generation
// ---------------------------------------------------------------------------

const SIZES: DogSize[] = ['toy', 'small', 'medium', 'large', 'giant'];
const SNOUTS: SnoutStyle[] = ['flat', 'short', 'medium', 'long'];

function between<T>(scale: T[], a: T, b: T): T {
  const i = scale.indexOf(a);
  const j = scale.indexOf(b);
  return scale[Math.round((i + j) / 2)];
}

function blendShapes(a: BreedShape, b: BreedShape, seed: number): BreedShape {
  const coin = (bit: number) => ((seed >> bit) & 1) === 1;
  // Pointy ears are genetically recessive-ish in crosses; floppy tends to win.
  const ears: EarStyle =
    a.ears === b.ears ? a.ears : a.ears === 'pointy' || b.ears === 'pointy' ? 'semi' : coin(1) ? a.ears : b.ears;
  return {
    ears,
    snout: between(SNOUTS, a.snout, b.snout),
    head: coin(2) ? a.head : b.head,
    coat: coin(3) ? a.coat : b.coat,
    size: between(SIZES, a.size, b.size),
    eyes: a.eyes === EYE.blue || b.eyes === EYE.blue ? (coin(4) ? EYE.blue : EYE.brown) : a.eyes,
    extras: {
      beard: a.extras?.beard && b.extras?.beard,
      topknot: a.extras?.topknot || b.extras?.topknot,
      wrinkles: a.extras?.wrinkles && b.extras?.wrinkles,
      jowls: a.extras?.jowls || b.extras?.jowls,
      eyebrows: a.extras?.eyebrows || b.extras?.eyebrows,
    },
  };
}

const UNIQUE_COATS: CoatVariant[] = [
  { label: 'Ginger', colors: { base: C.tan } },
  { label: 'Black & white', colors: { base: C.black }, markings: { blaze: true } },
  { label: 'Brindle', colors: { base: C.brindle, accent: C.brindleDark }, markings: { brindle: true } },
  { label: 'Cream', colors: { base: C.cream } },
  { label: 'Black & tan', colors: { base: C.black, points: C.tan, muzzle: C.tan }, markings: { points: true } },
  { label: 'Red & white', colors: { base: C.red }, markings: { blaze: true } },
  { label: 'Grey', colors: { base: C.grey }, markings: { blaze: true } },
  { label: 'Patchy', colors: { base: C.white, muzzle: C.white, accent: C.chocolate, ears: C.chocolate }, markings: { patch: true, spots: true } },
  { label: 'Sable', colors: { base: C.sable, accent: C.black }, markings: { mask: true } },
  { label: 'Chocolate', colors: { base: C.chocolate } },
  { label: 'Yellow', colors: { base: C.yellow } },
  { label: 'Tricolour', colors: { base: C.tan, accent: C.black }, markings: { blaze: true, saddle: true } },
];

function pickFrom<T>(list: T[], seed: number, salt: number): T {
  return list[hashString(`${seed}:${salt}`) % list.length];
}

function uniqueShape(seed: number): BreedShape {
  return {
    ears: pickFrom<EarStyle>(['pointy', 'floppy', 'semi', 'rose', 'floppy', 'semi'], seed, 1),
    snout: pickFrom<SnoutStyle>(['short', 'medium', 'medium', 'long'], seed, 2),
    head: pickFrom<HeadShape>(['round', 'broad', 'narrow'], seed, 3),
    coat: pickFrom<CoatTexture>(['smooth', 'smooth', 'fluffy', 'wiry', 'curly'], seed, 4),
    size: pickFrom<DogSize>(['small', 'medium', 'medium', 'large'], seed, 5),
    eyes: pickFrom([EYE.brown, EYE.brown, EYE.amber, EYE.hazel], seed, 6),
  };
}

function uniqueVariants(seed: number): CoatVariant[] {
  // Rotate the list so every dog gets a different default, but all options stay available.
  const offset = seed % UNIQUE_COATS.length;
  return [...UNIQUE_COATS.slice(offset), ...UNIQUE_COATS.slice(0, offset)];
}

function single(breed: BreedEntry, kind: MatchKind): BreedMatch {
  return { kind, label: breed.name, breeds: [breed], variants: breed.variants, shape: breed.shape };
}

/**
 * @param text  free-text breed
 * @param fallbackSeed  used when nothing matches (e.g. the dog's name) so an
 *                      unknown breed still gets a stable, personal look
 */
export function matchBreed(text: string, fallbackSeed = ''): BreedMatch {
  const phrase = normalise(text);
  const tokens = phrase ? phrase.split(' ') : [];

  if (!phrase) return makeUnique(fallbackSeed || 'dog', 'Mystery pup');

  const exact = BY_ALIAS.get(phrase);
  if (exact) return single(exact, 'exact');

  const found = findBreedsIn(tokens);
  if (found.length >= 2) {
    const [a, b] = found;
    const seed = hashString(`${a.name}|${b.name}`);
    return {
      kind: 'mix',
      label: `${a.name} × ${b.name}`,
      breeds: [a, b],
      // Coat options come from both parents.
      variants: [...a.variants, ...b.variants],
      shape: blendShapes(a.shape, b.shape, seed),
    };
  }
  if (found.length === 1) {
    const isMix = tokens.some((t) => MIX_WORDS.has(t) || GENERIC_MIX.has(t));
    const match = single(found[0], isMix ? 'mix' : 'contains');
    return isMix ? { ...match, label: `${found[0].name} mix` } : match;
  }

  if (!tokens.every((t) => GENERIC_MIX.has(t) || MIX_WORDS.has(t))) {
    const fuzzy = fuzzyWhole(phrase);
    if (fuzzy) return single(fuzzy, 'fuzzy');
  }

  return makeUnique(`${phrase}|${fallbackSeed}`, tokens.some((t) => GENERIC_MIX.has(t)) ? 'Wonderful mix' : 'One of a kind');
}

function makeUnique(seedText: string, label: string): BreedMatch {
  const seed = hashString(seedText);
  return { kind: 'unique', label, breeds: [], variants: uniqueVariants(seed), shape: uniqueShape(seed) };
}

export function traitsFor(breedText: string, variantIndex: number, fallbackSeed = ''): DogTraits {
  const match = matchBreed(breedText, fallbackSeed);
  const variant = match.variants[Math.abs(variantIndex) % match.variants.length];
  return resolveTraits(match.shape, variant, hashString(`${breedText}|${fallbackSeed}|${variantIndex}`));
}

/** Suggestions for the breed autocomplete. */
export function suggestBreeds(text: string, limit = 6): string[] {
  const phrase = normalise(text);
  if (phrase.length < 2) return [];
  const scored = new Map<string, number>();
  for (const a of ALIASES) {
    let score: number;
    if (a.alias.startsWith(phrase)) score = 2 - a.alias.length / 100;
    else if (a.alias.includes(phrase)) score = 1.5;
    else score = similarity(phrase, a.alias.slice(0, phrase.length + 2));
    if (score > 0.7) scored.set(a.breed.name, Math.max(scored.get(a.breed.name) ?? 0, score));
  }
  return [...scored.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, limit)
    .map(([name]) => name);
}
