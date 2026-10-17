import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from "react-router-dom";
import { api } from "./api";
import { SelectScreen } from "./screens/SelectScreen";
import { BattleScreen } from "./screens/BattleScreen";
import { ReportScreen } from "./screens/ReportScreen";
import { PlanScreen } from "./screens/PlanScreen";
import { AuthorScreen } from "./screens/AuthorScreen";
import { DataScreen } from "./screens/DataScreen";

export const App: React.FC = () => {
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <Router>
      <div className="app-container">
        {/* Top Arcade Navigation Bar */}
        <header className="header-nav" role="banner">
          <Link to="/" className="brand-section" onClick={closeMenu}>
            <div className="brand-icon">
              {/* Crossover Icon: Pokeball with Mario 'M' */}
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="13" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.5" />
                {/* Top Half Red */}
                <path d="M1 14 A 13 13 0 0 1 27 14 Z" fill="#ef4444" />
                {/* Bottom Half White */}
                <path d="M1 14 A 13 13 0 0 0 27 14 Z" fill="#f8fafc" />
                {/* Black Center Dividing Band */}
                <rect x="1" y="12.5" width="26" height="3" fill="#0f172a" />
                {/* Center Button */}
                <circle cx="14" cy="14" r="4.5" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
                <circle cx="14" cy="14" r="2" fill="#ef4444" />
              </svg>
            </div>
            <div>
              <div className="brand-title">
                MARIO x POKÉMON
                <span className="brand-badge">BATTLE ARENA</span>
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className={`nav-links ${mobileMenuOpen ? "open" : ""}`} role="navigation" aria-label="Main Navigation">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={closeMenu}>
              Draft Squad
            </NavLink>
            <NavLink to="/plan" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={closeMenu}>
              Pre-Battle Plan
            </NavLink>
            <NavLink to="/author" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={closeMenu}>
              Scenario Author
            </NavLink>
            <NavLink to="/data" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} onClick={closeMenu}>
              Data & Uploads
            </NavLink>
          </nav>

          {/* Backend Connection Health Badge & Mobile Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div className="backend-badge" title={backendOnline ? "Connected to FastAPI backend" : "Backend unreachable"}>
              <div className={`status-dot ${backendOnline ? "" : "offline"}`} />
              <span>{backendOnline ? "LIVE ENGINE" : "DISCONNECTED"}</span>
            </div>

            <button
              className="mobile-nav-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              ☰
            </button>
          </div>
        </header>

        {/* Main Routed Content */}
        <main className="main-content" role="main">
          <Routes>
            <Route path="/" element={<SelectScreen />} />
            <Route path="/battle/:id" element={<BattleScreen />} />
            <Route path="/report/:id" element={<ReportScreen />} />
            <Route path="/plan" element={<PlanScreen />} />
            <Route path="/author" element={<AuthorScreen />} />
            <Route path="/data" element={<DataScreen />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};
