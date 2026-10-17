import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, BattleRecord, Scenario, Creature } from "../api";
import { Arena } from "../components/Arena";
import { Card, CardHeader, CardTitle, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Table, Column } from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

export const BattleScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [battle, setBattle] = useState<BattleRecord | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [creaturesMap, setCreaturesMap] = useState<Record<string, Creature>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadBattleData() {
      if (!id) return;
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const battleRes = await api.getBattle(id);
        setBattle(battleRes.battle);

        const [scen, allCreatures] = await Promise.all([
          api.getScenario(battleRes.battle.scenario_id),
          api.getCreatures(),
        ]);
        setScenario(scen);

        const cmap: Record<string, Creature> = {};
        allCreatures.forEach((c) => {
          cmap[c.id] = c;
        });
        setCreaturesMap(cmap);
      } catch (err: any) {
        setErrorMsg("Failed to load battle record: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadBattleData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="page-container">
        <Skeleton variant="text" width="300px" height="32px" />
        <Skeleton variant="text" width="200px" height="18px" />
        <div style={{ marginTop: "var(--space-6)" }}>
          <Skeleton variant="rectangular" width="100%" height={380} />
        </div>
      </div>
    );
  }

  if (errorMsg || !battle) {
    return (
      <div className="page-container">
        <EmptyState
          title="Battle Not Found"
          description={errorMsg || "The requested battle simulation could not be loaded."}
          actionLabel="Back to Scenarios"
          onAction={() => navigate("/scenarios")}
        />
      </div>
    );
  }

  const isWin = battle.outcome === "win";

  const eventColumns: Column<any>[] = [
    {
      key: "tick",
      header: "Tick",
      width: "70px",
      render: (row) => <span style={{ fontWeight: "bold", color: "var(--text-muted)" }}>T{row.tick}</span>,
    },
    {
      key: "event_type",
      header: "Type",
      width: "90px",
      render: (row) => {
        const variant =
          row.event_type === "death"
            ? "error"
            : row.event_type === "hazard"
            ? "warning"
            : row.event_type === "pickup"
            ? "electric"
            : "neutral";
        return <Badge variant={variant as any} size="sm">{row.event_type}</Badge>;
      },
    },
    {
      key: "action",
      header: "Combat Action",
      render: (row) => (
        <span>
          <strong style={{ color: "var(--text-primary)" }}>{row.actor ? `${row.actor}: ` : ""}</strong>
          <span>{row.action}</span>
          {row.target && <span style={{ color: "var(--text-muted)" }}> → {row.target}</span>}
        </span>
      ),
    },
    {
      key: "damage",
      header: "Damage",
      width: "80px",
      render: (row) => (
        <span style={{ color: row.damage > 0 ? "var(--color-error)" : "inherit" }}>
          {row.damage > 0 ? `-${row.damage}` : "-"}
        </span>
      ),
    },
    {
      key: "hp_after",
      header: "HP After",
      width: "80px",
    },
    {
      key: "coin_change",
      header: "Coins",
      width: "80px",
      render: (row) => (
        <span style={{ color: row.coin_change ? "var(--color-warning)" : "inherit" }}>
          {row.coin_change ? (row.coin_change > 0 ? `+${row.coin_change}` : row.coin_change) : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="page-container">
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <h1 className="text-h1">{scenario?.name || "Scenario Battle"}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: isWin ? '2px solid #10b981' : '2px solid #ef4444',
                  boxShadow: isWin ? '0 0 10px rgba(16, 185, 129, 0.4)' : '0 0 10px rgba(239, 68, 68, 0.4)',
                }}
                title={isWin ? "Mascot: Victory is ours!" : "Mascot: Ready for a rematch!"}
              >
                <img
                  src="/images/eevee_mario_mascot.jpg"
                  alt="Mario Eevee Mascot"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <Badge variant={isWin ? "success" : "error"} size="md" hasDot>
                {isWin ? "VICTORY" : "DEFEAT"}
              </Badge>
            </div>
          </div>
          <p className="text-muted text-small" style={{ marginTop: "4px" }}>
            Deterministic Seed: <strong>{battle.seed}</strong> • Engine v{battle.engine_version} • Mode: {battle.personality}
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button
            id="open-report-btn"
            variant="primary"
            onClick={() => navigate(`/report/${battle.battle_id}`)}
          >
            📊 Analytics Report
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate("/scenarios")}
          >
            ↺ Draft New Squad
          </Button>
        </div>
      </div>

      {/* Main Arena Simulation */}
      <Arena battle={battle} scenario={scenario} creaturesMap={creaturesMap} />

      {/* Full Event Log */}
      <Card style={{ marginTop: "var(--space-6)" }}>
        <CardHeader>
          <CardTitle>Deterministic Event Log ({battle.events.length} records)</CardTitle>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <Table
            columns={eventColumns}
            data={battle.events}
            keyField={(row) => `${row.tick}-${row.action}-${row.hp_after}`}
            caption="Tick-by-tick combat resolution log"
          />
        </CardBody>
      </Card>
    </div>
  );
};
