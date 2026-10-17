import React, { useState, useRef } from "react";
import { Card, CardBody } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";

interface UploadDropzoneProps {
  onFileSelected: (file: File, kind: "scenarios" | "creatures" | "battles") => void;
  isLoading?: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onFileSelected, isLoading = false }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedKind, setSelectedKind] = useState<"scenarios" | "creatures" | "battles">("creatures");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const kinds = [
    {
      id: "creatures" as const,
      title: "Creatures",
      icon: "🐾",
      desc: "Upload custom combatants with HP, attack, speed, element typing, and move pools (.csv or .json).",
      sampleUrl: "/api/export/creatures?format=csv",
      sampleLabel: "Download sample CSV",
    },
    {
      id: "scenarios" as const,
      title: "Scenarios",
      icon: "🗺️",
      desc: "Upload multi-lane maps with hazard schedules, coin budgets, and win conditions (.json or .zip).",
      sampleUrl: "/api/export/scenarios?format=json",
      sampleLabel: "Download sample JSON",
    },
    {
      id: "battles" as const,
      title: "Battles",
      icon: "⚔️",
      desc: "Upload empirical combat replay logs for Monte Carlo planner calibration and gap analysis.",
      sampleUrl: "/api/export/battles?format=csv",
      sampleLabel: "Download sample CSV",
    },
  ];

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const name = file.name.toLowerCase();

    if (!name.endsWith(".json") && !name.endsWith(".csv") && !name.endsWith(".zip")) {
      setErrorMsg("Unsupported file format. Please upload a .json, .csv, or .zip archive.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File exceeds the 10 MB size limit.");
      return;
    }

    setErrorMsg(null);
    onFileSelected(file, selectedKind);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* 1. Three Kind Cards with sample links */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {kinds.map((k) => {
          const isSelected = selectedKind === k.id;
          return (
            <Card
              key={k.id}
              variant={isSelected ? "accent" : "interactive"}
              onClick={() => setSelectedKind(k.id)}
              style={{
                borderColor: isSelected ? "var(--accent-primary)" : undefined,
                background: isSelected ? "var(--accent-subtle)" : undefined,
                cursor: "pointer",
              }}
            >
              <CardBody>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span style={{ fontSize: "1.5rem" }}>{k.icon}</span>
                    <h3 className="text-h3">{k.title}</h3>
                  </div>
                  {isSelected && <Badge variant="info" size="sm">ACTIVE KIND</Badge>}
                </div>
                <p className="text-muted text-small" style={{ marginBottom: "var(--space-4)", minHeight: "44px" }}>
                  {k.desc}
                </p>
                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-2)" }}>
                  <a
                    href={k.sampleUrl}
                    download
                    onClick={(e) => e.stopPropagation()}
                    style={{ fontSize: "12px", color: "var(--accent-primary)", textDecoration: "none", fontWeight: "bold" }}
                  >
                    📥 {k.sampleLabel}
                  </a>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* 2. Large Drop Zone */}
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
          border: `2px dashed ${dragOver ? "var(--accent-primary)" : "var(--border-subtle)"}`,
          background: dragOver ? "var(--accent-subtle)" : "var(--bg-muted)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-10) var(--space-4)",
          textAlign: "center",
          cursor: "pointer",
          transition: "all var(--duration-short) ease",
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label={`Dropzone for uploading ${selectedKind}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv,.zip"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-2)" }}>📤</div>
        <h3 className="text-h3" style={{ marginBottom: "var(--space-1)" }}>
          Drag & Drop {selectedKind.toUpperCase()} file here
        </h3>
        <p className="text-muted text-small" style={{ marginBottom: "var(--space-4)" }}>
          Supports .json, .csv, and bundled .zip archives (up to 10 MB). Strict validation with atomic rollbacks.
        </p>
        <Button variant="secondary" size="sm" isLoading={isLoading} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
          Select File to Upload
        </Button>
      </div>

      {errorMsg && (
        <div style={{ color: "var(--color-error)", fontSize: "var(--font-size-small)", fontWeight: "bold" }}>
          ⚠️ {errorMsg}
        </div>
      )}
    </div>
  );
};
