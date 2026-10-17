import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { api } from './api';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './components/ui/Toast';
import { Sidebar } from './components/navigation/Sidebar';
import { BottomNav } from './components/navigation/BottomNav';
import { Breadcrumbs } from './components/navigation/Breadcrumbs';
import { CommandPalette } from './components/navigation/CommandPalette';
import { ShortcutHelpModal } from './components/navigation/ShortcutHelpModal';

// Eager load LandingScreen for immediate first paint
import { LandingScreen } from './screens/LandingScreen';

// Lazy load heavy secondary routes on demand for fast initial load
const SelectScreen = lazy(() => import('./screens/SelectScreen').then(m => ({ default: m.SelectScreen })));
const BattleScreen = lazy(() => import('./screens/BattleScreen').then(m => ({ default: m.BattleScreen })));
const ReportScreen = lazy(() => import('./screens/ReportScreen').then(m => ({ default: m.ReportScreen })));
const PlanScreen = lazy(() => import('./screens/PlanScreen').then(m => ({ default: m.PlanScreen })));
const AuthorScreen = lazy(() => import('./screens/AuthorScreen').then(m => ({ default: m.AuthorScreen })));
const DataScreen = lazy(() => import('./screens/DataScreen').then(m => ({ default: m.DataScreen })));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const HeroesScreen = lazy(() => import('./screens/HeroesScreen').then(m => ({ default: m.HeroesScreen })));
const AnalyticsScreen = lazy(() => import('./screens/AnalyticsScreen').then(m => ({ default: m.AnalyticsScreen })));
const TournamentScreen = lazy(() => import('./screens/TournamentScreen').then(m => ({ default: m.TournamentScreen })));
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
          <Suspense fallback={
            <div className="page-container" style={{ padding: 'var(--space-8)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--text-muted)' }}>
                <span className="ui-spinner" style={{ width: '20px', height: '20px' }} />
                <span>Loading view...</span>
              </div>
            </div>
          }>
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
          </Suspense>
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
