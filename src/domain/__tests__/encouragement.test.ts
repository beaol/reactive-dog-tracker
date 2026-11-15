import { dailyGreeting, insightsFor, messageAfterReaction } from '../encouragement';
import type { PeriodSummary } from '../stats';

const summary = (p: Partial<PeriodSummary>): PeriodSummary => ({
  reactiveCount: 0,
  reactiveWalks: 0,
  intensitySum: 0,
  meanIntensity: null,
  successCount: 0,
  successShare: null,
  ...p,
});

const ctx = { dogName: 'Luna', seed: 'x' };

describe('encouragement', () => {
  it('is deterministic per seed', () => {
    expect(dailyGreeting(ctx)).toBe(dailyGreeting(ctx));
    expect(messageAfterReaction(9, ctx)).toBe(messageAfterReaction(9, ctx));
  });

  it('celebrates softer reactions and more successes', () => {
    const out = insightsFor(
      {
        current: summary({ reactiveCount: 3, meanIntensity: 3, successCount: 6, successShare: 0.66 }),
        previous: summary({ reactiveCount: 6, meanIntensity: 6, successCount: 2, successShare: 0.25 }),
      },
      'month',
      ctx,
    );
    expect(out.every((i) => i.tone === 'celebrate')).toBe(true);
    expect(out[0].text).toMatch(/4 more success moments/);
  });

  it('never claims improvement over an empty previous period', () => {
    const out = insightsFor({ current: summary({ successCount: 5, reactiveCount: 2 }), previous: summary({}) }, 'year', ctx);
    expect(out.map((i) => i.text).join(' ')).not.toMatch(/more|fewer|up from/);
  });

  it('reframes a harder period supportively', () => {
    const out = insightsFor(
      { current: summary({ reactiveCount: 4, meanIntensity: 7 }), previous: summary({ reactiveCount: 4, meanIntensity: 4 }) },
      'week',
      ctx,
    );
    expect(out.some((i) => i.tone === 'support')).toBe(true);
  });
});
