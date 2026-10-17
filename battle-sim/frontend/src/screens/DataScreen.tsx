import React, { useState, useEffect, useRef } from "react";
import { api, UploadRecord } from "../api";
import { UploadDropzone } from "../components/UploadDropzone";
import { Card, CardHeader, CardTitle, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Drawer } from "../components/ui/Drawer";
import { Table } from "../components/ui/Table";
import { EmptyState } from "../components/ui/EmptyState";
import { useToast } from "../components/ui/Toast";

export type UploadStep = "checking_format" | "validating" | "imported" | "needs_fixes" | "idle";

export const DataScreen: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [currentUpload, setCurrentUpload] = useState<UploadRecord | null>(null);
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Side panel validation drawer
  const [reportDrawerOpen, setReportDrawerOpen] = useState<boolean>(false);
  const [highlightedRow, setHighlightedRow] = useState<number | null>(null);
  const previewTableRef = useRef<HTMLDivElement>(null);

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
    setIsUploading(true);
    setErrorMsg(null);
    setUploadStep("checking_format");

    try {
      await new Promise((r) => setTimeout(r, 200));
      setUploadStep("validating");

      const rec = await api.uploadFile(file, kind);
      setCurrentUpload(rec);
      setUploadStep(rec.status === "valid" ? "imported" : "needs_fixes");
      if (rec.status === "valid") {
        success("Upload Verified", `${rec.row_count} rows imported into database.`);
      } else {
        setReportDrawerOpen(true);
      }
      await loadUploads();
    } catch (err: any) {
      if (err.uploadRecord) {
        setCurrentUpload(err.uploadRecord);
        setUploadStep("needs_fixes");
        setReportDrawerOpen(true);
      } else {
        setErrorMsg(err.message);
        setUploadStep("needs_fixes");
        toastError("Upload Error", err.message);
      }
    } finally {
      setIsUploading(false);
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
        setUploadStep("idle");
      }
      success("Upload Deleted", "Removed dataset and rolled back rows.");
      await loadUploads();
    } catch (err: any) {
      toastError("Delete Error", err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleScrollToRow = (rowNum: number) => {
    setHighlightedRow(rowNum);
    // Find the row element in preview table
    const target = document.getElementById(`preview-row-${rowNum}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 className="text-h1">Data Management & Dataset Upload</h1>
        <p className="text-muted" style={{ marginTop: "var(--space-1)" }}>
          Import custom creature rosters, scenario bundles, and empirical battle logs in JSON or CSV format with strict all-or-nothing validation.
        </p>
      </div>

      {errorMsg && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <EmptyState
            title="Upload Processing Error"
            description={errorMsg}
            actionLabel="Dismiss"
            onAction={() => setErrorMsg(null)}
          />
        </div>
      )}

      {/* Upload Progress Card with 4 Status Steps */}
      {uploadStep !== "idle" && (
        <Card style={{ marginBottom: "var(--space-6)" }}>
          <CardBody>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <h3 className="text-h3">Upload Pipeline Status</h3>
              <Badge
                variant={
                  uploadStep === "imported"
                    ? "success"
                    : uploadStep === "needs_fixes"
                    ? "error"
                    : "warning"
                }
              >
                {uploadStep.replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-2)" }}>
              {[
                { id: "checking_format", label: "1. Checking Format" },
                { id: "validating", label: "2. Validating Schema" },
                { id: "imported", label: "3. Imported" },
                { id: "needs_fixes", label: "4. Needs Fixes" },
              ].map((step, idx) => {
                const isCurrent = uploadStep === step.id;
                const isPassed =
                  (uploadStep === "validating" && idx === 0) ||
                  (uploadStep === "imported" && idx <= 2);

                return (
                  <div
                    key={step.id}
                    style={{
                      padding: "var(--space-2) var(--space-3)",
                      borderRadius: "var(--radius-md)",
                      background: isCurrent
                        ? "var(--accent-subtle)"
                        : isPassed
                        ? "var(--color-success-bg)"
                        : "var(--bg-muted)",
                      border: `1px solid ${
                        isCurrent
                          ? "var(--accent-primary)"
                          : isPassed
                          ? "var(--color-success)"
                          : "var(--border-subtle)"
                      }`,
                      fontSize: "12px",
                      fontWeight: isCurrent || isPassed ? "bold" : "normal",
                      color: isCurrent
                        ? "var(--accent-primary)"
                        : isPassed
                        ? "var(--color-success)"
                        : "var(--text-muted)",
                      textAlign: "center",
                    }}
                  >
                    {step.label}
                  </div>
                );
              })}
            </div>

            {currentUpload && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-3)", fontSize: "var(--font-size-small)" }}>
                <span>File: <strong>{currentUpload.filename}</strong> ({currentUpload.row_count} rows)</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setReportDrawerOpen(true)}
                >
                  View Validation Report Panel ↗
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Large Drop Zone with 3 Kind Cards */}
      <UploadDropzone onFileSelected={handleUploadFile} isLoading={isUploading} />

      {/* Dataset Cards & Preview Table */}
      {currentUpload && currentUpload.preview && currentUpload.preview.length > 0 && (
        <Card ref={previewTableRef} style={{ marginTop: "var(--space-8)" }}>
          <CardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <div>
                <CardTitle>Dataset Preview: {currentUpload.filename}</CardTitle>
                <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "4px" }}>
                  <Badge variant="neutral" size="sm">{currentUpload.row_count} Total Rows</Badge>
                  <Badge variant="info" size="sm">Source: {currentUpload.kind}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setReportDrawerOpen(true)}>
                Inspection Report
              </Button>
            </div>
          </CardHeader>

          <CardBody style={{ padding: 0 }}>
            <div className="table-responsive-wrapper" style={{ maxHeight: "360px", overflowY: "auto" }}>
              <table className="ui-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>Row #</th>
                    {Object.keys(currentUpload.preview[0] || {})
                      .filter((k) => k !== "_line_num")
                      .map((k) => (
                        <th key={k}>{k.replace(/_/g, " ")}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {currentUpload.preview.map((row, idx) => {
                    const rowNum = idx + 1;
                    const isHighlighted = highlightedRow === rowNum;
                    return (
                      <tr
                        key={idx}
                        id={`preview-row-${rowNum}`}
                        style={{
                          backgroundColor: isHighlighted ? "var(--accent-subtle)" : undefined,
                          transition: "background-color var(--duration-short) ease",
                        }}
                      >
                        <td style={{ fontWeight: "bold", color: "var(--text-muted)" }}>{rowNum}</td>
                        {Object.keys(row)
                          .filter((k) => k !== "_line_num")
                          .map((k) => (
                            <td key={k}>
                              {typeof row[k] === "object" ? JSON.stringify(row[k]) : String(row[k] ?? "")}
                            </td>
                          ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Uploaded File Registry */}
      <Card style={{ marginTop: "var(--space-8)" }}>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <CardTitle>Uploaded File Registry ({uploads.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadUploads}>
              ↻ Refresh
            </Button>
          </div>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          {uploads.length === 0 ? (
            <div style={{ padding: "var(--space-8)", textAlign: "center", color: "var(--text-muted)" }}>
              No custom uploads registered yet. Drop a file above to add datasets!
            </div>
          ) : (
            <Table
              columns={[
                { key: "filename", header: "Filename", render: (u) => <strong>{u.filename}</strong> },
                { key: "kind", header: "Kind", width: "110px", render: (u) => <Badge variant="neutral" size="sm">{u.kind}</Badge> },
                { key: "row_count", header: "Rows", width: "90px" },
                {
                  key: "status",
                  header: "Status",
                  width: "100px",
                  render: (u) => <Badge variant={u.status === "valid" ? "success" : "error"} size="sm">{u.status}</Badge>,
                },
                {
                  key: "created_at",
                  header: "Uploaded At",
                  render: (u) => <span className="text-small text-muted">{new Date(u.created_at).toLocaleString()}</span>,
                },
                {
                  key: "actions",
                  header: "Actions",
                  width: "160px",
                  render: (u) => (
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setCurrentUpload(u);
                          setReportDrawerOpen(true);
                        }}
                      >
                        Inspect
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteUpload(u.id)}
                        isLoading={deletingId === u.id}
                      >
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={uploads}
              keyField="id"
            />
          )}
        </CardBody>
      </Card>

      {/* Validation Report Side Panel Drawer */}
      <Drawer
        isOpen={reportDrawerOpen}
        onClose={() => setReportDrawerOpen(false)}
        title="Upload Validation Report"
        width="480px"
      >
        {currentUpload ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="text-small text-muted">File: {currentUpload.filename}</span>
              <Badge variant={currentUpload.status === "valid" ? "success" : "error"}>
                {currentUpload.status === "valid" ? "VALIDATED" : "REJECTED"}
              </Badge>
            </div>

            {currentUpload.status === "valid" ? (
              <div
                style={{
                  padding: "var(--space-3)",
                  background: "var(--color-success-bg)",
                  border: "1px solid var(--color-success)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--color-success)",
                  fontSize: "var(--font-size-small)",
                }}
              >
                ✓ All {currentUpload.row_count} rows passed schema type & foreign key constraints.
              </div>
            ) : (
              <div>
                <div style={{ color: "var(--color-error)", fontWeight: "bold", marginBottom: "var(--space-2)" }}>
                  {currentUpload.errors.length} Validation Errors (Click to locate row):
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {currentUpload.errors.map((err, idx) => {
                    const match = err.match(/line (\d+)/i) || err.match(/row (\d+)/i);
                    const rowNum = match ? parseInt(match[1], 10) : null;

                    return (
                      <div
                        key={idx}
                        onClick={() => rowNum && handleScrollToRow(rowNum)}
                        style={{
                          padding: "var(--space-2) var(--space-3)",
                          background: "var(--color-error-bg)",
                          border: "1px solid var(--color-error)",
                          borderRadius: "var(--radius-sm)",
                          cursor: rowNum ? "pointer" : "default",
                          fontSize: "13px",
                        }}
                      >
                        <div style={{ fontWeight: "bold", color: "var(--color-error)" }}>
                          {rowNum ? `Row ${rowNum}` : `Error #${idx + 1}`}
                        </div>
                        <div style={{ color: "var(--text-primary)", marginTop: "2px" }}>{err}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted">No upload selected.</div>
        )}
      </Drawer>
    </div>
  );
};
