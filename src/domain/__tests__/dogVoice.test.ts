import { DOG_MESSAGES, messageForMoment, messagesIn, pickMessage, voiceContext } from '../dogVoice';
import type { Marker, Walk } from '../types';

const walk = (id: string, date: string): Walk => ({ id, date, time: '08:00', title: 'Walk', createdAt: '' });
const reactive = (walkId: string, intensity: number): Marker => ({
  id: `r${walkId}${intensity}`, walkId, triggerId: 't', kind: 'reactive', intensity, createdAt: '',
});
const success = (id: string, walkId: string): Marker => ({ id, walkId, triggerId: 't', kind: 'success', createdAt: '' });

const today = '2026-11-14';

describe('dog voice', () => {
  it('every message has a grounded explanation and unique id', () => {
    const ids = new Set(DOG_MESSAGES.map((x) => x.id));
    expect(ids.size).toBe(DOG_MESSAGES.length);
    for (const msg of DOG_MESSAGES) {
      expect(msg.why.length).toBeGreaterThan(30);
      expect(msg.text('Luna').length).toBeGreaterThan(20);
    }
  });

  it('has messages for every category', () => {
    for (const c of ['general', 'afterBigReaction', 'afterReaction', 'afterSuccess', 'recovery', 'stacking', 'progress', 'restDay'] as const) {
      expect(messagesIn(c).length).toBeGreaterThan(0);
    }
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

  it('notices progress when successes rise', () => {
    const walks = [walk('a', '2026-11-12'), walk('b', '2026-11-13')];
    expect(voiceContext({ walks, markers: [success('s1', 'a'), success('s2', 'b')], today })).toBe('progress');
  });

  it('falls back to rest-day and everyday messages', () => {
    expect(voiceContext({ walks: [], markers: [], today, restDay: true })).toBe('restDay');
    expect(voiceContext({ walks: [], markers: [], today })).toBe('general');
  });

  it('picks the moment message by kind and intensity', () => {
    expect(messageForMoment('reactive', 9, 'x').category).toBe('afterBigReaction');
    expect(messageForMoment('reactive', 3, 'x').category).toBe('afterReaction');
    expect(messageForMoment('success', undefined, 'x').category).toBe('afterSuccess');
  });
});
