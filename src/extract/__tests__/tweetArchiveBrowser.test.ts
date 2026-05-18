import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  parseTweetArchiveZip,
  parseTweetArchiveText,
} from '../tweetArchiveBrowser.js';

const SAMPLE = `window.YTD.tweets.part0 = [
  {
    "tweet": {
      "id_str": "1",
      "full_text": "hello world",
      "created_at": "Wed Jan 03 23:45:12 +0000 2024",
      "lang": "en",
      "entities": {}
    }
  },
  {
    "tweet": {
      "id_str": "2",
      "full_text": "second",
      "created_at": "Thu Jan 04 10:00:00 +0000 2024",
      "lang": "en",
      "entities": {}
    }
  }
];`;

async function makeZip(files: Record<string, string>): Promise<Blob> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  return new Blob([buf], { type: 'application/zip' });
}

describe('parseTweetArchiveZip', () => {
  it('extracts tweets from a single data/tweets.js inside the zip', async () => {
    const blob = await makeZip({ 'data/tweets.js': SAMPLE });
    const tweets = await parseTweetArchiveZip(blob);
    expect(tweets).toHaveLength(2);
    expect(tweets[0]!.text).toBe('hello world');
  });

  it('concatenates multiple tweets-partN.js files in sorted order', async () => {
    const blob = await makeZip({
      'data/tweets-part1.js': SAMPLE.replace('part0', 'part1'),
      'data/tweets.js': SAMPLE,
    });
    const tweets = await parseTweetArchiveZip(blob);
    expect(tweets.length).toBe(4);
  });

  it('also matches a standalone tweets.js at the zip root (not under data/)', async () => {
    const blob = await makeZip({ 'tweets.js': SAMPLE });
    const tweets = await parseTweetArchiveZip(blob);
    expect(tweets.length).toBe(2);
  });

  it('throws a helpful error if no archive files are present', async () => {
    const blob = await makeZip({ 'README.txt': 'nope' });
    await expect(parseTweetArchiveZip(blob)).rejects.toThrow(/Twitter \/ X/);
  });
});

describe('parseTweetArchiveText', () => {
  it('parses a Blob whose body is raw tweets.js text', async () => {
    const blob = new Blob([SAMPLE], { type: 'application/javascript' });
    const tweets = await parseTweetArchiveText(blob);
    expect(tweets).toHaveLength(2);
  });
});
