import React, { useState, useEffect } from "react";
import { api, Scenario, UploadRecord, PredictionResult } from "../api";
import { WinRateBar } from "../components/WinRateBar";

export const PlanScreen: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [team] = useState<string[]>(["mario", "pikachu"]);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string>("");

  const [compareResults, setCompareResults] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [scenList, upList] = await Promise.all([
          api.getScenarios(),
          api.getUploads(),
        ]);
        setScenarios(scenList);
        setUploads(upList.filter((u) => u.kind === "battles" && u.status === "valid"));
        if (scenList.length > 0) {
          setSelectedScenarioId(scenList[0].id);
        }
      } catch (e) {
        console.error("Plan screen load error:", e);
      }
    }
    loadData();
  }, []);

  const handleRunAnalysis = async () => {
    if (!selectedScenarioId) return;
    setIsLoading(true);
    try {
      // 1. Prediction with optional calibration
      const pred = await api.predictPlan({
        scenario_id: selectedScenarioId,
        team,
        seed_count: 200,
        calibrate_with_upload_id: selectedUploadId || undefined,
      });
      setPrediction(pred);

      // 2. Spending comparison
      const comp = await api.comparePlan({
        scenario_id: selectedScenarioId,
        seed_count: 100,
        options: [
          { name: "Zero Early Heal (Max Coins)", team, early_heal_spend: 0 },
          { name: "Moderate Early Heal (5 Coins)", team, early_heal_spend: 5 },
          { name: "Heavy Early Heal (10 Coins)", team, early_heal_spend: 10 },
          { name: "Total Early Spend (20 Coins)", team, early_heal_spend: 20 },
        ],
      });
      setCompareResults(comp);

      // 3. Recommendation
      const rec = await api.recommendPlan({
        scenario_id: selectedScenarioId,
        team,
        current_coins: 20,
      });
      setRecommendation(rec);
    } catch (e) {
      console.error("Analysis execution error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedScenarioId) {
      handleRunAnalysis();
    }
  }, [selectedScenarioId, selectedUploadId]);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 className="screen-title">Strategic Pre-Battle Planning & Calibration</h2>
        <p className="screen-subtitle">
          Optimize coin allocations, contrast team tactical formations, and benchmark simulated Monte Carlo win rates against uploaded battle logs.
        </p>
      </div>

      {/* Configuration bar */}
      <div className="arcade-panel" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              Target Scenario
            </label>
            <select
              value={selectedScenarioId}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: "8px",
              }}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              Empirical Calibration Dataset (Uploaded Battle Logs)
            </label>
            <select
              value={selectedUploadId}
              onChange={(e) => setSelectedUploadId(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: "8px",
              }}
            >
              <option value="">None (Pure Simulation)</option>
              {uploads.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.filename} ({u.row_count} battles)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading}
              className="btn-arcade btn-primary"
              style={{ width: "100%", padding: "8px 16px" }}
            >
              {isLoading ? "Running Simulation..." : "⚡ Re-calculate Predictions"}
            </button>
          </div>
        </div>
      </div>

      {/* Calibration Comparison Panel (when an upload is selected) */}
      {prediction?.calibration && (
        <div
          className="arcade-panel"
          style={{
            borderColor: "var(--border-highlight)",
            background: "rgba(59, 130, 246, 0.08)",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h4 style={{ color: "#fff", fontWeight: 800 }}>Empirical Calibration Benchmark</h4>
            <span style={{ fontSize: "0.8rem", color: "var(--coin-gold)", fontWeight: 700 }}>
              Never Silently Blended
            </span>
          </div>

          {prediction.calibration.uploaded_samples > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Simulated Win Rate:</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff" }}>
                  {prediction.win_rate_percent}% (±{prediction.confidence_interval_percent}%)
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Uploaded Empirical Rate:</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--border-highlight)" }}>
                  {prediction.calibration.uploaded_win_rate_percent}% ({prediction.calibration.uploaded_samples} records)
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Calibration Gap:</span>
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 900,
                    color: (prediction.calibration.gap || 0) > 0 ? "var(--primary-red)" : "var(--primary-green)",
                  }}
                >
                  {(prediction.calibration.gap_percent || 0) > 0 ? `+${prediction.calibration.gap_percent}%` : `${prediction.calibration.gap_percent}%`}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {prediction.calibration.message || "No matching uploaded battles found for this scenario and team."}
            </div>
          )}
        </div>
      )}

      {/* Prescriptive Recommendation Banner */}
      {recommendation && (
        <div
          className="arcade-panel"
          style={{
            borderColor: "var(--coin-gold)",
            background: "rgba(245, 158, 11, 0.08)",
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>💡</span>
            <h4 style={{ color: "var(--coin-gold)", fontWeight: 800 }}>Prescriptive Tactical Advice</h4>
          </div>
          <p style={{ color: "#fff", fontSize: "0.95rem" }}>{recommendation.explanation}</p>
        </div>
      )}

      {/* Ranked Options Comparison Table */}
      <div className="arcade-panel" style={{ padding: "1.25rem" }}>
        <h4 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.75rem" }}>
          Resource Allocation Comparison Table
        </h4>
        <div className="table-responsive-wrapper">
          <table className="arcade-table">
            <thead>
              <tr>
                <th>Strategy Name</th>
                <th style={{ width: "120px" }}>Early Spend</th>
                <th style={{ minWidth: "220px" }}>Predicted Win Rate</th>
                <th style={{ width: "120px" }}>Avg Survivors</th>
                <th style={{ width: "120px" }}>Reserve Kept</th>
              </tr>
            </thead>
            <tbody>
              {compareResults.map((opt, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: "#fff" }}>{opt.name}</td>
                  <td>{opt.early_heal_spend} coins</td>
                  <td>
                    <WinRateBar rate={opt.win_rate} showPercentText={true} />
                  </td>
                  <td>{opt.avg_survivors} alive</td>
                  <td>{opt.avg_coins_left} coins</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
