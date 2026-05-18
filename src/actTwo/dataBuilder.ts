import type { Tweet } from '../extract/tweetArchive.js';
import type { ScriptData } from './types.js';

const URL_RE = /https?:\/\/\S+/g;
const MENTION_RE = /@[A-Za-z0-9_]+/g;
const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;

export interface DataBuilderOptions {
  tzOffsetHours?: number;
  overrides?: Partial<ScriptData>;
  archiveFiles?: string[];
}

const DEFAULT_ARCHIVE_FILES = ['tweets.js', 'direct-messages.js', 'likes.js', 'following.js'];

const DEFAULTS: Partial<ScriptData> = {
  deletedCount: null,
  longestDayWhyCount: null,
  motherCount: null,
  fatherCount: null,
  emotionBreakdown: [
    { label: '快樂類', pct: 18 },
    { label: '悲傷類', pct: 23 },
    { label: '憤怒類', pct: 14 },
    { label: '焦慮類', pct: 27 },
    { label: '愛意類', pct: 8 },
    { label: '其他', pct: 10 },
  ],
  topEmotionLabel: '焦慮',
  positiveOrNeutralPct: 91,
  topics: ['—', '—', '—'],
  extractedFear: '—',
  inferredLovedOne: '—',
  trainingDmCount: 0,
  trainingLikeCount: 0,
};

export function buildScriptData(tweets: Tweet[], opts: DataBuilderOptions = {}): ScriptData {
  const tz = opts.tzOffsetHours ?? 8;
  const usable = tweets.filter((t) => !t.isRetweet && t.text.trim().length > 0);

  const totalPosts = usable.length;
  const span = timeSpan(usable);
  const yearsActive = Math.max(1, Math.round(span.days / 365));
  const postsPerDay = span.days === 0 ? 0 : totalPosts / span.days;

  const localized = usable.map((t) => ({ tweet: t, local: shiftDate(t.createdAt, tz) }));

  const peakHourMinute = pickPeakHourMinute(localized.map((x) => x.local));
  const lateNightCount = localized.filter((x) => {
    const h = x.local.getUTCHours();
    return h >= 2 && h < 5;
  }).length;

  const dayBuckets = new Map<string, number>();
  for (const { local } of localized) {
    const key = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
    dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const longest = [...dayBuckets.entries()].sort((a, b) => b[1] - a[1])[0];
  const longestDayCount = longest ? longest[1] : 0;
  const longestDayDate = longest ? formatChineseDate(longest[0]) : '—';

  const corpus = usable.map(cleanText).join('\n');
  const topWordsWithCounts = topTokensWithCounts(corpus, 6);
  const pronounSelfCount = countSubstr(corpus, '我');
  const pronounYouCount = countSubstr(corpus, '你');
  const pronounRatio =
    pronounYouCount === 0
      ? pronounSelfCount === 0
        ? 0
        : Infinity
      : pronounSelfCount / pronounYouCount;

  const motherCount = countAnyOf(corpus, ['媽媽', '媽']);
  const fatherCount = countAnyOf(corpus, ['爸爸', '爸']);

  const mentionsByAccount = new Map<string, { count: number; firstAt: Date; lastAt: Date }>();
  for (const { tweet, local } of localized) {
    for (const m of tweet.mentions) {
      const cur = mentionsByAccount.get(m);
      if (cur) {
        cur.count += 1;
        if (local < cur.firstAt) cur.firstAt = local;
        if (local > cur.lastAt) cur.lastAt = local;
      } else {
        mentionsByAccount.set(m, { count: 1, firstAt: local, lastAt: local });
      }
    }
  }
  const sortedMentions = [...mentionsByAccount.entries()].sort((a, b) => b[1].count - a[1].count);
  const topMention = sortedMentions[0]
    ? { account: sortedMentions[0][0], count: sortedMentions[0][1].count }
    : null;

  const lostContact = detectLostContact(sortedMentions, localized);

  const archiveFiles = opts.archiveFiles ?? DEFAULT_ARCHIVE_FILES;

  const computed: ScriptData = {
    archiveFiles,
    totalPosts,
    yearsActive,
    postsPerDay,
    deletedCount: DEFAULTS.deletedCount ?? null,
    peakHourMinute,
    lateNightCount,
    longestDayCount,
    longestDayDate,
    longestDayWhyCount: DEFAULTS.longestDayWhyCount ?? null,
    topWordsWithCounts,
    pronounSelfCount,
    pronounYouCount,
    pronounRatio: Number.isFinite(pronounRatio) ? pronounRatio : 0,
    motherCount: motherCount > 0 ? motherCount : null,
    fatherCount: fatherCount > 0 ? fatherCount : null,
    topMention,
    lostContact,
    emotionBreakdown: DEFAULTS.emotionBreakdown!,
    topEmotionLabel: DEFAULTS.topEmotionLabel!,
    positiveOrNeutralPct: DEFAULTS.positiveOrNeutralPct!,
    topics: DEFAULTS.topics! as [string, string, string],
    extractedFear: DEFAULTS.extractedFear!,
    inferredLovedOne: DEFAULTS.inferredLovedOne!,
    trainingPostCount: totalPosts,
    trainingDmCount: DEFAULTS.trainingDmCount!,
    trainingLikeCount: DEFAULTS.trainingLikeCount!,
    trainingDurationSeconds: 47,
  };

  return { ...computed, ...(opts.overrides ?? {}) };
}

function cleanText(t: Tweet): string {
  return t.text.replace(URL_RE, ' ').replace(MENTION_RE, ' ').replace(HASHTAG_RE, ' ');
}

function shiftDate(d: Date, offsetHours: number): Date {
  return new Date(d.getTime() + offsetHours * 3600 * 1000);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function timeSpan(tweets: Tweet[]): { days: number; first: Date | null; last: Date | null } {
  if (tweets.length === 0) return { days: 0, first: null, last: null };
  let first = tweets[0]!.createdAt;
  let last = tweets[0]!.createdAt;
  for (const t of tweets) {
    if (t.createdAt < first) first = t.createdAt;
    if (t.createdAt > last) last = t.createdAt;
  }
  const days = Math.max(1, Math.round((last.getTime() - first.getTime()) / 86400000));
  return { days, first, last };
}

function pickPeakHourMinute(dates: Date[]): string {
  if (dates.length === 0) return '00:00';
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]!;
  return top[0];
}

function formatChineseDate(isoYmd: string): string {
  const [y, m, d] = isoYmd.split('-');
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}

const CJK_RUN_RE = /[一-鿿]+/g;
const LATIN_WORD_RE = /[A-Za-z][A-Za-z']{1,}/g;

function topTokensWithCounts(corpus: string, k: number): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const run of corpus.match(CJK_RUN_RE) ?? []) {
    const chars = Array.from(run);
    for (let n = 1; n <= 2; n++) {
      for (let i = 0; i + n <= chars.length; i++) {
        const tok = chars.slice(i, i + n).join('');
        counts.set(tok, (counts.get(tok) ?? 0) + 1);
      }
    }
  }
  for (const word of corpus.match(LATIN_WORD_RE) ?? []) {
    const w = word.toLowerCase();
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, k)
    .map(([word, count]) => ({ word, count }));
}

function countSubstr(text: string, sub: string): number {
  if (sub.length === 0) return 0;
  let n = 0;
  let i = 0;
  while ((i = text.indexOf(sub, i)) !== -1) {
    n++;
    i += sub.length;
  }
  return n;
}

function countAnyOf(text: string, subs: string[]): number {
  let n = 0;
  for (const s of subs) n += countSubstr(text, s);
  return n;
}

function detectLostContact(
  sortedMentions: [string, { count: number; firstAt: Date; lastAt: Date }][],
  localized: { tweet: Tweet; local: Date }[],
): ScriptData['lostContact'] {
  if (localized.length === 0) return null;
  const latest = localized.reduce(
    (max, x) => (x.local > max ? x.local : max),
    localized[0]!.local,
  );
  const twelveMonthsAgo = new Date(latest.getTime() - 365 * 86400000);

  for (const [account, info] of sortedMentions) {
    if (info.count < 5) continue;
    if (info.lastAt < twelveMonthsAgo) {
      const sinceYearMonth = `${info.lastAt.getUTCFullYear()} 年 ${info.lastAt.getUTCMonth() + 1} 月`;
      return {
        account,
        sinceYearMonth,
        missingTerm: '想念',
        missingTermSurgePct: 340,
      };
    }
  }
  return null;
}
