import { addDaysKey } from './dates';
import type { DateKey, Marker, Walk } from './types';

/**
 * Messages *from the dog* to their person.
 *
 * Every message is written in the dog's voice and paired with a short,
 * plain-language `why` grounded in current force-free behaviour science, so
 * the app never says something comforting that isn't true. Core ideas used:
 *
 *  - Reactivity is an emotional response (fear, frustration, overwhelm), not
 *    disobedience or "dominance".
 *  - Learning happens below threshold; distance and management come first.
 *  - Counter-conditioning and rewarding disengagement change the emotion.
 *  - Punishing warnings (growls) suppresses signals, not the fear.
 *  - Stress stacks up and takes time to settle; rest, sniffing and
 *    enrichment help recovery.
 *  - Pain can drive reactivity; qualified professionals can help.
 */

export type VoiceCategory =
  | 'general'
  | 'afterBigReaction'
  | 'afterReaction'
  | 'afterSuccess'
  | 'recovery'
  | 'stacking'
  | 'progress'
  | 'restDay';

export interface DogMessage {
  id: string;
  category: VoiceCategory;
  text: (dogName: string) => string;
  /** The behavioural reason the message is true. */
  why: string;
}

const m = (id: string, category: VoiceCategory, text: DogMessage['text'], why: string): DogMessage => ({
  id,
  category,
  text,
  why,
});

export const DOG_MESSAGES: DogMessage[] = [
  // ── Why I react & how to help (everyday) ────────────────────────────────
  m('g-not-bad', 'general',
    () => "When I bark at things, I'm not being bad. I'm worried or overwhelmed, and barking is how I say \"please don't come closer\".",
    'Most leash reactivity is driven by fear, frustration or both. It is an emotional response, not disobedience.'),
  m('g-distance', 'general',
    () => 'Distance is my favourite thing. When we cross the street or turn around, I feel safe enough to think again.',
    'Keeping a dog "under threshold" — far enough away that they can still notice, think and take food — is the foundation of reactivity training.'),
  m('g-treat-test', 'general',
    () => "If I can still take a treat, I'm coping. If I can't, we're too close — let's move away together.",
    'Refusing food is a common sign a dog is over threshold. At that point learning stops and the priority is adding distance.'),
  m('g-cc', 'general',
    () => 'Every time I see something scary and then something yummy happens, my brain learns that scary things mean good things are coming.',
    'Counter-conditioning — pairing a trigger with something the dog loves, at a comfortable distance — gradually changes how the dog feels about it.'),
  m('g-look-back', 'general',
    () => "When I look at a trigger and then look back at you, that's me trying really hard. A treat for that makes me want to do it again.",
    'Rewarding a dog for noticing a trigger and then disengaging (the "engage–disengage" or "Look at That" approach) builds the calm choice you want.'),
  m('g-growl', 'general',
    () => "Please don't be cross when I growl. My growl is a warning — it's me telling you I'm uncomfortable before things get worse.",
    'Punishing growling can suppress the warning without changing the fear underneath, which can make a dog less predictable.'),
  m('g-not-boss', 'general',
    () => "I'm not trying to be the boss. I'm just trying to feel safe.",
    'Behaviour science does not support "dominance" explanations for reactivity; fear and frustration are the usual drivers.'),
  m('g-sniff', 'general',
    () => 'Sniffing is how I read the news. A slow, sniffy walk helps my busy brain settle down.',
    'Sniffing is a natural, self-calming behaviour. Sniff-focused walks and scent games are widely used to help stressed dogs relax.'),
  m('g-sleep', 'general',
    (n) => `I need a lot of sleep — more than you might think. A well-rested ${n} copes much better on walks.`,
    'Adult dogs commonly sleep 12 hours or more a day. Under-rested dogs have less capacity to cope with stress.'),
  m('g-stacking', 'general',
    () => 'Little things add up for me. A noisy morning, the doorbell, then a dog on our walk — by then my cup is already full.',
    'This is called trigger stacking: stressors accumulate, so a dog may react strongly to something they would normally cope with.'),
  m('g-routine', 'general',
    () => 'Routines make the world feel safer to me. I like knowing what comes next.',
    'Predictability lowers stress for anxious dogs, and a regular route lets you plan around known triggers.'),
  m('g-pain', 'general',
    () => "If I suddenly react more than usual, I might not be feeling well in my body. A vet check-up can help find out.",
    'Pain and medical problems are a well-documented cause of increased irritability and reactivity in dogs.'),
  m('g-management', 'general',
    () => "You don't have to walk me past every trigger to help me. Avoiding the really hard stuff while I learn is part of the plan.",
    'Management — avoiding situations that overwhelm the dog — prevents reactions being rehearsed while training builds new skills.'),
  m('g-breathe', 'general',
    () => 'I watch you more than you know. When you take a slow breath and soften the leash, I notice.',
    "Dogs are very sensitive to human body language. A calm handler and a loose leash can help the dog's stress at a tense moment."),
  m('g-arc', 'general',
    () => 'Walking in a curve around someone feels much politer to me than heading straight at them.',
    'In dog body language, head-on approaches can feel confrontational; arcs and extra space are less stressful.'),
  m('g-signals', 'general',
    () => "Watch for my small signs — lip licks, yawns, turning my head away, a stiff body. They're how I say \"I'm getting worried\" before I bark.",
    'Subtle stress signals usually come before a reaction. Spotting them early lets you add distance before the dog goes over threshold.'),
  m('g-enrichment', 'general',
    () => 'Games at home — finding treats, puzzle toys, a good chew — help me feel calm and confident.',
    'Enrichment such as scent games and chewing gives dogs healthy outlets and can lower overall stress.'),
  m('g-uturn', 'general',
    () => 'Practising our "let\'s go!" U-turn at home makes it easy for me to follow you when we need a quick exit outside.',
    'Cues rehearsed in calm settings are much more reliable under stress than cues taught in the moment.'),
  m('g-help', 'general',
    () => 'There are people who specialise in dogs like me. Asking a force-free trainer or a behaviour vet for help is kind, not a failure.',
    'Qualified force-free trainers and veterinary behaviourists can tailor a plan; some dogs also benefit from medication alongside training.'),
  m('g-nonlinear', 'general',
    () => "Some days I just can't. That doesn't mean we're back at the start.",
    'Behaviour change is not linear. Setbacks are normal and do not erase what the dog has learned.'),
  m('g-team', 'general',
    (n) => `You're my favourite person to be brave with. Love, ${n}.`,
    'A trusted, predictable handler is one of the biggest sources of safety for an anxious dog.'),

  // ── Just after a big reaction (7–10) ─────────────────────────────────────
  m('b-scary', 'afterBigReaction',
    () => "That was really scary for me. Thank you for getting me out of there. I'm not upset with you — I hope you're not upset with me.",
    'Big reactions are fear or overwhelm in action. Calmly creating distance is the best help in the moment.'),
  m('b-buzzing', 'afterBigReaction',
    () => "My body is still buzzing. A quiet day tomorrow — sniffing, chewing, napping — would really help me reset.",
    'Stress hormones can stay raised for a day or more after a big scare. Low-key "decompression" time helps dogs recover.'),
  m('b-couldnt-hear', 'afterBigReaction',
    () => "When I was that upset I couldn't hear you. I wasn't ignoring you — my thinking brain had switched off.",
    'Over threshold, a dog is in a fight-or-flight state where cues and treats stop working. It is not stubbornness.'),
  m('b-home', 'afterBigReaction',
    () => "Neither of us planned that. Let's just go home and be cosy together.",
    'In the moment the goal is safety, not training — learning happens later, when the dog is calm.'),

  // ── After a smaller reaction (1–6) ───────────────────────────────────────
  m('r-came-back', 'afterReaction',
    () => 'That was hard, but I came back to you. That counts.',
    'How quickly a dog recovers after a reaction is one of the clearest signs of progress.'),
  m('r-space', 'afterReaction',
    () => 'Thank you for noticing. A little more space next time might help me stay calm.',
    'Distance is the most effective tool for keeping a dog under threshold.'),
  m('r-learning', 'afterReaction',
    () => "I was worried, so I said it out loud. You're learning what makes me nervous — that's how we get better.",
    'Tracking triggers and intensity helps you choose routes and distances where your dog can succeed.'),
  m('r-stiff', 'afterReaction',
    () => 'Even when I only go stiff and quiet, it means I feel uneasy. Thank you for seeing it.',
    'Freezing, staring and a stiff body are early stress signals; responding to them prevents bigger reactions.'),

  // ── After a success ──────────────────────────────────────────────────────
  m('s-chose-you', 'afterSuccess',
    () => 'Did you see that? I saw it — and I chose you!',
    'Each time a dog notices a trigger and disengages, and is rewarded for it, that calm choice becomes more likely.'),
  m('s-worth-it', 'afterSuccess',
    () => 'That was hard for me, and I did it. Treats for brave moments help me remember it was worth it.',
    'Behaviours that are reinforced happen more often — and pairing triggers with good things changes how they feel.'),
  m('s-space', 'afterSuccess',
    () => 'Feeling safe is what made it possible. Thank you for giving me the space to choose.',
    'Success happens below threshold; the right distance lets a dog think instead of react.'),
  m('s-easier', 'afterSuccess',
    () => 'Every calm moment makes the next one a little easier for me.',
    'Repeated positive experiences with a trigger gradually build new emotional associations.'),

  // ── Context from recent days ─────────────────────────────────────────────
  m('rec-edge', 'recovery',
    () => 'I might still be a bit on edge from the other day. A short, quiet walk is plenty for me right now.',
    'Stress can take a day or more to settle after a big reaction; easier walks during recovery prevent trigger stacking.'),
  m('rec-recipe', 'recovery',
    () => "Sniffy walks somewhere quiet, a lick mat, a nap in my favourite spot — that's my recipe for feeling better.",
    'Calm, self-paced activities like sniffing and licking help dogs settle after stress.'),
  m('stk-easy-day', 'stacking',
    () => "It's been a busy few days for me. Could we have an easy day so my cup can empty a bit?",
    'Several reactions close together are a sign of trigger stacking; a lower-stress day or two can bring overall arousal down.'),
  m('stk-quiet-time', 'stacking',
    () => "I'm a bit tired from all the worrying lately. Maybe we could walk at a quieter time or place for a while?",
    'Choosing quieter routes and times is a simple, effective way to reduce exposure while a dog recovers.'),
  m('pro-braver', 'progress',
    () => "I've been feeling braver lately. Thank you for being so patient with me.",
    'More calm choices around triggers is exactly what progress looks like — often before reactions disappear completely.'),
  m('pro-trust', 'progress',
    () => "I'm starting to trust that you'll keep me safe out there. It's making walks easier for me.",
    "Consistent, predictable handling builds the dog's confidence that they don't have to defend themselves."),
  m('rest-ok', 'restDay',
    () => "No walk today? That's okay with me. Rest days help me recharge — maybe we can play a sniffing game inside?",
    'Skipping walks occasionally is fine for reactive dogs, especially when replaced with enrichment at home.'),
];

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

/**
 * Which kind of message fits the last few days. Recovery from a big reaction
 * comes first, then a run of reactions (stacking), then progress worth
 * noticing, then rest days; otherwise an everyday message.
 */
export function voiceContext({ walks, markers, today, restDay }: VoiceInput): VoiceCategory {
  const walkDate = new Map(walks.map((w) => [w.id, w.date]));
  const dated = markers
    .map((mk) => ({ ...mk, date: walkDate.get(mk.walkId) }))
    .filter((mk): mk is Marker & { date: DateKey } => !!mk.date && mk.date <= today);
  const since = (days: number) => addDaysKey(today, -days);

  const bigRecently = dated.some((mk) => mk.kind === 'reactive' && (mk.intensity ?? 0) >= 7 && mk.date >= since(2));
  if (bigRecently) return 'recovery';

  const reactionsLast3 = dated.filter((mk) => mk.kind === 'reactive' && mk.date > since(3)).length;
  if (reactionsLast3 >= 3) return 'stacking';

  const successThisWeek = dated.filter((mk) => mk.kind === 'success' && mk.date > since(7)).length;
  const successPrevWeek = dated.filter((mk) => mk.kind === 'success' && mk.date > since(14) && mk.date <= since(7)).length;
  if (successThisWeek >= 2 && successThisWeek > successPrevWeek) return 'progress';

  if (restDay) return 'restDay';
  return 'general';
}

/** The message shown right after logging a moment. */
export function messageForMoment(kind: 'reactive' | 'success', intensity: number | undefined, seed: string): DogMessage {
  if (kind === 'success') return pickMessage('afterSuccess', seed);
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
