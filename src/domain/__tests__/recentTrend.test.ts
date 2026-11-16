import { homeGreeting } from '../encouragement';
import { recentTrend } from '../recentTrend';
import type { Marker, Walk } from '../types';

const today = '2026-11-14';
// Current window: Nov 1–14. Previous window: Oct 18–31.
const walks: Walk[] = [
  { id: 'cur', date: '2026-11-10', time: '08:00', title: 'Walk', createdAt: '' },
  { id: 'prev', date: '2026-10-20', time: '08:00', title: 'Walk', createdAt: '' },
  { id: 'edge', date: '2026-10-31', time: '08:00', title: 'Walk', createdAt: '' },
];
let n = 0;
const r = (walkId: string, intensity: number): Marker => ({ id: `r${n++}`, walkId, triggerId: 't', kind: 'reactive', intensity, createdAt: '' });
const s = (walkId: string): Marker => ({ id: `s${n++}`, walkId, triggerId: 't', kind: 'success', createdAt: '' });
const ctx = { dogName: 'Luna', seed: 'x' };

describe('recent trend', () => {
  it('needs data in both windows to compare', () => {
    expect(recentTrend(walks, [], today).direction).toBe('none');
    expect(recentTrend(walks, [s('cur')], today).direction).toBe('new');
    expect(recentTrend(walks, [r('prev', 5)], today).direction).toBe('none');
  });

  it('puts the window edge in the previous period', () => {
    const t = recentTrend(walks, [r('edge', 5), s('cur')], today);
    expect(t.previous.reactiveCount).toBe(1);
    expect(t.current.successCount).toBe(1);
  });

  it('sees more successes, softer and fewer reactions', () => {
    const markers = [r('prev', 8), r('prev', 8), r('prev', 7), r('prev', 7), r('cur', 4), r('cur', 3), s('cur'), s('cur')];
    const t = recentTrend(walks, markers, today);
    expect(t.direction).toBe('improving');
    expect(t.improving).toEqual(expect.arrayContaining(['moreSuccesses', 'softerReactions', 'fewerReactions']));
    expect(homeGreeting('progress', t, ctx)).toMatch(/2 calm choices in the last two weeks, up from 0/);
  });

  it('ignores a single extra reaction', () => {
    const t = recentTrend(walks, [r('prev', 4), r('prev', 4), r('cur', 4), r('cur', 4), r('cur', 4)], today);
    expect(t.direction).toBe('steady');
  });

  it('notices stronger reactions and words it kindly', () => {
    const t = recentTrend(walks, [r('prev', 3), r('prev', 3), r('cur', 7), r('cur', 8)], today);
    expect(t.direction).toBe('harder');
    expect(t.harder).toEqual(['strongerReactions']);
    const line = homeGreeting('toughStretch', t, ctx);
    expect(line).toMatch(/3\.0 → 7\.5/);
    expect(line).toMatch(/not failure/);
  });

  it('calls it mixed when both happen', () => {
    const markers = [r('prev', 4), r('cur', 4), r('cur', 4), r('cur', 4), s('cur'), s('cur')];
    const t = recentTrend(walks, markers, today);
    expect(t.direction).toBe('mixed');
    expect(homeGreeting('mixed', t, ctx)).toMatch(/2 calm choices/);
  });
});
