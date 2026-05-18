// 幕三 → 幕五 過場用的純統計函式。
//
// 這個過場取代了 docs/04 §1 推翻的「鏡子頁/揭露頁」。
// 設計準則:列數字、零詮釋、跟幕二的冷感美學一致(出自 docs/02 §1 原則三)。
//
// 觀眾自己會看出 mirror:「我跟還原版的我互動,本身也是一份數位足跡」。
// 這個 insight 由觀眾自己生,不是作品塞 — 所以不違反 docs/04 §1 的三個錯。

import type { ChatMessage } from './ghost/index.js';

export interface ChatStats {
  durationMs: number;
  ghostChars: number;
  userChars: number;
  ghostMeCount: number;
  userMeCount: number;
}

function countChars(text: string): number {
  // 不算空白。中文一字一 codepoint,用 Array.from 安全處理 surrogate pair。
  return Array.from(text.replace(/\s+/g, '')).length;
}

function countMe(text: string): number {
  return (text.match(/我/g) ?? []).length;
}

export function buildChatStats(
  messages: ChatMessage[],
  durationMs: number,
): ChatStats {
  let ghostChars = 0;
  let userChars = 0;
  let ghostMeCount = 0;
  let userMeCount = 0;

  for (const m of messages) {
    const chars = countChars(m.content);
    const me = countMe(m.content);
    if (m.role === 'assistant') {
      ghostChars += chars;
      ghostMeCount += me;
    } else {
      userChars += chars;
      userMeCount += me;
    }
  }

  return { durationMs, ghostChars, userChars, ghostMeCount, userMeCount };
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
}
