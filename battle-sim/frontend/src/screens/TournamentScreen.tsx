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

  const handleSimulate = async () => {
    setLoading(true);
    try {
      soundFX.playCoin();
      const res = await api.runTournament(squadSize);
      setReport(res);
      setSelectedMatch(res.rounds[res.rounds.length - 1]?.matches[0] || null);
      soundFX.playVictory();
      success("Championship tournament simulated successfully!");
    } catch (err: any) {
      toastError("Failed to simulate tournament", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial run on mount
    handleSimulate();
  }, []);

  return (
    <div className="container" style={{ padding: "var(--space-6) var(--space-4)" }}>
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>
              🏆 Tournament Bracket Simulator
            </h1>
            <Badge variant="info" size="md">8 Squads</Badge>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
            Single-elimination championship bracket. 8 seeded squads battle through Quarterfinals,
            Semifinals, and the Grand Finals.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <label htmlFor="squad-size-select" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Squad Size:
            </label>
            <select
              id="squad-size-select"
              value={squadSize}
              onChange={(e) => setSquadSize(Number(e.target.value))}
              className="ui-input"
              style={{ padding: "4px 8px", width: "80px", height: "32px", fontSize: "13px" }}
            >
              <option value={2}>2v2</option>
              <option value={3}>3v3</option>
            </select>
          </div>

          <Button
            id="simulate-tournament-btn"
            variant="primary"
            onClick={handleSimulate}
            isLoading={loading}
          >
            🎲 New Tournament
          </Button>
        </div>
      </div>

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
                {report.champion.name}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Roster: {report.champion.members.join(", ")}
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
                {report.mvp_creature.name}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                ⚔️ {report.mvp_creature.kos} KOs &nbsp;•&nbsp; 💥 {report.mvp_creature.damage} DMG dealt
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
                <h3 style={{ fontSize: "15px", fontWeight: "bold", margin: 0 }}>{round.name}</h3>
                <Badge variant="neutral" size="sm">
                  {round.matches.length} {round.matches.length === 1 ? "Match" : "Matches"}
                </Badge>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", justifyContent: "space-around", flex: 1 }}>
                {round.matches.map((m) => {
                  const isWinnerA = m.winner.id === m.squad_a.id;
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
                            #{m.squad_a.seed}
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
                            #{m.squad_b.seed}
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
                        <span>{m.survivors_left} survived</span>
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
                {selectedMatch.round} Match Breakdown: {selectedMatch.squad_a.name} vs {selectedMatch.squad_b.name}
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Battle ID: <code>{selectedMatch.battle_id}</code>
              </p>
            </div>

            <Link
              to={`/battles/${selectedMatch.battle_id}`}
              className="ui-btn ui-btn-primary ui-btn-sm"
              onClick={() => soundFX.playCoin()}
            >
              📺 Watch Full Match Replay
            </Link>
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
                {selectedMatch.winner.name}
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
                {selectedMatch.survivors_left}
              </div>
            </div>

            <div style={{ padding: "var(--space-3)", background: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Coins Collected</div>
              <div style={{ fontSize: "15px", fontWeight: "bold" }}>
                🪙 {selectedMatch.coins_collected}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
