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

  // Retro Easter Egg: Punchable Mario Question Block
  const [punchedCoins, setPunchedCoins] = useState<number>(() => {
    return Number(localStorage.getItem('puffcap_punched_coins') || '0');
  });
  const [isBouncing, setIsBouncing] = useState<boolean>(false);
  const [showCoinPop, setShowCoinPop] = useState<boolean>(false);

  // Retro Arcade: CRT Scanline Filter Toggle
  const [crtEnabled, setCrtEnabled] = useState<boolean>(() => {
    return localStorage.getItem('puffcap_crt_enabled') === 'true';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-crt', String(crtEnabled));
    localStorage.setItem('puffcap_crt_enabled', String(crtEnabled));
  }, [crtEnabled]);

  const handlePunchBlock = () => {
    soundFX.playCoin();
    setIsBouncing(true);
    setShowCoinPop(true);
    setPunchedCoins((prev) => {
      const next = prev + 1;
      localStorage.setItem('puffcap_punched_coins', String(next));
      return next;
    });
    setTimeout(() => setIsBouncing(false), 180);
    setTimeout(() => setShowCoinPop(false), 550);
  };

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

  // Retro Easter Egg: Konami Code (↑ ↑ ↓ ↓ ← → ← → B A)
  useEffect(() => {
    const konamiSequence = [
      'arrowup', 'arrowup', 'arrowdown', 'arrowdown',
      'arrowleft', 'arrowright', 'arrowleft', 'arrowright',
      'b', 'a'
    ];
    let keyIdx = 0;

    const handleKonami = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const key = e.key.toLowerCase();
      if (key === konamiSequence[keyIdx]) {
        keyIdx++;
        if (keyIdx === konamiSequence.length) {
          keyIdx = 0;
          soundFX.playVictory();
          setPunchedCoins((prev) => {
            const next = prev + 100;
            localStorage.setItem('puffcap_punched_coins', String(next));
            return next;
          });
          alert('🌟 1-UP! KONAMI CODE ACTIVATED: +100 Coins & Super Star Boost!');
        }
      } else {
        keyIdx = key === konamiSequence[0] ? 1 : 0;
      }
    };

    window.addEventListener('keydown', handleKonami);
    return () => window.removeEventListener('keydown', handleKonami);
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

          <div className="top-bar-right" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            {/* Mascot Companion Avatar */}
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1.5px solid #f59e0b',
                background: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Mario Eevee • Arena Mascot & Companion"
              onClick={handlePunchBlock}
            >
              <img
                src="/images/eevee_mario_mascot.jpg"
                alt="Mario Eevee"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Punchable Mario Question Block */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handlePunchBlock}
                title="Hit the Question Block for coins!"
                aria-label="Mario Question Block"
                style={{
                  background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                  border: '2px solid #78350f',
                  borderRadius: '4px',
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: '13px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transform: isBouncing ? 'translateY(-6px)' : 'none',
                  transition: 'transform 0.08s ease',
                  boxShadow: '0 3px 0 #78350f',
                  padding: 0,
                }}
              >
                ?
              </button>

              {showCoinPop && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#fbbf24',
                    animation: 'floatUp 0.5s ease forwards',
                    pointerEvents: 'none',
                  }}
                >
                  🪙+1
                </span>
              )}

              {punchedCoins > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#fbbf24',
                    marginLeft: '6px',
                    fontFamily: 'monospace',
                  }}
                  title="Total punched coins"
                >
                  🪙{punchedCoins}
                </span>
              )}
            </div>

            {/* Retro CRT Scanlines Toggle */}
            <button
              type="button"
              className={`ui-btn ui-btn-sm ${crtEnabled ? 'ui-btn-primary' : 'ui-btn-ghost'}`}
              onClick={() => setCrtEnabled(!crtEnabled)}
              title={crtEnabled ? "Disable Retro CRT Filter" : "Enable Retro CRT Scanlines"}
              aria-label="Toggle Retro CRT Scanlines"
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              📺 CRT
            </button>

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
