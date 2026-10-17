import React from "react";

interface HeatmapProps {
  heatmap: Array<Array<{ damage: number; kos: number }>>;
}

export const Heatmap: React.FC<HeatmapProps> = ({ heatmap }) => {
  if (!heatmap || heatmap.length === 0) {
    return <div style={{ color: "var(--text-muted)" }}>No heatmap data recorded.</div>;
  }

  // Find max damage for color scaling
  let maxDmg = 1;
  heatmap.forEach((lane) => {
    lane.forEach((cell) => {
      if (cell.damage > maxDmg) maxDmg = cell.damage;
    });
  });

  return (
    <div className="arcade-panel" style={{ padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h4 style={{ color: "#fff", fontWeight: 700 }}>Battlefield Threat & KO Heatmap</h4>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Damage & Fatalities</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "400px" }}>
          {heatmap.map((lane, laneIdx) => (
            <div key={laneIdx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "50px", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>
                L{laneIdx + 1}
              </span>
              <div style={{ display: "flex", flex: 1, gap: "4px" }}>
                {lane.map((cell, tileIdx) => {
                  const intensity = Math.min(1, cell.damage / maxDmg);
                  const hasKo = cell.kos > 0;
                  return (
                    <div
                      key={tileIdx}
                      style={{
                        flex: 1,
                        height: "36px",
                        borderRadius: "4px",
                        background: hasKo
                          ? "rgba(239, 68, 68, 0.85)"
                          : cell.damage > 0
                          ? `rgba(245, 158, 11, ${Math.max(0.2, intensity)})`
                          : "rgba(255, 255, 255, 0.05)",
                        border: hasKo ? "1px solid #ff4444" : "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: hasKo || intensity > 0.4 ? "#fff" : "rgba(255,255,255,0.4)",
                      }}
                      title={`Lane ${laneIdx + 1}, Tile ${tileIdx}: ${cell.damage} damage, ${cell.kos} KOs`}
                    >
                      {hasKo ? `☠ ${cell.kos}` : cell.damage > 0 ? `${cell.damage}` : "-"}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
