import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ScenarioSummary } from '../../api';

interface PaletteItem {
  id: string;
  category: 'Scenario' | 'Creature' | 'Battle' | 'Screen';
  title: string;
  subtitle?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      api.listScenarios().then(setScenarios).catch(() => {});
    }
  }, [isOpen]);

  const defaultItems: PaletteItem[] = [
    {
      id: 'screen-overview',
      category: 'Screen',
      title: 'Overview & Landing',
      subtitle: 'Home page and quick battle',
      action: () => { navigate('/'); onClose(); }
    },
    {
      id: 'screen-heroes',
      category: 'Screen',
      title: 'Heroes Directory',
      subtitle: 'Browse all 10 original combatants, stats, and move pools',
      action: () => { navigate('/heroes'); onClose(); }
    },
    {
      id: 'screen-scenarios',
      category: 'Screen',
      title: 'Scenarios & Squad Draft',
      subtitle: 'Build squad and run simulation',
      action: () => { navigate('/scenarios'); onClose(); }
    },
    {
      id: 'screen-plan',
      category: 'Screen',
      title: 'Battle Plan',
      subtitle: 'Monte Carlo matchup win-rate matrix',
      action: () => { navigate('/plan'); onClose(); }
    },
    {
      id: 'screen-analytics',
      category: 'Screen',
      title: 'Analytics & Defeat Diagnostics',
      subtitle: 'Macro telemetry, ranked loss causes, and team win rates',
      action: () => { navigate('/analytics'); onClose(); }
    },
    {
      id: 'screen-author',
      category: 'Screen',
      title: 'Scenario Author',
      subtitle: 'Visual map editor and JSON editor',
      action: () => { navigate('/author'); onClose(); }
    },
    {
      id: 'screen-data',
      category: 'Screen',
      title: 'Data & Uploads',
      subtitle: 'Import CSV/JSON rosters, scenarios & battle logs',
      action: () => { navigate('/data'); onClose(); }
    },
    {
      id: 'screen-settings',
      category: 'Screen',
      title: 'Settings',
      subtitle: 'Theme, text size, and motion preferences',
      action: () => { navigate('/settings'); onClose(); }
    },
  ];

  const scenarioItems: PaletteItem[] = scenarios.map((s) => ({
    id: `scenario-${s.id}`,
    category: 'Scenario',
    title: s.name,
    subtitle: `Lanes: ${s.lanes} • Objective: ${s.objective.type}`,
    action: () => { navigate(`/scenarios/${s.id}`); onClose(); }
  }));

  const creatureItems: PaletteItem[] = [
    { id: 'c-ember_fox', category: 'Creature', title: 'Ember Fox', subtitle: 'Type: Fire • Role: Striker', action: () => { navigate('/scenarios'); onClose(); } },
    { id: 'c-bubble_toad', category: 'Creature', title: 'Bubble Toad', subtitle: 'Type: Water • Role: Defender', action: () => { navigate('/scenarios'); onClose(); } },
    { id: 'c-moss_shroom', category: 'Creature', title: 'Moss Shroom', subtitle: 'Type: Grass • Role: Support/Healer', action: () => { navigate('/scenarios'); onClose(); } },
    { id: 'c-volt_hedgehog', category: 'Creature', title: 'Volt Hedgehog', subtitle: 'Type: Electric • Role: Fast Striker', action: () => { navigate('/scenarios'); onClose(); } },
    { id: 'c-crag_golem', category: 'Creature', title: 'Crag Golem', subtitle: 'Type: Stone • Role: Heavy Tank', action: () => { navigate('/scenarios'); onClose(); } },
  ];

  const allItems = [...defaultItems, ...scenarioItems, ...creatureItems];

  const filteredItems = query.trim() === ''
    ? allItems
    : allItems.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase())) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-palette-backdrop" onClick={onClose} role="presentation">
      <div
        className="cmd-palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="cmd-palette-input-wrap">
          <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette-input"
            placeholder="Type a scenario, creature, or screen name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-autocomplete="list"
            data-testid="command-palette-input"
          />
          <span className="kbd-key">ESC</span>
        </div>

        <div className="cmd-palette-results" role="listbox">
          {filteredItems.length === 0 ? (
            <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
              No matching scenarios or tools found.
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={item.id}
                role="option"
                aria-selected={idx === selectedIndex}
                className={`cmd-palette-item ${idx === selectedIndex ? 'is-selected' : ''}`}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div>
                  <div style={{ fontWeight: 'var(--font-weight-bold)' }}>{item.title}</div>
                  {item.subtitle && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {item.subtitle}
                    </div>
                  )}
                </div>
                <span className="ui-badge ui-badge-neutral ui-badge-sm">
                  {item.category}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="cmd-palette-footer">
          <span>Navigate with <kbd className="kbd-key">↑</kbd> <kbd className="kbd-key">↓</kbd></span>
          <span>Select with <kbd className="kbd-key">↵</kbd></span>
        </div>
      </div>
    </div>
  );
};
