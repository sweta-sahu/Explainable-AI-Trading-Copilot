import type { HistoryRow } from '../types';

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
      <header className="border-b border-white/10 pb-4">
        <h3 className="text-xl font-bold tracking-tight text-white">Prediction History</h3>
        <p className="text-sm text-white/60">Recent trading day predictions</p>
      </header>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="text-left">
            <tr className="border-b border-white/10">
              <th className="py-2 pr-4 font-semibold uppercase tracking-wider text-white/50">Date</th>
              <th className="py-2 px-4 text-center font-semibold uppercase tracking-wider text-white/50">Direction</th>
              <th className="py-2 px-4 text-right font-semibold uppercase tracking-wider text-white/50">Probability</th>
              <th className="py-2 pl-4 text-center font-semibold uppercase tracking-wider text-white/50">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 transition-colors last:border-none hover:bg-white/5">
                <td className="py-3 pr-4 font-medium text-white/85">{row.date}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${row.direction === 'UP' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                    {row.direction === 'UP' ? '▲' : '▼'} {row.direction}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-semibold tabular-nums text-white/90">
                  {Math.round(row.probability * 100)}%
                </td>
                <td className="py-3 pl-4 text-center">
                  {row.outcome ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${row.outcome === 'CORRECT' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                      {row.outcome === 'CORRECT' ? '✓' : '✕'} {row.outcome}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-white/50">— PENDING —</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
