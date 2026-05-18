import { describe, it, expect } from 'vitest';
import { parseTweetArchive } from '../tweetArchive.js';

const SAMPLE = `window.YTD.tweets.part0 = [
  {
    "tweet": {
      "id_str": "1",
      "full_text": "hello world",
      "created_at": "Wed Jan 03 23:45:12 +0000 2024",
      "lang": "en",
      "entities": {
        "user_mentions": [{"screen_name": "alice"}],
        "hashtags": [{"text": "foo"}]
      }
    }
  },
  {
    "tweet": {
      "id_str": "2",
      "full_text": "RT @bob: copy",
      "created_at": "Wed Jan 03 12:00:00 +0000 2024",
      "in_reply_to_status_id_str": null,
      "entities": {}
    }
  }
];`;

describe('parseTweetArchive', () => {
  it('strips the YTD prefix and parses tweet objects', () => {
    const tweets = parseTweetArchive(SAMPLE);
    expect(tweets).toHaveLength(2);
    expect(tweets[0]).toMatchObject({
      id: '1',
      text: 'hello world',
      lang: 'en',
      mentions: ['alice'],
      hashtags: ['foo'],
      isRetweet: false,
    });
  });

  it('flags retweets via the RT @ prefix', () => {
    const tweets = parseTweetArchive(SAMPLE);
    expect(tweets[1]!.isRetweet).toBe(true);
  });

  it('tolerates trailing semicolons (Twitter exports include them)', () => {
    const withSemi = SAMPLE.trim() + ';';
    expect(parseTweetArchive(withSemi)).toHaveLength(2);
  });

  it('throws on non-archive input', () => {
    expect(() => parseTweetArchive('not really a tweets file')).toThrow(/Twitter archive/);
  });

  it('parses created_at into a real Date', () => {
    const t = parseTweetArchive(SAMPLE)[0]!;
    expect(t.createdAt.getUTCFullYear()).toBe(2024);
    expect(t.createdAt.getUTCMonth()).toBe(0);
    expect(t.createdAt.getUTCDate()).toBe(3);
  });

  it('handles missing entities gracefully', () => {
    const noEntities = `window.YTD.tweets.part0 = [{"tweet": {"id_str": "9", "full_text": "x", "created_at": "Wed Jan 03 00:00:00 +0000 2024"}}]`;
    const t = parseTweetArchive(noEntities)[0]!;
    expect(t.mentions).toEqual([]);
    expect(t.hashtags).toEqual([]);
  });
});
