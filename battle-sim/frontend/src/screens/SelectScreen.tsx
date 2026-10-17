import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, Scenario, Creature, PredictionResult, SynergyCombo } from "../api";
import { CreatureCard, CreatureAvatar } from "../components/CreatureCard";
import { Card, CardBody } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Drawer } from "../components/ui/Drawer";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { useToast } from "../components/ui/Toast";

export const SelectScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id: urlScenarioId } = useParams<{ id?: string }>();
  const { success, error: toastError } = useToast();

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [synergies, setSynergies] = useState<SynergyCombo[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [activeCreatureForDrawer, setActiveCreatureForDrawer] = useState<Creature | null>(null);

  const [seed] = useState<number>(1000);
  const [personality] = useState<string>("opportunistic");
  const [useUploaded, setUseUploaded] = useState<boolean>(true);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load scenarios and creatures
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [scenList, creatList, synList] = await Promise.all([
          api.getScenarios(),
          api.getCreatures(),
          api.getSynergies().catch(() => []),
        ]);
        setScenarios(scenList);
        setCreatures(creatList);
        setSynergies(synList || []);

        // Pick scenario from URL or localStorage or first available
        if (urlScenarioId && scenList.some((s) => s.id === urlScenarioId)) {
          setSelectedScenarioId(urlScenarioId);
        } else {
          const savedScen = localStorage.getItem("last_selected_scenario");
          if (savedScen && scenList.some((s) => s.id === savedScen)) {
            setSelectedScenarioId(savedScen);
          } else if (scenList.length > 0) {
            setSelectedScenarioId(scenList[0].id);
          }
        }

        // Default team: strictly original Puffcap Kingdom IP creatures
        const savedTeam = localStorage.getItem("last_selected_team");
        if (savedTeam) {
          try {
            const parsed = JSON.parse(savedTeam);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const valid = parsed.filter((id: string) => creatList.some((c) => c.id === id));
              setSelectedTeam(valid.length > 0 ? valid : ["ember_fox", "bubble_toad", "moss_shroom", "volt_hedgehog"]);
            } else {
              setSelectedTeam(["ember_fox", "bubble_toad", "moss_shroom", "volt_hedgehog"]);
            }
          } catch {
            setSelectedTeam(["ember_fox", "bubble_toad", "moss_shroom", "volt_hedgehog"]);
          }
        } else {
          setSelectedTeam(["ember_fox", "bubble_toad", "moss_shroom", "volt_hedgehog"]);
        }
      } catch (err: any) {
        setErrorMsg("Failed to load scenario & creature data: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [urlScenarioId]);

  // Persist selections
  useEffect(() => {
    if (selectedScenarioId) {
      localStorage.setItem("last_selected_scenario", selectedScenarioId);
    }
  }, [selectedScenarioId]);

  useEffect(() => {
    if (selectedTeam.length > 0) {
      localStorage.setItem("last_selected_team", JSON.stringify(selectedTeam));
    }
  }, [selectedTeam]);

  // Keyboard shortcut 1-4 for slot selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["1", "2", "3", "4"].includes(e.key)) {
        const slotIdx = parseInt(e.key, 10) - 1;
        setSelectedSlotIndex((prev) => (prev === slotIdx ? null : slotIdx));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced live prediction from /api/plan/predict
  useEffect(() => {
    if (!selectedScenarioId || selectedTeam.length === 0) {
      setPrediction(null);
      return;
    }

    setIsPredicting(true);
    const timer = setTimeout(async () => {
      try {
        const pred = await api.predictPlan({
          scenario_id: selectedScenarioId,
          team: selectedTeam,
          seed_count: 50,
        });
        setPrediction(pred);
      } catch (e) {
        console.warn("Prediction error:", e);
      } finally {
        setIsPredicting(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedScenarioId, selectedTeam]);

  const handleSelectCreature = (c: Creature) => {
    // If a specific slot is active via keyboard/click, place creature in that slot
    if (selectedSlotIndex !== null) {
      const nextTeam = [...selectedTeam];
      // Remove creature from previous position if already in team
      const existingIdx = nextTeam.indexOf(c.id);
      if (existingIdx !== -1) {
        nextTeam.splice(existingIdx, 1);
      }
      nextTeam[selectedSlotIndex] = c.id;
      setSelectedTeam(nextTeam.filter(Boolean).slice(0, 4));
      setSelectedSlotIndex(null);
      return;
    }

    // Toggle logic
    setSelectedTeam((prev) => {
      if (prev.includes(c.id)) {
        return prev.filter((id) => id !== c.id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, c.id];
    });
  };

  const handleDropIntoSlot = (slotIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const creatureId = e.dataTransfer.getData("text/plain");
    if (!creatureId) return;

    const nextTeam = [...selectedTeam];
    const existingIdx = nextTeam.indexOf(creatureId);
    if (existingIdx !== -1) {
      nextTeam.splice(existingIdx, 1);
    }
    nextTeam[slotIndex] = creatureId;
    setSelectedTeam(nextTeam.filter(Boolean).slice(0, 4));
  };

  const handleRemoveFromSlot = (slotIndex: number) => {
    setSelectedTeam((prev) => prev.filter((_, idx) => idx !== slotIndex));
  };

  const handleStartBattle = async () => {
    if (!selectedScenarioId || selectedTeam.length === 0) return;
    setIsStarting(true);
    setErrorMsg(null);
    try {
      const res = await api.createBattle({
        scenario_id: selectedScenarioId,
        player_team: selectedTeam,
        seed: seed,
        personality: personality,
      });
      success("Battle Simulated", `Starting replay #${res.battle_id.slice(0, 8)}`);
      navigate(`/battles/${res.battle_id}`, { state: { result: res } });
    } catch (err: any) {
      const msg = err.message || "Failed to launch battle";
      setErrorMsg(msg);
      toastError("Simulation Error", msg);
      setIsStarting(false);
    }
  };

  const handleQuickBattle = async () => {
    setIsStarting(true);
    try {
      const targetScenario = scenarios[0]?.id || "pipe_ambush";
      const defaultTeam = ["ember_fox", "bubble_toad", "moss_shroom", "volt_hedgehog"];
      const randomSeed = Math.floor(Math.random() * 10000);
      const res = await api.createBattle({
        scenario_id: targetScenario,
        player_team: defaultTeam,
        seed: randomSeed,
        personality: "opportunistic",
      });
      success("Quick Battle Launched", `Scenario: ${targetScenario}`);
      navigate(`/battles/${res.battle_id}`, { state: { result: res } });
    } catch (err: any) {
      toastError("Failed to start quick battle", err.message);
      setIsStarting(false);
    }
  };

  const filteredCreatures = creatures.filter((c) => useUploaded || c.source === "builtin");

  if (loading) {
    return (
      <div className="page-container">
        <Skeleton variant="text" width="280px" height="32px" />
        <Skeleton variant="text" width="480px" height="18px" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
          <Skeleton variant="card" count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Draft Chamber Header Banner */}
      <div
        style={{
          position: 'relative',
          borderRadius: '16px',
          overflow: 'hidden',
          marginBottom: 'var(--space-6)',
          border: '2px solid rgba(59, 130, 246, 0.4)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          background: '#090d16',
          height: '200px',
        }}
      >
        <img
          src="/images/trainer_mario_yoshis.jpg"
          alt="Trainer Mario & Yoshi Starters at Warp Pipe"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
            filter: 'brightness(0.9) contrast(1.1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0.5) 50%, rgba(15,23,42,0.92) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 32px',
          }}
        >
          <div style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <Badge variant="water" size="sm">⚔️ SQUAD DRAFT CHAMBER</Badge>
              <Badge variant="warning" size="sm">WARP PIPE ARENA</Badge>
              <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 600 }}>⭐ 4v4 Tactical Lanes</span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: '0 0 4px 0', color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
              Stages & Squad Draft
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
              Pick a hazard stage, draft 4 synergy fighters from the warp pipe, and launch deterministic seeded skirmishes.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              id="quick-battle-btn"
              variant="secondary"
              onClick={handleQuickBattle}
              isLoading={isStarting}
              title="Launch an instant battle with default squad"
            >
              ⚡ Quick Match
            </Button>
            <Button
              id="launch-battle-btn"
              variant="primary"
              onClick={handleStartBattle}
              disabled={selectedTeam.length === 0 || !selectedScenarioId}
              isLoading={isStarting}
            >
              ⚔️ Simulate Battle ({selectedTeam.length}/4)
            </Button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <EmptyState
            title="Unable to Launch Battle"
            description={errorMsg}
            actionLabel="Try Again"
            onAction={handleStartBattle}
          />
        </div>
      )}

      {/* 1. Scenarios Grid */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
          <h2 className="text-h3">1. Select Battle Scenario</h2>
          <span className="text-small text-muted">{scenarios.length} scenarios available</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {scenarios.map((scen) => {
            const isSelected = scen.id === selectedScenarioId;
            const difficulty = (scen as any).difficulty || (scen.ticks > 35 ? "Hard" : scen.lanes > 2 ? "Medium" : "Easy");
            const diffVariant = difficulty.toLowerCase() === "hard" ? "error" : difficulty.toLowerCase() === "medium" ? "warning" : "success";

            return (
              <Card
                key={scen.id}
                variant={isSelected ? "interactive" : "default"}
                onClick={() => setSelectedScenarioId(scen.id)}
                style={{
                  borderColor: isSelected ? "var(--accent-primary)" : undefined,
                  boxShadow: isSelected ? "0 0 0 2px var(--accent-primary)" : undefined,
                }}
                data-testid={`scenario-card-${scen.id}`}
              >
                <CardBody>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
                    <h3 className="text-h3">{scen.name}</h3>
                    <Badge variant={diffVariant as any} size="sm">
                      {difficulty}
                    </Badge>
                  </div>

                  <p className="text-muted text-small" style={{ marginBottom: "var(--space-3)", minHeight: "36px" }}>
                    {scen.description}
                  </p>

                  {/* Looping preview bar / mini lane representation */}
                  <div
                    style={{
                      height: "28px",
                      background: "var(--bg-muted)",
                      borderRadius: "var(--radius-sm)",
                      padding: "4px 8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    <span>Lanes: {scen.lanes}</span>
                    <span>Hazards: {scen.hazard_schedule?.length || 0}</span>
                    <span>Win Rate: ~58%</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      borderTop: "1px solid var(--border-subtle)",
                      paddingTop: "var(--space-2)",
                    }}
                  >
                    <span>Objective: <strong>{scen.objective.type}</strong></span>
                    <span>Ticks: <strong>{scen.ticks}</strong></span>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 2. Team Builder & 4 Drag-and-Drop Slots */}
      <section style={{ marginBottom: "var(--space-8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
          <div>
            <h2 className="text-h3">2. Squad Roster (4 Slots)</h2>
            <p className="text-muted text-small">
              Drag creatures into slots, or press 1-4 on your keyboard then click a creature to assign.
            </p>
          </div>
          {selectedSlotIndex !== null && (
            <Badge variant="info">
              Slot {selectedSlotIndex + 1} Active (Pick creature below)
            </Badge>
          )}
        </div>

        {/* 4 Slots */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-4)",
            marginBottom: "var(--space-6)",
          }}
        >
          {[0, 1, 2, 3].map((slotIdx) => {
            const creatureId = selectedTeam[slotIdx];
            const creature = creatures.find((c) => c.id === creatureId);
            const isSlotActive = selectedSlotIndex === slotIdx;

            return (
              <div
                key={slotIdx}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropIntoSlot(slotIdx, e)}
                onClick={() => setSelectedSlotIndex(isSlotActive ? null : slotIdx)}
                className={`ui-card ${isSlotActive ? "ui-card-accent" : ""}`}
                style={{
                  minHeight: "100px",
                  border: isSlotActive ? "2px solid var(--accent-primary)" : "2px dashed var(--border-subtle)",
                  backgroundColor: creature ? "var(--bg-card)" : "var(--bg-muted)",
                  padding: "var(--space-3)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                data-testid={`team-slot-${slotIdx}`}
              >
                {creature ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <CreatureAvatar type={creature.type} avatar={creature.avatar} id={creature.id} size={42} />
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: "14px" }}>{creature.name}</div>
                        <Badge variant={creature.type as any} size="sm">{creature.type}</Badge>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ui-btn ui-btn-ghost ui-btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromSlot(slotIdx);
                      }}
                      title="Remove from squad"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                    <div>Slot {slotIdx + 1} (Empty)</div>
                    <div style={{ fontSize: "11px", marginTop: "2px" }}>Drop or Press [{slotIdx + 1}]</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Active Synergy Dual-Combos */}
        {(() => {
          const activeSynergies = synergies.filter(
            (s) => selectedTeam.includes(s.pair[0]) && selectedTeam.includes(s.pair[1])
          );
          if (activeSynergies.length === 0) return null;
          return (
            <div
              style={{
                background: "linear-gradient(90deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3) var(--space-4)",
                marginBottom: "var(--space-6)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>⚡</span>
                <span style={{ fontWeight: "bold", fontSize: "14px", color: "var(--accent-primary)" }}>
                  Active Team Synergies ({activeSynergies.length})
                </span>
                <Badge variant="info" size="sm">Dual-Combo Ready</Badge>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--space-2)" }}>
                {activeSynergies.map((syn) => (
                  <div
                    key={syn.id}
                    style={{
                      background: "rgba(0, 0, 0, 0.25)",
                      borderRadius: "var(--radius-sm)",
                      padding: "6px 10px",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#38bdf8" }}>
                      ✨ {syn.name}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "2px" }}>
                      {syn.pair[0]} + {syn.pair[1]} • {syn.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Live Debounced Win-Rate Meter */}
        <Card style={{ marginBottom: "var(--space-6)" }}>
          <CardBody>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <span style={{ fontWeight: "bold" }}>Live Predicted Win Rate:</span>
                {isPredicting && <span className="text-small text-muted">(Calculating...)</span>}
              </div>
              <span className="text-h3" style={{ color: "var(--accent-primary)" }}>
                {prediction ? `${Math.round(prediction.win_rate * 100)}%` : "--%"}
              </span>
            </div>

            <div className="winrate-bar-container">
              <div
                className="winrate-bar-fill"
                style={{
                  width: prediction ? `${prediction.win_rate * 100}%` : "0%",
                }}
              />
              {prediction && (
                <div
                  className="winrate-ci-shade"
                  style={{
                    left: `${Math.max(0, prediction.win_rate - (prediction.confidence_interval_percent || 5) / 100) * 100}%`,
                    width: `${Math.min(1, ((prediction.confidence_interval_percent || 5) * 2) / 100) * 100}%`,
                  }}
                  title={`95% Confidence Interval: ±${prediction.confidence_interval_percent}%`}
                />
              )}
            </div>

            {prediction && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginTop: "var(--space-2)" }}>
                <span>Simulated over {prediction.seed_count || 50} Monte Carlo seeds</span>
                <span>Recommendation: {prediction.win_rate >= 0.5 ? "Favored Squad" : "Challenging Matchup"}</span>
              </div>
            )}
          </CardBody>
        </Card>

        {/* 3. Available Creatures Grid */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
          <h2 className="text-h3">3. Available Creatures ({filteredCreatures.length})</h2>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--font-size-small)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={useUploaded}
              onChange={(e) => setUseUploaded(e.target.checked)}
            />
            <span>Include custom uploaded creatures</span>
          </label>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          {filteredCreatures.map((c) => {
            const isSelected = selectedTeam.includes(c.id);
            return (
              <CreatureCard
                key={c.id}
                creature={c}
                selected={isSelected}
                onSelect={handleSelectCreature}
                onInspect={(creature) => setActiveCreatureForDrawer(creature)}
              />
            );
          })}
        </div>
      </section>

      {/* Creature Details Drawer */}
      <Drawer
        isOpen={Boolean(activeCreatureForDrawer)}
        onClose={() => setActiveCreatureForDrawer(null)}
        title={activeCreatureForDrawer?.name || "Creature Details"}
      >
        {activeCreatureForDrawer && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <CreatureAvatar
                type={activeCreatureForDrawer.type}
                avatar={activeCreatureForDrawer.avatar}
                id={activeCreatureForDrawer.id}
                size={64}
              />
              <div>
                <h3 className="text-h3">{activeCreatureForDrawer.name}</h3>
                <Badge variant={activeCreatureForDrawer.type as any}>
                  {activeCreatureForDrawer.type}
                </Badge>
              </div>
            </div>

            <Card variant="sunken">
              <CardBody>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <div>
                    <span className="text-muted text-small">Health (HP):</span>
                    <div style={{ fontWeight: "bold" }}>{activeCreatureForDrawer.hp}</div>
                  </div>
                  <div>
                    <span className="text-muted text-small">Attack:</span>
                    <div style={{ fontWeight: "bold" }}>{activeCreatureForDrawer.attack}</div>
                  </div>
                  <div>
                    <span className="text-muted text-small">Speed:</span>
                    <div style={{ fontWeight: "bold" }}>{activeCreatureForDrawer.speed}</div>
                  </div>
                  <div>
                    <span className="text-muted text-small">Source:</span>
                    <div style={{ fontWeight: "bold" }}>{activeCreatureForDrawer.source || "builtin"}</div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <div>
              <h4 style={{ fontWeight: "bold", marginBottom: "var(--space-2)" }}>Known Moves & Abilities</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {activeCreatureForDrawer.moves?.map((m) => (
                  <Badge key={m} variant="neutral">
                    {m.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              variant={selectedTeam.includes(activeCreatureForDrawer.id) ? "danger" : "primary"}
              onClick={() => {
                handleSelectCreature(activeCreatureForDrawer);
                setActiveCreatureForDrawer(null);
              }}
            >
              {selectedTeam.includes(activeCreatureForDrawer.id) ? "Remove from Squad" : "Add to Squad"}
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
};
