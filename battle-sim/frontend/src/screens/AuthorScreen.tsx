import React, { useState, useEffect } from "react";
import { api, Scenario } from "../api";

export const AuthorScreen: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [jsonText, setJsonText] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<any | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadScenarios() {
      try {
        const list = await api.getScenarios();
        setScenarios(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
          setJsonText(JSON.stringify(list[0], null, 2));
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadScenarios();
  }, []);

  const handleSelectScenario = async (id: string) => {
    setSelectedId(id);
    setSaveSuccess(null);
    try {
      const sc = await api.getScenario(id);
      setJsonText(JSON.stringify(sc, null, 2));
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);
    setSaveSuccess(null);
    try {
      JSON.parse(text);
      setJsonError(null);
    } catch (err: any) {
      setJsonError("Invalid JSON syntax: " + err.message);
    }
  };

  const handleRunBalanceAudit = async () => {
    if (!selectedId) return;
    setIsAuditing(true);
    try {
      const data = await api.auditBalance(selectedId);
      setBalanceData(data);
    } catch (e: any) {
      alert("Balance check failed: " + e.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSaveScenario = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      setIsSaving(true);
      await api.saveScenario(parsed);
      setSaveSuccess(`Scenario '${parsed.name || parsed.id}' saved successfully!`);
      const updatedList = await api.getScenarios();
      setScenarios(updatedList);
    } catch (err: any) {
      setJsonError("Failed to save: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 className="screen-title">Scenario Authoring & Balance Dashboard</h2>
        <p className="screen-subtitle">
          Construct and calibrate scenarios using JSON specifications, inspect pacing metrics, and verify balance within the 25%–75% target win band.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* Left Column: JSON Editor */}
        <div className="arcade-panel" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h4 style={{ color: "#fff", fontWeight: 800 }}>Scenario Definition Editor</h4>
            <select
              value={selectedId}
              onChange={(e) => handleSelectScenario(e.target.value)}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                color: "#fff",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "0.85rem",
              }}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  Load: {s.name}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={jsonText}
            onChange={handleJsonChange}
            aria-label="Scenario JSON Editor"
            rows={18}
            style={{
              width: "100%",
              background: "#0d1117",
              color: "#58a6ff",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              padding: "0.75rem",
              borderRadius: "8px",
              border: `1px solid ${jsonError ? "#ef4444" : "var(--border-color)"}`,
              outline: "none",
              resize: "vertical",
            }}
          />

          {jsonError && (
            <div style={{ color: "#ef4444", fontSize: "0.8rem", marginTop: "0.5rem", fontWeight: 700 }}>
              {jsonError}
            </div>
          )}

          {saveSuccess && (
            <div style={{ color: "#10b981", fontSize: "0.8rem", marginTop: "0.5rem", fontWeight: 700 }}>
              ✓ {saveSuccess}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              onClick={handleSaveScenario}
              disabled={Boolean(jsonError) || isSaving}
              className="btn-arcade btn-primary"
              style={{ flex: 1 }}
            >
              {isSaving ? "Saving..." : "💾 Save Scenario"}
            </button>
            <button
              onClick={handleRunBalanceAudit}
              disabled={isAuditing || !selectedId}
              className="btn-arcade btn-accent"
              style={{ flex: 1 }}
            >
              {isAuditing ? "Auditing..." : "⚖ Run Balance Check"}
            </button>
          </div>
        </div>

        {/* Right Column: Balance & Pacing Audit */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {balanceData ? (
            <>
              {/* Balance Banner */}
              <div
                className="arcade-panel"
                style={{
                  borderColor: balanceData.is_balanced ? "var(--primary-green)" : "var(--primary-red)",
                  background: balanceData.is_balanced
                    ? "rgba(16, 185, 129, 0.08)"
                    : "rgba(239, 68, 68, 0.08)",
                  padding: "1.25rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h4 style={{ color: "#fff", fontWeight: 800 }}>Scenario Balance Status</h4>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.8rem",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: balanceData.is_balanced ? "#10b981" : "#ef4444",
                      color: "#fff",
                    }}
                  >
                    {balanceData.is_balanced ? "WELL-BALANCED" : "FLAGGED UNBALANCED"}
                  </span>
                </div>

                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff", marginBottom: "0.25rem" }}>
                  {balanceData.overall_win_rate_percent}% Win Rate
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Target Band: <strong>{balanceData.target_band}</strong>
                </div>

                {balanceData.balance_flag && (
                  <div style={{ marginTop: "0.75rem", color: "#fca5a5", fontSize: "0.85rem", fontWeight: 600 }}>
                    ⚠ {balanceData.balance_flag}
                  </div>
                )}
              </div>

              {/* Pacing Metrics */}
              <div className="arcade-panel" style={{ padding: "1.25rem" }}>
                <h4 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.75rem" }}>Pacing Analytics</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Average Ticks:</span>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff" }}>
                      {balanceData.pacing.avg_ticks} / {balanceData.pacing.max_ticks}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-muted)" }}>Timeout Rate:</span>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff" }}>
                      {balanceData.pacing.timeout_percent}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Archetypes Test Table */}
              <div className="arcade-panel" style={{ padding: "1.25rem" }}>
                <h4 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>Squad Archetype Tests</h4>
                <div className="table-responsive-wrapper">
                  <table className="arcade-table">
                    <thead>
                      <tr>
                        <th>Squad Archetype</th>
                        <th>Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceData.archetypes.map((arch: any, i: number) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 700, color: "#fff" }}>{arch.archetype}</td>
                          <td>
                            <strong style={{ color: arch.win_rate_percent >= 50 ? "#10b981" : "#f59e0b" }}>
                              {arch.win_rate_percent}%
                            </strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="arcade-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
              <p>Click "Run Balance Check" to simulate standard archetype squads and test game pacing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
