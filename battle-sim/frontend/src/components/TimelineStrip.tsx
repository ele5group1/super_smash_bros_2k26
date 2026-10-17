import React from 'react';
import { BattleEvent } from '../api';

interface TimelineStripProps {
  totalTicks: number;
  currentTick: number;
  onSelectTick: (tick: number) => void;
  events: BattleEvent[];
}

export const TimelineStrip: React.FC<TimelineStripProps> = ({
  totalTicks,
  currentTick,
  onSelectTick,
  events,
}) => {
  // Map ticks to events
  const eventsByTick: Record<number, BattleEvent[]> = {};
  events.forEach((ev) => {
    if (!eventsByTick[ev.tick]) eventsByTick[ev.tick] = [];
    eventsByTick[ev.tick].push(ev);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
        <span>Tick Timeline Strip (Click segment or marker to jump)</span>
        <span>Tick {currentTick} / {totalTicks}</span>
      </div>

      <div
        className="timeline-strip"
        role="group"
        aria-label="Timeline tick strip"
      >
        {Array.from({ length: totalTicks }).map((_, idx) => {
          const tick = idx + 1;
          const tickEvents = eventsByTick[tick] || [];
          const hasKo = tickEvents.some((e) => e.ko || e.event_type === 'death');
          const hasHit = tickEvents.some((e) => e.damage > 0);
          const hasPickup = tickEvents.some((e) => e.pickup || e.event_type === 'pickup');
          const isCurrent = currentTick === tick;

          let segClass = 'timeline-tick-seg';
          if (isCurrent) segClass += ' is-current';
          else if (hasKo) segClass += ' has-ko';
          else if (hasHit) segClass += ' has-hit';
          else if (hasPickup) segClass += ' has-pickup';

          const markerTooltip = tickEvents.length > 0
            ? `T${tick}: ${tickEvents.map((e) => e.action).join(', ')}`
            : `T${tick}`;

          return (
            <button
              key={tick}
              type="button"
              className={segClass}
              onClick={() => onSelectTick(tick)}
              title={markerTooltip}
              aria-label={markerTooltip}
            >
              {hasKo && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: '#ef4444',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: '11px', color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, background: 'var(--accent-primary)', borderRadius: 2 }} /> Current
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, background: '#8b5cf6', borderRadius: 2 }} /> KO
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, background: 'var(--color-error)', borderRadius: 2 }} /> Damage
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: 8, height: 8, background: 'var(--color-warning)', borderRadius: 2 }} /> Pickup
        </span>
      </div>
    </div>
  );
};
