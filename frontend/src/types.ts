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
