import React from "react";
import { DiagnosticAnalytics } from "../api";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

interface CauseListProps {
  diagnostic: DiagnosticAnalytics;
  onCounterfactual?: (tick: number, actor: string) => void;
  onJumpToTick?: (tick: number) => void;
}

export const CauseList: React.FC<CauseListProps> = ({
  diagnostic,
  onCounterfactual,
  onJumpToTick,
}) => {
  if (!diagnostic.is_defeat) {
    return (
      <div className="ui-card" style={{ padding: "var(--space-4)" }}>
        <div style={{ color: "var(--color-success)", fontWeight: "bold", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span>✓</span>
          <span>Victory achieved. Review damage and casualties in the battle summary.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-card" style={{ padding: "var(--space-4)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        <span style={{ fontSize: "1.25rem" }}>🔍</span>
        <h3 className="text-h3">
          Possible Contributors to Defeat
        </h3>
      </div>

      <p style={{ color: "var(--text-primary)", fontSize: "var(--font-size-small)", marginBottom: "var(--space-4)" }}>
        {diagnostic.explanation}
      </p>

      {diagnostic.recommendation && (
        <div
          style={{
            background: "var(--color-warning-bg)",
            borderLeft: "4px solid var(--color-warning)",
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            marginBottom: "var(--space-4)",
            fontSize: "var(--font-size-small)",
            color: "var(--text-primary)",
          }}
        >
          <strong>Tactical Recommendation:</strong> {diagnostic.recommendation}
        </div>
      )}

      <h4 style={{ color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase", marginBottom: "var(--space-2)" }}>
        Pivotal Turning Points (Click moment to inspect tick)
      </h4>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {diagnostic.turning_points.map((pt, idx) => (
          <div
            key={idx}
            onClick={() => onJumpToTick?.(pt.tick)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onJumpToTick?.(pt.tick);
              }
            }}
            className="ui-card ui-card-interactive"
            style={{
              padding: "var(--space-3) var(--space-4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-3)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <Badge variant="neutral" size="sm">
                Tick {pt.tick}
              </Badge>
              <div>
                <div style={{ fontWeight: "bold", fontSize: "var(--font-size-small)" }}>
                  {pt.title}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  {pt.description}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {onCounterfactual && pt.actor && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCounterfactual(pt.tick, pt.actor!);
                  }}
                >
                  ⚡ Try a Change
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
