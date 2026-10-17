import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { api } from './api';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './components/ui/Toast';
import { Sidebar } from './components/navigation/Sidebar';
import { BottomNav } from './components/navigation/BottomNav';
import { Breadcrumbs } from './components/navigation/Breadcrumbs';
import { CommandPalette } from './components/navigation/CommandPalette';
import { ShortcutHelpModal } from './components/navigation/ShortcutHelpModal';

import { LandingScreen } from './screens/LandingScreen';
import { SelectScreen } from './screens/SelectScreen';
import { BattleScreen } from './screens/BattleScreen';
import { ReportScreen } from './screens/ReportScreen';
import { PlanScreen } from './screens/PlanScreen';
import { AuthorScreen } from './screens/AuthorScreen';
import { DataScreen } from './screens/DataScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { HeroesScreen } from './screens/HeroesScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { TournamentScreen } from './screens/TournamentScreen';
import { soundFX } from './services/sound';

export const AppContent: React.FC = () => {
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(() => soundFX.isMuted());

  // Poll backend health status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        await api.checkHealth();
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Global keyboard shortcuts (Cmd/Ctrl+K, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || tag === 'select';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-layout">
      {/* Persistent Collapsible Sidebar for Desktop */}
      <Sidebar
        backendOnline={backendOnline}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Main Column */}
      <div className="main-wrapper">
        <header className="top-bar" role="banner">
          <div className="top-bar-left">
            <Breadcrumbs />
          </div>

          <div className="top-bar-right">
            <button
              type="button"
              className="ui-btn ui-btn-secondary ui-btn-sm"
              onClick={() => setPaletteOpen(true)}
              title="Search (Ctrl+K)"
              id="top-search-button"
            >
              <span>🔍</span>
              <span className="desktop-only">Search</span>
              <kbd className="kbd-key" style={{ fontSize: '10px' }}>Ctrl+K</kbd>
            </button>

            <button
              type="button"
              className="ui-btn ui-btn-ghost ui-btn-sm"
              onClick={() => {
                const nextMuted = soundFX.toggleMute();
                setSoundMuted(nextMuted);
              }}
              title={soundMuted ? "Unmute Sound" : "Mute Sound"}
              aria-label={soundMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {soundMuted ? "🔇" : "🔊"}
            </button>

            <Link to="/settings" className="ui-btn ui-btn-ghost ui-btn-sm" title="Settings" aria-label="Settings">
              ⚙️
            </Link>
          </div>
        </header>

        <main role="main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<LandingScreen />} />
            <Route path="/scenarios" element={<SelectScreen />} />
            <Route path="/scenarios/:id" element={<SelectScreen />} />
            <Route path="/tournament" element={<TournamentScreen />} />
            <Route path="/battles/:id" element={<BattleScreen />} />
            <Route path="/battle/:id" element={<BattleScreen />} />
            <Route path="/report/:id" element={<ReportScreen />} />
            <Route path="/plan" element={<PlanScreen />} />
            <Route path="/author" element={<AuthorScreen />} />
            <Route path="/data" element={<DataScreen />} />
            <Route path="/heroes" element={<HeroesScreen />} />
            <Route path="/analytics" element={<AnalyticsScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav />

      {/* Command Palette Modal */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Keyboard Shortcuts Help Modal */}
      <ShortcutHelpModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <SettingsProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </SettingsProvider>
    </Router>
  );
};
