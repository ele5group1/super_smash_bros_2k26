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

  const [evaluation, setEvaluation] = useState<Awaited<ReturnType<typeof api.getEvaluation>> | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loadError, setLoadError] = useState("");
  useEffect(() => { const timer = setInterval(() => setRefresh(n => n + 1), 10000); return () => clearInterval(timer); }, []);

  // Load scenarios
  useEffect(() => {
    api.listScenarios().then(setScenarios).catch(() => {});
  }, []);

  // Fetch team stats & loss causes
  useEffect(() => {
    let active = true;
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const [quality, teams, losses] = await Promise.all([
          api.getEvaluation(selectedScenario || undefined),
          api.getTeamStats(selectedScenario || undefined, sourceFilter !== 'both' ? sourceFilter : undefined),
          api.getLossCauses(selectedScenario || undefined, sourceFilter !== 'both' ? sourceFilter : undefined),
        ]);
        if (!active) return;
        setEvaluation(quality);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoadError("");
        setTeamStats(teams);
        setLossCauses(losses);
      } catch (err) {
        if (active) setLoadError('Connection interrupted. Retrying every 10 seconds.');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchAnalytics();
    return () => { active = false; };
  }, [selectedScenario, sourceFilter, refresh]);

  const maxLossCount = lossCauses.reduce((max, l) => Math.max(max, l.count ?? 0), 1);

  return (
    <div className="analytics-screen page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      <Card><CardBody>
        <h2>Shared arcade control center</h2>
        <p>Updates every 10 seconds. Last updated: {lastUpdated || "waiting"}.</p>
        <Button variant="secondary" onClick={() => setRefresh(n => n + 1)}>Refresh now</Button>
        {loadError && <p role="alert">{loadError}</p>}
        {evaluation && <>
          <p>{evaluation.sample_count} recorded playable rounds · Brier score: {evaluation.brier_score === null ? "No evaluated rounds yet" : evaluation.brier_score.toFixed(3)}</p>
          <p>{evaluation.note} Evaluation includes playable rounds for this scenario, independent of the source filter below.</p>
          <div style={{ overflowX: "auto" }}><table className="ui-table">
            <caption>Calibration: saved predictions compared with actual outcomes</caption>
            <thead><tr><th>Prediction range</th><th>Rounds</th><th>Mean predicted</th><th>Observed wins</th></tr></thead>
            <tbody>{evaluation.calibration.map(bin => <tr key={bin.range}><td>{bin.range}</td><td>{bin.count}</td><td>{(bin.predicted*100).toFixed(1)}%</td><td>{(bin.observed*100).toFixed(1)}%</td></tr>)}</tbody>
          </table></div>
          <h3>Recent sessions across terminals</h3>
          {evaluation.recent_sessions.map(session => <p key={session.battle_id}>
            {session.created_at} UTC · {session.terminal_id || "Unlabeled terminal"} · {session.outcome} · Potion: {session.spend} coins
            <Button variant="ghost" size="sm" onClick={() => navigate(`/battles/${session.battle_id}`)}>Open round</Button>
          </p>)}
        </>}
      </CardBody></Card>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '32px' }}>📜</span>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Replay Theater & Post-Match Breakdown
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: '6px', fontSize: '15px' }}>
            Review combat pacing, team win rates, and fatal knockouts (environmental hazards vs fighter specials).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={() => navigate('/plan')}>
            🎯 Strategy Calc
          </Button>
          <Button variant="secondary" onClick={() => navigate('/heroes')}>
            🥊 Fighters Roster
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
          {/* Top Ranked Knockout Causes */}
          <Card style={{ background: 'var(--card-bg, #1e293b)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #334155)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  🛑 Observed Loss Factors
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {lossCauses.length} categories logged
                </span>
              </div>
            </div>
            <CardBody style={{ padding: '20px' }}>
              {lossCauses.length === 0 ? (
                <EmptyState
                  title="No Knockout Events Logged"
                  description="Run more battles or watch replays to analyze fatal combat triggers."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {lossCauses.map((cause, idx) => {
                    const count = cause.count ?? 0;
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
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
                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc', overflowWrap: 'anywhere' }}>
                              {(cause.cause || 'Unclassified').replaceAll('_', ' ')}
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

                        {cause.description && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#cbd5e1', display: 'flex', gap: '6px' }}>
                            <span style={{ color: '#f59e0b' }}>Evidence:</span>
                            <span>{cause.description}</span>
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
                👥 Squad Records & Match Win Rates
              </h3>
            </div>
            <CardBody style={{ padding: '0', overflowX: 'auto' }}>
              {teamStats.length === 0 ? (
                <div style={{ padding: '30px' }}>
                  <EmptyState title="No Squad Records Yet" description="Simulate battles or complete Championship runs to log squad records." />
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
                          <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{t.sample_count ?? 0}</td>
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
                            {t.avg_ticks_to_victory !== undefined ? Math.round(t.avg_ticks_to_victory) : '—'}
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
