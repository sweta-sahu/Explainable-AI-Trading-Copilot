import { useMemo, useState, useEffect } from 'react';
import { HealthBadge } from './components/HealthBadge';
import { TickerInput } from './components/TickerInput';
import { PredictionCard } from './components/PredictionCard';
import { EvidencePanel } from './components/EvidencePanel';
import { HistoryTable } from './components/HistoryTable';
import { SkeletonLoader } from './components/SkeletonLoader';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useApiData } from './hooks/useApiData';
import { useHistoryData } from './hooks/useHistoryData';
import { MOCK_HEALTH } from './data/mock';

function App() {
  const [ticker, setTicker] = useState('AAPL');
  const { data: prediction, loading, error, isRefreshing, fetchData, retry, clearError } = useApiData();
  const { data: history, loading: historyLoading, error: historyError, fetchHistory } = useHistoryData();



  // Fetch initial data on mount
  useEffect(() => {
    fetchData(ticker);
    fetchHistory(ticker);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle ticker changes
  const handleTickerChange = (newTicker: string) => {
    setTicker(newTicker);
    if (newTicker.trim()) {
      fetchData(newTicker);
      fetchHistory(newTicker);
    }
  };

  // Handle predict button click (refresh current ticker)
  const handlePredict = () => {
    if (ticker.trim()) {
      fetchData(ticker);
      fetchHistory(ticker);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      
      {/* Background ambient lighting effect */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-20vw] top-[-20vh] h-[80vh] w-[80vw] rounded-full bg-blue-900/30 opacity-50 blur-[150px]"></div>
        <div className="absolute bottom-[-30vh] right-[-10vw] h-[70vh] w-[70vw] rounded-full bg-emerald-900/30 opacity-50 blur-[150px]"></div>
      </div>

      <header className="sticky top-0 z-10 border-b border-white/10 bg-gray-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <h1 className="text-xl font-bold tracking-tight">AI Trading Copilot</h1>
          <HealthBadge status={MOCK_HEALTH} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        <section className="flex justify-center">
          <div className="relative">
            <TickerInput
              value={ticker}
              onChange={handleTickerChange}
              onPredict={handlePredict}
              disabled={loading === 'loading'}
              error={error?.code === 'INVALID_TICKER' || error?.code === 'EMPTY_TICKER' ? error.message : undefined}
            />
            {isRefreshing && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <LoadingSpinner size="small" position="inline" />
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-7">
          <div className="lg:col-span-3">
            <ErrorBoundary>
              {loading === 'loading' ? (
                <SkeletonLoader variant="prediction-card" />
              ) : (
                <PredictionCard 
                  data={prediction} 
                  loading={loading}
                  error={error}
                  onRetry={retry}
                  onClearError={clearError}
                />
              )}
            </ErrorBoundary>
          </div>
          <div className="lg:col-span-4">
            <ErrorBoundary>
              {loading === 'loading' ? (
                <SkeletonLoader variant="evidence-panel" />
              ) : (
                <EvidencePanel 
                  data={prediction}
                  loading={loading}
                  error={error}
                />
              )}
            </ErrorBoundary>
          </div>
        </section>

        <section>
          <ErrorBoundary>
            {historyLoading === 'loading' ? (
              <SkeletonLoader variant="history-table" />
            ) : historyError ? (
              <div className="rounded-2xl border border-red-500/20 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
                <div className="flex flex-col items-center justify-center space-y-4 text-center py-8">
                  <div className="rounded-full bg-red-500/10 p-3">
                    <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Unable to Load History</h3>
                    <p className="text-sm text-white/70">{historyError.message}</p>
                  </div>
                  <button
                    onClick={() => fetchHistory(ticker)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <HistoryTable rows={history} />
            )}
          </ErrorBoundary>
        </section>
      </main>

      <footer className="py-8 text-center text-sm text-white/50">
        <p>Explainable AI Trading Copilot • Demo UI • Not financial advice</p>
      </footer>
    </div>
  );
}

export default App;
