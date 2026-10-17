import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const baseClass = `ui-btn ui-btn-${variant} ui-btn-${size} ${fullWidth ? 'ui-btn-full' : ''} ${className}`;

    return (
      <button
        ref={ref}
        className={baseClass}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        style={style}
        {...props}
      >
        {isLoading && (
          <span className="ui-btn-spinner" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          </span>
        )}
        {!isLoading && leftIcon && <span className="ui-btn-icon-left">{leftIcon}</span>}
        <span className="ui-btn-label">{children}</span>
        {!isLoading && rightIcon && <span className="ui-btn-icon-right">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
