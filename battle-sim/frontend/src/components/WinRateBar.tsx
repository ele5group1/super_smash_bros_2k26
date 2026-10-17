import React from "react";

interface WinRateBarProps {
  rate: number; // 0.0 to 1.0 or 0 to 100
  ci?: number; // Confidence interval percentage e.g. 5.2
  label?: string;
  showPercentText?: boolean;
}

export const WinRateBar: React.FC<WinRateBarProps> = ({
  rate,
  ci,
  label = "Predicted Win Rate",
  showPercentText = true,
}) => {
  const percent = rate > 1 ? Math.min(100, Math.max(0, rate)) : Math.min(100, Math.max(0, rate * 100));
  const rounded = Math.round(percent);

  // Gradient color based on win rate quality
  let colorGrad = "linear-gradient(90deg, #ef4444, #f97316)";
  if (percent >= 60) {
    colorGrad = "linear-gradient(90deg, #10b981, #059669)";
  } else if (percent >= 35) {
    colorGrad = "linear-gradient(90deg, #f59e0b, #eab308)";
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.85rem" }}>
        <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
        {showPercentText && (
          <span style={{ fontWeight: 800, color: "#fff" }}>
            {rounded}% {ci !== undefined ? `(±${Math.round(ci)}%)` : ""}
          </span>
        )}
      </div>
      <div
        style={{
          width: "100%",
          height: "12px",
          background: "var(--bg-surface)",
          borderRadius: "6px",
          overflow: "hidden",
          border: "1px solid var(--border-color)",
          position: "relative",
        }}
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: colorGrad,
            borderRadius: "5px",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
};
