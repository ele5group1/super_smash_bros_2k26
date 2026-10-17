import React, { useState, useEffect } from "react";
import { api, UploadRecord } from "../api";
import { UploadDropzone } from "../components/UploadDropzone";
import { ValidationReport } from "../components/ValidationReport";
import { PreviewTable } from "../components/PreviewTable";

export const DataScreen: React.FC = () => {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [currentUpload, setCurrentUpload] = useState<UploadRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUploads = async () => {
    try {
      const list = await api.getUploads();
      setUploads(list);
    } catch (e: any) {
      setErrorMsg("Failed to load upload records: " + e.message);
    }
  };

  useEffect(() => {
    loadUploads();
  }, []);

  const handleUploadFile = async (file: File, kind: "scenarios" | "creatures" | "battles") => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const rec = await api.uploadFile(file, kind);
      setCurrentUpload(rec);
      await loadUploads();
    } catch (err: any) {
      if (err.uploadRecord) {
        setCurrentUpload(err.uploadRecord);
      } else {
        setErrorMsg(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUpload = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this upload and all its imported records?")) {
      return;
    }
    setDeletingId(id);
    try {
      await api.deleteUpload(id);
      if (currentUpload?.id === id) {
        setCurrentUpload(null);
      }
      await loadUploads();
    } catch (err: any) {
      alert("Failed to delete upload: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 className="screen-title">Data Management & Dataset Upload</h2>
        <p className="screen-subtitle">
          Import custom creature rosters, scenario bundles, and empirical battle logs in JSON or CSV format with strict all-or-nothing validation.
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid #ef4444",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            color: "#fca5a5",
            marginBottom: "1.5rem",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Upload Zone */}
      <UploadDropzone onFileSelected={handleUploadFile} isLoading={isLoading} />

      {/* Live Validation Report & Preview for Last Upload */}
      {currentUpload && (
        <div style={{ marginTop: "1.5rem" }}>
          <ValidationReport
            status={currentUpload.status}
            errors={currentUpload.errors}
            warnings={currentUpload.warnings}
            rowCount={currentUpload.row_count}
          />
          {currentUpload.preview && currentUpload.preview.length > 0 && (
            <PreviewTable rows={currentUpload.preview} />
          )}
        </div>
      )}

      {/* Dataset Export Section */}
      <div className="arcade-panel" style={{ marginTop: "2rem", padding: "1.25rem" }}>
        <h4 style={{ color: "#fff", fontWeight: 800, marginBottom: "0.5rem" }}>
          Export Database Records
        </h4>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
          Download entire database tables as clean JSON or sanitized CSV (with automated spreadsheet formula injection guard).
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <div style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "8px" }}>
            <div style={{ fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>Creature Roster</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <a href="/api/export/creatures?format=csv" download className="btn-arcade btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }}>
                CSV (.csv)
              </a>
              <a href="/api/export/creatures?format=json" download className="btn-arcade btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }}>
                JSON (.json)
              </a>
            </div>
          </div>

          <div style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "8px" }}>
            <div style={{ fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>Scenario Sets</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <a href="/api/export/scenarios?format=csv" download className="btn-arcade btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }}>
                ZIP (CSVs)
              </a>
              <a href="/api/export/scenarios?format=json" download className="btn-arcade btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }}>
                JSON (.json)
              </a>
            </div>
          </div>

          <div style={{ background: "var(--bg-surface)", padding: "1rem", borderRadius: "8px" }}>
            <div style={{ fontWeight: 700, color: "#fff", marginBottom: "0.5rem" }}>Battle Records & Logs</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <a href="/api/export/battles?format=csv" download className="btn-arcade btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }}>
                ZIP (CSVs)
              </a>
              <a href="/api/export/battles?format=json" download className="btn-arcade btn-secondary" style={{ flex: 1, fontSize: "0.8rem" }}>
                JSON (.json)
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Upload History Table */}
      <div className="arcade-panel" style={{ marginTop: "2rem", padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h4 style={{ color: "#fff", fontWeight: 800 }}>Uploaded File Registry ({uploads.length})</h4>
          <button onClick={loadUploads} className="btn-arcade btn-secondary" style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
            ↻ Refresh
          </button>
        </div>

        {uploads.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem 0" }}>
            No uploads stored yet. Upload your first dataset above!
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="arcade-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Kind</th>
                  <th>Rows</th>
                  <th>Status</th>
                  <th>Uploaded At</th>
                  <th style={{ width: "160px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => {
                  const isValid = u.status === "valid";
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700, color: "#fff" }}>{u.filename}</td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "var(--bg-surface)",
                            textTransform: "uppercase",
                          }}
                        >
                          {u.kind}
                        </span>
                      </td>
                      <td>{u.row_count}</td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            color: isValid ? "#10b981" : "#ef4444",
                          }}
                        >
                          {isValid ? "VALID" : "REJECTED"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {new Date(u.created_at).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => setCurrentUpload(u)}
                            className="btn-arcade btn-secondary"
                            style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                          >
                            Inspect
                          </button>
                          <button
                            onClick={() => handleDeleteUpload(u.id)}
                            disabled={deletingId === u.id}
                            className="btn-arcade btn-danger"
                            style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                          >
                            {deletingId === u.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
