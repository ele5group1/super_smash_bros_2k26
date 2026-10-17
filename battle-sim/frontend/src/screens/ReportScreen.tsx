import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  api,
  BattleRecord,
  ReplayStatus,
  DescriptiveAnalytics,
  DiagnosticAnalytics,
  Creature,
} from "../api";
import { TickTimeline } from "../components/TickTimeline";
import { Heatmap } from "../components/Heatmap";
import { CauseList } from "../components/CauseList";

export const ReportScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [battle, setBattle] = useState<BattleRecord | null>(null);
  const [replayStatus, setReplayStatus] = useState<ReplayStatus | null>(null);
  const [descriptive, setDescriptive] = useState<DescriptiveAnalytics | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticAnalytics | null>(null);
  const [creaturesMap, setCreaturesMap] = useState<Record<string, Creature>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Counterfactual rerun state
  const [cfRunning, setCfRunning] = useState<boolean>(false);
  const [cfResult, setCfResult] = useState<any | null>(null);

  useEffect(() => {
    async function loadReport() {
      if (!id) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const [battleData, descData, diagData, allCreatures] = await Promise.all([
          api.getBattle(id),
          api.getDescriptiveAnalytics(id),
          api.getDiagnosticAnalytics(id),
          api.getCreatures(),
        ]);
        setBattle(battleData.battle);
        setReplayStatus(battleData.replay_status || null);
        setDescriptive(descData);
        setDiagnostic(diagData);

        const cmap: Record<string, Creature> = {};
        allCreatures.forEach((c) => {
          cmap[c.id] = c;
        });
        setCreaturesMap(cmap);
      } catch (err: any) {
        setErrorMsg("Failed to generate analytics report: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, [id]);

  const handleRerunCounterfactual = async (tick: number, actor: string) => {
    if (!battle) return;
    setCfRunning(true);
    try {
      const res = await api.rerunCounterfactual(battle.battle_id, {
        tick,
        actor,
        action_type: "move_lane",
        target_lane: 1,
      });
      setCfResult(res);
    } catch (e: any) {
      alert("Counterfactual execution failed: " + e.message);
    } finally {
      setCfRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <h3>Assembling analytics report...</h3>
      </div>
    );
  }

  if (errorMsg || !battle) {
    return (
      <div className="arcade-panel" style={{ padding: "2rem", textAlign: "center" }}>
        <h3 style={{ color: "#ef4444", marginBottom: "1rem" }}>{errorMsg || "Battle not found"}</h3>
        <Link to="/" className="btn-arcade btn-primary">
          Back to Roster
        </Link>
      </div>
    );
  }

  const isWin = battle.outcome === "win";
  const isUploaded = battle.source.startsWith("upload:");

  return (
    <div>
      {/* Top Banner */}
      <div
        className="arcade-panel"
        style={{
          background: isWin
            ? "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(22, 27, 34, 0.95) 100%)"
            : "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(22, 27, 34, 0.95) 100%)",
          borderColor: isWin ? "var(--primary-green)" : "var(--primary-red)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 900,
                  fontSize: "2.25rem",
                  color: isWin ? "#10b981" : "#ef4444",
                }}
              >
                {isWin ? "VICTORY ACHIEVED" : "DEFEAT SUFFERED"}
              </h2>
              <span
                style={{
                  background: isUploaded ? "#6366f1" : "var(--primary-blue)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                }}
              >
                {isUploaded ? "Uploaded Battle" : "Simulated Engine"}
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Scenario: <strong style={{ color: "#fff" }}>{battle.scenario_id}</strong> • Ticks Elapsed:{" "}
              <strong style={{ color: "#fff" }}>{battle.ticks_elapsed}</strong> • Survivors:{" "}
              <strong style={{ color: "#fff" }}>{battle.survivors}</strong> • Coins Remaining:{" "}
              <strong style={{ color: "var(--coin-gold)" }}>{battle.coins_left}</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Link to={`/battle/${battle.battle_id}`} className="btn-arcade btn-secondary">
              📺 View Arena Replay
            </Link>
            <Link to="/" className="btn-arcade btn-primary">
              ⚔ New Scenario
            </Link>
          </div>
        </div>

        {/* Replay Verification status for Uploaded Battles */}
        {replayStatus && (
          <div
            style={{
              marginTop: "1rem",
              background: "var(--bg-surface)",
              border: `1px solid ${replayStatus.status === "match" ? "#10b981" : "#f59e0b"}`,
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.85rem",
            }}
          >
            <span style={{ fontWeight: 800, color: replayStatus.status === "match" ? "#10b981" : "#f59e0b" }}>
              REPLAY CHECK: {replayStatus.status.toUpperCase()}
            </span>
            <span style={{ color: "var(--text-main)" }}>{replayStatus.details}</span>
          </div>
        )}
      </div>

      {/* Creature Cards Stats Grid */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff", marginBottom: "0.75rem" }}>
          Creature Performance & Casualties
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {descriptive?.creatures_stats.map((stat) => {
            const c = creaturesMap[stat.id];
            return (
              <div key={stat.id} className="arcade-panel" style={{ padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 800, color: "#fff" }}>{c?.name || stat.id}</span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: stat.survived ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                      color: stat.survived ? "#10b981" : "#ef4444",
                    }}
                  >
                    {stat.survived ? "SURVIVED" : "KNOCKED OUT"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  <div>Dealt: <strong style={{ color: "#fff" }}>{stat.damage_dealt} dmg</strong></div>
                  <div>Taken: <strong style={{ color: "#fff" }}>{stat.damage_taken} dmg</strong></div>
                  <div>KOs Scored: <strong style={{ color: "var(--coin-gold)" }}>{stat.kos}</strong></div>
                  <div>Hazard Hits: <strong style={{ color: "var(--hazard-purple)" }}>{stat.hazard_ticks}</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Descriptive Analytics: Timelines & Heatmap */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
        {descriptive && <TickTimeline timeline={descriptive.hp_timeline} playerTeam={battle.player_team} />}
        {descriptive && <Heatmap heatmap={descriptive.heatmap} />}
      </div>

      {/* Diagnostic Analytics: Defeat Cause & Counterfactual */}
      {diagnostic && (
        <div style={{ marginBottom: "1.5rem" }}>
          {cfRunning && (
            <div style={{ color: "var(--coin-gold)", marginBottom: "0.5rem", fontWeight: 700 }}>
              ⚡ Rerunning counterfactual simulation with alternative decision...
            </div>
          )}
          <CauseList
            diagnostic={diagnostic}
            onCounterfactual={(t, a) => handleRerunCounterfactual(t, a)}
          />
        </div>
      )}

      {/* Counterfactual Results Diff Box */}
      {cfResult && (
        <div className="arcade-panel" style={{ borderColor: "var(--coin-gold)", background: "rgba(245, 158, 11, 0.05)", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h4 style={{ color: "var(--coin-gold)", fontWeight: 800 }}>Counterfactual Rerun Results</h4>
            <button onClick={() => setCfResult(null)} className="btn-arcade btn-secondary" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
              Dismiss
            </button>
          </div>
          <p style={{ fontSize: "0.9rem", color: "#fff", marginBottom: "0.75rem" }}>
            Outcome shifted from <strong>{cfResult.original_outcome.toUpperCase()}</strong> to{" "}
            <strong style={{ color: cfResult.new_outcome === "win" ? "#10b981" : "#ef4444" }}>
              {cfResult.new_outcome.toUpperCase()}
            </strong>{" "}
            (first divergent tick: T{cfResult.first_differing_tick}).
          </p>
          <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            <span>Survivors Delta: <strong style={{ color: "#fff" }}>{cfResult.survivors_diff >= 0 ? `+${cfResult.survivors_diff}` : cfResult.survivors_diff}</strong></span>
            <span>Ticks Delta: <strong style={{ color: "#fff" }}>{cfResult.ticks_diff}</strong></span>
            <span>Coins Delta: <strong style={{ color: "#fff" }}>{cfResult.coins_diff}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
