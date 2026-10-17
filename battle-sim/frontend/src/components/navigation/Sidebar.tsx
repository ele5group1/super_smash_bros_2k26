import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

interface SidebarProps {
  backendOnline: boolean;
  onOpenShortcuts: () => void;
  onOpenPalette: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ backendOnline, onOpenShortcuts, onOpenPalette }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const navItems = [
    { to: '/', label: 'Battle Lobby', icon: '🏠', end: true },
    { to: '/heroes', label: 'Fighters Roster', icon: '🥊' },
    { to: '/scenarios', label: 'Stages & Draft', icon: '⚔️' },
    { to: '/tournament', label: 'Championship Cup', icon: '🏆' },
    { to: '/plan', label: 'Matchup Calc', icon: '🎯' },
    { to: '/analytics', label: 'Replay Theater', icon: '📜' },
    { to: '/author', label: 'Stage Builder', icon: '🛠️' },
    { to: '/data', label: 'Custom Mods & Packs', icon: '📦' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'is-collapsed' : ''}`} aria-label="Main navigation">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand" title="Puffcap Arena: Mario x Pokemon Battle Arena">
          <div className="sidebar-logo" style={{ overflow: 'hidden', padding: 0, border: '2px solid #ef4444', borderRadius: '8px', background: '#0f172a' }}>
            <img
              src="/images/eevee_mario_mascot.jpg"
              alt="Mario Eevee Mascot"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          {!isCollapsed && <span>Puffcap Arena</span>}
        </Link>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="ui-btn ui-btn-ghost ui-btn-sm"
          onClick={onOpenPalette}
          title="Search / Command Palette (Ctrl+K)"
          style={{ width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <span>🔍</span>
          {!isCollapsed && <span>Search (Ctrl+K)</span>}
        </button>

        <button
          type="button"
          className="ui-btn ui-btn-ghost ui-btn-sm"
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (?)"
          style={{ width: '100%', justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <span>⌨️</span>
          {!isCollapsed && <span>Shortcuts (?)</span>}
        </button>

        {!isCollapsed && (
          <div className="backend-badge" title={backendOnline ? "Connected to deterministic engine" : "Backend unreachable"}>
            <div className={`status-dot ${backendOnline ? '' : 'offline'}`} />
            <span>{backendOnline ? 'ENGINE READY' : 'OFFLINE'}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
