import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, BattleRecord, Scenario, Creature } from "../api";
import { Arena } from "../components/Arena";

export const BattleScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [battle, setBattle] = useState<BattleRecord | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [creaturesMap, setCreaturesMap] = useState<Record<string, Creature>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadBattleData() {
      if (!id) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const battleRes = await api.getBattle(id);
        setBattle(battleRes.battle);

        const [scen, allCreatures] = await Promise.all([
          api.getScenario(battleRes.battle.scenario_id),
          api.getCreatures(),
        ]);
        setScenario(scen);

        const cmap: Record<string, Creature> = {};
        allCreatures.forEach((c) => {
          cmap[c.id] = c;
        });
        setCreaturesMap(cmap);
      } catch (err: any) {
        setErrorMsg("Failed to load battle: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadBattleData();
  }, [id]);

  if (isLoading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <h3>Loading battle simulation...</h3>
      </div>
    );
  }

  if (errorMsg || !battle) {
    return (
      <div className="arcade-panel" style={{ padding: "2rem", textAlign: "center" }}>
        <h3 style={{ color: "#ef4444", marginBottom: "1rem" }}>{errorMsg || "Battle not found"}</h3>
        <Link to="/" className="btn-arcade btn-primary">
          Back to Roster Select
        </Link>
      </div>
    );
  }

  const isWin = battle.outcome === "win";

  return (
    <div>
      {/* Top Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h2 className="screen-title" style={{ fontSize: "1.75rem" }}>
              {scenario?.name || "Scenario Battle"}
            </h2>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 900,
                fontSize: "0.85rem",
                padding: "3px 10px",
                borderRadius: "6px",
                background: isWin ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                color: isWin ? "var(--primary-green)" : "var(--primary-red)",
                border: `1px solid ${isWin ? "var(--primary-green)" : "var(--primary-red)"}`,
              }}
            >
              {isWin ? "VICTORY" : "DEFEAT"}
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Deterministic Seed: <strong>{battle.seed}</strong> • Engine v{battle.engine_version} • Mode:{" "}
            <strong>{battle.personality}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => navigate(`/report/${battle.battle_id}`)}
            className="btn-arcade btn-accent"
          >
            📊 Open Analytics Report
          </button>
          <Link to="/" className="btn-arcade btn-secondary">
            ↺ New Battle
          </Link>
        </div>
      </div>

      {/* Interactive Themed Arena */}
      <Arena battle={battle} scenario={scenario} creaturesMap={creaturesMap} />

      {/* Event Log Stream */}
      <div className="arcade-panel" style={{ marginTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h4 style={{ color: "#fff", fontWeight: 800 }}>Complete Event Log ({battle.events.length} records)</h4>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Fully Deterministic Record</span>
        </div>

        <div className="table-responsive-wrapper" style={{ maxHeight: "320px", overflowY: "auto" }}>
          <table className="arcade-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>Tick</th>
                <th style={{ width: "90px" }}>Type</th>
                <th>Action & Target</th>
                <th style={{ width: "80px" }}>Damage</th>
                <th style={{ width: "80px" }}>HP After</th>
                <th style={{ width: "80px" }}>Coins</th>
              </tr>
            </thead>
            <tbody>
              {battle.events.map((ev, idx) => (
                <tr key={idx} style={{ background: ev.ko ? "rgba(239, 68, 68, 0.12)" : undefined }}>
                  <td style={{ fontWeight: 800, color: "var(--text-muted)" }}>T{ev.tick}</td>
                  <td>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background:
                          ev.event_type === "hazard"
                            ? "var(--hazard-purple)"
                            : ev.event_type === "death"
                            ? "var(--primary-red)"
                            : ev.event_type === "pickup" || ev.event_type === "block"
                            ? "var(--coin-gold)"
                            : "var(--bg-surface)",
                        color:
                          ev.event_type === "pickup" || ev.event_type === "block" ? "#000" : "#fff",
                      }}
                    >
                      {ev.event_type}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: "#fff" }}>{ev.actor ? `${ev.actor}: ` : ""}</strong>
                    <span>{ev.action}</span>
                    {ev.target && <span style={{ color: "var(--text-muted)" }}> → {ev.target}</span>}
                    {ev.status_change && (
                      <span style={{ color: "var(--coin-gold)", marginLeft: "6px" }}>
                        [{ev.status_change}]
                      </span>
                    )}
                  </td>
                  <td style={{ color: ev.damage > 0 ? "#ef4444" : ev.damage < 0 ? "#10b981" : "inherit" }}>
                    {ev.damage > 0 ? `-${ev.damage}` : ev.damage < 0 ? `+${Math.abs(ev.damage)}` : "-"}
                  </td>
                  <td>{ev.hp_after}</td>
                  <td style={{ color: ev.coin_change ? "var(--coin-gold)" : "inherit" }}>
                    {ev.coin_change ? (ev.coin_change > 0 ? `+${ev.coin_change}` : ev.coin_change) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
