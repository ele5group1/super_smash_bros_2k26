import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  api,
  BattleRecord,
  ReplayStatus,
  DescriptiveAnalytics,
  DiagnosticAnalytics,
  Creature,
} from "../api";
import { TickTimeline } from "../components/TickTimeline";
import { Heatmap } from "../components/Heatmap";
import { CauseList } from "../components/CauseList";
import { Card, CardHeader, CardTitle, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Tabs, TabItem } from "../components/ui/Tabs";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { useToast } from "../components/ui/Toast";

export const ReportScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [battle, setBattle] = useState<BattleRecord | null>(null);
  const [replayStatus, setReplayStatus] = useState<ReplayStatus | null>(null);
  const [descriptive, setDescriptive] = useState<DescriptiveAnalytics | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticAnalytics | null>(null);
  const [creaturesMap, setCreaturesMap] = useState<Record<string, Creature>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Segmented tab control
  const [activeTab, setActiveTab] = useState<string>("summary");

  // Counterfactual state
  const [cfRunning, setCfRunning] = useState<boolean>(false);
  const [cfResult, setCfResult] = useState<any | null>(null);

  useEffect(() => {
    async function loadReport() {
      if (!id) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const [battleData, descData, diagData, allCreatures] = await Promise.all([
          api.getBattle(id),
          api.getDescriptiveAnalytics(id),
          api.getDiagnosticAnalytics(id),
          api.getCreatures(),
        ]);
        setBattle(battleData.battle);
        setReplayStatus(battleData.replay_status || null);
        setDescriptive(descData);
        setDiagnostic(diagData);

        const cmap: Record<string, Creature> = {};
        allCreatures.forEach((c) => {
          cmap[c.id] = c;
        });
        setCreaturesMap(cmap);
      } catch (err: any) {
        setErrorMsg("Failed to generate analytics report: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadReport();
  }, [id]);

  const handleRerunCounterfactual = async (tick: number, actor: string) => {
    if (!battle) return;
    setCfRunning(true);
    try {
      const res = await api.rerunCounterfactual(battle.battle_id, {
        tick,
        actor,
        action_type: "move_lane",
        target_lane: 1,
      });
      setCfResult(res);
      success("Counterfactual Rerun Complete", `Shifted outcome to ${res.new_outcome.toUpperCase()}`);
    } catch (e: any) {
      toastError("Counterfactual Error", e.message);
    } finally {
      setCfRunning(false);
    }
  };

  const handleJumpToTick = (tick: number) => {
    if (!battle) return;
    navigate(`/battles/${battle.battle_id}`, { state: { jumpTick: tick } });
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <Skeleton variant="rectangular" width="100%" height={140} style={{ marginBottom: "var(--space-6)" }} />
        <Skeleton variant="text" width="400px" height={32} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
          <Skeleton variant="card" count={3} />
        </div>
      </div>
    );
  }

  if (errorMsg || !battle) {
    return (
      <div className="page-container">
        <EmptyState
          title="Analytics Report Unavailable"
          description={errorMsg || "Could not find battle log."}
          actionLabel="Return to Scenarios"
          onAction={() => navigate("/scenarios")}
        />
      </div>
    );
  }

  const isWin = battle.outcome === "win";
  const isUploaded = battle.source.startsWith("upload:");

  const reportTabs: TabItem[] = [
    { id: "summary", label: "Summary" },
    { id: "creatures", label: "Creatures", badge: descriptive?.creatures_stats.length },
    { id: "timeline", label: "Timeline" },
    { id: "heatmap", label: "Heatmap" },
    { id: "cause_trace", label: "Cause Trace", badge: diagnostic?.turning_points.length },
  ];

  return (
    <div className="page-container">
      {/* 1. Results Banner with headline number */}
      <Card
        style={{
          borderLeft: `6px solid ${isWin ? "var(--color-success)" : "var(--color-error)"}`,
          marginBottom: "var(--space-6)",
        }}
      >
        <CardBody>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-4)" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-2)" }}>
                <span className="text-display" style={{ color: isWin ? "var(--color-success)" : "var(--color-error)" }}>
                  {isWin ? "VICTORY" : "DEFEAT"}
                </span>
                <Badge variant={isUploaded ? "info" : "neutral"} size="md">
                  {isUploaded ? "Uploaded Battle" : "Simulated Engine"}
                </Badge>
              </div>

              {/* Headline Number */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
                <span className="text-display" style={{ fontSize: "36px", color: "var(--text-primary)" }}>
                  {battle.survivors}
                </span>
                <span className="text-muted text-body">
                  Allied Survivors ({battle.ticks_elapsed} ticks • {battle.coins_left} coins left)
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <Button
                variant="primary"
                onClick={() => navigate(`/battles/${battle.battle_id}`)}
              >
                📺 Watch Arena Replay
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleRerunCounterfactual(1, "ember_fox")}
                isLoading={cfRunning}
              >
                ⚡ Try a Change
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/scenarios")}
              >
                ↺ New Scenario
              </Button>
            </div>
          </div>

          {/* Replay Verification status for Uploaded Battles */}
          {replayStatus && (
            <div
              style={{
                marginTop: "var(--space-4)",
                padding: "var(--space-3) var(--space-4)",
                background: "var(--bg-muted)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${replayStatus.status === "match" ? "var(--color-success)" : "var(--color-warning)"}`,
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <Badge variant={replayStatus.status === "match" ? "success" : "warning"}>
                REPLAY MATCH: {replayStatus.status.toUpperCase()}
              </Badge>
              <span className="text-small">{replayStatus.details}</span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Counterfactual Diff Box if active */}
      {cfResult && (
        <Card style={{ borderColor: "var(--color-warning)", background: "var(--color-warning-bg)", marginBottom: "var(--space-6)" }}>
          <CardBody>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <h3 className="text-h3" style={{ color: "var(--color-warning)" }}>
                Counterfactual Before & After Diff
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setCfResult(null)}>
                Dismiss
              </Button>
            </div>

            <p style={{ fontSize: "var(--font-size-body)", marginBottom: "var(--space-3)" }}>
              Outcome shifted from <strong>{cfResult.original_outcome.toUpperCase()}</strong> to{" "}
              <strong style={{ color: cfResult.new_outcome === "win" ? "var(--color-success)" : "var(--color-error)" }}>
                {cfResult.new_outcome.toUpperCase()}
              </strong>{" "}
              (first divergent tick: T{cfResult.first_divergent_tick ?? "none"}).
            </p>

            <div style={{ display: "flex", gap: "var(--space-6)", fontSize: "var(--font-size-small)" }}>
              <div>Survivors Diff: <strong>{cfResult.survivors_diff >= 0 ? `+${cfResult.survivors_diff}` : cfResult.survivors_diff}</strong></div>
              <div>Ticks Diff: <strong>{cfResult.ticks_diff}</strong></div>
              <div>Coins Diff: <strong>{cfResult.coins_diff}</strong></div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 2. Segmented Tabs Control */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <Tabs
          items={reportTabs}
          activeId={activeTab}
          onChange={setActiveTab}
          variant="segment"
        />
      </div>

      {/* Tab Panels */}
      {activeTab === "summary" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)" }}>
          <Card>
            <CardHeader><CardTitle>Combat Summary</CardTitle></CardHeader>
            <CardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Scenario ID:</span>
                  <strong>{battle.scenario_id}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Total Ticks:</span>
                  <strong>{battle.ticks_elapsed}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Player Team Size:</span>
                  <strong>{battle.player_team.length} creatures</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Final Outcome:</span>
                  <Badge variant={isWin ? "success" : "error"}>{battle.outcome}</Badge>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><CardTitle>Turn & Hazard Stats</CardTitle></CardHeader>
            <CardBody>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Total Events Logged:</span>
                  <strong>{battle.events.length}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Deterministic Seed:</span>
                  <code>{battle.seed}</code>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="text-muted">Engine Version:</span>
                  <span>v{battle.engine_version}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === "creatures" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--space-4)" }}>
          {descriptive?.creatures_stats.map((stat) => {
            const c = creaturesMap[stat.id];
            return (
              <Card key={stat.id}>
                <CardBody>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
                    <span style={{ fontWeight: "bold" }}>{c?.name || stat.id}</span>
                    <Badge variant={stat.survived ? "success" : "error"} size="sm">
                      {stat.survived ? "SURVIVED" : "KNOCKED OUT"}
                    </Badge>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", fontSize: "var(--font-size-small)", color: "var(--text-muted)" }}>
                    <div>Damage Dealt: <strong style={{ color: "var(--text-primary)" }}>{stat.damage_dealt}</strong></div>
                    <div>Damage Taken: <strong style={{ color: "var(--text-primary)" }}>{stat.damage_taken}</strong></div>
                    <div>KOs Scored: <strong style={{ color: "var(--color-warning)" }}>{stat.kos}</strong></div>
                    <div>Hazard Hits: <strong style={{ color: "var(--color-error)" }}>{stat.hazard_ticks}</strong></div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {activeTab === "timeline" && descriptive && (
        <TickTimeline timeline={descriptive.hp_timeline} playerTeam={battle.player_team} />
      )}

      {activeTab === "heatmap" && descriptive && (
        <Heatmap heatmap={descriptive.heatmap} />
      )}

      {activeTab === "cause_trace" && diagnostic && (
        <CauseList
          diagnostic={diagnostic}
          onCounterfactual={handleRerunCounterfactual}
          onJumpToTick={handleJumpToTick}
        />
      )}
    </div>
  );
};
