import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PredictionCard } from '../PredictionCard';
import { ErrorType } from '../../utils/errorHandling';

describe('PredictionCard', () => {
  const mockPrediction = {
    ticker: 'AAPL',
    direction: 'UP' as const,
    probability: 0.65,
    confidence: 'High',
    volatility: 'Medium',
    asOf: '2025-10-21T10:00:00Z',
    model: 'Production v1.0',
    factors: [
      { name: 'Recent 1-Day Return', shap: 0.5 }
    ],
    news: [
      { title: 'Test', summary: 'Test news', tone: 'Positive' as const, source: 'Test' }
    ]
  };

  it('should render prediction data correctly', () => {
    render(<PredictionCard data={mockPrediction} />);

    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('UP')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getAllByText('High')).toHaveLength(2); // Appears in confidence text and info pill
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });

  it('should show UP direction with correct styling', () => {
    render(<PredictionCard data={mockPrediction} />);

    const directionElement = screen.getByText('UP');
    const parentElement = directionElement.closest('.text-emerald-400');
    expect(parentElement).toBeInTheDocument();
  });

  it('should show DOWN direction with correct styling', () => {
    const downPrediction = { ...mockPrediction, direction: 'DOWN' as const };
    render(<PredictionCard data={downPrediction} />);

    const directionElement = screen.getByText('DOWN');
    const parentElement = directionElement.closest('.text-rose-400');
    expect(parentElement).toBeInTheDocument();
  });

  it('should render error state', () => {
    const mockError = {
      type: ErrorType.API,
      message: 'Failed to fetch prediction',
      code: 'API_ERROR',
      retryable: true,
      timestamp: new Date()
    };

    const onRetry = vi.fn();
    const onClearError = vi.fn();

    render(
      <PredictionCard 
        data={null} 
        loading="error" 
        error={mockError}
        onRetry={onRetry}
        onClearError={onClearError}
      />
    );

    expect(screen.getByText('Prediction Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch prediction')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('should call retry function when retry button is clicked', () => {
    const mockError = {
      type: ErrorType.API,
      message: 'Failed to fetch prediction',
      code: 'API_ERROR',
      retryable: true,
      timestamp: new Date()
    };

    const onRetry = vi.fn();
    const onClearError = vi.fn();

    render(
      <PredictionCard 
        data={null} 
        loading="error" 
        error={mockError}
        onRetry={onRetry}
        onClearError={onClearError}
      />
    );

    fireEvent.click(screen.getByText('Try Again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should call clear error function when dismiss button is clicked', () => {
    const mockError = {
      type: ErrorType.API,
      message: 'Failed to fetch prediction',
      code: 'API_ERROR',
      retryable: true,
      timestamp: new Date()
    };

    const onRetry = vi.fn();
    const onClearError = vi.fn();

    render(
      <PredictionCard 
        data={null} 
        loading="error" 
        error={mockError}
        onRetry={onRetry}
        onClearError={onClearError}
      />
    );

    fireEvent.click(screen.getByText('Dismiss'));
    expect(onClearError).toHaveBeenCalledTimes(1);
  });

  it('should render no data state', () => {
    render(<PredictionCard data={null} />);

    expect(screen.getByText('No Prediction Data')).toBeInTheDocument();
    expect(screen.getByText('Enter a ticker symbol to get started')).toBeInTheDocument();
  });

  it('should show loading overlay when refreshing', () => {
    render(<PredictionCard data={mockPrediction} loading="refreshing" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument(); // Previous data still visible
  });

  it('should calculate probability percentage correctly', () => {
    const prediction = { ...mockPrediction, probability: 0.7834 };
    render(<PredictionCard data={prediction} />);

    expect(screen.getByText('78%')).toBeInTheDocument();
  });
});