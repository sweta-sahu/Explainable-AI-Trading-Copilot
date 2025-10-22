import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PredictionCard } from '../../src/components/PredictionCard';
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
  factors: [],
  news: []
};

describe('PredictionCard', () => {
  it('renders prediction data correctly', () => {
    render(<PredictionCard data={mockPrediction} />);
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('UP')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
  });

  it('displays UP direction with correct styling', () => {
    render(<PredictionCard data={mockPrediction} />);
    
    const directionBadge = screen.getByText('UP').closest('div');
    expect(directionBadge?.className).toContain('text-emerald-400');
  });

  it('displays DOWN direction with correct styling', () => {
    const downPrediction = { ...mockPrediction, direction: 'DOWN' as const };
    render(<PredictionCard data={downPrediction} />);
    
    const directionBadge = screen.getByText('DOWN').closest('div');
    expect(directionBadge?.className).toContain('text-rose-400');
  });

  it('shows no data state when data is null', () => {
    render(<PredictionCard data={null} />);
    
    expect(screen.getByText('No Prediction Data')).toBeInTheDocument();
    expect(screen.getByText('Enter a ticker symbol to get started')).toBeInTheDocument();
  });

  it('shows error state with error message', () => {
    const error: AppError = {
      message: 'Failed to fetch prediction',
      code: 'API_ERROR',
      type: 'api' as const
    };
    
    render(<PredictionCard data={null} loading="error" error={error} />);
    
    expect(screen.getByText('Prediction Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch prediction')).toBeInTheDocument();
  });

  it('calls onRetry when Try Again button is clicked', () => {
    const handleRetry = vi.fn();
    const error: AppError = {
      message: 'Error',
      code: 'ERROR',
      type: 'api' as const
    };
    
    render(
      <PredictionCard
        data={null}
        loading="error"
        error={error}
        onRetry={handleRetry}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);
    
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onClearError when Dismiss button is clicked', () => {
    const handleClearError = vi.fn();
    const error: AppError = {
      message: 'Error',
      code: 'ERROR',
      type: 'api' as const
    };
    
    render(
      <PredictionCard
        data={null}
        loading="error"
        error={error}
        onClearError={handleClearError}
      />
    );
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    
    expect(handleClearError).toHaveBeenCalledTimes(1);
  });

  it('displays loading spinner when refreshing', () => {
    render(<PredictionCard data={mockPrediction} loading="refreshing" />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays confidence level correctly', () => {
    render(<PredictionCard data={mockPrediction} />);
    
    expect(screen.getByText(/confidence in the daily movement:/i)).toBeInTheDocument();
    expect(screen.getAllByText('High').length).toBeGreaterThan(0);
  });

  it('displays volatility in footer', () => {
    render(<PredictionCard data={mockPrediction} />);
    
    expect(screen.getByText('Volatility')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('displays model version in footer', () => {
    render(<PredictionCard data={mockPrediction} />);
    
    expect(screen.getByText('Model Ver.')).toBeInTheDocument();
    expect(screen.getByText('v1.0')).toBeInTheDocument();
  });

  it('formats probability as percentage', () => {
    const prediction = { ...mockPrediction, probability: 0.8523 };
    render(<PredictionCard data={prediction} />);
    
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('displays progress bar with correct width', () => {
    render(<PredictionCard data={mockPrediction} />);
    
    const progressBar = document.querySelector('.h-2\\.5');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('shows both retry and dismiss buttons in error state', () => {
    const error: AppError = {
      message: 'Error',
      code: 'ERROR',
      type: 'api' as const
    };
    
    render(
      <PredictionCard
        data={null}
        loading="error"
        error={error}
        onRetry={vi.fn()}
        onClearError={vi.fn()}
      />
    );
    
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });
});
