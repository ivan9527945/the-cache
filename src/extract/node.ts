import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parseTweetArchive } from './tweetArchive.js';
import type { Tweet } from './tweetArchive.js';

export async function loadTweetArchive(pathOrDir: string): Promise<Tweet[]> {
  const s = await stat(pathOrDir);
  const files = s.isDirectory() ? await findArchiveFiles(pathOrDir) : [pathOrDir];
  if (files.length === 0) {
    throw new Error(`no tweets*.js files found in ${pathOrDir}`);
  }
  const all: Tweet[] = [];
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    all.push(...parseTweetArchive(text));
  }
  return all;
}

async function findArchiveFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const matches = entries
    .filter((e) => e.isFile() && /^tweets(-part\d+)?\.js$/i.test(e.name))
    .map((e) => join(dir, e.name))
    .sort();
  return matches;
}
