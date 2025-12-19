import React from 'react';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
  text?: string;
  centered?: boolean;
  className?: string;
}

const sizeStyles: Record<LoadingSpinnerSize, string> = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

const textSizeStyles: Record<LoadingSpinnerSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  (
    {
      size = 'md',
      text,
      centered = false,
      className = '',
    },
    ref
  ) => {
    const spinnerSize = sizeStyles[size];
    const textSize = textSizeStyles[size];

    const containerClass = centered
      ? 'flex flex-col items-center justify-center min-h-screen'
      : 'flex flex-col items-center justify-center';

    return (
      <div
        ref={ref}
        className={`${containerClass} ${className}`}
        role="status"
        aria-label={text || 'Loading'}
      >
        <div
          className={`${spinnerSize} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
        />

        {text && (
          <p className={`${textSize} text-gray-600 mt-4 font-medium`}>
            {text}
          </p>
        )}

        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;
