/**
 * "Why" facts: what a reactive dog feels, and what helps them feel safer.
 *
 * Every message the dog "says" in the app points to one of these facts, so a
 * kind word is always also a true one. Each fact is a short, plain-language
 * summary of guidance from veterinary behaviour organisations, animal-welfare
 * charities or peer-reviewed research, and lists where it comes from.
 *
 * Sources were checked in November 2026. Study links use DOIs, so they keep
 * working when publishers move pages. Wording is deliberately careful: where
 * evidence is preliminary (small studies, correlations) the fact says so
 * rather than over-claiming.
 */

export interface WhySource {
  /** Organisation or authors. */
  by: string;
  title: string;
  /** Publication year, when the source states one. */
  year?: number;
  url: string;
}

export type WhyFactId =
  | 'emotion'
  | 'leash'
  | 'notAggressive'
  | 'notYourFault'
  | 'threshold'
  | 'treatTest'
  | 'counterConditioning'
  | 'lookAtThat'
  | 'management'
  | 'aversives'
  | 'growl'
  | 'dominance'
  | 'bodyLanguage'
  | 'stacking'
  | 'recovery'
  | 'pain'
  | 'sniffing'
  | 'sleep'
  | 'routine'
  | 'safePlace'
  | 'enrichment'
  | 'emotionalMirror'
  | 'rewardBond'
  | 'slowProgress'
  | 'professionalHelp'
  | 'caregiver';

export interface WhyFact {
  id: WhyFactId;
  /** A few words, used as a heading. */
  topic: string;
  /** The fact itself, in plain language. */
  fact: string;
  sources: WhySource[];
}

// ── Sources ─────────────────────────────────────────────────────────────────

const S = {
  aspca: {
    by: 'ASPCA',
    title: 'Managing and Training Leash-Reactive Dogs',
    url: 'https://www.aspcapro.org/node/103137',
  },
  bestFriends: {
    by: 'Best Friends Animal Society',
    title: 'Dealing with Leash Reactivity',
    url: 'https://bestfriends.org/node/616589',
  },
  dogsTrustStress: {
    by: 'Dogs Trust',
    title: 'Why dogs get scared or frustrated and how to help them',
    url: 'https://www.dogstrust.org.uk/help-advice/behaviour/signs-your-dog-may-be-stressed',
  },
  dogsTrustStacking: {
    by: 'Dogs Trust',
    title: 'Situation stacking',
    url: 'https://www.dogstrust.org.uk/how-we-help/professionals/vet-clinics/situation-stacking',
  },
  vcaDsCc: {
    by: 'VCA Animal Hospitals',
    title: 'Introduction to Desensitization and Counterconditioning',
    url: 'https://vcahospitals.com/know-your-pet/introduction-to-desensitization-and-counterconditioning',
  },
  merck: {
    by: 'Merck Veterinary Manual',
    title: 'Treatment of Behavior Problems in Animals',
    url: 'https://www.merckvetmanual.com/behavior/behavioral-medicine-introduction/treatment-of-behavior-problems-in-animals',
  },
  avsabTraining: {
    by: 'American Veterinary Society of Animal Behavior (AVSAB)',
    title: 'Humane Dog Training Position Statement',
    year: 2021,
    url: 'https://avsab.org/wp-content/uploads/2021/08/AVSAB-Humane-Dog-Training-Position-Statement-2021.pdf',
  },
  avsabPunishment: {
    by: 'American Veterinary Society of Animal Behavior (AVSAB)',
    title: 'Position Statement on the Use of Punishment for Behavior Modification in Animals',
    year: 2007,
    url: 'https://indoorpet.osu.edu/sites/default/files/imce/Punishment_Position_Statement-download_-_10-6-14.pdf',
  },
  avsabDominance: {
    by: 'American Veterinary Society of Animal Behavior (AVSAB)',
    title: 'Position Statement on the Use of Dominance Theory in Behavior Modification of Animals',
    year: 2008,
    url: 'https://avsab.org/wp-content/uploads/2018/03/Dominance_Position_Statement_download-10-3-14.pdf',
  },
  vieiraDeCastro: {
    by: 'Vieira de Castro et al., PLOS ONE',
    title: 'Does training method matter? Evidence for the negative impact of aversive-based methods on companion dog welfare',
    year: 2020,
    url: 'https://doi.org/10.1371/journal.pone.0225023',
  },
  herron: {
    by: 'Herron, Shofer & Reisner, Applied Animal Behaviour Science',
    title: 'Survey of the use and outcome of confrontational and non-confrontational training methods in client-owned dogs showing undesired behaviors',
    year: 2009,
    url: 'https://doi.org/10.1016/j.applanim.2008.12.011',
  },
  mills: {
    by: 'Mills et al., Animals',
    title: 'Pain and Problem Behavior in Cats and Dogs',
    year: 2020,
    url: 'https://doi.org/10.3390/ani10020318',
  },
  duranton: {
    by: 'Duranton & Horowitz, Applied Animal Behaviour Science',
    title: 'Let me sniff! Nosework induces positive judgment bias in pet dogs',
    year: 2019,
    url: 'https://doi.org/10.1016/j.applanim.2018.12.009',
  },
  kis: {
    by: 'Kis et al., Scientific Reports',
    title: 'The interrelated effect of sleep and learning in dogs: an EEG and behavioural study',
    year: 2017,
    url: 'https://doi.org/10.1038/srep41873',
  },
  sundman: {
    by: 'Sundman et al., Scientific Reports',
    title: 'Long-term stress levels are synchronized in dogs and their owners',
    year: 2019,
    url: 'https://doi.org/10.1038/s41598-019-43851-x',
  },
  albuquerque: {
    by: 'Albuquerque et al., Biology Letters',
    title: 'Dogs recognize dog and human emotions',
    year: 2016,
    url: 'https://doi.org/10.1098/rsbl.2015.0883',
  },
  salonen: {
    by: 'Salonen et al., Scientific Reports',
    title: 'Prevalence, comorbidity, and breed differences in canine anxiety in 13,700 Finnish pet dogs',
    year: 2020,
    url: 'https://doi.org/10.1038/s41598-020-59837-z',
  },
  deldalle: {
    by: 'Deldalle & Gaunet, Journal of Veterinary Behavior',
    title: 'Effects of 2 training methods on stress-related behaviors of the dog and on the dog–owner relationship',
    year: 2014,
    url: 'https://doi.org/10.1016/j.jveb.2013.11.004',
  },
  buller: {
    by: 'Buller & Ballantyne, Journal of Veterinary Behavior',
    title: "Living with and loving a pet with behavioral problems: Pet owners' experiences",
    year: 2020,
    url: 'https://doi.org/10.1016/j.jveb.2020.04.003',
  },
} satisfies Record<string, WhySource>;

// ── Facts ───────────────────────────────────────────────────────────────────

export const WHY_FACTS: Record<WhyFactId, WhyFact> = {
  emotion: {
    id: 'emotion',
    topic: 'Reactivity is a feeling',
    fact:
      'Leash reactivity is usually driven by fear, frustration or both. Barking and lunging are attempts to make a worrying thing go away, or a reaction to being held back. It is an emotional response, not disobedience.',
    sources: [S.bestFriends, S.aspca, S.dogsTrustStress],
  },
  leash: {
    id: 'leash',
    topic: 'The leash takes away escape',
    fact:
      'On a leash a worried dog cannot move away, and head-on meetings with tight leashes are tense for dogs. Curving around others and giving extra space removes much of that pressure.',
    sources: [S.bestFriends, S.aspca],
  },
  notAggressive: {
    id: 'notAggressive',
    topic: 'Reactive is not the same as aggressive',
    fact:
      'Reacting on the leash does not mean a dog is aggressive towards people or other dogs. Many reactive dogs behave very differently when they are not restrained.',
    sources: [S.bestFriends],
  },
  notYourFault: {
    id: 'notYourFault',
    topic: "It's nobody's fault",
    fact:
      'Fear is common in dogs. In a study of 13,700 pet dogs, 29% showed fearfulness and 17% were afraid of other dogs, with large differences between breeds that point to a strong genetic part. Genes, early experiences, past scares and health all play a role.',
    sources: [S.salonen, S.dogsTrustStress],
  },
  threshold: {
    id: 'threshold',
    topic: 'Distance makes learning possible',
    fact:
      'Dogs learn best "under threshold": far enough from a trigger that they can notice it without reacting. Pushing closer while a dog is uncomfortable can make future reactions worse (sensitisation), so distance comes first.',
    sources: [S.aspca, S.vcaDsCc, S.bestFriends],
  },
  treatTest: {
    id: 'treatTest',
    topic: 'Treats as a stress gauge',
    fact:
      'A dog that stops taking treats, or snatches them roughly, is usually too stressed to learn. That is the sign to add distance or end the session.',
    sources: [S.vcaDsCc, S.aspca, S.dogsTrustStress],
  },
  counterConditioning: {
    id: 'counterConditioning',
    topic: 'Changing how triggers feel',
    fact:
      'Desensitisation and counter-conditioning — showing the trigger at a comfortable distance and pairing it with something the dog loves — gradually change how the dog feels about it. Most dogs need many sessions over days or weeks.',
    sources: [S.vcaDsCc, S.aspca, S.avsabTraining],
  },
  lookAtThat: {
    id: 'lookAtThat',
    topic: 'Rewarding the look back',
    fact:
      'Games like "Look at That" reward a dog for calmly looking at a trigger and then looking back at their person. Repeated and rewarded, that calm choice becomes more likely.',
    sources: [S.bestFriends],
  },
  management: {
    id: 'management',
    topic: 'Avoiding triggers is part of the plan',
    fact:
      'Avoiding situations that overwhelm your dog is a perfectly reasonable way to cope with leash reactivity: walk at quieter times or places, cross the street, use U-turns. It prevents reactions being rehearsed while training builds new skills.',
    sources: [S.aspca, S.bestFriends],
  },
  aversives: {
    id: 'aversives',
    topic: 'Fear-based methods make it worse',
    fact:
      'Dogs trained with aversive methods show more stress behaviours, larger cortisol rises and a more "pessimistic" outlook. In one survey, confrontational techniques triggered an aggressive response in a quarter or more of dogs. Veterinary behaviourists recommend reward-based methods only.',
    sources: [S.vieiraDeCastro, S.herron, S.avsabTraining],
  },
  growl: {
    id: 'growl',
    topic: 'A growl is a warning',
    fact:
      'Punishing growls and other warnings can suppress the signal without changing the fear underneath. A dog whose warnings were punished may later react with fewer warnings or none, which is more dangerous.',
    sources: [S.avsabPunishment, S.dogsTrustStress],
  },
  dominance: {
    id: 'dominance',
    topic: 'Not about dominance',
    fact:
      'Veterinary behaviour experts do not support "dominance" as an explanation for behaviour problems. Fear and anxiety are common causes, and the recommended approach addresses the underlying emotion with rewards, desensitisation and counter-conditioning.',
    sources: [S.avsabDominance],
  },
  bodyLanguage: {
    id: 'bodyLanguage',
    topic: 'Small signals come first',
    fact:
      'Before barking or lunging, dogs usually show subtle signs of stress: turning away, lip-licking, yawning when not tired, ears back, freezing, or going unusually quiet. Spotting these early lets you add distance in time.',
    sources: [S.dogsTrustStress],
  },
  stacking: {
    id: 'stacking',
    topic: 'Stress stacks up',
    fact:
      'When stressful moments come in quick succession, a dog has no time to return to baseline in between, and arousal builds. That is why a reaction can seem to come out of nowhere after a busy day ("trigger stacking").',
    sources: [S.dogsTrustStacking, S.dogsTrustStress, S.bestFriends],
  },
  recovery: {
    id: 'recovery',
    topic: 'Time to recover',
    fact:
      'Dogs\' bodies respond physically to emotional experiences. After a stressful event, quiet time to rest lets them settle before the next challenge; easier days afterwards help prevent stacking.',
    sources: [S.dogsTrustStress, S.dogsTrustStacking],
  },
  pain: {
    id: 'pain',
    topic: 'Pain can drive reactivity',
    fact:
      'In behaviour referral cases, roughly a third — and in some caseloads nearly 80% — of dogs had a painful condition contributing to the problem. Sudden changes in behaviour are worth a vet check.',
    sources: [S.mills, S.dogsTrustStress],
  },
  sniffing: {
    id: 'sniffing',
    topic: 'Sniffing is good for the mind',
    fact:
      'In a small study, dogs who did nosework (searching with their nose) became more "optimistic" than dogs who did heelwork, suggesting sniffing activities can improve wellbeing.',
    sources: [S.duranton],
  },
  sleep: {
    id: 'sleep',
    topic: 'Sleep helps learning',
    fact:
      "Dogs need plenty of rest. In an EEG study, dogs' sleep after a training session was linked to how well they remembered what they had learned, and calm, non-interfering activity after learning supported recall.",
    sources: [S.kis],
  },
  routine: {
    id: 'routine',
    topic: 'Predictability feels safe',
    fact:
      'Irregular routines, limited choices and frequent scary experiences increase anxiety and frustration. A predictable daily rhythm of walks, play, training and rest helps a dog know what to expect.',
    sources: [S.dogsTrustStress],
  },
  safePlace: {
    id: 'safePlace',
    topic: 'A safe place at home',
    fact:
      'A quiet den or resting spot where the dog is not disturbed, and the freedom not to interact when they do not want to, help worried dogs feel in control and recover.',
    sources: [S.dogsTrustStress],
  },
  enrichment: {
    id: 'enrichment',
    topic: 'A full, enriched life',
    fact:
      'Boredom adds to anxiety and frustration. A physically and mentally enriching life — games, food puzzles, scent work, appropriate outlets — can help calm reactivity overall.',
    sources: [S.bestFriends, S.dogsTrustStress],
  },
  emotionalMirror: {
    id: 'emotionalMirror',
    topic: 'Dogs read us closely',
    fact:
      "Dogs recognise human emotions from faces and voices, and owners' long-term stress levels have been found to match their dogs'. The link is a correlation, not blame — but it means looking after yourself helps your dog too.",
    sources: [S.albuquerque, S.sundman],
  },
  rewardBond: {
    id: 'rewardBond',
    topic: 'Rewards build trust',
    fact:
      'Dogs trained with positive reinforcement showed fewer stress behaviours and looked at their owners more often than dogs trained with corrections. Reward-based training supports the relationship as well as the behaviour.',
    sources: [S.deldalle, S.avsabTraining],
  },
  slowProgress: {
    id: 'slowProgress',
    topic: 'Progress is gradual',
    fact:
      'Behaviour change is generally slow and gradual, and moving too quickly sabotages it. Setbacks, especially in unusual situations, are normal and do not erase what a dog has learned; small steps count as progress.',
    sources: [S.merck, S.bestFriends],
  },
  professionalHelp: {
    id: 'professionalHelp',
    topic: 'Help is available',
    fact:
      'Veterinarians, veterinary behaviourists and qualified reward-based trainers can build a plan for your dog. When fear is frequent, medication can help restore a more stable emotional state and make training more effective.',
    sources: [S.merck, S.vcaDsCc],
  },
  caregiver: {
    id: 'caregiver',
    topic: "You're not alone",
    fact:
      'Owners of dogs with behaviour problems commonly experience caregiver burden: worry, frustration and feeling misunderstood by others, while still deeply loving their dog. These feelings are normal, and support helps.',
    sources: [S.buller],
  },
};

export function whyFact(id: WhyFactId): WhyFact {
  return WHY_FACTS[id];
}
