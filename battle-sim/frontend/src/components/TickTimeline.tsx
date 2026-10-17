import React from "react";
import { DescriptiveAnalytics } from "../api";

interface TickTimelineProps {
  timeline: DescriptiveAnalytics["hp_timeline"];
  playerTeam: string[];
}

export const TickTimeline: React.FC<TickTimelineProps> = ({ timeline, playerTeam }) => {
  if (!timeline || timeline.length === 0) {
    return <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No timeline data available.</div>;
  }

  const maxTicks = timeline.length;
  const svgWidth = 640;
  const svgHeight = 200;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Colors for each creature line
  const colors = ["#ef4444", "#06b6d4", "#22c55e", "#eab308"];

  const getX = (tick: number) => padding.left + ((tick - 1) / Math.max(1, maxTicks - 1)) * chartWidth;
  const getY = (hp: number) => padding.top + (1 - Math.max(0, Math.min(100, hp)) / 100) * chartHeight;

  return (
    <div className="arcade-panel" style={{ padding: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h4 style={{ color: "#fff", fontWeight: 700 }}>HP & Event Timeline</h4>
        <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem" }}>
          {playerTeam.map((cid, idx) => (
            <div key={cid} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors[idx % colors.length] }} />
              <span style={{ color: "var(--text-muted)" }}>{cid}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: "100%", height: "auto", minWidth: "480px" }}
          role="img"
          aria-label="HP and Event Timeline Chart"
        >
          {/* Horizontal grid lines */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line x1={padding.left} y1={y} x2={svgWidth - padding.right} y2={y} stroke="#334155" strokeDasharray="3 3" />
                <text x={padding.left - 8} y={y + 4} fill="#64748b" fontSize="10" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Creature HP Lines */}
          {playerTeam.map((cid, cidx) => {
            const color = colors[cidx % colors.length];
            const points = timeline.map((pt) => `${getX(pt.tick)},${getY(pt.creatures[cid] ?? 0)}`).join(" ");
            return (
              <g key={cid}>
                <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" points={points} />
                {timeline.map((pt) => {
                  const hp = pt.creatures[cid] ?? 0;
                  const isKo = pt.ko_events.includes(cid);
                  if (isKo) {
                    return (
                      <circle
                        key={pt.tick}
                        cx={getX(pt.tick)}
                        cy={getY(hp)}
                        r="4.5"
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth="1.5"
                      />
                    );
                  }
                  return null;
                })}
              </g>
            );
          })}

          {/* Hazard markers */}
          {timeline.map((pt) => {
            if (pt.hazard_events && pt.hazard_events.length > 0) {
              const x = getX(pt.tick);
              return (
                <line
                  key={`haz-${pt.tick}`}
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={svgHeight - padding.bottom}
                  stroke="var(--hazard-purple)"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              );
            }
            return null;
          })}

          {/* X axis labels */}
          <line
            x1={padding.left}
            y1={svgHeight - padding.bottom}
            x2={svgWidth - padding.right}
            y2={svgHeight - padding.bottom}
            stroke="#64748b"
          />
          {timeline
            .filter((_, idx) => idx % Math.ceil(maxTicks / 8) === 0 || idx === maxTicks - 1)
            .map((pt) => (
              <text
                key={`lbl-${pt.tick}`}
                x={getX(pt.tick)}
                y={svgHeight - 10}
                fill="#94a3b8"
                fontSize="10"
                textAnchor="middle"
              >
                T{pt.tick}
              </text>
            ))}
        </svg>
      </div>
    </div>
  );
};
