interface SkeletonLoaderProps {
  variant: 'prediction-card' | 'evidence-panel' | 'history-table';
  className?: string;
}

function SkeletonBox({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/10 rounded ${className}`} />
  );
}

export function SkeletonLoader({ variant, className = '' }: SkeletonLoaderProps) {
  if (variant === 'prediction-card') {
    return (
      <div className={`flex h-full flex-col rounded-2xl border border-white/10 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg ${className}`}>
        {/* Header skeleton */}
        <header className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="space-y-2">
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-8 w-16" />
          </div>
          <SkeletonBox className="h-8 w-20 rounded-full" />
        </header>

        {/* Main content skeleton */}
        <div className="flex flex-1 flex-col items-center justify-center space-y-4 py-8">
          <SkeletonBox className="h-4 w-32" />
          <SkeletonBox className="h-20 w-32" />
          <SkeletonBox className="h-2 w-48 rounded-full" />
          <SkeletonBox className="h-3 w-40" />
        </div>

        {/* Footer skeleton */}
        <footer className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
          <SkeletonBox className="h-12 rounded-lg" />
          <SkeletonBox className="h-12 rounded-lg" />
          <SkeletonBox className="h-12 rounded-lg" />
          <SkeletonBox className="h-12 rounded-lg" />
        </footer>
      </div>
    );
  }

  if (variant === 'evidence-panel') {
    return (
      <div className={`rounded-2xl border border-white/10 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg ${className}`}>
        {/* Header skeleton */}
        <div className="mb-6 space-y-2">
          <SkeletonBox className="h-6 w-32" />
          <SkeletonBox className="h-4 w-full" />
          <SkeletonBox className="h-4 w-3/4" />
        </div>

        {/* Factors skeleton */}
        <div className="space-y-3">
          <SkeletonBox className="h-5 w-24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <SkeletonBox className="h-4 w-32" />
              <SkeletonBox className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'history-table') {
    return (
      <div className={`rounded-2xl border border-white/10 bg-gray-900/50 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg ${className}`}>
        {/* Header skeleton */}
        <div className="mb-4">
          <SkeletonBox className="h-6 w-40" />
        </div>

        {/* Table skeleton */}
        <div className="space-y-3">
          {/* Table header */}
          <div className="grid grid-cols-4 gap-4 border-b border-white/10 pb-2">
            <SkeletonBox className="h-4 w-16" />
            <SkeletonBox className="h-4 w-20" />
            <SkeletonBox className="h-4 w-24" />
            <SkeletonBox className="h-4 w-18" />
          </div>
          
          {/* Table rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4 py-2">
              <SkeletonBox className="h-4 w-20" />
              <SkeletonBox className="h-4 w-12" />
              <SkeletonBox className="h-4 w-16" />
              <SkeletonBox className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}