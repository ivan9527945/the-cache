// 瀏覽器與 Node 共用的安全匯出。
// Node-only 的 fs loader 在 ./node.ts;瀏覽器 zip 解析在 ./tweetArchiveBrowser.ts。
export { parseTweetArchive } from './tweetArchive.js';
export type { Tweet, RawTweet, RawMention, RawHashtag } from './tweetArchive.js';
export { buildFeaturesFromTweets } from './features.js';
export type { ExtractResult, ExtractMeta, ExtractOptions } from './features.js';
export {
  parseTweetArchiveZip,
  parseTweetArchiveText,
  parseAnyArchive,
} from './tweetArchiveBrowser.js';
