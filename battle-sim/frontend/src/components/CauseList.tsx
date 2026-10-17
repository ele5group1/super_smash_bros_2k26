import React from "react";
import { DiagnosticAnalytics } from "../api";

interface CauseListProps {
  diagnostic: DiagnosticAnalytics;
  onCounterfactual?: (tick: number, actor: string) => void;
}

export const CauseList: React.FC<CauseListProps> = ({ diagnostic, onCounterfactual }) => {
  if (!diagnostic.is_defeat) {
    return (
      <div className="arcade-panel" style={{ padding: "1rem" }}>
        <div style={{ color: "var(--primary-green)", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
          <span>✓</span>
          <span>Victory achieved: no loss causes to diagnose.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="arcade-panel" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "1.25rem" }}>🔍</span>
        <h4 style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem" }}>
          Defeat Root-Cause Diagnostic
        </h4>
      </div>

      <p style={{ color: "var(--text-main)", fontSize: "0.95rem", marginBottom: "1rem" }}>
        {diagnostic.explanation}
      </p>

      {diagnostic.recommendation && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.12)",
            borderLeft: "4px solid var(--coin-gold)",
            padding: "0.75rem 1rem",
            borderRadius: "0 8px 8px 0",
            marginBottom: "1rem",
            fontSize: "0.9rem",
            color: "#fef3c7",
          }}
        >
          <strong>Tactical Advice:</strong> {diagnostic.recommendation}
        </div>
      )}

      <h5 style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
        Pivotal Turning Points (Chronological Trace)
      </h5>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {diagnostic.turning_points.map((pt, idx) => (
          <div
            key={idx}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span
                style={{
                  background: "#334155",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  padding: "2px 8px",
                  borderRadius: "4px",
                }}
              >
                Tick {pt.tick}
              </span>
              <div>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>{pt.title}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{pt.description}</div>
              </div>
            </div>

            {onCounterfactual && (
              <button
                onClick={() => onCounterfactual(pt.tick, "ember_fox")}
                className="btn-arcade btn-secondary"
                style={{ fontSize: "0.8rem", padding: "4px 10px" }}
              >
                Rerun Alternate Move ↺
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
