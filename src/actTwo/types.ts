export type AppearStyle = 'fade' | 'typewriter' | 'instant';

export type ScriptStep =
  | { kind: 'line'; text: string; appearStyle?: AppearStyle; pauseAfterMs: number }
  | {
      kind: 'list';
      items: string[];
      perItemDelayMs: number;
      appearStyle?: AppearStyle;
      pauseAfterMs: number;
    };

export interface Section {
  id: string;
  title: string;
  steps: ScriptStep[];
}

export interface Renderer {
  enterSection?(section: Section, signal: AbortSignal): Promise<void> | void;
  showLine(text: string, style: AppearStyle, signal: AbortSignal): Promise<void> | void;
  showList?(
    items: string[],
    style: AppearStyle,
    perItemDelayMs: number,
    signal: AbortSignal,
  ): Promise<void> | void;
  leaveSection?(section: Section, signal: AbortSignal): Promise<void> | void;
}

export interface PlayOptions {
  signal: AbortSignal;
  pauseMultiplier?: number;
}

export interface ScriptData {
  archiveFiles: string[];

  totalPosts: number;
  yearsActive: number;
  postsPerDay: number;
  deletedCount: number | null;

  peakHourMinute: string;
  lateNightCount: number;
  longestDayCount: number;
  longestDayDate: string;
  longestDayWhyCount: number | null;

  topWordsWithCounts: { word: string; count: number }[];
  pronounSelfCount: number;
  pronounYouCount: number;
  pronounRatio: number;

  motherCount: number | null;
  fatherCount: number | null;
  topMention: { account: string; count: number } | null;
  lostContact:
    | { account: string; sinceYearMonth: string; missingTermSurgePct: number; missingTerm: string }
    | null;

  emotionBreakdown: { label: string; pct: number }[];
  topEmotionLabel: string;
  positiveOrNeutralPct: number;

  topics: [string, string, string];
  extractedFear: string;
  inferredLovedOne: string;

  trainingPostCount: number;
  trainingDmCount: number;
  trainingLikeCount: number;
  trainingDurationSeconds: number;
}
