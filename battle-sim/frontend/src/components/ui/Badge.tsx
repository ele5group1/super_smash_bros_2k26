import React from 'react';

export type BadgeVariant =
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'stone'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  hasDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  hasDot = false,
  className = '',
  ...props
}) => {
  return (
    <span className={`ui-badge ui-badge-${variant} ui-badge-${size} ${className}`} {...props}>
      {hasDot && <span className="ui-badge-dot" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};
