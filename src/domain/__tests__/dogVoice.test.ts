import {
  DOG_MESSAGES,
  factFor,
  homeContext,
  messageForMoment,
  messagesIn,
  pickMessage,
  VOICE_CATEGORIES,
  voiceContext,
} from '../dogVoice';
import type { Marker, Walk } from '../types';
import { WHY_FACTS } from '../whyFacts';

const walk = (id: string, date: string): Walk => ({ id, date, time: '08:00', title: 'Walk', createdAt: '' });
let n = 0;
const reactive = (walkId: string, intensity: number): Marker => ({
  id: `r${n++}`, walkId, triggerId: 't', kind: 'reactive', intensity, createdAt: '',
});
const success = (walkId: string): Marker => ({ id: `s${n++}`, walkId, triggerId: 't', kind: 'success', createdAt: '' });

const today = '2026-11-14';

describe('why facts', () => {
  it('every fact is sourced and has at least one message from the dog', () => {
    for (const fact of Object.values(WHY_FACTS)) {
      expect(fact.fact.length).toBeGreaterThan(60);
      expect(fact.sources.length).toBeGreaterThan(0);
      for (const s of fact.sources) expect(s.url).toMatch(/^https:\/\//);
      expect(DOG_MESSAGES.some((msg) => msg.factId === fact.id)).toBe(true);
    }
  });

  it('every message points to an existing fact', () => {
    for (const msg of DOG_MESSAGES) expect(factFor(msg)).toBe(WHY_FACTS[msg.factId]);
  });
});

describe('dog voice', () => {
  it('has unique ids and real sentences', () => {
    const ids = new Set(DOG_MESSAGES.map((x) => x.id));
    expect(ids.size).toBe(DOG_MESSAGES.length);
    for (const msg of DOG_MESSAGES) expect(msg.text('Luna').length).toBeGreaterThan(20);
  });

  it('never blames the dog or the person', () => {
    for (const msg of DOG_MESSAGES) {
      const text = msg.text('Luna').replace(/not your fault/gi, '');
      expect(text).not.toMatch(/\b(naughty|stubborn|dominant|your fault|should have)\b/i);
    }
  });

  it('has messages for every category', () => {
    for (const c of VOICE_CATEGORIES) expect(messagesIn(c).length).toBeGreaterThan(0);
  });

  it('is deterministic per seed', () => {
    expect(pickMessage('general', 'a').id).toBe(pickMessage('general', 'a').id);
    expect(pickMessage('general', 'a', 1).id).not.toBe(pickMessage('general', 'a').id);
  });

  it('suggests recovery after a big reaction yesterday', () => {
    expect(voiceContext({ walks: [walk('w', '2026-11-13')], markers: [reactive('w', 8)], today })).toBe('recovery');
  });

  it('detects trigger stacking from several recent reactions', () => {
    const walks = [walk('a', '2026-11-12'), walk('b', '2026-11-13'), walk('c', '2026-11-14')];
    const markers = [reactive('a', 3), reactive('b', 4), reactive('c', 2)];
    expect(voiceContext({ walks, markers, today })).toBe('stacking');
  });

  it('celebrates the very first success', () => {
    const walks = [walk('a', '2026-11-12'), walk('old', '2026-10-01')];
    expect(voiceContext({ walks, markers: [success('a'), reactive('old', 5)], today })).toBe('firstSuccess');
  });

  it('follows the two-week trend', () => {
    const walks = [walk('prev', '2026-10-25'), walk('cur', '2026-11-08'), walk('old', '2026-09-01')];
    const base = [success('old')];
    const improving = [...base, reactive('prev', 6), reactive('prev', 6), reactive('prev', 6), success('cur'), success('cur'), success('cur')];
    expect(voiceContext({ walks, markers: improving, today })).toBe('progress');

    const harder = [...base, reactive('prev', 3), reactive('cur', 6), reactive('cur', 6), reactive('cur', 6)];
    const ctx = homeContext({ walks, markers: harder, today });
    expect(ctx.category).toBe('toughStretch');
    expect(ctx.trend.harder).toEqual(['moreReactions']);

    const steady = [...base, reactive('prev', 4), success('prev'), reactive('cur', 4), success('cur')];
    expect(voiceContext({ walks, markers: steady, today })).toBe('steady');
  });

  it('falls back to rest-day and everyday messages', () => {
    expect(voiceContext({ walks: [], markers: [], today, restDay: true })).toBe('restDay');
    expect(voiceContext({ walks: [], markers: [], today })).toBe('general');
  });

  it('picks the moment message by kind and intensity', () => {
    expect(messageForMoment('reactive', 9, 'x').category).toBe('afterBigReaction');
    expect(messageForMoment('reactive', 3, 'x').category).toBe('afterReaction');
    expect(messageForMoment('success', undefined, 'x').category).toBe('afterSuccess');
    expect(messageForMoment('success', undefined, 'x', { firstSuccess: true }).category).toBe('firstSuccess');
  });
});
