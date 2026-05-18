export interface LinguisticFeatures {
  avg_sentence_length: number;
  punctuation_pattern: string;
  top_15_words: string[];
  signature_phrases: string[];
  paragraph_style: string;
  tone: string;
}

export interface EmojiFeatures {
  frequency_per_message: number;
  top_5: string[];
}

export interface EntityFeatures {
  top_people: string[];
  top_places: string[];
}

export interface OpinionFeatures {
  stated_stances: string[];
}

export interface TemporalFeatures {
  active_hours: string;
  peak_periods: string[];
}

export interface SentimentFeatures {
  emotion_breakdown: Record<string, number>;
  overall_tone: string;
}

export interface UserFeatures {
  linguistic: LinguisticFeatures;
  emoji: EmojiFeatures;
  entities: EntityFeatures;
  opinions: OpinionFeatures;
  interests: string[];
  temporal: TemporalFeatures;
  sentiment: SentimentFeatures;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GhostReply {
  text: string;
  regenerated: boolean;
  stop_reason: string | null;
}
