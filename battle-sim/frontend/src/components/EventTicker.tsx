import React from 'react';
import { BattleEvent } from '../api';

interface EventTickerProps {
  events: BattleEvent[];
  currentTick: number;
}

export const EventTicker: React.FC<EventTickerProps> = ({ events, currentTick }) => {
  // Filter events up to currentTick and take the last 3-4 events
  const pastEvents = events
    .filter((e) => e.tick <= currentTick)
    .slice(-4)
    .reverse();

  if (pastEvents.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-2) var(--space-4)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-muted)',
          fontSize: 'var(--font-size-small)',
        }}
      >
        Waiting for combat action...
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: 'var(--space-2) var(--space-4)',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
      }}
      aria-live="polite"
      aria-label="Recent battle events ticker"
    >
      <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        Live Combat Ticker
      </div>
      {pastEvents.map((ev, idx) => (
        <div
          key={`${ev.tick}-${idx}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--font-size-small)',
            opacity: idx === 0 ? 1 : 0.7 - idx * 0.15,
          }}
        >
          <span className="kbd-key" style={{ fontSize: '10px' }}>T{ev.tick}</span>
          <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
            {ev.actor ? `${ev.actor.replace(/_/g, ' ')}:` : ''}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {ev.action} {ev.target ? `→ ${ev.target.replace(/_/g, ' ')}` : ''}
          </span>
          {ev.damage > 0 && (
            <span style={{ color: 'var(--color-error)', fontWeight: 'bold' }}>
              (-{ev.damage} HP)
            </span>
          )}
          {ev.ko && (
            <span className="ui-badge ui-badge-error ui-badge-sm">
              KO
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
