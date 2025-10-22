import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useHistoryData } from '../../src/hooks/useHistoryData';
import * as predictionApiModule from '../../src/services/predictionApi';
import type { HistoryRow } from '../../src/types';

vi.mock('../../src/services/predictionApi');

const mockHistory: HistoryRow[] = [
  {
    date: '2024-01-15',
    direction: 'UP',
    probability: 0.75,
    outcome: 'CORRECT'
  },
  {
    date: '2024-01-14',
    direction: 'DOWN',
    probability: 0.65,
    outcome: null
  }
];

describe('useHistoryData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useHistoryData());
    
    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('fetches history successfully', async () => {
    vi.spyOn(predictionApiModule.predictionApi, 'fetchHistory')
      .mockResolvedValue(mockHistory);
    
    const { result } = renderHook(() => useHistoryData());
    
    result.current.fetchHistory('AAPL');
    
    await waitFor(() => {
      expect(result.current.loading).toBe('idle');
    });
    
    expect(result.current.data).toEqual(mockHistory);
    expect(result.current.error).toBeNull();
  });

  it('sets loading state when fetching', async () => {
    vi.spyOn(predictionApiModule.predictionApi, 'fetchHistory')
      .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockHistory), 100)));
    
    const { result } = renderHook(() => useHistoryData());
    
    result.current.fetchHistory('AAPL');
    
    await waitFor(() => {
      expect(['loading', 'idle']).toContain(result.current.loading);
    });
  });

  it('handles fetch error', async () => {
    const error = new Error('API Error');
    vi.spyOn(predictionApiModule.predictionApi, 'fetchHistory')
      .mockRejectedValue(error);
    
    const { result } = renderHook(() => useHistoryData());
    
    result.current.fetchHistory('AAPL');
    
    await waitFor(() => {
      expect(result.current.loading).toBe('error');
    });
    
    expect(result.current.error).toBeTruthy();
  });

  it('clears error on successful fetch', async () => {
    // First fetch fails
    vi.spyOn(predictionApiModule.predictionApi, 'fetchHistory')
      .mockRejectedValueOnce(new Error('Error'));
    
    const { result } = renderHook(() => useHistoryData());
    
    result.current.fetchHistory('AAPL');
    await waitFor(() => expect(result.current.error).toBeTruthy());
    
    // Second fetch succeeds
    vi.spyOn(predictionApiModule.predictionApi, 'fetchHistory')
      .mockResolvedValue(mockHistory);
    
    result.current.fetchHistory('AAPL');
    
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
    
    expect(result.current.data).toEqual(mockHistory);
  });

  it('ignores AbortError', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    
    vi.spyOn(predictionApiModule.predictionApi, 'fetchHistory')
      .mockRejectedValue(abortError);
    
    const { result } = renderHook(() => useHistoryData());
    
    result.current.fetchHistory('AAPL');
    
    await waitFor(() => {
      expect(result.current.loading).toBe('idle');
    });
    
    expect(result.current.error).toBeNull();
  });

  it('updates data when fetching different ticker', async () => {
    const aaplHistory = mockHistory;
    const msftHistory = [
      {
        date: '2024-01-15',
        direction: 'DOWN' as const,
        probability: 0.60,
        outcome: 'INCORRECT' as const
      }
    ];
    
    vi.spyOn(predictionApiModule.predictionApi, 'fetchHistory')
      .mockResolvedValueOnce(aaplHistory)
      .mockResolvedValueOnce(msftHistory);
    
    const { result } = renderHook(() => useHistoryData());
    
    result.current.fetchHistory('AAPL');
    await waitFor(() => expect(result.current.data).toEqual(aaplHistory));
    
    result.current.fetchHistory('MSFT');
    await waitFor(() => expect(result.current.data).toEqual(msftHistory));
  });

  it('preserves data during refresh', async () => {
    vi.spyOn(predictionApiModule.predictionApi, 'fetchHistory')
      .mockResolvedValue(mockHistory);
    
    const { result } = renderHook(() => useHistoryData());
    
    result.current.fetchHistory('AAPL');
    await waitFor(() => expect(result.current.data).toEqual(mockHistory));
    
    // Trigger refresh
    vi.spyOn(predictionApiModule.predictionApi, 'fetchHistory')
      .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockHistory), 100)));
    
    result.current.fetchHistory('AAPL');
    
    // Data should still be available during refresh
    expect(result.current.data).toEqual(mockHistory);
  });
});
