import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvidencePanel } from '../../src/components/EvidencePanel';
import type { Prediction } from '../../src/types';
import type { AppError } from '../../src/utils/errorHandling';

const mockPrediction: Prediction = {
  ticker: 'AAPL',
  direction: 'UP',
  probability: 0.75,
  confidence: 'High',
  volatility: 'Medium',
  asOf: '2024-01-15T10:30:00Z',
  model: 'v1.0',
  factors: [
    { name: 'RSI', shap: 0.5 },
    { name: 'Volume', shap: -0.3 },
    { name: 'Moving Average', shap: 0.2 },
  ],
  news: [
    {
      title: 'Model Analysis',
      summary: 'The model predicts upward movement based on technical indicators.',
      tone: 'Neutral',
      source: 'AI Model'
    }
  ]
};

describe('EvidencePanel', () => {
  it('renders evidence panel with factors', () => {
    render(<EvidencePanel data={mockPrediction} />);
    
    expect(screen.getByText('Explainability: Key Factors')).toBeInTheDocument();
    expect(screen.getByText('Positive Drivers')).toBeInTheDocument();
    expect(screen.getByText('Negative Drivers')).toBeInTheDocument();
  });

  it('displays positive factors correctly', () => {
    render(<EvidencePanel data={mockPrediction} />);
    
    expect(screen.getByText('RSI')).toBeInTheDocument();
    expect(screen.getByText('Moving Average')).toBeInTheDocument();
  });

  it('displays negative factors correctly', () => {
    render(<EvidencePanel data={mockPrediction} />);
    
    expect(screen.getByText('Volume')).toBeInTheDocument();
  });

  it('displays model analysis section', () => {
    render(<EvidencePanel data={mockPrediction} />);
    
    const modelAnalysisElements = screen.getAllByText('Model Analysis');
    expect(modelAnalysisElements.length).toBeGreaterThan(0);
    expect(screen.getByText('The model predicts upward movement based on technical indicators.')).toBeInTheDocument();
  });

  it('shows no data state when data is null', () => {
    render(<EvidencePanel data={null} />);
    
    expect(screen.getByText('No Evidence Available')).toBeInTheDocument();
    expect(screen.getByText('Get a prediction to see the key factors')).toBeInTheDocument();
  });

  it('shows error state with error message', () => {
    const error: AppError = {
      message: 'Failed to load evidence',
      code: 'API_ERROR',
      type: 'api' as const
    };
    
    render(<EvidencePanel data={null} loading="error" error={error} />);
    
    expect(screen.getByText('Unable to Load Evidence')).toBeInTheDocument();
    expect(screen.getByText('Failed to load evidence')).toBeInTheDocument();
  });

  it('displays loading spinner when refreshing', () => {
    render(<EvidencePanel data={mockPrediction} loading="refreshing" />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays news item with tone and source', () => {
    render(<EvidencePanel data={mockPrediction} />);
    
    expect(screen.getByText(/Tone:/)).toBeInTheDocument();
    expect(screen.getByText('Neutral')).toBeInTheDocument();
    expect(screen.getByText(/Source:/)).toBeInTheDocument();
    expect(screen.getByText('AI Model')).toBeInTheDocument();
  });

  it('limits positive factors to top 5', () => {
    const manyFactors: Prediction = {
      ...mockPrediction,
      factors: Array.from({ length: 10 }, (_, i) => ({
        name: `Factor ${i}`,
        shap: 0.1 * (i + 1)
      }))
    };
    
    render(<EvidencePanel data={manyFactors} />);
    
    const positiveSection = screen.getByText('Positive Drivers').closest('div');
    const factorElements = positiveSection?.querySelectorAll('[title]');
    expect(factorElements?.length).toBeLessThanOrEqual(5);
  });

  it('limits negative factors to top 5', () => {
    const manyFactors: Prediction = {
      ...mockPrediction,
      factors: Array.from({ length: 10 }, (_, i) => ({
        name: `Factor ${i}`,
        shap: -0.1 * (i + 1)
      }))
    };
    
    render(<EvidencePanel data={manyFactors} />);
    
    const negativeSection = screen.getByText('Negative Drivers').closest('div');
    const factorElements = negativeSection?.querySelectorAll('[title]');
    expect(factorElements?.length).toBeLessThanOrEqual(5);
  });

  it('converts negative SHAP values to positive for display', () => {
    render(<EvidencePanel data={mockPrediction} />);
    
    // Volume has shap of -0.3, should display as 0.30
    expect(screen.getByText('0.30')).toBeInTheDocument();
  });

  it('renders multiple news items', () => {
    const multiNews: Prediction = {
      ...mockPrediction,
      news: [
        {
          title: 'Analysis 1',
          summary: 'Summary 1',
          tone: 'Positive',
          source: 'Source 1'
        },
        {
          title: 'Analysis 2',
          summary: 'Summary 2',
          tone: 'Negative',
          source: 'Source 2'
        }
      ]
    };
    
    render(<EvidencePanel data={multiNews} />);
    
    expect(screen.getByText('Analysis 1')).toBeInTheDocument();
    expect(screen.getByText('Analysis 2')).toBeInTheDocument();
    expect(screen.getByText('Summary 1')).toBeInTheDocument();
    expect(screen.getByText('Summary 2')).toBeInTheDocument();
  });
});
