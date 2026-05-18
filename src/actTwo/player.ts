import type { PlayOptions, Renderer, Section } from './types.js';

export async function playSequence(
  sections: Section[],
  renderer: Renderer,
  opts: PlayOptions,
): Promise<void> {
  const { signal } = opts;
  const multiplier = opts.pauseMultiplier ?? 1;

  for (const section of sections) {
    if (signal.aborted) return;
    if (renderer.enterSection) await renderer.enterSection(section, signal);

    for (const step of section.steps) {
      if (signal.aborted) return;
      const style = step.appearStyle ?? 'fade';

      if (step.kind === 'line') {
        await renderer.showLine(step.text, style, signal);
      } else {
        const perItem = Math.round(step.perItemDelayMs * multiplier);
        if (renderer.showList) {
          await renderer.showList(step.items, style, perItem, signal);
        } else {
          for (let i = 0; i < step.items.length; i++) {
            if (signal.aborted) return;
            await renderer.showLine(step.items[i]!, style, signal);
            if (i < step.items.length - 1) await sleep(perItem, signal);
          }
        }
      }

      await sleep(step.pauseAfterMs * multiplier, signal);
    }

    if (renderer.leaveSection) await renderer.leaveSection(section, signal);
  }
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
