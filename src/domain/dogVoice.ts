import { addDaysKey } from './dates';
import { recentTrend, type RecentTrend } from './recentTrend';
import type { DateKey, Marker, Walk } from './types';
import { type WhyFact, whyFact, type WhyFactId } from './whyFacts';

/**
 * Messages *from the dog* to their person — the words the dog can't say.
 *
 * Every message is written in the dog's voice and points to a researched
 * "why" fact (`whyFacts.ts`), so the app never says something comforting that
 * isn't true. The tone is always the same: the dog is never "bad", the person
 * is never to blame, wins are celebrated, and hard moments are met with
 * understanding and a concrete, kind next step.
 */

export type VoiceCategory =
  /** Everyday "why I react & how to help". Also the fallback. */
  | 'general'
  /** Right after logging a reaction of intensity 7–10. */
  | 'afterBigReaction'
  /** Right after logging a reaction of intensity 1–6. */
  | 'afterReaction'
  /** Right after logging a success. */
  | 'afterSuccess'
  /** The very first success that was ever logged. */
  | 'firstSuccess'
  /** A big reaction in the last two days. */
  | 'recovery'
  /** Several reactions in the last three days. */
  | 'stacking'
  /** The last two weeks look better than the two before. */
  | 'progress'
  /** The last two weeks look harder than the two before. */
  | 'toughStretch'
  /** Some things better, some harder. */
  | 'mixed'
  /** Regular logging, no clear change. */
  | 'steady'
  /** Every walk planned today was skipped. */
  | 'restDay';

export const VOICE_CATEGORIES: VoiceCategory[] = [
  'general',
  'afterBigReaction',
  'afterReaction',
  'afterSuccess',
  'firstSuccess',
  'recovery',
  'stacking',
  'progress',
  'toughStretch',
  'mixed',
  'steady',
  'restDay',
];

export interface DogMessage {
  id: string;
  category: VoiceCategory;
  text: (dogName: string) => string;
  /** The researched fact that makes this message true. */
  factId: WhyFactId;
}

const m = (id: string, category: VoiceCategory, factId: WhyFactId, text: DogMessage['text']): DogMessage => ({
  id,
  category,
  factId,
  text,
});

export const DOG_MESSAGES: DogMessage[] = [
  // ── Why I react & how to help (everyday) ────────────────────────────────
  m('g-not-bad', 'general', 'emotion',
    () => "When I bark at things, I'm not being bad. I'm worried or overwhelmed, and barking is the only way I know to say \"please don't come closer\"."),
  m('g-hard-time', 'general', 'emotion',
    () => "I'm not giving you a hard time. I'm having a hard time — and you're the one I trust to help me through it."),
  m('g-leash', 'general', 'leash',
    () => "On the leash I can't move away from things that scare me. When you give me a curve and some space, I don't have to shout."),
  m('g-arc', 'general', 'leash',
    () => 'Walking in a curve around someone feels much politer to me than heading straight at them.'),
  m('g-not-mean', 'general', 'notAggressive',
    () => "I'm not a mean dog. Out there on the leash I just feel stuck and worried. Please remember who I am at home with you."),
  m('g-not-your-fault', 'general', 'notYourFault',
    () => "You didn't make me this way, and I didn't choose it either. Some of us are just born more sensitive. We'll figure it out together."),
  m('g-many-dogs', 'general', 'notYourFault',
    () => "Lots of dogs feel scared like me — almost a third of them. You're not the only one walking a worried dog, and you're doing it with so much heart."),
  m('g-distance', 'general', 'threshold',
    () => 'Distance is my favourite thing. When we cross the street or turn around, I feel safe enough to think again.'),
  m('g-treat-test', 'general', 'treatTest',
    () => "If I can still take a treat, I'm coping. If I can't, we're too close — let's move away together."),
  m('g-cc', 'general', 'counterConditioning',
    () => 'Every time I see something scary and then something yummy happens, my brain learns that scary things mean good things are coming.'),
  m('g-look-back', 'general', 'lookAtThat',
    () => "When I look at a trigger and then look back at you, that's me trying really hard. A treat for that makes me want to do it again."),
  m('g-management', 'general', 'management',
    () => "You don't have to walk me past every trigger to help me. Avoiding the really hard stuff while I learn is part of the plan."),
  m('g-quiet-streets', 'general', 'management',
    () => "Quiet streets and early mornings aren't hiding. They're how I get to practise feeling calm."),
  m('g-kindness', 'general', 'aversives',
    () => 'Please never use pain or fear to teach me. It makes the world feel even scarier — kindness and treats are how I learn best.'),
  m('g-growl', 'general', 'growl',
    () => "Please don't be cross when I growl. My growl is a warning — it's me telling you I'm uncomfortable before things get worse."),
  m('g-not-boss', 'general', 'dominance',
    () => "I'm not trying to be the boss. I'm just trying to feel safe."),
  m('g-signals', 'general', 'bodyLanguage',
    () => "Watch for my small signs — lip licks, yawns, turning my head away, a stiff body. They're how I say \"I'm getting worried\" before I bark."),
  m('g-stacking', 'general', 'stacking',
    () => 'Little things add up for me. A noisy morning, the doorbell, then a dog on our walk — by then my cup is already full.'),
  m('g-pain', 'general', 'pain',
    () => "If I suddenly react more than usual, I might not be feeling well in my body. A vet check-up can help find out."),
  m('g-sniff', 'general', 'sniffing',
    () => 'Sniffing is how I read the news. A slow, sniffy walk helps my busy brain feel good about the world.'),
  m('g-sleep', 'general', 'sleep',
    (n) => `I need a lot of sleep — more than you might think. A well-rested ${n} copes much better on walks.`),
  m('g-routine', 'general', 'routine',
    () => 'Routines make the world feel safer to me. I like knowing what comes next.'),
  m('g-safe-spot', 'general', 'safePlace',
    () => 'Having my own quiet spot where nobody bothers me helps me feel safe. Thank you for letting me say "not now" sometimes.'),
  m('g-enrichment', 'general', 'enrichment',
    () => 'Games at home — finding treats, puzzle toys, a good chew — help me feel calm and confident.'),
  m('g-breathe', 'general', 'emotionalMirror',
    () => 'I watch you more than you know. When you take a slow breath and soften the leash, I notice.'),
  m('g-look-after-you', 'general', 'emotionalMirror',
    () => 'Please look after yourself too. When you feel a bit lighter, I feel a bit lighter.'),
  m('g-safe-place-you', 'general', 'rewardBond',
    () => "Every treat and kind word teaches me that you're my safe place. That's why I keep looking back at you."),
  m('g-team', 'general', 'rewardBond',
    (n) => `You're my favourite person to be brave with. Love, ${n}.`),
  m('g-nonlinear', 'general', 'slowProgress',
    () => "Some days I just can't. That doesn't mean we're back at the start."),
  m('g-help', 'general', 'professionalHelp',
    () => 'There are people who specialise in dogs like me. Asking a reward-based trainer or a behaviour vet for help is kind, not a failure.'),
  m('g-not-alone', 'general', 'caregiver',
    () => 'I know walking me can feel hard and lonely sometimes. Your feelings make sense — and I love you for sticking with me.'),

  // ── Just after a big reaction (7–10) ─────────────────────────────────────
  m('b-scary', 'afterBigReaction', 'emotion',
    () => "That was really scary for me. Thank you for getting me out of there. I'm not upset with you — I hope you're not upset with me."),
  m('b-buzzing', 'afterBigReaction', 'recovery',
    () => 'My body is still buzzing. A quiet day tomorrow — sniffing, chewing, napping — would really help me reset.'),
  m('b-couldnt-hear', 'afterBigReaction', 'threshold',
    () => "When I was that upset I couldn't hear you. I wasn't ignoring you — my thinking brain had switched off."),
  m('b-home', 'afterBigReaction', 'management',
    () => "Neither of us planned that. Let's just go home and be cosy together. Getting us out of there was exactly right."),
  m('b-not-alone', 'afterBigReaction', 'caregiver',
    () => "I know that was scary and embarrassing for you too. Please don't carry it alone — it was a hard moment, not who we are."),
  m('b-not-erased', 'afterBigReaction', 'slowProgress',
    () => "One big moment doesn't wipe out everything I've learned. I'm still the dog who made all those brave choices."),
  m('b-breathe', 'afterBigReaction', 'emotionalMirror',
    () => "When you're ready, take a deep breath with me. We're both safe now."),

  // ── After a smaller reaction (1–6) ───────────────────────────────────────
  m('r-came-back', 'afterReaction', 'slowProgress',
    () => 'That was hard, but I came back to you. That counts.'),
  m('r-space', 'afterReaction', 'threshold',
    () => 'Thank you for noticing. A little more space next time might help me stay calm.'),
  m('r-learning', 'afterReaction', 'emotion',
    () => "I was worried, so I said it out loud. You're learning what makes me nervous — that's how we get better."),
  m('r-stiff', 'afterReaction', 'bodyLanguage',
    () => 'Even when I only go stiff and quiet, it means I feel uneasy. Thank you for seeing it.'),
  m('r-way-out', 'afterReaction', 'leash',
    () => 'I felt a bit stuck there. A curve or a quick U-turn helps me feel like I have a way out.'),
  m('r-listened', 'afterReaction', 'growl',
    () => "Thank you for listening instead of telling me off. It helps me trust that I can tell you when I'm worried."),

  // ── After a success ──────────────────────────────────────────────────────
  m('s-chose-you', 'afterSuccess', 'lookAtThat',
    () => 'Did you see that? I saw it — and I chose you!'),
  m('s-worth-it', 'afterSuccess', 'counterConditioning',
    () => 'That was hard for me, and I did it. Treats for brave moments help me remember it was worth it.'),
  m('s-space', 'afterSuccess', 'threshold',
    () => 'Feeling safe is what made it possible. Thank you for giving me the space to choose.'),
  m('s-easier', 'afterSuccess', 'counterConditioning',
    () => 'Every calm moment makes the next one a little easier for me.'),
  m('s-team', 'afterSuccess', 'rewardBond',
    () => "When I looked back at you, I knew you had my back. That's us, being a team."),
  m('s-sniffed', 'afterSuccess', 'sniffing',
    () => 'Sniffing instead of shouting — that was me calming myself down. Pretty clever, right?'),
  m('s-remember', 'afterSuccess', 'slowProgress',
    () => "Remember this one when a hard day comes. This is what we're building, together."),

  // ── The very first logged success ────────────────────────────────────────
  m('f-first', 'firstSuccess', 'lookAtThat',
    () => "Our very first calm moment in the book! I saw something scary and didn't have to shout. I'm so proud of us."),
  m('f-start', 'firstSuccess', 'slowProgress',
    () => 'This is the start of something. One brave moment means there can be more.'),
  m('f-trust', 'firstSuccess', 'rewardBond',
    (n) => `Did you feel that? That was trust. Thank you for believing in me. Love, ${n}.`),

  // ── A big reaction in the last two days ──────────────────────────────────
  m('rec-edge', 'recovery', 'recovery',
    () => 'I might still be a bit on edge from the other day. A short, quiet walk is plenty for me right now.'),
  m('rec-recipe', 'recovery', 'sniffing',
    () => "Sniffy walks somewhere quiet, a puzzle toy, a nap in my favourite spot — that's my recipe for feeling better."),
  m('rec-spot', 'recovery', 'safePlace',
    () => "Let me curl up in my quiet spot for a bit. I'm not sulking — I'm recharging."),
  m('rec-forgive', 'recovery', 'caregiver',
    () => "If you're still thinking about that hard walk, please be gentle with yourself. I'm not holding on to it — there's nothing to forgive."),
  m('rec-naps', 'recovery', 'sleep',
    () => 'Extra naps help me settle and sort through everything. Let me snooze — it is part of getting better.'),

  // ── Several reactions in a few days ──────────────────────────────────────
  m('stk-easy-day', 'stacking', 'stacking',
    () => "It's been a busy few days for me. Could we have an easy day so my cup can empty a bit?"),
  m('stk-quiet-time', 'stacking', 'management',
    () => "I'm a bit tired from all the worrying lately. Maybe we could walk at a quieter time or place for a while?"),
  m('stk-vet', 'stacking', 'pain',
    () => "I've been reacting more than usual these days. If it keeps happening, could we check with the vet that nothing hurts?"),
  m('stk-games', 'stacking', 'enrichment',
    () => "Instead of a big walk, could we play a sniffing game at home? I get to use my brain without all the worry."),
  m('stk-ordinary', 'stacking', 'routine',
    () => 'A calm, ordinary day — same walk, same dinner, same cuddles — helps me feel steady again.'),

  // ── Trend: getting better ────────────────────────────────────────────────
  m('pro-braver', 'progress', 'slowProgress',
    () => "I've been feeling braver lately. Thank you for being so patient with me."),
  m('pro-trust', 'progress', 'rewardBond',
    () => "I'm starting to trust that you'll keep me safe out there. It's making walks easier for me."),
  m('pro-less-scary', 'progress', 'counterConditioning',
    () => "The scary things don't feel quite as scary anymore. All those treats and all that distance are working."),
  m('pro-choosing-you', 'progress', 'lookAtThat',
    () => "I've been choosing you more and more out there. Did you notice? I did it for us."),
  m('pro-you-did-this', 'progress', 'caregiver',
    () => 'All those walks you planned, all the times you turned us around — look where they got us. You did this too.'),

  // ── Trend: a harder stretch ──────────────────────────────────────────────
  m('tough-not-undone', 'toughStretch', 'slowProgress',
    () => "These last weeks have been harder for me. It's not your fault and it's not mine — and it doesn't undo what we've learned."),
  m('tough-vet', 'toughStretch', 'pain',
    () => "When I'm suddenly more on edge than usual, something might be bothering my body. A vet check can rule that out."),
  m('tough-busy', 'toughStretch', 'stacking',
    () => "Maybe life's been a bit busy lately — for both of us. A few calm, easy days could help me find my feet again."),
  m('tough-step-back', 'toughStretch', 'threshold',
    () => 'Could we give me a bit more space for a while? Taking a step back now helps me move forward later.'),
  m('tough-help', 'toughStretch', 'professionalHelp',
    () => "If it feels like too much, it's okay to ask for help. A behaviour vet or a kind trainer can see things we can't."),
  m('tough-love', 'toughStretch', 'caregiver',
    (n) => `I know this stretch is wearing you down. I still love our walks, even the hard ones. Love, ${n}.`),
  m('tough-breathe', 'toughStretch', 'emotionalMirror',
    () => "When you feel worried before our walk, I feel it too. Let's take a slow breath together before we head out."),

  // ── Trend: mixed ─────────────────────────────────────────────────────────
  m('mix-wobbles', 'mixed', 'slowProgress',
    () => "Some walks are wins and some are wobbles. That's what learning looks like for a dog like me."),
  m('mix-see-them', 'mixed', 'lookAtThat',
    () => "Even on wobbly weeks, I'm still making brave choices. Can you spot them in between the hard moments?"),
  m('mix-comfort-zone', 'mixed', 'threshold',
    () => "When things go wrong, it's usually because we got a bit too close. Your notes are showing us where my comfort zone is."),

  // ── Trend: steady ────────────────────────────────────────────────────────
  m('st-steady', 'steady', 'slowProgress',
    () => "Things are steady with me. Steady is good — it means I'm feeling safe enough to keep learning."),
  m('st-familiar', 'steady', 'routine',
    () => 'Our walks feel familiar now. Knowing what to expect helps me stay calm.'),
  m('st-underneath', 'steady', 'counterConditioning',
    () => 'Keep the treats coming when I see things. Little by little, my feelings are changing underneath.'),
  m('st-showing-up', 'steady', 'caregiver',
    () => 'Thank you for showing up for me every day, even when nothing big happens. The quiet days matter too.'),

  // ── Rest day ─────────────────────────────────────────────────────────────
  m('rest-ok', 'restDay', 'enrichment',
    () => "No walk today? That's okay with me. Rest days help me recharge — maybe we can play a sniffing game inside?"),
  m('rest-nap', 'restDay', 'sleep',
    () => 'A lazy day sounds perfect. Napping helps my brain hold on to everything we practised.'),
  m('rest-settle', 'restDay', 'recovery',
    () => "Skipping a walk isn't skipping training. Calm days are what let my body settle."),
];

/** The researched fact behind a message. */
export function factFor(message: DogMessage): WhyFact {
  return whyFact(message.factId);
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function messagesIn(category: VoiceCategory): DogMessage[] {
  return DOG_MESSAGES.filter((msg) => msg.category === category);
}

/** Deterministic pick: the same seed always gives the same message. */
export function pickMessage(category: VoiceCategory, seed: string, offset = 0): DogMessage {
  const pool = messagesIn(category);
  return pool[(hashString(seed) + offset) % pool.length];
}

export interface VoiceInput {
  walks: Walk[];
  markers: Marker[];
  today: DateKey;
  /** True when every walk planned for today has been skipped. */
  restDay?: boolean;
}

export interface HomeContext {
  category: VoiceCategory;
  trend: RecentTrend;
}

/**
 * What the last days and weeks say, most urgent first:
 *  1. a big reaction in the last two days → recovery
 *  2. three or more reactions in three days → stacking
 *  3. the first ever success in the last week → firstSuccess
 *  4. the two-week trend (better / harder / mixed)
 *  5. today's walks skipped → restDay
 *  6. regular logging with no clear change → steady, otherwise general
 */
export function homeContext({ walks, markers, today, restDay }: VoiceInput): HomeContext {
  const trend = recentTrend(walks, markers, today);
  const walkDate = new Map(walks.map((w) => [w.id, w.date]));
  const dated = markers
    .map((mk) => ({ ...mk, date: walkDate.get(mk.walkId) }))
    .filter((mk): mk is Marker & { date: DateKey } => !!mk.date && mk.date <= today);
  const since = (days: number) => addDaysKey(today, -days);
  const ctx = (category: VoiceCategory): HomeContext => ({ category, trend });

  if (dated.some((mk) => mk.kind === 'reactive' && (mk.intensity ?? 0) >= 7 && mk.date >= since(2))) return ctx('recovery');
  if (dated.filter((mk) => mk.kind === 'reactive' && mk.date > since(3)).length >= 3) return ctx('stacking');

  const successes = dated.filter((mk) => mk.kind === 'success');
  if (successes.length > 0 && successes.every((mk) => mk.date > since(7))) return ctx('firstSuccess');

  if (trend.direction === 'improving') return ctx('progress');
  if (trend.direction === 'harder') return ctx('toughStretch');
  if (restDay) return ctx('restDay');
  if (trend.direction === 'mixed') return ctx('mixed');
  if (trend.direction === 'steady') return ctx('steady');
  return ctx('general');
}

/** Which kind of message fits the last few days and weeks. */
export function voiceContext(input: VoiceInput): VoiceCategory {
  return homeContext(input).category;
}

/** The message shown right after logging a moment. */
export function messageForMoment(
  kind: 'reactive' | 'success',
  intensity: number | undefined,
  seed: string,
  opts: { firstSuccess?: boolean } = {},
): DogMessage {
  if (kind === 'success') return pickMessage(opts.firstSuccess ? 'firstSuccess' : 'afterSuccess', seed);
  return pickMessage((intensity ?? 0) >= 7 ? 'afterBigReaction' : 'afterReaction', seed);
}

/**
 * Today's message on the home screen. `offset` lets the user ask for another:
 * it first cycles the contextual pool, then continues with everyday messages.
 */
export function dailyDogMessage(category: VoiceCategory, seed: string, offset = 0): DogMessage {
  const pool = messagesIn(category);
  if (category === 'general' || offset < pool.length) return pickMessage(category, seed, offset);
  return pickMessage('general', seed, offset - pool.length);
}
