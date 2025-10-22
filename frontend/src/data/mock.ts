import type { Health, Prediction, HistoryRow } from '../types';

export const MOCK_HEALTH: Health = { api: 'up', model: 'hot', data: 'fresh' };

// Mock history now includes the current date for realism
export const MOCK_HISTORY = (ticker: string): HistoryRow[] => {
  const today = new Date();
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  console.log(ticker); // Keep ticker for potential future use
  return [
    { date: formatDate(today), direction: 'UP', probability: 0.68, outcome: null },
    { date: '2025-10-14', direction: 'UP', probability: 0.72, outcome: 'CORRECT' },
    { date: '2025-10-13', direction: 'DOWN', probability: 0.61, outcome: 'INCORRECT' },
    { date: '2025-10-10', direction: 'UP', probability: 0.85, outcome: 'CORRECT' },
    { date: '2025-10-09', direction: 'DOWN', probability: 0.53, outcome: 'CORRECT' },
    { date: '2025-10-08', direction: 'UP', probability: 0.77, outcome: 'CORRECT' },
    { date: '2025-10-07', direction: 'DOWN', probability: 0.59, outcome: 'CORRECT' },
    { date: '2025-10-06', direction: 'DOWN', probability: 0.81, outcome: 'CORRECT' },
  ];
}

export const makeMockPrediction = (ticker: string, seed: number): Prediction => {
  // A simple deterministic generator based on ticker and seed
  const hash = Array.from(ticker).reduce((acc, char) => acc + char.charCodeAt(0), 0) + seed;
  const direction = (hash % 2) === 0 ? 'UP' : 'DOWN';
  const probability = 0.5 + ((hash % 45) / 100);

  return {
    ticker,
    direction,
    probability,
    confidence: (probability > 0.75) ? 'High' : (probability > 0.6) ? 'Medium' : 'Low',
    volatility: (hash % 3 === 0) ? 'High' : (hash % 3 === 1) ? 'Medium' : 'Low',
    asOf: new Date().toISOString(),
    model: `v${(hash % 3) + 2}.1-alpha`,
    factors: [
      { name: 'Recent Earnings Beat', shap: direction === 'UP' ? 0.35 : -0.15 },
      { name: 'Insider Buying Activity', shap: direction === 'UP' ? 0.22 : -0.05 },
      { name: 'Positive Analyst Ratings', shap: direction === 'UP' ? 0.18 : -0.1 },
      { name: 'S&P 500 Index Strength', shap: 0.08 },
      { name: 'Low Volume on Pullback', shap: direction === 'UP' ? -0.05 : -0.2 },
      { name: 'High Debt-to-Equity Ratio', shap: direction === 'DOWN' ? -0.25 : 0.05 },
      { name: 'Interest Rate Hike Fear', shap: direction === 'DOWN' ? -0.15 : 0.08 },
      { name: 'Sector Weakness (Tech)', shap: direction === 'DOWN' ? -0.12 : -0.02 },
    ].sort((a, b) => b.shap - a.shap), // Sort for consistent positive/negative split
    news: [
      { title: `${ticker} announces new product line, surprising analysts.`, summary: 'The stock reacted positively to the unexpected product launch, driving up sentiment.', tone: 'Positive', source: 'Reuters' },
      { title: 'Global chip shortage hits quarterly guidance.', summary: 'Supply chain concerns continue to plague the industry, leading to a cautious outlook from management.', tone: 'Negative', source: 'Bloomberg' },
    ]
  };
};
