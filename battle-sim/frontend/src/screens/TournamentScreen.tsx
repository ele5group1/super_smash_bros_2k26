import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, TournamentReport, TournamentMatch } from "../api";
import { soundFX } from "../services/sound";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { useToast } from "../components/ui/Toast";

export const TournamentScreen: React.FC = () => {
  const [report, setReport] = useState<TournamentReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [squadSize, setSquadSize] = useState<number>(3);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const { success, error: toastError } = useToast();

  const handleSimulate = async (silent = false) => {
    setLoading(true);
    try {
      if (!silent) soundFX.playCoin();
      const res = await api.runTournament(squadSize);
      setReport(res);
      setSelectedMatch(res.rounds[res.rounds.length - 1]?.matches[0] || null);
      if (!silent) {
        soundFX.playVictory();
        success("Championship tournament simulated successfully!");
      }
    } catch (err: any) {
      if (!silent) toastError("Failed to simulate tournament", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      handleSimulate(true);
    }, 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="container" style={{ padding: "var(--space-6) var(--space-4)" }}>
      {/* Tournament Clash Banner */}
      <div
        style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: 'var(--space-6)',
          border: '2px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          background: '#090d16',
          height: '200px',
        }}
      >
        <img
          src="/images/arena_battle_clash.jpg"
          alt="Championship Cup Battle Clash"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 35%',
            filter: 'brightness(0.9) contrast(1.15)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0.45) 50%, rgba(15,23,42,0.92) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 32px',
          }}
        >
          <div style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <Badge variant="error" size="sm">🏆 CHAMPIONSHIP CUP</Badge>
              <Badge variant="warning" size="sm">8-SQUAD ELIMINATION</Badge>
              <span style={{ fontSize: '12px', color: '#facc15', fontWeight: 600 }}>⭐ Grand Finals Trophy</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: '0 0 4px 0', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
              Mushroom Cup Championship
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
              8 seeded squads battle through Quarterfinals, Semifinals, and the Grand Finals. Track MVP eliminations and live battle replays.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <label htmlFor="squad-size-select" style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
                Squad Size:
              </label>
              <select
                id="squad-size-select"
                value={squadSize}
                onChange={(e) => setSquadSize(Number(e.target.value))}
                className="ui-input"
                style={{ padding: '4px 8px', width: '80px', height: '32px', fontSize: '13px' }}
              >
                <option value={2}>2v2</option>
                <option value={3}>3v3</option>
              </select>
            </div>

            <Button
              id="simulate-tournament-btn"
              variant="primary"
              onClick={() => handleSimulate(false)}
              isLoading={loading}
            >
              🎲 New Tournament
            </Button>
          </div>
        </div>
      </div>

      {/* Loading and Empty States */}
      {loading && !report && (
        <div style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "36px", marginBottom: "var(--space-3)" }}>⚔️</div>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>Simulating Championship Tournament...</div>
          <div style={{ fontSize: "13px", marginTop: "4px" }}>8 squads competing across Quarterfinals, Semifinals, and Grand Finals</div>
        </div>
      )}

      {!loading && !report && (
        <div style={{ textAlign: "center", padding: "var(--space-12) 0", color: "var(--text-muted)" }}>
          <div style={{ fontSize: "36px", marginBottom: "var(--space-3)" }}>🏆</div>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>No Tournament Data</div>
          <p style={{ fontSize: "13px", marginTop: "4px", marginBottom: "var(--space-4)" }}>Click below to simulate a championship bracket.</p>
          <Button variant="primary" onClick={() => handleSimulate(false)}>🎲 Start Tournament</Button>
        </div>
      )}

      {/* Champion & MVP Showcase */}
      {report && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--space-4)",
            marginBottom: "var(--space-6)",
          }}
        >
          {/* Champion Podium */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(20, 26, 40, 0.9) 100%)",
              border: "1px solid rgba(234, 179, 8, 0.4)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
            }}
          >
            <div style={{ fontSize: "42px" }}>🏆</div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#eab308", textTransform: "uppercase" }}>
                Tournament Champion
              </div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#fff" }}>
                {report.champion?.name || "Champion"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Roster: {(report.champion?.members || (report.champion as any)?.creatures || []).map((c: string) => c.replace(/_/g, " ")).join(", ") || "Active Squad"}
              </div>
            </div>
          </div>

          {/* MVP Showcase */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(20, 26, 40, 0.9) 100%)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "var(--radius-lg)",
              padding: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
            }}
          >
            <div style={{ fontSize: "42px" }}>🔥</div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: "#ef4444", textTransform: "uppercase" }}>
                Tournament MVP
              </div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#fff" }}>
                {typeof report.mvp_creature === "object" && report.mvp_creature ? report.mvp_creature.name : String(report.mvp_creature || "Mario").replace(/_/g, " ")}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                ⚔️ {typeof report.mvp_creature === "object" && report.mvp_creature ? report.mvp_creature.kos : 0} KOs &nbsp;•&nbsp; 💥 {typeof report.mvp_creature === "object" && report.mvp_creature ? report.mvp_creature.damage : 0} DMG dealt
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bracket Tree Layout */}
      {report && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "var(--space-5)" }}>
          {report.rounds.map((round, rIdx) => (
            <div key={rIdx} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "var(--space-2)",
                }}
              >
                <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: 0 }}>{round.name || (round as any).round_name || `Round ${rIdx + 1}`}</h3>
                <Badge variant="neutral" size="sm">
                  {round.matches.length} {round.matches.length === 1 ? "Match" : "Matches"}
                </Badge>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", justifyContent: "space-around", flex: 1 }}>
                {round.matches.map((m) => {
                  const winnerSquad = m.winner || (m as any).winner_squad;
                  const isWinnerA = winnerSquad ? winnerSquad.id === m.squad_a.id : m.score_a >= m.score_b;
                  const isSelected = selectedMatch?.match_id === m.match_id;

                  return (
                    <div
                      key={m.match_id}
                      onClick={() => {
                        setSelectedMatch(m);
                        soundFX.playHit();
                      }}
                      style={{
                        background: isSelected ? "rgba(99, 102, 241, 0.15)" : "var(--bg-panel)",
                        border: isSelected
                          ? "1px solid var(--accent-primary)"
                          : "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "var(--space-3)",
                        cursor: "pointer",
                        transition: "all var(--duration-short) ease",
                      }}
                    >
                      {/* Squad A */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "4px 6px",
                          borderRadius: "var(--radius-sm)",
                          background: isWinnerA ? "rgba(34, 197, 94, 0.1)" : "transparent",
                          fontWeight: isWinnerA ? "bold" : "normal",
                          color: isWinnerA ? "#fff" : "var(--text-muted)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            #{m.squad_a.seed || 1}
                          </span>
                          <span>{m.squad_a.name}</span>
                          {isWinnerA && <span style={{ fontSize: "12px" }}>✓</span>}
                        </div>
                        <span style={{ fontWeight: "bold", fontSize: "13px" }}>{m.score_a}</span>
                      </div>

                      {/* Divider */}
                      <div style={{ height: "1px", background: "var(--border-subtle)", margin: "4px 0" }} />

                      {/* Squad B */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "4px 6px",
                          borderRadius: "var(--radius-sm)",
                          background: !isWinnerA ? "rgba(34, 197, 94, 0.1)" : "transparent",
                          fontWeight: !isWinnerA ? "bold" : "normal",
                          color: !isWinnerA ? "#fff" : "var(--text-muted)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            #{m.squad_b.seed || 2}
                          </span>
                          <span>{m.squad_b.name}</span>
                          {!isWinnerA && <span style={{ fontSize: "12px" }}>✓</span>}
                        </div>
                        <span style={{ fontWeight: "bold", fontSize: "13px" }}>{m.score_b}</span>
                      </div>

                      {/* Footer info */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "6px",
                          fontSize: "11px",
                          color: "var(--text-muted)",
                        }}
                      >
                        <span>{m.ticks_elapsed} ticks</span>
                        <span>{m.survivors_left ?? (m as any).survivors ?? 0} survived</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Match Details Drawer / Inspector */}
      {selectedMatch && (
        <Card style={{ marginTop: "var(--space-6)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "var(--space-3)",
              marginBottom: "var(--space-3)",
            }}
          >
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>
                {(selectedMatch.round || (selectedMatch as any).round_name || "Match")} Breakdown: {selectedMatch.squad_a?.name} vs {selectedMatch.squad_b?.name}
              </h3>
              {selectedMatch.battle_id && (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Battle ID: <code>{selectedMatch.battle_id}</code>
                </p>
              )}
            </div>

            {selectedMatch.battle_id ? (
              <Link
                to={`/battles/${selectedMatch.battle_id}`}
                className="ui-btn ui-btn-primary ui-btn-sm"
                onClick={() => soundFX.playCoin()}
              >
                📺 Watch Full Match Replay
              </Link>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ padding: "var(--space-3)", background: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Winner</div>
              <div style={{ fontSize: "15px", fontWeight: "bold", color: "var(--color-success)" }}>
                {(selectedMatch.winner || (selectedMatch as any).winner_squad)?.name || "Winner"}
              </div>
            </div>

            <div style={{ padding: "var(--space-3)", background: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Duration</div>
              <div style={{ fontSize: "15px", fontWeight: "bold" }}>
                {selectedMatch.ticks_elapsed} Ticks
              </div>
            </div>

            <div style={{ padding: "var(--space-3)", background: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Survivors Left</div>
              <div style={{ fontSize: "15px", fontWeight: "bold" }}>
                {selectedMatch.survivors_left ?? (selectedMatch as any).survivors ?? 0}
              </div>
            </div>

            <div style={{ padding: "var(--space-3)", background: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Coins Collected</div>
              <div style={{ fontSize: "15px", fontWeight: "bold" }}>
                🪙 {selectedMatch.coins_collected ?? 0}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
