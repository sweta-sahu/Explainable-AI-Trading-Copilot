import type { Prediction, LoadingState } from '../types';
import type { AppError } from '../utils/errorHandling';
import { InfoPill } from './InfoPill';
import { LoadingSpinner } from './LoadingSpinner';

interface PredictionCardProps {
  data: Prediction | null;
  loading?: LoadingState;
  error?: AppError | null;
  onRetry?: () => void;
  onClearError?: () => void;
}

export function PredictionCard({ data, loading, error, onRetry, onClearError }: PredictionCardProps) {
  // Handle error state
  if (loading === 'error' && error) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-red-500/20 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
        <div className="flex flex-1 flex-col items-center justify-center space-y-4 text-center">
          <div className="rounded-full bg-red-500/10 p-3">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Prediction Error</h3>
            <p className="text-sm text-white/70 mb-4">{error.message}</p>
          </div>
          <div className="flex gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Try Again
              </button>
            )}
            {onClearError && (
              <button
                onClick={onClearError}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle no data state
  if (!data) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
        <div className="flex flex-1 flex-col items-center justify-center space-y-4 text-center">
          <div className="rounded-full bg-white/5 p-3">
            <svg className="h-8 w-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">No Prediction Data</h3>
            <p className="text-sm text-white/70">Enter a ticker symbol to get started</p>
          </div>
        </div>
      </div>
    );
  }

  const isUp = data.direction === 'UP';
  const probabilityPct = Math.round(data.probability * 100);
  const dirColor = isUp ? 'text-emerald-400' : 'text-rose-400';
  const barBg = isUp ? 'bg-emerald-500' : 'bg-rose-500';
  const dirRing = isUp ? 'ring-emerald-300/40' : 'ring-rose-300/40';
  const dirBg = isUp ? 'bg-emerald-500/10' : 'bg-rose-500/10';

  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-white/10 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
      {loading === 'refreshing' && (
        <LoadingSpinner size="small" position="overlay" className="rounded-2xl" />
      )}
      <header className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wider text-white/60">Prediction For</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-white">{data.ticker}</h2>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-bold ring-2 ring-inset ${dirColor} ${dirBg} ${dirRing}`}>
          <span aria-hidden="true">{isUp ? '▲' : '▼'}</span>
          <span>{data.direction}</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center space-y-4 py-8">
        <p className="text-sm font-medium uppercase tracking-wider text-white/70">
          Predicted Probability
        </p>
        <p className={`text-8xl font-extrabold tabular-nums ${dirColor}`}>
          {probabilityPct}%
        </p>
        <div className="w-full max-w-xs overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-2.5 transition-all duration-500 ease-out ${barBg}`}
            style={{ width: `${probabilityPct}%` }}
          />
        </div>
        <p className="text-xs text-white/60">Confidence in the daily movement: <span className="font-semibold">{data.confidence}</span></p>
      </div>

      <footer className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
        <InfoPill label="Confidence" value={data.confidence} />
        <InfoPill label="Volatility" value={data.volatility} />
        <InfoPill label="Pred. Time" value={new Date(data.asOf).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
        <InfoPill label="Model Ver." value={data.model} />
      </footer>
    </div>
  );
}
