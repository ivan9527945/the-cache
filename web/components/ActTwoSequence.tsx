'use client';

import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import Link from 'next/link';
import { playSequence, buildScript, NOT_YET_LINE } from '../../src/actTwo';
import type { ScriptData, Section, AppearStyle, Renderer } from '../../src/actTwo';

type RenderedItem =
  | { kind: 'section'; id: string; title: string }
  | { kind: 'line'; id: string; text: string; style: AppearStyle };

interface Props {
  data: ScriptData;
}

export default function ActTwoSequence({ data }: Props): JSX.Element {
  const [items, setItems] = useState<RenderedItem[]>([]);
  const [done, setDone] = useState(false);
  const [choice, setChoice] = useState<null | 'not-yet' | 'meet'>(null);
  const counter = useRef(0);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const multiplier = reduced ? 0.1 : 1;

    const ac = new AbortController();
    const sections = buildScript(data);

    const push = (item: RenderedItem): void => {
      counter.current += 1;
      setItems((prev) => [...prev, item]);
    };

    const renderer: Renderer = {
      enterSection(section: Section) {
        if (section.id === 'opening') return;
        push({ kind: 'section', id: `s-${section.id}`, title: section.title });
      },
      showLine(text: string, style: AppearStyle) {
        push({
          kind: 'line',
          id: `l-${counter.current}`,
          text,
          style,
        });
      },
    };

    playSequence(sections, renderer, { signal: ac.signal, pauseMultiplier: multiplier })
      .then(() => {
        if (!ac.signal.aborted) setDone(true);
      })
      .catch(() => {
        /* aborted */
      });

    return () => ac.abort();
  }, [data]);

  return (
    <>
      {items.map((item) => {
        if (item.kind === 'section') {
          return (
            <div key={item.id} className="section-header">
              {item.title}
            </div>
          );
        }
        return (
          <p key={item.id} className={`line${item.style === 'instant' ? ' dim' : ''}`}>
            {item.text}
          </p>
        );
      })}

      {done && choice === null && (
        <div className="choices">
          <button onClick={() => setChoice('not-yet')}>還沒</button>
          <button onClick={() => setChoice('meet')}>見他</button>
        </div>
      )}

      {choice === 'not-yet' && (
        <p className="line" style={{ marginTop: '2rem' }}>
          {NOT_YET_LINE}
        </p>
      )}

      {choice === 'meet' && (
        <>
          <p className="line dim" style={{ marginTop: '2rem' }}>
            (Ghost 對話介面尚未實作)
          </p>
          <p className="line" style={{ marginTop: '1rem' }}>
            <Link href="/ending">→ 跳到結尾</Link>
          </p>
        </>
      )}
    </>
  );
}
