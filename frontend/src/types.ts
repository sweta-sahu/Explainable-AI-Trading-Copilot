export type Health = {
  api: 'up' | 'down';
  model: 'hot' | 'cold';
  data: 'fresh' | 'stale';
};

export type Factor = {
  name: string;
  shap: number;
};

export type News = {
  title: string;
  summary: string;
  tone: 'Positive' | 'Negative' | 'Neutral';
  source: string;
};

export type Prediction = {
  ticker: string;
  direction: 'UP' | 'DOWN';
  probability: number;
  confidence: string;
  volatility: string;
  asOf: string;
  model: string;
  factors: Factor[];
  news: News[];
};

export type HistoryRow = {
  date: string;
  direction: 'UP' | 'DOWN';
  probability: number;
  outcome: 'CORRECT' | 'INCORRECT' | null;
};

// History API response type
export type HistoryApiResponse = {
  model_version: string;
  features_s3_path: string;
  datatype: string;
  data_found_for: string;
  ingested_at: string;
  confidence: string;
  prediction: 'Up' | 'Down';
  probability_up: string;
  ticker_date: string;
};

// API-related types
export type LoadingState = 'idle' | 'loading' | 'refreshing' | 'error';

// Legacy type for backward compatibility
export type ApiError = {
  message: string;
  code?: string;
  status?: number;
};

export type PredictionState = {
  data: Prediction | null;
  loading: LoadingState;
  error: ApiError | null;
};
