import JSZip from 'jszip';
import { parseTweetArchive } from './tweetArchive.js';
import type { Tweet } from './tweetArchive.js';

const ARCHIVE_FILE_RE = /(?:^|\/)data\/tweets(-part\d+)?\.js$/i;
const STANDALONE_FILE_RE = /^tweets(-part\d+)?\.js$/i;

export async function parseTweetArchiveZip(file: File | Blob): Promise<Tweet[]> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const candidates = Object.keys(zip.files)
    .filter((name) => ARCHIVE_FILE_RE.test(name) || STANDALONE_FILE_RE.test(name))
    .sort();
  if (candidates.length === 0) {
    throw new Error(
      'zip 內找不到 data/tweets*.js 或 tweets*.js — 確定是 Twitter / X 官方 archive 嗎?',
    );
  }
  const all: Tweet[] = [];
  for (const name of candidates) {
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    const text = await entry.async('text');
    all.push(...parseTweetArchive(text));
  }
  return all;
}

export async function parseTweetArchiveText(file: File | Blob): Promise<Tweet[]> {
  const text = await file.text();
  return parseTweetArchive(text);
}

export async function parseAnyArchive(file: File): Promise<Tweet[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.zip')) return parseTweetArchiveZip(file);
  if (name.endsWith('.js')) return parseTweetArchiveText(file);
  throw new Error(`不支援的檔案類型:${file.name}(只接受 .zip 或 .js)`);
}
