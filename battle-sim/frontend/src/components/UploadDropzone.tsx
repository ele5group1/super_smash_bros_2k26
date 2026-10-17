import React, { useState, useRef } from "react";

interface UploadDropzoneProps {
  onFileSelected: (file: File, kind: "scenarios" | "creatures" | "battles") => void;
  isLoading?: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onFileSelected, isLoading = false }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedKind, setSelectedKind] = useState<"scenarios" | "creatures" | "battles">("creatures");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const name = file.name.toLowerCase();

    // Check supported extension
    if (!name.endsWith(".json") && !name.endsWith(".csv") && !name.endsWith(".zip")) {
      setErrorMsg("Unsupported file format. Please upload a .json, .csv, or .zip archive.");
      return;
    }

    // Size limit check (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File exceeds the 10 MB size limit.");
      return;
    }

    setErrorMsg(null);
    onFileSelected(file, selectedKind);
  };

  return (
    <div className="arcade-panel" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <h4 style={{ color: "#fff", fontWeight: 800 }}>Dataset Importer</h4>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Upload custom creature rosters, scenarios, or battle logs (.json, .csv, or .zip)
          </p>
        </div>

        {/* Kind Selector */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {(["creatures", "scenarios", "battles"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSelectedKind(k)}
              className={`btn-arcade ${selectedKind === k ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "0.8rem", padding: "4px 10px", textTransform: "capitalize" }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Bundle hints */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "0.75rem",
          marginBottom: "1rem",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
        }}
      >
        <strong style={{ color: "#fff" }}>Required bundle structure for {selectedKind}:</strong>
        {selectedKind === "creatures" && <span> Single JSON list of creatures or creatures.csv</span>}
        {selectedKind === "scenarios" && (
          <span> Single scenario.json or scenarios_bundle.zip (scenarios.csv, hazards.csv, map_tiles.csv)</span>
        )}
        {selectedKind === "battles" && (
          <span> Single battles.json or battles_bundle.zip (battles.csv, battle_events.csv)</span>
        )}
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--border-highlight)" : "var(--border-color)"}`,
          background: dragOver ? "rgba(37, 99, 235, 0.08)" : "rgba(255, 255, 255, 0.02)",
          borderRadius: "12px",
          padding: "2.5rem 1rem",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept=".json,.csv,.zip"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📁</div>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>
          {isLoading ? "Uploading and Validating..." : "Drag & drop files here, or click to browse"}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Target Kind: <strong style={{ color: "var(--coin-gold)" }}>{selectedKind.toUpperCase()}</strong> (Max 10 MB)
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            marginTop: "1rem",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            padding: "0.75rem",
            color: "#fca5a5",
            fontSize: "0.85rem",
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
};
