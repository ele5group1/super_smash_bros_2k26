import React from 'react';
import { NavLink } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const items = [
    { to: '/', label: 'Lobby', icon: '🏠', end: true },
    { to: '/heroes', label: 'Fighters', icon: '🥊' },
    { to: '/scenarios', label: 'Stages', icon: '⚔️' },
    { to: '/tournament', label: 'Cup', icon: '🏆' },
    { to: '/plan', label: 'Odds', icon: '🎯' },
    { to: '/analytics', label: 'Replays', icon: '📜' },
  ];

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bottom-nav-link ${isActive ? 'is-active' : ''}`}
        >
          <span className="bottom-nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
