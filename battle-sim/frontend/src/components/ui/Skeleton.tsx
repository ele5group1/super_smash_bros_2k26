import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  count = 1,
  className = '',
  style,
  ...props
}) => {
  const items = Array.from({ length: count });

  const getStyle = (): React.CSSProperties => {
    const s: React.CSSProperties = { ...style };
    if (width !== undefined) s.width = typeof width === 'number' ? `${width}px` : width;
    if (height !== undefined) s.height = typeof height === 'number' ? `${height}px` : height;
    return s;
  };

  if (variant === 'card') {
    return (
      <div className="ui-skeleton-card" aria-hidden="true" {...props}>
        <div className="ui-skeleton ui-skeleton-rectangular" style={{ height: '140px', width: '100%' }} />
        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div className="ui-skeleton ui-skeleton-text" style={{ width: '60%', height: '20px' }} />
          <div className="ui-skeleton ui-skeleton-text" style={{ width: '90%', height: '14px' }} />
          <div className="ui-skeleton ui-skeleton-text" style={{ width: '40%', height: '14px' }} />
        </div>
      </div>
    );
  }

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={`ui-skeleton ui-skeleton-${variant} ${className}`}
          style={getStyle()}
          aria-hidden="true"
          {...props}
        />
      ))}
    </>
  );
};
