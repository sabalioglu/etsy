import React from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      padding = 'md',
      header,
      footer,
      children,
      className = '',
      ...rest
    },
    ref
  ) => {
    const baseStyles = 'bg-white rounded-lg border border-gray-200 shadow-sm';
    const paddingClass = paddingStyles[padding];
    const combinedClassName = `${baseStyles} ${className}`;

    return (
      <div ref={ref} className={combinedClassName} {...rest}>
        {header && (
          <div className={`border-b border-gray-200 ${padding !== 'none' ? paddingClass : 'px-6 py-4'}`}>
            {header}
          </div>
        )}

        <div className={padding !== 'none' ? paddingClass : ''}>
          {children}
        </div>

        {footer && (
          <div className={`border-t border-gray-200 ${padding !== 'none' ? paddingClass : 'px-6 py-4'}`}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
