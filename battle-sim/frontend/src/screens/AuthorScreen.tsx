import React, { useState, useEffect } from "react";
import { api, Scenario } from "../api";
import { Card, CardHeader, CardTitle, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";

export const AuthorScreen: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const [jsonText, setJsonText] = useState<string>("");
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const [scenarioObj, setScenarioObj] = useState<any | null>(null);

  const [balanceData, setBalanceData] = useState<any | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Palette of draggable/placeable tile tools
  const [selectedTool, setSelectedTool] = useState<string>("hazard");

  useEffect(() => {
    async function loadScenarios() {
      try {
        const list = await api.getScenarios();
        setScenarios(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedId(first.id);
          setScenarioObj(first);
          setJsonText(JSON.stringify(first, null, 2));
        }
      } catch (e: any) {
        toastError("Failed to load scenarios", e.message);
      }
    }
    loadScenarios();
  }, []);

  const validateScenario = (obj: any): string[] => {
    const errors: string[] = [];
    if (!obj.id) errors.push("Scenario 'id' is required.");
    if (!obj.name) errors.push("Scenario 'name' is required.");
    if (!obj.map) {
      errors.push("Missing 'map' definition.");
    } else {
      if (typeof obj.map.lanes !== "number" || obj.map.lanes <= 0) {
        errors.push("map.lanes must be a positive integer.");
      }
      if (!Array.isArray(obj.map.hazards)) {
        errors.push("map.hazards must be an array.");
      }
    }
    if (!obj.objective || !obj.objective.type) {
      errors.push("Scenario requires an 'objective' with a valid 'type'.");
    }
    return errors;
  };

  const handleSelectScenario = async (id: string) => {
    setSelectedId(id);
    setBalanceData(null);
    try {
      const sc = await api.getScenario(id);
      setScenarioObj(sc);
      setJsonText(JSON.stringify(sc, null, 2));
      setJsonErrors(validateScenario(sc));
    } catch (e: any) {
      toastError("Failed to load scenario", e.message);
    }
  };

  // When JSON editor changes: sync to Visual Map
  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      const errors = validateScenario(parsed);
      setJsonErrors(errors);
      setScenarioObj(parsed);
    } catch (err: any) {
      setJsonErrors([`JSON Syntax Error: ${err.message}`]);
    }
  };

  // When visual map tile is clicked or dropped: sync to JSON editor
  const handleTileClick = (laneIdx: number, colIdx: number) => {
    if (!scenarioObj) return;

    const nextObj = JSON.parse(JSON.stringify(scenarioObj));
    if (!nextObj.map) nextObj.map = { width: 8, height: 4, lanes: 3, hazards: [] };
    if (!Array.isArray(nextObj.map.hazards)) nextObj.map.hazards = [];

    // Check if hazard already exists at this lane & col
    const existingIdx = nextObj.map.hazards.findIndex(
      (h: any) => h.lane === laneIdx && (h.col === colIdx || h.x === colIdx)
    );

    if (existingIdx !== -1) {
      // Toggle off or change
      if (nextObj.map.hazards[existingIdx].type === selectedTool) {
        nextObj.map.hazards.splice(existingIdx, 1);
      } else {
        nextObj.map.hazards[existingIdx].type = selectedTool;
      }
    } else {
      nextObj.map.hazards.push({
        lane: laneIdx,
        col: colIdx,
        x: colIdx,
        y: laneIdx,
        type: selectedTool,
        tick: (colIdx + 1) * 3,
        duration: 3,
      });
    }

    setScenarioObj(nextObj);
    setJsonText(JSON.stringify(nextObj, null, 2));
    setJsonErrors(validateScenario(nextObj));
  };

  const handleRunBalanceAudit = async () => {
    if (!selectedId) return;
    setIsAuditing(true);
    try {
      const data = await api.auditBalance(selectedId);
      setBalanceData(data);
      success("Balance Check Complete", `Win rate: ${data.overall_win_rate_percent}%`);
    } catch (e: any) {
      toastError("Balance Audit Failed", e.message);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSaveScenario = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      setIsSaving(true);
      await api.saveScenario(parsed);
      success("Scenario Saved", `'${parsed.name || parsed.id}' saved successfully.`);
      const updatedList = await api.getScenarios();
      setScenarios(updatedList);
    } catch (err: any) {
      toastError("Save Failed", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const numLanes = scenarioObj?.map?.lanes || 3;
  const numCols = scenarioObj?.map?.width || 8;
  const hazards = scenarioObj?.map?.hazards || [];

  // Dynamic balance meter color (target band 25% to 75%)
  const winRate = balanceData?.overall_win_rate_percent ?? 50;
  const isBalanced = winRate >= 25 && winRate <= 75;
  const balanceColor = isBalanced ? "var(--color-success)" : "var(--color-error)";

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div>
          <h1 className="text-h1">Scenario Visual Author & Balance Studio</h1>
          <p className="text-muted" style={{ marginTop: "var(--space-1)" }}>
            Bi-directional visual map builder, real-time schema validation, and Monte Carlo balance metering.
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <select
            className="ui-select"
            value={selectedId}
            onChange={(e) => handleSelectScenario(e.target.value)}
            style={{ width: "200px" }}
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <Button
            id="audit-balance-btn"
            variant="secondary"
            onClick={handleRunBalanceAudit}
            isLoading={isAuditing}
          >
            ⚖ Run Balance Audit
          </Button>

          <Button
            id="save-scenario-btn"
            variant="primary"
            onClick={handleSaveScenario}
            disabled={jsonErrors.length > 0 || isSaving}
            isLoading={isSaving}
          >
            💾 Save Scenario
          </Button>
        </div>
      </div>

      {/* Dynamic Win Rate Balance Meter (25% - 75% target band) */}
      <Card style={{ marginBottom: "var(--space-6)" }}>
        <CardBody>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span style={{ fontWeight: "bold" }}>Scenario Balance Meter:</span>
              <Badge variant={isBalanced ? "success" : "error"} size="sm">
                {isBalanced ? "WELL-BALANCED (25%–75% TARGET)" : "OUT OF TARGET BAND"}
              </Badge>
            </div>
            <span style={{ fontWeight: "bold", fontSize: "18px", color: balanceColor }}>
              {balanceData ? `${winRate}% Win Rate` : "Untested (Run Audit)"}
            </span>
          </div>

          <div className="winrate-bar-container" style={{ height: "16px" }}>
            <div
              className="winrate-bar-fill"
              style={{
                width: `${winRate}%`,
                background: balanceColor,
              }}
            />
            {/* Shaded Target Band (25% to 75%) */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "25%",
                width: "50%",
                borderLeft: "2px solid rgba(255, 255, 255, 0.4)",
                borderRight: "2px solid rgba(255, 255, 255, 0.4)",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                pointerEvents: "none",
              }}
              title="Target Band: 25% to 75% win rate"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
            <span>0% Defeat-Heavy</span>
            <span>25% Target Band Start</span>
            <span>50% Center</span>
            <span>75% Target Band End</span>
            <span>100% Win-Heavy</span>
          </div>
        </CardBody>
      </Card>

      {/* Validation Errors Summary List if any */}
      {jsonErrors.length > 0 && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-error-bg)",
              border: "1px solid var(--color-error)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ fontWeight: "bold", color: "var(--color-error)", marginBottom: "4px" }}>
              ⚠️ Validation Errors Detected ({jsonErrors.length}):
            </div>
            <ul style={{ paddingLeft: "var(--space-4)", fontSize: "13px", color: "var(--text-primary)" }}>
              {jsonErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Split View: Visual Map Editor (Left) & Scenario JSON (Right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "var(--space-6)",
        }}
      >
        {/* Left Column: Visual Map Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Map Arena Editor</CardTitle>
            <div style={{ display: "flex", gap: "var(--space-1)" }}>
              {[
                { type: "hazard", label: "Spikes ⚠️" },
                { type: "pipe", label: "Pipe 🕳" },
                { type: "exit", label: "Goal 🏁" },
              ].map((tool) => (
                <button
                  key={tool.type}
                  type="button"
                  className={`ui-btn ui-btn-sm ${selectedTool === tool.type ? "ui-btn-primary" : "ui-btn-ghost"}`}
                  onClick={() => setSelectedTool(tool.type)}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardBody>
            <p className="text-muted text-small" style={{ marginBottom: "var(--space-3)" }}>
              Click tiles below to place or remove elements. Changes immediately update the JSON.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
                background: "var(--bg-app)",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {Array.from({ length: numLanes }).map((_, laneIdx) => (
                <div key={laneIdx} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span style={{ width: "50px", fontSize: "11px", fontWeight: "bold", color: "var(--text-muted)" }}>
                    Lane {laneIdx + 1}
                  </span>
                  <div style={{ display: "flex", gap: "4px", flex: 1 }}>
                    {Array.from({ length: numCols }).map((_, colIdx) => {
                      const hazard = hazards.find(
                        (h: any) => h.lane === laneIdx && (h.col === colIdx || h.x === colIdx)
                      );

                      return (
                        <button
                          key={colIdx}
                          type="button"
                          onClick={() => handleTileClick(laneIdx, colIdx)}
                          style={{
                            flex: 1,
                            height: "44px",
                            backgroundColor: hazard
                              ? hazard.type === "hazard"
                                ? "var(--color-error)"
                                : hazard.type === "pipe"
                                ? "#15803d"
                                : "var(--accent-primary)"
                              : "var(--bg-surface)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            cursor: "pointer",
                            color: "#fff",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title={`Lane ${laneIdx + 1}, Col ${colIdx + 1}: ${hazard ? hazard.type : "Empty"}`}
                          aria-label={`Lane ${laneIdx + 1}, Col ${colIdx + 1}`}
                        >
                          {hazard?.type === "hazard" ? "⚠️" : hazard?.type === "pipe" ? "🕳" : hazard?.type === "exit" ? "🏁" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Right Column: Scenario JSON Editor */}
        <Card>
          <CardHeader>
            <CardTitle>Scenario JSON Specification</CardTitle>
            <span className="text-small text-muted">Bi-directional Synchronization</span>
          </CardHeader>
          <CardBody style={{ padding: "var(--space-2)" }}>
            <div style={{ position: "relative" }}>
              <textarea
                value={jsonText}
                onChange={handleJsonChange}
                rows={18}
                aria-label="Scenario JSON Editor"
                style={{
                  width: "100%",
                  background: "var(--bg-app)",
                  color: "var(--accent-primary)",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${jsonErrors.length > 0 ? "var(--color-error)" : "var(--border-subtle)"}`,
                  outline: "none",
                  resize: "vertical",
                  lineHeight: "1.4",
                }}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
