'use client';

// 幕三:Ghost 對話 + 結束過場(對齊 docs/01-ghost-prompt.md)。
//
// 設計鐵則:
//   - 開場 hardcode OPENING_LINE,不靠 LLM 生(保證一致、避免 LLM 在後續再重複)
//   - 送給 /api/chat 的 history 過濾掉 OPENING_LINE(Anthropic messages 必須 user 開頭)
//   - 不 stream、不 typing indicator(冷感 > 「他在思考」感)
//   - 結束按鈕固定右上,色淡不引導(對齊 docs/04 §6「離開要主動」)
//   - 沒 features 不開放 chat(sample mode 看 demo 可,聊天必須先 upload)
//   - 對話結束過場:純統計、無評價,接 docs/02 第六波收場的美學(取代被 docs/04 推翻的鏡子頁)

import { useEffect, useRef, useState } from 'react';
import type { JSX, FormEvent, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sleep } from '../../../src/actTwo';
import { OPENING_LINE } from '../../../src/ghost';
import type { ChatMessage, GhostReply } from '../../../src/ghost';
import { buildChatStats, formatDuration } from '../../../src/chatStats';
import { useSession } from '../../lib/sessionStore';

type Phase = 'no-features' | 'chatting' | 'transition';

export default function ChatClient(): JSX.Element {
  const features = useSession((s) => s.features);
  const messages = useSession((s) => s.messages);
  const addMessage = useSession((s) => s.addMessage);
  const setMessages = useSession((s) => s.setMessages);

  const [phase, setPhase] = useState<Phase>('chatting');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstUserSentAt = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 沒 features = 從首頁直接進來 / 用 sample mode 看完幕二的人
  useEffect(() => {
    if (!features) {
      setPhase('no-features');
    }
  }, [features]);

  // 開場句 hardcode(只在第一次 mount 時塞,後續 navigate 回來不重複)
  useEffect(() => {
    if (features && messages.length === 0) {
      setMessages([{ role: 'assistant', content: OPENING_LINE }]);
    }
  }, [features, messages.length, setMessages]);

  // 新訊息來,自動 scroll 到底
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, sending]);

  async function send(): Promise<void> {
    const text = input.trim();
    if (!text || sending || !features) return;

    if (firstUserSentAt.current === null) {
      firstUserSentAt.current = Date.now();
    }

    setError(null);
    const userMsg: ChatMessage = { role: 'user', content: text };
    addMessage(userMsg);
    setInput('');
    setSending(true);

    try {
      // OPENING_LINE 是 client 端 hardcode,Anthropic 端不該看到(messages 必須 user 開頭)。
      const history = messages.filter((m) => m.content !== OPENING_LINE);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features, messages: [...history, userMsg] }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const reply = (await res.json()) as GhostReply;
      addMessage({ role: 'assistant', content: reply.text });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    void send();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  }

  if (phase === 'no-features') {
    return (
      <main className="shell">
        <p className="line">Ghost 還沒生成。</p>
        <div className="spacer" />
        <p className="line dim">
          需要你的 archive 才能跟他對話。
        </p>
        <div className="spacer" />
        <p className="line">
          <Link href="/upload">→ 上傳你的 archive</Link>
        </p>
        <p className="line dim">
          <Link href="/act-two">或先看一遍幕二 sample</Link>
        </p>
      </main>
    );
  }

  if (phase === 'transition') {
    const startedAt = firstUserSentAt.current ?? Date.now();
    return <ChatStatsTransition messages={messages} startedAtMs={startedAt} />;
  }

  return (
    <main className="chat-shell">
      <button
        className="chat-end-button"
        onClick={() => setPhase('transition')}
        aria-label="結束對話"
      >
        結束對話
      </button>

      <div className="chat-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <p
            key={i}
            className={`chat-line ${m.role === 'user' ? 'user' : 'ghost'}`}
          >
            {m.content}
          </p>
        ))}
        {sending && <p className="chat-line ghost dim">⋯</p>}
        {error && <p className="chat-line dim">送出失敗:{error}</p>}
      </div>

      <form className="chat-input-row" onSubmit={onSubmit}>
        <textarea
          className="chat-textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={sending}
          rows={2}
          placeholder=""
        />
        <button type="submit" disabled={!input.trim() || sending}>
          送出
        </button>
      </form>
    </main>
  );
}

// 對話結束 → 純統計過場 → 自動 push /ending。
// 取代 docs/04 §1 推翻的鏡子頁。只列數字,讓觀眾自己看出「跟自己對話也是一份足跡」。
function ChatStatsTransition({
  messages,
  startedAtMs,
}: {
  messages: ChatMessage[];
  startedAtMs: number;
}): JSX.Element {
  const router = useRouter();
  const [lines, setLines] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const multiplier = reduced ? 0.1 : 1;

    // 過濾掉 hardcode 的 OPENING_LINE,讓「他說了 X 字」反映真正 LLM 產出。
    const realMessages = messages.filter((m) => m.content !== OPENING_LINE);
    const stats = buildChatStats(realMessages, Date.now() - startedAtMs);

    const sequence: { text: string; pauseAfterMs: number }[] = [
      { text: '對話結束。', pauseAfterMs: 2000 },
      { text: `你跟他講了 ${formatDuration(stats.durationMs)}。`, pauseAfterMs: 2000 },
      { text: `他說了 ${stats.ghostChars.toLocaleString()} 個字。`, pauseAfterMs: 2000 },
      { text: `你說了 ${stats.userChars.toLocaleString()} 個字。`, pauseAfterMs: 3000 },
      { text: `他用「我」${stats.ghostMeCount} 次。`, pauseAfterMs: 1000 },
      { text: `你用「我」${stats.userMeCount} 次。`, pauseAfterMs: 5000 },
    ];

    (async () => {
      let id = 0;
      for (const step of sequence) {
        if (ac.signal.aborted) return;
        const lineId = id++;
        setLines((prev) => [...prev, { id: lineId, text: step.text }]);
        try {
          await sleep(step.pauseAfterMs * multiplier, ac.signal);
        } catch {
          return;
        }
      }
      if (!ac.signal.aborted) router.push('/ending');
    })();

    return () => ac.abort();
  }, [messages, startedAtMs, router]);

  return (
    <main className="shell">
      {lines.map((l) => (
        <p key={l.id} className="line">
          {l.text}
        </p>
      ))}
    </main>
  );
}
