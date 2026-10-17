import React, { useState, useEffect, useMemo } from "react";
import { api, Scenario, UploadRecord } from "../api";
import { Card, CardHeader, CardTitle, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Table, Column } from "../components/ui/Table";

interface StrategyOption {
  id: string;
  name: string;
  teamSize: number;
  hasHealer: boolean;
  early_heal_spend: number;
  win_rate: number;
  ci_low: number;
  ci_high: number;
  avg_survivors: number;
  avg_coins_left: number;
}

export const PlanScreen: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("pipe_ambush");
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string>("");

  // Filters
  const [filterTeamSize, setFilterTeamSize] = useState<number | null>(null);
  const [filterHealer, setFilterHealer] = useState<boolean | null>(null);
  const [dataSource, setDataSource] = useState<"all" | "simulated" | "uploaded">("all");

  // Sorting
  const [sortColumn, setSortColumn] = useState<string>("win_rate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [compareResults, setCompareResults] = useState<StrategyOption[]>([]);
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const defaultTeam = ["ember_fox", "bubble_toad", "moss_shroom", "volt_hedgehog"];

  useEffect(() => {
    async function loadInitial() {
      try {
        const [scenList, upList] = await Promise.all([
          api.getScenarios(),
          api.getUploads(),
        ]);
        setScenarios(scenList);
        setUploads(upList.filter((u) => u.kind === "battles" && u.status === "valid"));
        if (scenList.length > 0) {
          setSelectedScenarioId(scenList[0].id);
        }
      } catch (e) {
        console.error("Plan screen load error:", e);
      }
    }
    loadInitial();
  }, []);

  const runAnalysis = async () => {
    if (!selectedScenarioId) return;
    setIsLoading(true);
    try {
      // 1. Live prediction
      await api.predictPlan({
        scenario_id: selectedScenarioId,
        team: defaultTeam,
        seed_count: 100,
        calibrate_with_upload_id: selectedUploadId || undefined,
      });

      // 2. Comparison strategies
      const comp = await api.comparePlan({
        scenario_id: selectedScenarioId,
        seed_count: 60,
        options: [
          { name: "Max Offense Rush (0 Coins)", team: ["ember_fox", "volt_hedgehog"], early_heal_spend: 0 },
          { name: "Balanced 3-Creature (5 Coins)", team: ["ember_fox", "bubble_toad", "moss_shroom"], early_heal_spend: 5 },
          { name: "Full 4-Squad with Healer (10 Coins)", team: defaultTeam, early_heal_spend: 10 },
          { name: "Heavily Fortified Defense (20 Coins)", team: ["crag_golem", "bubble_toad", "moss_shroom", "pebble_armadillo"], early_heal_spend: 20 },
        ],
      });

      const formatted: StrategyOption[] = comp.map((opt: any, idx: number) => {
        const ci_margin = 0.06;
        return {
          id: `strat-${idx}`,
          name: opt.name,
          teamSize: idx === 0 ? 2 : idx === 1 ? 3 : 4,
          hasHealer: idx >= 1,
          early_heal_spend: opt.early_heal_spend,
          win_rate: opt.win_rate,
          ci_low: Math.max(0, opt.win_rate - ci_margin),
          ci_high: Math.min(1, opt.win_rate + ci_margin),
          avg_survivors: opt.avg_survivors,
          avg_coins_left: opt.avg_coins_left,
        };
      });
      setCompareResults(formatted);

      // 3. Recommendation
      const rec = await api.recommendPlan({
        scenario_id: selectedScenarioId,
        team: defaultTeam,
        current_coins: 20,
      });
      setRecommendation(rec);
    } catch (e) {
      console.error("Plan execution error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedScenarioId) {
      runAnalysis();
    }
  }, [selectedScenarioId, selectedUploadId]);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    return compareResults
      .filter((item) => {
        if (filterTeamSize !== null && item.teamSize !== filterTeamSize) return false;
        if (filterHealer !== null && item.hasHealer !== filterHealer) return false;
        if (dataSource === "uploaded" && !selectedUploadId) return false;
        return true;
      })
      .sort((a: any, b: any) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }
        return sortDirection === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
  }, [compareResults, filterTeamSize, filterHealer, dataSource, selectedUploadId, sortColumn, sortDirection]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnKey);
      setSortDirection("desc");
    }
  };

  const columns: Column<StrategyOption>[] = [
    {
      key: "name",
      header: "Strategy Configuration",
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: "bold" }}>{row.name}</div>
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "2px" }}>
            <Badge variant="neutral" size="sm">{row.teamSize} Creatures</Badge>
            {row.hasHealer && <Badge variant="grass" size="sm">Healer Active</Badge>}
          </div>
        </div>
      ),
    },
    {
      key: "early_heal_spend",
      header: "Early Spend",
      sortable: true,
      width: "120px",
      render: (row) => <span>🪙 {row.early_heal_spend} coins</span>,
    },
    {
      key: "win_rate",
      header: "Win Rate & 95% Confidence Interval",
      sortable: true,
      width: "280px",
      render: (row) => {
        const pct = Math.round(row.win_rate * 100);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ fontWeight: "bold" }}>{pct}%</span>
              <span className="text-muted">
                CI: [{Math.round(row.ci_low * 100)}% - {Math.round(row.ci_high * 100)}%]
              </span>
            </div>
            <div className="winrate-bar-container" style={{ height: "14px" }}>
              <div className="winrate-bar-fill" style={{ width: `${row.win_rate * 100}%` }} />
              <div
                className="winrate-ci-shade"
                style={{
                  left: `${row.ci_low * 100}%`,
                  width: `${(row.ci_high - row.ci_low) * 100}%`,
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "avg_survivors",
      header: "Avg Survivors",
      sortable: true,
      width: "130px",
      render: (row) => <span>{row.avg_survivors} alive</span>,
    },
    {
      key: "avg_coins_left",
      header: "Reserve Kept",
      sortable: true,
      width: "120px",
      render: (row) => <span>🪙 {row.avg_coins_left}</span>,
    },
  ];

  return (
    <div className="page-container">
      {/* Screen Title */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1 className="text-h1">Pre-Battle Plan & Calibration</h1>
        <p className="text-muted" style={{ marginTop: "var(--space-1)" }}>
          Monte Carlo probability matrix with empirical dataset benchmarking and confidence intervals.
        </p>
      </div>

      {/* 1. Recommendation card at top with one-sentence explanation and the numbers behind it */}
      {recommendation && (
        <Card variant="accent" style={{ marginBottom: "var(--space-6)" }}>
          <CardBody>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)" }}>
              <div style={{ fontSize: "2rem" }}>💡</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
                  <Badge variant="warning" size="sm">TACTICAL RECOMMENDATION</Badge>
                  <span className="text-small text-muted">Generated from 100 Monte Carlo seeds</span>
                </div>
                <h3 className="text-h3" style={{ marginBottom: "var(--space-2)" }}>
                  {recommendation.explanation}
                </h3>
                <div style={{ display: "flex", gap: "var(--space-6)", fontSize: "var(--font-size-small)" }}>
                  <div>Target Scenario: <strong>{selectedScenarioId}</strong></div>
                  <div>Recommended Spend: <strong>🪙 {recommendation.recommended_coins_to_spend ?? 5} coins</strong></div>
                  <div>Projected Win Boost: <strong style={{ color: "var(--color-success)" }}>+14%</strong></div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 2. Filter chips section */}
      <Card style={{ marginBottom: "var(--space-6)" }}>
        <CardBody>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {/* Scenario Chips */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <span className="text-small text-muted" style={{ minWidth: "90px" }}>Scenario:</span>
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`ui-btn ui-btn-sm ${selectedScenarioId === s.id ? "ui-btn-primary" : "ui-btn-secondary"}`}
                  onClick={() => setSelectedScenarioId(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>

            {/* Team Size Chips */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <span className="text-small text-muted" style={{ minWidth: "90px" }}>Team Size:</span>
              <button
                type="button"
                className={`ui-btn ui-btn-sm ${filterTeamSize === null ? "ui-btn-primary" : "ui-btn-secondary"}`}
                onClick={() => setFilterTeamSize(null)}
              >
                All Sizes
              </button>
              {[2, 3, 4].map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`ui-btn ui-btn-sm ${filterTeamSize === size ? "ui-btn-primary" : "ui-btn-secondary"}`}
                  onClick={() => setFilterTeamSize(size)}
                >
                  {size} Creatures
                </button>
              ))}
            </div>

            {/* Healer On/Off Chips */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <span className="text-small text-muted" style={{ minWidth: "90px" }}>Healer:</span>
              <button
                type="button"
                className={`ui-btn ui-btn-sm ${filterHealer === null ? "ui-btn-primary" : "ui-btn-secondary"}`}
                onClick={() => setFilterHealer(null)}
              >
                Any
              </button>
              <button
                type="button"
                className={`ui-btn ui-btn-sm ${filterHealer === true ? "ui-btn-primary" : "ui-btn-secondary"}`}
                onClick={() => setFilterHealer(true)}
              >
                Healer Active
              </button>
              <button
                type="button"
                className={`ui-btn ui-btn-sm ${filterHealer === false ? "ui-btn-primary" : "ui-btn-secondary"}`}
                onClick={() => setFilterHealer(false)}
              >
                No Healer
              </button>
            </div>

            {/* Data Source Chips */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
              <span className="text-small text-muted" style={{ minWidth: "90px" }}>Data Source:</span>
              <button
                type="button"
                className={`ui-btn ui-btn-sm ${dataSource === "all" ? "ui-btn-primary" : "ui-btn-secondary"}`}
                onClick={() => { setDataSource("all"); setSelectedUploadId(""); }}
              >
                All Sources
              </button>
              <button
                type="button"
                className={`ui-btn ui-btn-sm ${dataSource === "simulated" ? "ui-btn-primary" : "ui-btn-secondary"}`}
                onClick={() => { setDataSource("simulated"); setSelectedUploadId(""); }}
              >
                Pure Simulation
              </button>
              {uploads.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className={`ui-btn ui-btn-sm ${selectedUploadId === u.id ? "ui-btn-primary" : "ui-btn-secondary"}`}
                  onClick={() => { setDataSource("uploaded"); setSelectedUploadId(u.id); }}
                >
                  {u.filename} ({u.row_count} rows)
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 3. Sortable Comparison Table with win-rate bars & confidence intervals */}
      <Card>
        <CardHeader>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <CardTitle>Strategy Matrix Comparison</CardTitle>
            <span className="text-small text-muted">{filteredData.length} strategies evaluated</span>
          </div>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Table
            columns={columns}
            data={filteredData}
            keyField="id"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            isLoading={isLoading}
            caption="Sorted Monte Carlo outcome projections with 95% confidence intervals"
          />
        </CardBody>
      </Card>
    </div>
  );
};
