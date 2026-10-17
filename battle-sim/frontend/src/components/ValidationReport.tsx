import React from "react";

interface ValidationReportProps {
  errors: string[];
  warnings?: string[];
  rowCount?: number;
  status: "valid" | "rejected";
}

export const ValidationReport: React.FC<ValidationReportProps> = ({
  errors,
  warnings = [],
  rowCount = 0,
  status,
}) => {
  const isValid = status === "valid";

  return (
    <div className="arcade-panel" style={{ padding: "1.25rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h4 style={{ color: "#fff", fontWeight: 800 }}>Validation Report</h4>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              fontWeight: 800,
              fontSize: "0.8rem",
              background: isValid ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
              color: isValid ? "#10b981" : "#ef4444",
              border: `1px solid ${isValid ? "#10b981" : "#ef4444"}`,
            }}
          >
            {isValid ? "VALIDATED & STORED" : "REJECTED (ALL-OR-NOTHING)"}
          </span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "0.8rem",
              background: "var(--bg-surface)",
              color: "var(--text-muted)",
              border: "1px solid var(--border-color)",
            }}
          >
            {rowCount} Rows Processed
          </span>
        </div>
      </div>

      {isValid ? (
        <div style={{ color: "#10b981", fontSize: "0.9rem" }}>
          All rows strictly verified against schema. Imported successfully into database.
        </div>
      ) : (
        <div>
          <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: "0.5rem", fontSize: "0.9rem" }}>
            {errors.length} validation error(s) detected. The upload was completely rolled back.
          </div>
          <div className="table-responsive-wrapper">
            <table className="arcade-table">
              <thead>
                <tr>
                  <th style={{ width: "80px" }}>Line #</th>
                  <th>Error Description</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err, idx) => {
                  // Extract line number if present
                  const match = err.match(/line (\d+)/i) || err.match(/row (\d+)/i);
                  const lineNum = match ? match[1] : "-";
                  return (
                    <tr key={idx} style={{ background: "rgba(239, 68, 68, 0.08)" }}>
                      <td style={{ fontWeight: 800, color: "#fca5a5" }}>{lineNum}</td>
                      <td style={{ color: "#fca5a5", whiteSpace: "normal" }}>{err}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ color: "var(--coin-gold)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.25rem" }}>
            Warnings ({warnings.length}):
          </div>
          <ul style={{ paddingLeft: "1.25rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
