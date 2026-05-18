export interface RawMention {
  screen_name: string;
}

export interface RawHashtag {
  text: string;
}

export interface RawTweet {
  id_str: string;
  full_text: string;
  created_at: string;
  lang?: string;
  in_reply_to_status_id_str?: string | null;
  entities?: {
    user_mentions?: RawMention[];
    hashtags?: RawHashtag[];
  };
}

export interface Tweet {
  id: string;
  text: string;
  createdAt: Date;
  lang: string;
  isRetweet: boolean;
  isReply: boolean;
  mentions: string[];
  hashtags: string[];
}

const ARCHIVE_HEADER_RE = /^[\s\S]*?window\.YTD\.tweets\.part\d+\s*=\s*/;

export function parseTweetArchive(content: string): Tweet[] {
  const stripped = content.replace(ARCHIVE_HEADER_RE, '').trim();
  if (!stripped.startsWith('[')) {
    throw new Error('not a Twitter archive: expected JSON array after `window.YTD.tweets.partN = `');
  }
  const json = stripped.replace(/[;\s]+$/, '');
  let raw: { tweet: RawTweet }[];
  try {
    raw = JSON.parse(json) as { tweet: RawTweet }[];
  } catch (err) {
    throw new Error(`tweet archive JSON parse failed: ${(err as Error).message}`);
  }
  return raw
    .map(({ tweet }) => normalize(tweet))
    .filter((t): t is Tweet => t !== null);
}

function normalize(raw: RawTweet): Tweet | null {
  if (!raw || typeof raw.full_text !== 'string') return null;
  const createdAt = new Date(raw.created_at);
  if (Number.isNaN(createdAt.getTime())) return null;
  const text = raw.full_text;
  return {
    id: raw.id_str,
    text,
    createdAt,
    lang: raw.lang ?? 'und',
    isRetweet: text.startsWith('RT @'),
    isReply: Boolean(raw.in_reply_to_status_id_str),
    mentions: (raw.entities?.user_mentions ?? []).map((m) => m.screen_name).filter(Boolean),
    hashtags: (raw.entities?.hashtags ?? []).map((h) => h.text).filter(Boolean),
  };
}
