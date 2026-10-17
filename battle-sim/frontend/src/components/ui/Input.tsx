import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, id, leftIcon, rightIcon, className = '', ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const hintId = inputId ? `${inputId}-hint` : undefined;

    return (
      <div className={`ui-field-wrapper ${error ? 'has-error' : ''}`}>
        {label && (
          <label htmlFor={inputId} className="ui-field-label">
            {label}
            {props.required && <span className="ui-field-required" aria-hidden="true"> *</span>}
          </label>
        )}
        <div className="ui-input-container">
          {leftIcon && <span className="ui-field-icon-left">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`ui-input ${leftIcon ? 'has-left-icon' : ''} ${rightIcon ? 'has-right-icon' : ''} ${className}`}
            aria-invalid={Boolean(error)}
            aria-describedby={[hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
            {...props}
          />
          {rightIcon && <span className="ui-field-icon-right">{rightIcon}</span>}
        </div>
        {error && (
          <p id={errorId} className="ui-field-error" role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={hintId} className="ui-field-hint">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
