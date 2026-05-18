import { describe, it, expect } from 'vitest';
import { buildFeaturesFromTweets } from '../features.js';
import type { Tweet } from '../tweetArchive.js';

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

describe('buildFeaturesFromTweets', () => {
  const tweets: Tweet[] = [
    mkTweet('今天好累⋯就只想躺著 🙃', '2024-01-03T23:45:00Z'),
    mkTweet('其實我覺得啦,加班文化真的很扯 😅', '2024-01-04T14:20:00Z', {
      mentions: ['alice'],
      hashtags: ['獨立電影'],
    }),
    mkTweet('RT @someone: 完全同意這個 take', '2024-01-05T02:10:00Z', { isRetweet: true }),
    mkTweet('其實我覺得啦,這個社會就那樣 🥲 https://example.com/post', '2024-01-07T17:00:00Z', {
      mentions: ['alice', 'bob'],
      hashtags: ['獨立電影', '咖啡'],
    }),
    mkTweet('欸我覺得啦,你看,人就是這樣的生物 💀', '2024-01-07T18:30:00Z', {
      mentions: ['alice'],
    }),
  ];

  it('ignores retweets in usable set', () => {
    const { meta } = buildFeaturesFromTweets(tweets);
    expect(meta.ignoredRetweets).toBe(1);
    expect(meta.usedTweets).toBe(4);
  });

  it('extracts top mentions and hashtags', () => {
    const { features } = buildFeaturesFromTweets(tweets);
    expect(features.entities.top_people[0]).toBe('alice');
    expect(features.interests).toContain('獨立電影');
  });

  it('counts emoji frequency and top emojis', () => {
    const { features } = buildFeaturesFromTweets(tweets);
    expect(features.emoji.top_5.length).toBeGreaterThan(0);
    expect(features.emoji.frequency_per_message).toBeGreaterThan(0);
  });

  it('strips URLs / mentions / hashtags before counting words', () => {
    const { features } = buildFeaturesFromTweets(tweets);
    const joined = features.linguistic.top_15_words.join('');
    expect(joined).not.toContain('https');
    expect(joined).not.toContain('@');
    expect(joined).not.toContain('#');
  });

  it('captures repeated phrases as signature_phrases', () => {
    const { features } = buildFeaturesFromTweets(tweets);
    expect(features.linguistic.signature_phrases).toContain('我覺得啦');
  });

  it('computes a non-trivial avg_sentence_length', () => {
    const { features } = buildFeaturesFromTweets(tweets);
    expect(features.linguistic.avg_sentence_length).toBeGreaterThan(0);
  });

  it('shifts hours by tz offset (default +8)', () => {
    const { features } = buildFeaturesFromTweets(tweets);
    expect(features.temporal.active_hours).toMatch(/^\d{2}:00–\d{2}:00$/);
  });

  it('leaves manual fields empty so the user knows to fill them', () => {
    const { features, meta } = buildFeaturesFromTweets(tweets);
    expect(features.entities.top_places).toEqual([]);
    expect(features.opinions.stated_stances).toEqual([]);
    expect(features.sentiment.emotion_breakdown).toEqual({});
    expect(features.sentiment.overall_tone).toBe('');
    expect(meta.manualFields.map((m) => m.path)).toEqual(
      expect.arrayContaining([
        'entities.top_places',
        'opinions.stated_stances',
        'sentiment.emotion_breakdown',
        'sentiment.overall_tone',
      ]),
    );
  });

  it('infers a tone string and paragraph style from signals', () => {
    const { features, meta } = buildFeaturesFromTweets(tweets);
    expect(features.linguistic.tone).toMatch(/.+/);
    expect(features.linguistic.paragraph_style).toMatch(/.+/);
    expect(meta.inferredFields).toEqual(
      expect.arrayContaining(['linguistic.paragraph_style', 'linguistic.tone']),
    );
  });

  it('handles an empty corpus without throwing', () => {
    const { features } = buildFeaturesFromTweets([]);
    expect(features.linguistic.avg_sentence_length).toBe(0);
    expect(features.emoji.top_5).toEqual([]);
    expect(features.entities.top_people).toEqual([]);
  });

  it('drops retweets even when caller toggles includeReplies', () => {
    const { meta } = buildFeaturesFromTweets(tweets, { includeReplies: false });
    expect(meta.ignoredRetweets).toBe(1);
  });
});
