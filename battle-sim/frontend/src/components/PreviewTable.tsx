import React from "react";

interface PreviewTableProps {
  rows: any[];
  title?: string;
}

export const PreviewTable: React.FC<PreviewTableProps> = ({ rows, title = "Data Preview (First 20 Rows)" }) => {
  if (!rows || rows.length === 0) {
    return null;
  }

  // Derive column keys
  const keys = Object.keys(rows[0]).filter((k) => k !== "_line_num");

  return (
    <div className="arcade-panel" style={{ padding: "1.25rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h4 style={{ color: "#fff", fontWeight: 800 }}>{title}</h4>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Showing {rows.length} rows</span>
      </div>

      <div className="table-responsive-wrapper">
        <table className="arcade-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>#</th>
              {keys.map((k) => (
                <th key={k} style={{ textTransform: "capitalize" }}>
                  {k.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td style={{ color: "var(--text-muted)", fontWeight: 700 }}>{idx + 1}</td>
                {keys.map((k) => {
                  let val = row[k];
                  if (typeof val === "object" && val !== null) {
                    val = JSON.stringify(val);
                  }
                  return (
                    <td key={k} style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {String(val ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
