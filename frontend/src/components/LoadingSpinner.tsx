interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  position?: 'inline' | 'overlay' | 'center';
  className?: string;
}

export function LoadingSpinner({ 
  size = 'medium', 
  position = 'center',
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  const positionClasses = {
    inline: 'inline-block',
    overlay: 'absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm',
    center: 'flex items-center justify-center'
  };

  const spinnerElement = (
    <div
      className={`animate-spin rounded-full border-2 border-white/20 border-t-white ${sizeClasses[size]}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (position === 'overlay') {
    return (
      <div className={`${positionClasses[position]} ${className}`}>
        {spinnerElement}
      </div>
    );
  }

  return (
    <div className={`${positionClasses[position]} ${className}`}>
      {spinnerElement}
    </div>
  );
}