import { describe, it, expect } from 'vitest';
import { buildScriptData } from '../dataBuilder.js';
import type { Tweet } from '../../extract/tweetArchive.js';

function mkTweet(text: string, isoUtc: string, overrides: Partial<Tweet> = {}): Tweet {
  return {
    id: Math.random().toString(),
    text,
    createdAt: new Date(isoUtc),
    lang: 'zh',
    isRetweet: text.startsWith('RT @'),
    isReply: false,
    mentions: [],
    hashtags: [],
    ...overrides,
  };
}

describe('buildScriptData', () => {
  it('counts only usable (non-retweet) tweets in totalPosts', () => {
    const tweets = [
      mkTweet('a', '2024-01-01T00:00:00Z'),
      mkTweet('b', '2024-01-02T00:00:00Z'),
      mkTweet('RT @x: c', '2024-01-03T00:00:00Z', { isRetweet: true }),
    ];
    const d = buildScriptData(tweets);
    expect(d.totalPosts).toBe(2);
  });

  it('picks the most common HH:MM as peakHourMinute', () => {
    const tweets = [
      mkTweet('a', '2024-01-01T15:47:00Z'),
      mkTweet('b', '2024-01-02T15:47:00Z'),
      mkTweet('c', '2024-01-03T10:00:00Z'),
    ];
    const d = buildScriptData(tweets, { tzOffsetHours: 8 });
    expect(d.peakHourMinute).toBe('23:47');
  });

  it('counts late-night (02-05 local) tweets', () => {
    const tweets = [
      mkTweet('night1', '2024-01-01T18:00:00Z'),
      mkTweet('night2', '2024-01-02T20:30:00Z'),
      mkTweet('day', '2024-01-03T05:00:00Z'),
    ];
    const d = buildScriptData(tweets, { tzOffsetHours: 8 });
    expect(d.lateNightCount).toBe(2);
  });

  it('identifies the longest day and formats its date in Chinese', () => {
    const tweets = [
      mkTweet('1', '2021-04-16T01:00:00Z'),
      mkTweet('2', '2021-04-16T02:00:00Z'),
      mkTweet('3', '2021-04-16T03:00:00Z'),
      mkTweet('lonely', '2021-04-20T10:00:00Z'),
    ];
    const d = buildScriptData(tweets, { tzOffsetHours: 8 });
    expect(d.longestDayCount).toBe(3);
    expect(d.longestDayDate).toContain('2021');
    expect(d.longestDayDate).toContain('月');
  });

  it('computes pronoun ratio for 我 vs 你', () => {
    const tweets = [
      mkTweet('我 我 我 我', '2024-01-01T00:00:00Z'),
      mkTweet('你', '2024-01-02T00:00:00Z'),
    ];
    const d = buildScriptData(tweets);
    expect(d.pronounSelfCount).toBe(4);
    expect(d.pronounYouCount).toBe(1);
    expect(d.pronounRatio).toBe(4);
  });

  it('counts mother/father with both 媽媽 and 媽 / 爸爸 and 爸', () => {
    const tweets = [
      mkTweet('媽媽 媽媽 媽 爸爸', '2024-01-01T00:00:00Z'),
    ];
    const d = buildScriptData(tweets);
    expect(d.motherCount).toBeGreaterThan(0);
    expect(d.fatherCount).toBeGreaterThan(0);
  });

  it('returns the most-mentioned account as topMention', () => {
    const tweets = [
      mkTweet('hi', '2024-01-01T00:00:00Z', { mentions: ['alice', 'bob'] }),
      mkTweet('hi', '2024-01-02T00:00:00Z', { mentions: ['alice'] }),
    ];
    const d = buildScriptData(tweets);
    expect(d.topMention?.account).toBe('alice');
    expect(d.topMention?.count).toBe(2);
  });

  it('detects lostContact when an oft-mentioned account drops off >12 months ago', () => {
    const tweets = [
      ...Array.from({ length: 6 }, (_, i) =>
        mkTweet('x', `2020-06-${(i + 1).toString().padStart(2, '0')}T00:00:00Z`, {
          mentions: ['lost'],
        }),
      ),
      mkTweet('recent', '2024-01-01T00:00:00Z', { mentions: ['current'] }),
    ];
    const d = buildScriptData(tweets);
    expect(d.lostContact?.account).toBe('lost');
    expect(d.lostContact?.sinceYearMonth).toContain('2020');
  });

  it('applies overrides on top of computed values', () => {
    const tweets = [mkTweet('hi', '2024-01-01T00:00:00Z')];
    const d = buildScriptData(tweets, {
      overrides: { topics: ['a', 'b', 'c'], extractedFear: '被遺忘' },
    });
    expect(d.topics).toEqual(['a', 'b', 'c']);
    expect(d.extractedFear).toBe('被遺忘');
  });

  it('handles empty input without throwing', () => {
    const d = buildScriptData([]);
    expect(d.totalPosts).toBe(0);
    expect(d.peakHourMinute).toBe('00:00');
    expect(d.topMention).toBeNull();
    expect(d.lostContact).toBeNull();
  });
});
