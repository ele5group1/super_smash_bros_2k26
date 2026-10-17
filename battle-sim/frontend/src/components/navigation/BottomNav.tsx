import React from 'react';
import { NavLink } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const items = [
    { to: '/', label: 'Home', icon: '🏠', end: true },
    { to: '/heroes', label: 'Heroes', icon: '🛡️' },
    { to: '/scenarios', label: 'Draft', icon: '⚔️' },
    { to: '/plan', label: 'Plan', icon: '🎯' },
    { to: '/analytics', label: 'Analytics', icon: '📊' },
    { to: '/data', label: 'Data', icon: '📁' },
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
