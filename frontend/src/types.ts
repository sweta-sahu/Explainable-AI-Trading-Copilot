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
