'use client';

// 幕五:遺囑。逐字實作 docs/04-ending-restraint.md §3-6。
// 設計鐵則(§5/§6):
//   - 最後畫面 ≥ 8s,不打擾使用者
//   - 無外部連結、無 CTA、無「分享」/「再玩一次」
//   - 不解釋作品意圖
//   - 唯一關閉動作是 X
//   - 沒有 auto-redirect / 彈窗 / 音效 / 背景 animation
//   - 不存使用者寫的東西(Q2 textarea uncontrolled,根本不讀)

import { useRef, useState } from 'react';
import EndingFinal from './EndingFinal';

type Step = 'intro' | 'q1' | 'q2' | 'q3' | 'confirm' | 'final';

export const Q1_OPTIONS = [
  'Twitter 貼文',
  '私訊',
  '按讚記錄',
  '全部',
  '都不刪',
] as const;

export const Q3_CHOICES = [
  '刪除 Ghost',
  '保留 Ghost',
  '我不知道',
] as const;

export default function EndingClient(): JSX.Element {
  const [step, setStep] = useState<Step>('intro');
  const [q1Selection, setQ1Selection] = useState<Set<string>>(new Set());
  const q2Ref = useRef<HTMLTextAreaElement>(null);
  const [q3Choice, setQ3Choice] = useState<string | null>(null);

  function toggleQ1(option: string): void {
    setQ1Selection((prev) => {
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  }

  function chooseQ3(label: string): void {
    setQ3Choice(label);
    setStep('confirm');
  }

  function onDelete(): void {
    // 不讀 q2Ref.current?.value。連讀都不讀,直接丟。
    setStep('final');
  }

  if (step === 'final') {
    return <EndingFinal />;
  }

  return (
    <main className="ending-shell">
      {step === 'intro' && (
        <>
          <p className="line">結束之前,三個問題。</p>
          <p className="line" style={{ animationDelay: '3s' }}>
            你不必回答。
          </p>
          <div className="ending-actions" style={{ animationDelay: '6s' }}>
            <button onClick={() => setStep('q1')}>繼續</button>
          </div>
        </>
      )}

      {step === 'q1' && (
        <>
          <p className="line">你想刪掉哪些訓練資料?</p>
          <ul className="ending-checks" style={{ animationDelay: '2s' }}>
            {Q1_OPTIONS.map((opt) => (
              <li key={opt}>
                <label>
                  <input
                    type="checkbox"
                    checked={q1Selection.has(opt)}
                    onChange={() => toggleQ1(opt)}
                  />
                  <span>{opt}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="line dim" style={{ animationDelay: '3s' }}>
            (這只是個問題。所有資料無論如何都會被刪除。)
          </p>
          <div className="ending-actions" style={{ animationDelay: '4s' }}>
            <button onClick={() => setStep('q2')}>下一個</button>
          </div>
        </>
      )}

      {step === 'q2' && (
        <>
          <p className="line">你想留下什麼,是 Ghost 不知道的?</p>
          <textarea
            ref={q2Ref}
            className="ending-textarea"
            style={{ animationDelay: '3s' }}
            placeholder="寫一段話。或不寫。"
            rows={8}
            defaultValue=""
          />
          <div className="ending-actions" style={{ animationDelay: '4s' }}>
            <button onClick={() => setStep('q3')}>下一個</button>
          </div>
        </>
      )}

      {step === 'q3' && (
        <>
          <p className="line">Ghost 該被保留嗎?</p>
          <div
            className="ending-q3-choices"
            style={{ animationDelay: '3s' }}
          >
            {Q3_CHOICES.map((label) => (
              <button key={label} onClick={() => chooseQ3(label)}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'confirm' && q3Choice && (
        <>
          <p className="line">你選擇了 {q3Choice}。</p>
          <div className="ending-actions" style={{ animationDelay: '4s' }}>
            <button onClick={onDelete}>刪除所有資料</button>
          </div>
        </>
      )}
    </main>
  );
}
