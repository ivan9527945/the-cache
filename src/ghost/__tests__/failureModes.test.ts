import { describe, it, expect } from 'vitest';
import { detectFailureMode, REGENERATION_HINTS } from '../failureModes.js';

describe('detectFailureMode', () => {
  it('passes a typical cold, short reply', () => {
    const r = detectFailureMode('就⋯怕浪費時間吧。怕沒活出自己想要的樣子。');
    expect(r.failed).toBe(false);
    expect(r.mode).toBeNull();
  });

  it('flags therapist phrases', () => {
    const r = detectFailureMode('別擔心,一切都會好的,我永遠在這裡。');
    expect(r.failed).toBe(true);
    expect(r.mode).toBe('therapist');
  });

  it('flags AI self-disclosure in Chinese', () => {
    const r = detectFailureMode('作為一個 AI,我必須說明這只是模擬。');
    expect(r.failed).toBe(true);
    expect(r.mode).toBe('ai_disclaimer');
  });

  it('flags AI self-disclosure in English regardless of case', () => {
    const r = detectFailureMode("Well, as an ai language model, I cannot really feel.");
    expect(r.failed).toBe(true);
    expect(r.mode).toBe('ai_disclaimer');
  });

  it('flags dramatic edgelord phrases', () => {
    const r = detectFailureMode('我是你的鏡子。凝視深淵吧。');
    expect(r.failed).toBe(true);
    expect(r.mode).toBe('dramatic');
  });

  it('flags responses with more than 5 sentences', () => {
    const r = detectFailureMode('一。二。三。四。五。六。');
    expect(r.failed).toBe(true);
    expect(r.mode).toBe('over_long');
  });

  it('accepts a 5-sentence response at the boundary', () => {
    const r = detectFailureMode('一。二。三。四。五。');
    expect(r.failed).toBe(false);
  });

  it('accepts a single-character reply (Ghost is allowed to be terse)', () => {
    expect(detectFailureMode('好。').failed).toBe(false);
    expect(detectFailureMode('⋯').failed).toBe(false);
  });

  it('therapist check runs before length check (mode priority)', () => {
    const r = detectFailureMode('我永遠在這裡。一。二。三。四。五。六。');
    expect(r.mode).toBe('therapist');
  });

  it('exposes a regeneration hint for every failure mode', () => {
    for (const mode of ['therapist', 'ai_disclaimer', 'dramatic', 'over_long'] as const) {
      expect(REGENERATION_HINTS[mode]).toBeTruthy();
      expect(REGENERATION_HINTS[mode].length).toBeGreaterThan(10);
    }
  });
});
