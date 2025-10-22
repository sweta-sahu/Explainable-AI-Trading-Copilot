import { useState } from 'react';

type TickerInputProps = {
  value: string;
  onChange: (v: string) => void;
  onPredict: () => void;
  disabled?: boolean;
  error?: string;
};

export function TickerInput({ value, onChange, onPredict, disabled = false, error }: TickerInputProps) {
  const [localValue, setLocalValue] = useState(value);

  const handlePredict = () => {
    onChange(localValue.trim() || 'AAPL'); // Fallback to AAPL if empty
    onPredict();
  };

  return (
    <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
      <label htmlFor="ticker" className="block text-sm font-medium text-white/70 mb-2">
        Enter Stock Ticker
      </label>
      <div className="flex gap-3">
        <input
          id="ticker"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter' && !disabled) handlePredict(); }}
          placeholder="e.g., AAPL, GOOG, TSLA"
          disabled={disabled}
          className={`flex-1 rounded-lg border px-4 py-2.5 text-lg font-medium tracking-wider text-white placeholder:text-white/40 transition duration-200 focus:outline-none focus:ring-2 ${
            error 
              ? 'border-red-500/50 bg-red-500/10 focus:border-red-500 focus:ring-red-500/50' 
              : disabled
              ? 'border-white/5 bg-white/5 cursor-not-allowed opacity-50'
              : 'border-white/10 bg-white/5 focus:border-blue-500 focus:bg-gray-900 focus:ring-blue-500/50'
          }`}
        />
        <button
          onClick={handlePredict}
          disabled={disabled}
          title="Run prediction (Enter)"
          className={`rounded-lg px-6 py-2.5 text-base font-semibold text-white shadow-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            disabled
              ? 'bg-gray-600 cursor-not-allowed opacity-50'
              : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-500 focus:ring-blue-500 active:scale-[0.98]'
          }`}
        >
          Analyze
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-400">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-right text-xs text-white/50">
          Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">Enter</kbd> to run
        </p>
      )}
    </div>
  );
}
