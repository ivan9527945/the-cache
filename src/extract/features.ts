import type { UserFeatures } from '../ghost/types.js';
import type { Tweet } from './tweetArchive.js';

const URL_RE = /https?:\/\/\S+/g;
const MENTION_RE = /@[A-Za-z0-9_]+/g;
const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;
const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const CJK_RE = /[一-鿿]/;
const CJK_RUN_RE = /[一-鿿]+/g;
const LATIN_WORD_RE = /[A-Za-z][A-Za-z']{1,}/g;
const SENTENCE_SPLIT_RE = /[。!?\.!?\n]+/;

export interface ExtractMeta {
  inputTweets: number;
  usedTweets: number;
  ignoredRetweets: number;
  filledFields: string[];
  inferredFields: string[];
  manualFields: { path: string; hint: string }[];
}

export interface ExtractResult {
  features: UserFeatures;
  meta: ExtractMeta;
}

export interface ExtractOptions {
  tzOffsetHours?: number;
  includeReplies?: boolean;
}

export function buildFeaturesFromTweets(
  tweets: Tweet[],
  opts: ExtractOptions = {},
): ExtractResult {
  const tzOffset = opts.tzOffsetHours ?? 8;
  const includeReplies = opts.includeReplies ?? true;

  const usable = tweets.filter(
    (t) => !t.isRetweet && (includeReplies || !t.isReply) && t.text.trim().length > 0,
  );
  const ignoredRetweets = tweets.filter((t) => t.isRetweet).length;

  const cleanedTexts = usable.map(cleanText);
  const corpus = cleanedTexts.join('\n');

  const sentences = splitSentences(corpus);
  const avgSentenceLength =
    sentences.length === 0
      ? 0
      : Math.round(sentences.reduce((s, t) => s + countChars(t), 0) / sentences.length);

  const punctuationPattern = describePunctuation(corpus);
  const topWords = topTokens(cleanedTexts, 15);
  const signaturePhrases = topNgramPhrases(cleanedTexts, 5);

  const allEmojis = cleanedTexts.flatMap(extractEmojis);
  const emojiFreqPerMessage =
    allEmojis.length === 0 ? 999 : Math.max(1, Math.round(usable.length / allEmojis.length));
  const topEmojis = topCounted(allEmojis, 5);

  const mentions = usable.flatMap((t) => t.mentions);
  const topPeople = topCounted(mentions, 5);

  const hashtags = usable.flatMap((t) => t.hashtags);
  const interests = topCounted(hashtags, 5);

  const localHours = usable.map((t) => shiftHour(t.createdAt.getUTCHours(), tzOffset));
  const activeHours = peakWindow(localHours);

  const localWeekdays = usable.map((t) =>
    shiftWeekday(t.createdAt.getUTCDay(), t.createdAt.getUTCHours(), tzOffset),
  );
  const peakPeriods = topWeekdays(localWeekdays);

  const paragraphStyle = inferParagraphStyle(avgSentenceLength, cleanedTexts);
  const tone = inferTone(topEmojis, topWords);

  const features: UserFeatures = {
    linguistic: {
      avg_sentence_length: avgSentenceLength,
      punctuation_pattern: punctuationPattern,
      top_15_words: topWords,
      signature_phrases: signaturePhrases,
      paragraph_style: paragraphStyle,
      tone,
    },
    emoji: { frequency_per_message: emojiFreqPerMessage, top_5: topEmojis },
    entities: { top_people: topPeople, top_places: [] },
    opinions: { stated_stances: [] },
    interests,
    temporal: { active_hours: activeHours, peak_periods: peakPeriods },
    sentiment: { emotion_breakdown: {}, overall_tone: '' },
  };

  const meta: ExtractMeta = {
    inputTweets: tweets.length,
    usedTweets: usable.length,
    ignoredRetweets,
    filledFields: [
      'linguistic.avg_sentence_length',
      'linguistic.punctuation_pattern',
      'linguistic.top_15_words',
      'linguistic.signature_phrases',
      'emoji.frequency_per_message',
      'emoji.top_5',
      'entities.top_people',
      'interests',
      'temporal.active_hours',
      'temporal.peak_periods',
    ],
    inferredFields: ['linguistic.paragraph_style', 'linguistic.tone'],
    manualFields: [
      { path: 'entities.top_places', hint: '常出現地點(e.g. 公司、家、台北),tweet archive 沒有地理 NER 訊號' },
      { path: 'opinions.stated_stances', hint: '你公開表達的立場(e.g. 討厭加班文化)' },
      { path: 'sentiment.emotion_breakdown', hint: '情緒分布百分比(e.g. {平靜: 40, 焦慮: 30}),需要情緒分類器' },
      { path: 'sentiment.overall_tone', hint: '整體基調的一句話描述(e.g. 低能量、自嘲為主)' },
    ],
  };

  return { features, meta };
}

function cleanText(t: Tweet): string {
  return t.text
    .replace(URL_RE, ' ')
    .replace(MENTION_RE, ' ')
    .replace(HASHTAG_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(corpus: string): string[] {
  return corpus
    .split(SENTENCE_SPLIT_RE)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function countChars(s: string): number {
  return Array.from(s.replace(EMOJI_RE, '')).length;
}

function describePunctuation(corpus: string): string {
  const sample = corpus;
  const counts: Record<string, number> = {
    '。': occurrences(sample, '。'),
    ',': occurrences(sample, ','),
    '?': occurrences(sample, '?'),
    '!': occurrences(sample, '!'),
    '⋯': occurrences(sample, '⋯') + occurrences(sample, '…'),
    '~': occurrences(sample, '~') + occurrences(sample, '~'),
  };
  const total = Object.values(counts).reduce((s, n) => s + n, 0) || 1;
  const ranked = Object.entries(counts)
    .map(([k, v]) => ({ k, pct: v / total }))
    .sort((a, b) => b.pct - a.pct);
  const heavy = ranked.filter((r) => r.pct >= 0.25).map((r) => r.k);
  const light = ranked.filter((r) => r.pct > 0 && r.pct < 0.05).map((r) => r.k);
  const parts: string[] = [];
  if (heavy.length) parts.push(`常用 ${heavy.join('')}`);
  if (light.length) parts.push(`少用 ${light.join('')}`);
  if (parts.length === 0) parts.push('標點分布均勻');
  return parts.join('、');
}

function occurrences(text: string, ch: string): number {
  let n = 0;
  let i = 0;
  while ((i = text.indexOf(ch, i)) !== -1) {
    n++;
    i += ch.length;
  }
  return n;
}

function topTokens(texts: string[], k: number): string[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const run of text.match(CJK_RUN_RE) ?? []) {
      const chars = Array.from(run);
      for (let n = 1; n <= 2; n++) {
        for (let i = 0; i + n <= chars.length; i++) {
          const tok = chars.slice(i, i + n).join('');
          counts.set(tok, (counts.get(tok) ?? 0) + 1);
        }
      }
    }
    for (const word of text.match(LATIN_WORD_RE) ?? []) {
      const w = word.toLowerCase();
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([t, n]) => n >= 2 && t.length > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, k)
    .map(([t]) => t);
}

function topNgramPhrases(texts: string[], k: number): string[] {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const run of text.match(CJK_RUN_RE) ?? []) {
      const chars = Array.from(run);
      for (let n = 4; n <= 6; n++) {
        for (let i = 0; i + n <= chars.length; i++) {
          const phrase = chars.slice(i, i + n).join('');
          counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
        }
      }
    }
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, k)
    .map(([p]) => p);
}

function extractEmojis(text: string): string[] {
  return [...text.matchAll(EMOJI_RE)].map((m) => m[0]);
}

function topCounted<T extends string>(items: T[], k: number): T[] {
  const counts = new Map<T, number>();
  for (const x of items) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, k)
    .map(([x]) => x);
}

function shiftHour(utcHour: number, offsetHours: number): number {
  return (utcHour + offsetHours + 24) % 24;
}

function shiftWeekday(utcDay: number, utcHour: number, offsetHours: number): number {
  const total = utcHour + offsetHours;
  let dayShift = 0;
  if (total >= 24) dayShift = 1;
  else if (total < 0) dayShift = -1;
  return (utcDay + dayShift + 7) % 7;
}

function peakWindow(hours: number[]): string {
  if (hours.length === 0) return '00:00–00:00';
  const buckets = new Array(24).fill(0);
  for (const h of hours) buckets[h] += 1;
  const window = 4;
  let bestStart = 0;
  let bestSum = -1;
  for (let start = 0; start < 24; start++) {
    let sum = 0;
    for (let i = 0; i < window; i++) sum += buckets[(start + i) % 24];
    if (sum > bestSum) {
      bestSum = sum;
      bestStart = start;
    }
  }
  const end = (bestStart + window) % 24;
  return `${pad(bestStart)}:00–${pad(end)}:00`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

const WEEKDAY_LABEL = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

function topWeekdays(days: number[]): string[] {
  if (days.length === 0) return [];
  const counts = new Array(7).fill(0);
  for (const d of days) counts[d] += 1;
  const ranked = counts
    .map((n, i) => ({ n, i }))
    .sort((a, b) => b.n - a.n)
    .filter((x) => x.n > 0);
  return ranked.slice(0, 2).map((x) => WEEKDAY_LABEL[x.i]!);
}

function inferParagraphStyle(avgLen: number, texts: string[]): string {
  const newlineMessages = texts.filter((t) => t.includes('\n')).length;
  const multiLineRatio = texts.length === 0 ? 0 : newlineMessages / texts.length;
  if (avgLen === 0) return '單段、不換行';
  if (avgLen < 12) return '短句、隨手 tweet 風格';
  if (multiLineRatio > 0.4) return '多段、會分行';
  if (avgLen < 25) return '單段、不換行、像隨手 tweet';
  return '長段、有起承轉合';
}

const SELF_DEPRECATING_EMOJIS = new Set(['🙃', '😅', '🥲', '🫠', '💀', '😮‍💨']);
const WARM_EMOJIS = new Set(['❤️', '🥰', '😍', '🤗', '✨', '🥹']);

function inferTone(topEmojis: string[], topWords: string[]): string {
  const selfDeprecating = topEmojis.filter((e) => SELF_DEPRECATING_EMOJIS.has(e)).length;
  const warm = topEmojis.filter((e) => WARM_EMOJIS.has(e)).length;
  const wordHits = topWords.filter((w) => ['累', '幹', '欸', '齁', '無聊', '崩潰', '完蛋'].includes(w)).length;
  if (selfDeprecating >= 2 || wordHits >= 2) return '冷淡、自嘲、偶爾刻薄';
  if (warm >= 2) return '溫暖、外放、有情緒起伏';
  if (topEmojis.length === 0) return '克制、少 emoji';
  return '中性、口語';
}
