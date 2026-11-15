import type { PeriodComparison } from './stats';

/**
 * The supportive voice of the app.
 *
 * Principles (from force-free / behaviour-science guidance on reactivity):
 * - Reactivity is an emotional response (fear, frustration, overwhelm), not
 *   disobedience. Never blame the dog — or the human.
 * - Every logged episode is useful data, so logging itself is praised.
 * - Progress is non-linear: a hard day doesn't erase a good month.
 *
 * Message selection is deterministic for a given seed so the copy doesn't
 * flicker on re-render, but varies from day to day.
 */

type Template = (name: string) => string;

const AFTER_REACTION_MILD: Template[] = [
  (n) => `Noticing the small signs — like a stiff body — is a real skill. ${n} told you how they felt, and you listened.`,
  (n) => `A quiet stiffen is ${n} coping as best they can. Logging it helps you see where their threshold is.`,
  (n) => `That was ${n} feeling unsure, not ${n} being "bad". You're learning their language together.`,
];

const AFTER_REACTION_MEDIUM: Template[] = [
  (n) => `${n} isn't giving you a hard time — ${n} is having a hard time. Thank you for writing it down.`,
  (n) => `Reacting is how ${n} says "this feels too close or too much". It's communication, not misbehaviour.`,
  (n) => `Not ${n}'s fault, and not yours. Some moments are just more than a nervous system can hold.`,
  (n) => `Every log is a clue. Over time these clues show you exactly what ${n} needs.`,
];

const AFTER_REACTION_BIG: Template[] = [
  (n) => `That sounded like a really tough moment. Take a breath — ${n} was overwhelmed, not trying to upset you.`,
  (n) => `Big reactions come from big feelings. ${n} felt unsafe, and you were there for them. That matters.`,
  (n) => `Hard walks happen to every reactive-dog team. One rough moment doesn't undo your progress.`,
  (n) => `Be gentle with yourself today. Some decompression time — a sniffy walk, a lick mat, a nap — helps ${n} reset after big stress.`,
];

const AFTER_SUCCESS: Template[] = [
  (n) => `Look at ${n} go! Choosing calm when a trigger shows up is hard work. 🎉`,
  (n) => `That's a win worth celebrating. ${n} saw it and chose something else — that's the training paying off.`,
  (n) => `Yes! Every calm choice makes the next one a little easier for ${n}.`,
  (n) => `${n} is learning that the world can be safe — and you're the one teaching that. 💛`,
  (n) => `A beautiful moment of focus. Treat jackpot well deserved!`,
];

const GREETINGS: Template[] = [
  (n) => `Every walk with ${n} is practice, not a test.`,
  (n) => `You and ${n} are a team. Progress isn't a straight line — and that's okay.`,
  (n) => `Reactivity is a feeling, not a flaw. ${n} is doing their best.`,
  (n) => `Small wins count. So do hard days. You're showing up for ${n} either way.`,
  (n) => `Distance is your friend. There's no shame in crossing the street.`,
  (n) => `${n} is lucky to have someone who tries this hard to understand them.`,
  (n) => `Rest days are training days too. Calm brains learn best.`,
];

const ROUGH_PERIOD: Template[] = [
  (n) => `This has been a heavier stretch. Stress stacks up for dogs like it does for us — extra rest can help ${n}.`,
  (n) => `Tough weeks are part of every journey. Your notes will help you spot what changed for ${n}.`,
];

export interface MessageContext {
  dogName: string;
  /** Any string; the same seed always returns the same message. */
  seed: string;
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(templates: Template[], ctx: MessageContext): string {
  return templates[hashString(ctx.seed) % templates.length](ctx.dogName);
}

export function messageAfterReaction(intensity: number, ctx: MessageContext): string {
  if (intensity <= 3) return pick(AFTER_REACTION_MILD, ctx);
  if (intensity <= 6) return pick(AFTER_REACTION_MEDIUM, ctx);
  return pick(AFTER_REACTION_BIG, ctx);
}

export function messageAfterSuccess(ctx: MessageContext): string {
  return pick(AFTER_SUCCESS, ctx);
}

export function dailyGreeting(ctx: MessageContext): string {
  return pick(GREETINGS, ctx);
}

export interface Insight {
  tone: 'celebrate' | 'support' | 'neutral';
  text: string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * Turns period-over-period numbers into a few kind, data-backed sentences.
 * Improvements are celebrated; regressions are reframed supportively and
 * never phrased as failure.
 */
export function insightsFor(
  cmp: PeriodComparison,
  periodNoun: 'week' | 'month' | 'year',
  ctx: MessageContext,
): Insight[] {
  const { current: cur, previous: prev } = cmp;
  const n = ctx.dogName;
  const out: Insight[] = [];
  const logged = cur.reactiveCount + cur.successCount;

  if (logged === 0) {
    out.push({
      tone: 'neutral',
      text: `Nothing logged this ${periodNoun} yet. Whenever you're ready, each marker helps you see ${n}'s progress.`,
    });
    return out;
  }

  const hasHistory = prev.reactiveCount + prev.successCount > 0;

  if (hasHistory && cur.successCount > prev.successCount) {
    const diff = cur.successCount - prev.successCount;
    out.push({
      tone: 'celebrate',
      text: `${diff} more success moment${diff === 1 ? '' : 's'} than last ${periodNoun}. ${n} is learning!`,
    });
  } else if (cur.successCount > 0) {
    out.push({
      tone: 'celebrate',
      text: `${cur.successCount} success moment${cur.successCount === 1 ? '' : 's'} this ${periodNoun}. Each one counts.`,
    });
  }

  if (cur.meanIntensity !== null && prev.meanIntensity !== null) {
    const delta = cur.meanIntensity - prev.meanIntensity;
    if (delta <= -0.5) {
      out.push({
        tone: 'celebrate',
        text: `Reactions are getting softer: average intensity eased from ${prev.meanIntensity.toFixed(1)} to ${cur.meanIntensity.toFixed(1)}.`,
      });
    } else if (delta >= 1) {
      out.push({ tone: 'support', text: pick(ROUGH_PERIOD, ctx) });
    }
  }

  if (cur.successShare !== null && prev.successShare !== null && cur.successShare > prev.successShare + 0.05) {
    out.push({
      tone: 'celebrate',
      text: `${pct(cur.successShare)} of trigger encounters were calm choices, up from ${pct(prev.successShare)}.`,
    });
  }

  if (prev.reactiveCount > 0 && cur.reactiveCount < prev.reactiveCount) {
    out.push({
      tone: 'celebrate',
      text: `Fewer reactions than last ${periodNoun} (${cur.reactiveCount} vs ${prev.reactiveCount}).`,
    });
  }

  if (out.length === 0) {
    out.push({
      tone: 'neutral',
      text: `You logged ${logged} moment${logged === 1 ? '' : 's'} this ${periodNoun}. Consistent notes are how patterns appear — keep going.`,
    });
  }
  return out.slice(0, 3);
}
