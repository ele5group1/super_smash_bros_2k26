import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ScenarioSummary } from '../api';
import { CreatureAvatar } from '../components/CreatureCard';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

export const AnalyticsScreen: React.FC = () => {
  const navigate = useNavigate();

  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'both' | 'simulated' | 'uploaded'>('both');

  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [lossCauses, setLossCauses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load scenarios
  useEffect(() => {
    api.listScenarios().then(setScenarios).catch(() => {});
  }, []);

  // Fetch team stats & loss causes
  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const [teams, losses] = await Promise.all([
          api.getTeamStats(selectedScenario || undefined, sourceFilter !== 'both' ? sourceFilter : undefined),
          api.getLossCauses(selectedScenario || undefined, sourceFilter !== 'both' ? sourceFilter : undefined),
        ]);
        setTeamStats(teams);
        setLossCauses(losses);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [selectedScenario, sourceFilter]);

  const maxLossCount = lossCauses.reduce((max, l) => Math.max(max, l.count || l.losses || 1), 1);

  return (
    <div className="analytics-screen page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '32px' }}>📊</span>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Battle Analytics & Loss Diagnostics
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: '6px', fontSize: '15px' }}>
            Macro telemetry across simulated runs and verified upload datasets. Inspect team win rates, pacing, and ranked defeat causes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={() => navigate('/plan')}>
            🎯 Plan Simulator
          </Button>
          <Button variant="secondary" onClick={() => navigate('/heroes')}>
            🛡️ Heroes Directory
          </Button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div
        style={{
          padding: '16px 20px',
          background: 'var(--card-bg, #1e293b)',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #334155)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        {/* Source Filter Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Data Source:</span>
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '3px', borderRadius: '8px', border: '1px solid #334155' }}>
            {(['both', 'simulated', 'uploaded'] as const).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setSourceFilter(src)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: 'none',
                  cursor: 'pointer',
                  background: sourceFilter === src ? '#3b82f6' : 'transparent',
                  color: sourceFilter === src ? '#fff' : '#94a3b8',
                  transition: 'all 0.15s ease',
                }}
              >
                {src === 'both' ? 'All Sources' : src}
              </button>
            ))}
          </div>
        </div>

        {/* Scenario Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>Scenario:</span>
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            className="ui-select"
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--input-bg, #0f172a)',
              border: '1px solid var(--border-color, #334155)',
              color: 'var(--text-primary, #f8fafc)',
              fontSize: '13px',
              minWidth: '200px',
            }}
          >
            <option value="">All Scenarios</option>
            {scenarios.map((scen) => (
              <option key={scen.id} value={scen.id}>
                {scen.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Skeleton height="200px" style={{ borderRadius: '12px' }} />
          <Skeleton height="260px" style={{ borderRadius: '12px' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Top Ranked Loss Causes */}
          <Card style={{ background: 'var(--card-bg, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #334155)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  🛑 Ranked Loss Causes & Defeat Catalysts
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {lossCauses.length} categories logged
                </span>
              </div>
            </div>
            <CardBody style={{ padding: '20px' }}>
              {lossCauses.length === 0 ? (
                <EmptyState
                  title="No Loss Events Recorded"
                  description="Run more simulated battles or upload match logs to analyze fatal triggers."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {lossCauses.map((cause, idx) => {
                    const count = cause.count || cause.losses || 1;
                    const pct = Math.round((count / maxLossCount) * 100);
                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(15, 23, 42, 0.4)',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: idx === 0 ? '#ef4444' : '#334155',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              {idx + 1}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                              {cause.cause || cause.reason || 'Elimination by hazard/damage'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                            <span style={{ color: '#94a3b8' }}>
                              Occurrences: <strong style={{ color: '#f8fafc' }}>{count}</strong>
                            </span>
                            {cause.avg_tick && (
                              <span style={{ color: '#94a3b8' }}>
                                Avg Tick: <strong style={{ color: '#38bdf8' }}>{Math.round(cause.avg_tick)}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bar */}
                        <div style={{ height: '8px', width: '100%', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: idx === 0 ? '#ef4444' : '#f97316',
                              borderRadius: '4px',
                            }}
                          />
                        </div>

                        {cause.recommendation && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#cbd5e1', display: 'flex', gap: '6px' }}>
                            <span style={{ color: '#f59e0b' }}>💡 Advice:</span>
                            <span>{cause.recommendation}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Team Performance Table */}
          <Card style={{ background: 'var(--card-bg, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #334155)' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                👥 Squad Performance & Win Rates
              </h3>
            </div>
            <CardBody style={{ padding: '0', overflowX: 'auto' }}>
              {teamStats.length === 0 ? (
                <div style={{ padding: '30px' }}>
                  <EmptyState title="No Team Data Available" description="Run simulations to generate team telemetry." />
                </div>
              ) : (
                <table className="ui-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid var(--border-color, #334155)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px' }}>Squad Lineup</th>
                      <th style={{ padding: '12px 16px' }}>Battles</th>
                      <th style={{ padding: '12px 16px' }}>Win Rate</th>
                      <th style={{ padding: '12px 16px' }}>Avg Ticks</th>
                      <th style={{ padding: '12px 16px' }}>Avg Coins Left</th>
                      <th style={{ padding: '12px 16px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamStats.map((t, idx) => {
                      const winRate = t.win_rate_percent ?? Math.round(((t.wins || 0) / (t.battles || 1)) * 100);
                      const teamMembers: string[] = Array.isArray(t.team) ? t.team : (t.team_ids || []);
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
                          }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {teamMembers.map((cid, cIdx) => (
                                <div
                                  key={cIdx}
                                  title={cid}
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid #475569',
                                  }}
                                >
                                  <CreatureAvatar type="fire" size={24} id={cid} />
                                </div>
                              ))}
                              <span style={{ marginLeft: '4px', fontWeight: 600, color: '#f8fafc' }}>
                                {teamMembers.map((m) => m.replace('_', ' ')).join(', ')}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{t.battles || t.total_runs || 0}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: winRate >= 50 ? '#10b981' : '#ef4444',
                                }}
                              >
                                {winRate}%
                              </span>
                              <div style={{ width: '60px', height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${winRate}%`,
                                    background: winRate >= 50 ? '#10b981' : '#ef4444',
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                            {t.avg_ticks ? Math.round(t.avg_ticks) : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: 600 }}>
                            {t.avg_coins_left !== undefined ? `🪙 ${Math.round(t.avg_coins_left)}` : '—'}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                localStorage.setItem('last_selected_team', JSON.stringify(teamMembers));
                                navigate('/scenarios');
                              }}
                            >
                              ⚔️ Pick Squad
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};
