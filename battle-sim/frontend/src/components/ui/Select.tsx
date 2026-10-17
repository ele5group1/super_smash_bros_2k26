import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, id, options, children, className = '', ...props }, ref) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const errorId = selectId ? `${selectId}-error` : undefined;
    const hintId = selectId ? `${selectId}-hint` : undefined;

    return (
      <div className={`ui-field-wrapper ${error ? 'has-error' : ''}`}>
        {label && (
          <label htmlFor={selectId} className="ui-field-label">
            {label}
            {props.required && <span className="ui-field-required" aria-hidden="true"> *</span>}
          </label>
        )}
        <div className="ui-select-container">
          <select
            ref={ref}
            id={selectId}
            className={`ui-select ${className}`}
            aria-invalid={Boolean(error)}
            aria-describedby={[hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <span className="ui-select-arrow" aria-hidden="true">
            ▾
          </span>
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

Select.displayName = 'Select';
