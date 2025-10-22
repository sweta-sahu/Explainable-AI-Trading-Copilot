import type { Prediction, LoadingState } from '../types';
import type { AppError } from '../utils/errorHandling';
import { FactorList } from './FactorList';
import { LoadingSpinner } from './LoadingSpinner';

interface EvidencePanelProps {
  data: Prediction | null;
  loading?: LoadingState;
  error?: AppError | null;
}

export function EvidencePanel({ data, loading, error }: EvidencePanelProps) {
  // Handle error or no data state
  if (loading === 'error' && error) {
    return (
      <div className="h-full rounded-2xl border border-red-500/20 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
        <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
          <div className="rounded-full bg-red-500/10 p-3">
            <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Unable to Load Evidence</h3>
            <p className="text-sm text-white/70">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full rounded-2xl border border-white/10 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
        <div className="flex h-full flex-col items-center justify-center space-y-4 text-center">
          <div className="rounded-full bg-white/5 p-3">
            <svg className="h-6 w-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">No Evidence Available</h3>
            <p className="text-sm text-white/70">Get a prediction to see the key factors</p>
          </div>
        </div>
      </div>
    );
  }

  const positiveFactors = data.factors.filter((f) => f.shap > 0).slice(0, 5);
  const negativeFactors = data.factors.filter((f) => f.shap < 0).map(f => ({ ...f, shap: Math.abs(f.shap) })).slice(0, 5);

  return (
    <div className="relative h-full rounded-2xl border border-white/10 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
      {loading === 'refreshing' && (
        <LoadingSpinner size="small" position="overlay" className="rounded-2xl" />
      )}
      <h3 className="border-b border-white/10 pb-4 text-xl font-bold tracking-tight text-white">
        Explainability: Key Factors
      </h3>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <FactorList title="Positive Drivers" items={positiveFactors} color="emerald" />
        <FactorList title="Negative Drivers" items={negativeFactors} color="rose" />
      </div>
      <div className="mt-8 border-t border-white/10 pt-6">
        <h4 className="text-lg font-semibold text-white/95">Model Analysis</h4>
        <div className="mt-4 space-y-4">
          {data.news.map((item, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10">
              <p className="text-base font-semibold leading-snug text-white/90">{item.title}</p>
              <p className="text-sm leading-relaxed text-white/75">{item.summary}</p>
              <div className="flex justify-between pt-2 text-xs font-mono text-white/50">
                <span>Tone: <span className="font-semibold text-white/70">{item.tone}</span></span>
                <span>Source: <span className="font-semibold text-white/70">{item.source}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
