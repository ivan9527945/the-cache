// 第三層:前端記憶體管理。出自 docs/03-privacy-architecture.md。
// 沒有 persist middleware。一旦 tab 關閉 / 重新整理 / idle 過久,資料就沒了。
import { create } from 'zustand';
import type { ChatMessage, UserFeatures } from '../../src/ghost';
import type { ScriptData } from '../../src/actTwo';

interface SessionState {
  features: UserFeatures | null;
  actTwoData: ScriptData | null;
  messages: ChatMessage[];
  setFeatures: (f: UserFeatures) => void;
  setActTwoData: (d: ScriptData) => void;
  addMessage: (m: ChatMessage) => void;
  setMessages: (m: ChatMessage[]) => void;
  purge: () => void;
}

export const useSession = create<SessionState>((set) => ({
  features: null,
  actTwoData: null,
  messages: [],
  setFeatures: (features) => set({ features }),
  setActTwoData: (actTwoData) => set({ actTwoData }),
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setMessages: (messages) => set({ messages }),
  purge: () => set({ features: null, actTwoData: null, messages: [] }),
}));
