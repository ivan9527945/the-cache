import { describe, it, expect } from 'vitest';
import { playSequence, sleep } from '../player.js';
import type { Renderer, Section } from '../types.js';

function captureRenderer(): { events: string[]; renderer: Renderer } {
  const events: string[] = [];
  const renderer: Renderer = {
    enterSection(s) {
      events.push(`enter:${s.id}`);
    },
    leaveSection(s) {
      events.push(`leave:${s.id}`);
    },
    async showLine(text) {
      events.push(`line:${text}`);
    },
  };
  return { events, renderer };
}

const TINY_SECTIONS: Section[] = [
  {
    id: 'a',
    title: 'A',
    steps: [
      { kind: 'line', text: 'one', pauseAfterMs: 5 },
      {
        kind: 'list',
        items: ['x', 'y', 'z'],
        perItemDelayMs: 2,
        pauseAfterMs: 5,
      },
    ],
  },
  {
    id: 'b',
    title: 'B',
    steps: [{ kind: 'line', text: 'two', pauseAfterMs: 5 }],
  },
];

describe('playSequence', () => {
  it('emits events in declared order with section lifecycle', async () => {
    const { events, renderer } = captureRenderer();
    const ac = new AbortController();
    await playSequence(TINY_SECTIONS, renderer, { signal: ac.signal, pauseMultiplier: 0 });
    expect(events).toEqual([
      'enter:a',
      'line:one',
      'line:x',
      'line:y',
      'line:z',
      'leave:a',
      'enter:b',
      'line:two',
      'leave:b',
    ]);
  });

  it('honors pauseMultiplier for total wall-clock time', async () => {
    const { renderer } = captureRenderer();
    const ac = new AbortController();
    const fast = await measure(() =>
      playSequence(TINY_SECTIONS, renderer, { signal: ac.signal, pauseMultiplier: 0 }),
    );
    const slow = await measure(() =>
      playSequence(TINY_SECTIONS, renderer, { signal: ac.signal, pauseMultiplier: 2 }),
    );
    expect(slow).toBeGreaterThan(fast + 10);
  });

  it('aborts cleanly mid-sequence without throwing', async () => {
    const { events, renderer } = captureRenderer();
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 5);
    await expect(
      playSequence(
        [
          {
            id: 'long',
            title: 'long',
            steps: Array.from({ length: 10 }, (_, i) => ({
              kind: 'line' as const,
              text: `line-${i}`,
              pauseAfterMs: 100,
            })),
          },
        ],
        renderer,
        { signal: ac.signal },
      ),
    ).resolves.toBeUndefined();
    expect(events.length).toBeLessThan(10);
  });

  it('delegates list rendering when renderer provides showList', async () => {
    const events: string[] = [];
    const renderer: Renderer = {
      async showLine(text) {
        events.push(`line:${text}`);
      },
      async showList(items, _style, _delay) {
        events.push(`list:${items.join(',')}`);
      },
    };
    const ac = new AbortController();
    await playSequence(
      [
        {
          id: 'l',
          title: 'l',
          steps: [
            { kind: 'list', items: ['a', 'b'], perItemDelayMs: 1, pauseAfterMs: 1 },
          ],
        },
      ],
      renderer,
      { signal: ac.signal, pauseMultiplier: 0 },
    );
    expect(events).toEqual(['list:a,b']);
  });
});

describe('sleep', () => {
  it('resolves (does not reject) on abort', async () => {
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 5);
    await expect(sleep(10_000, ac.signal)).resolves.toBeUndefined();
  });

  it('resolves immediately if signal already aborted', async () => {
    const ac = new AbortController();
    ac.abort();
    const t0 = Date.now();
    await sleep(10_000, ac.signal);
    expect(Date.now() - t0).toBeLessThan(50);
  });
});

async function measure(fn: () => Promise<void>): Promise<number> {
  const t0 = Date.now();
  await fn();
  return Date.now() - t0;
}
