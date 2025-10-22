import { useState, useCallback, useRef, useEffect } from 'react';
import { predictionApi } from '../services/predictionApi';
import { normalizeError, errorLogger, getUserFriendlyMessage, type AppError } from '../utils/errorHandling';
import type { HistoryRow, LoadingState } from '../types';

export interface UseHistoryDataReturn {
  data: HistoryRow[];
  loading: LoadingState;
  error: AppError | null;
  fetchHistory: (ticker: string) => Promise<void>;
  clearError: () => void;
}

export function useHistoryData(): UseHistoryDataReturn {
  const [data, setData] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState<LoadingState>('idle');
  const [error, setError] = useState<AppError | null>(null);
  const lastTickerRef = useRef<string>('');
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchHistory = useCallback(async (ticker: string) => {
    const context = { ticker, component: 'useHistoryData' };
    
    // Clear previous error and set loading
    setError(null);
    setLoading('loading');
    
    lastTickerRef.current = ticker;

    try {
      const historyData = await predictionApi.fetchHistory(ticker);
      
      // Always update state if we get here
      setData(historyData);
      setLoading('idle');
      setError(null);
      
    } catch (err) {
      
      setLoading('error');
      
      // Don't show error if request was just cancelled
      if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))) {
        setLoading('idle');
        return;
      }
      
      // Normalize the error and log it
      const normalizedError = normalizeError(err, context);
      errorLogger.log(normalizedError, context);
      
      // Set user-friendly error message
      const userFriendlyError = {
        ...normalizedError,
        message: getUserFriendlyMessage(normalizedError)
      };
      
      setError(userFriendlyError);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    if (loading === 'error') {
      setLoading('idle');
    }
  }, [loading]);

  return {
    data,
    loading,
    error,
    fetchHistory,
    clearError,
  };
}