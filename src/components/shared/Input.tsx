import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      fullWidth = true,
      className = '',
      disabled = false,
      ...rest
    },
    ref
  ) => {
    const baseInputStyles =
      'w-full px-3 py-2 border border-gray-300 rounded-lg font-normal text-gray-900 placeholder-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed';

    const errorStyles = error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300';

    const wrapperClass = fullWidth ? 'w-full' : '';
    const inputClass = `${baseInputStyles} ${errorStyles} ${className}`;

    const iconWrapperStyles = icon
      ? 'relative flex items-center'
      : '';

    return (
      <div className={wrapperClass}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}

        <div className={iconWrapperStyles}>
          {icon && (
            <span className="absolute left-3 flex items-center text-gray-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={`${inputClass} ${icon ? 'pl-10' : ''}`}
            {...rest}
          />
        </div>

        {error && (
          <div className="flex items-center mt-1 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span>{error}</span>
          </div>
        )}

        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
