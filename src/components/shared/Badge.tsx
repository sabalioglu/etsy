import React from 'react';

export type BadgeStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: BadgeStatus;
  label?: string;
  children?: React.ReactNode;
}

const statusStyles: Record<BadgeStatus, { bg: string; text: string; dot: string }> = {
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    dot: 'bg-yellow-500',
  },
  processing: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    dot: 'bg-blue-500',
  },
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    dot: 'bg-green-500',
  },
  failed: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    dot: 'bg-red-500',
  },
};

const statusLabels: Record<BadgeStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
};

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      status,
      label,
      children,
      className = '',
      ...rest
    },
    ref
  ) => {
    const styles = statusStyles[status];
    const displayLabel = label || children || statusLabels[status];

    const baseStyles = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium';
    const combinedClassName = `${baseStyles} ${styles.bg} ${styles.text} ${className}`;

    return (
      <div ref={ref} className={combinedClassName} {...rest}>
        <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
        <span>{displayLabel}</span>
      </div>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
