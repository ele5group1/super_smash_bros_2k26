import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, Scenario, Creature, PredictionResult } from "../api";
import { CreatureCard } from "../components/CreatureCard";
import { WinRateBar } from "../components/WinRateBar";

export const SelectScreen: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [selectedTeam, setSelectedTeam] = useState<string[]>([]);
  const [seed, setSeed] = useState<number>(1000);
  const [personality, setPersonality] = useState<string>("opportunistic");
  const [useUploaded, setUseUploaded] = useState<boolean>(true);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load scenarios and creatures
  useEffect(() => {
    async function loadData() {
      try {
        const [scenList, creatList] = await Promise.all([
          api.getScenarios(),
          api.getCreatures(),
        ]);
        setScenarios(scenList);
        setCreatures(creatList);

        // Restore from localStorage
        const savedScen = localStorage.getItem("last_selected_scenario");
        const savedTeam = localStorage.getItem("last_selected_team");

        if (savedScen && scenList.some((s) => s.id === savedScen)) {
          setSelectedScenarioId(savedScen);
        } else if (scenList.length > 0) {
          setSelectedScenarioId(scenList[0].id);
        }

        if (savedTeam) {
          try {
            const parsed = JSON.parse(savedTeam);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSelectedTeam(parsed);
            } else {
              setSelectedTeam(["mario", "pikachu"]);
            }
          } catch {
            setSelectedTeam(["mario", "pikachu"]);
          }
        } else {
          setSelectedTeam(["mario", "pikachu"]);
        }
      } catch (err: any) {
        setErrorMsg("Failed to load initial game data: " + err.message);
      }
    }
    loadData();
  }, []);

  // Save to localStorage
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
          seed_count: 80,
        });
        setPrediction(pred);
      } catch (e) {
        console.warn("Prediction error:", e);
      } finally {
        setIsPredicting(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [selectedScenarioId, selectedTeam]);

  const toggleCreature = (c: Creature) => {
    setSelectedTeam((prev) => {
      if (prev.includes(c.id)) {
        return prev.filter((id) => id !== c.id);
      }
      if (prev.length >= 4) {
        return prev; // Max 4
      }
      return [...prev, c.id];
    });
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
      navigate(`/battle/${res.battle_id}`);
    } catch (err: any) {
      setErrorMsg("Failed to launch battle: " + err.message);
      setIsStarting(false);
    }
  };

  const filteredCreatures = creatures.filter(
    (c) => useUploaded || c.source === "builtin"
  );

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 className="screen-title">Super Mario x Pokémon Battle Arena</h2>
        <p className="screen-subtitle">
          Draft your dream squad of Super Mario & Pokémon champions, pick an iconic stage, and battle through deterministic arcade scenarios.
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

      {/* Scenarios Carousel/Card Grid */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff", fontSize: "1.25rem" }}>
            1. Select Scenario
          </h3>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {scenarios.length} scenarios available
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {scenarios.map((scen) => {
            const isSelected = scen.id === selectedScenarioId;
            return (
              <div
                key={scen.id}
                onClick={() => setSelectedScenarioId(scen.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedScenarioId(scen.id);
                  }
                }}
                className="arcade-panel"
                style={{
                  cursor: "pointer",
                  borderColor: isSelected ? "var(--border-highlight)" : undefined,
                  background: isSelected ? "rgba(37, 99, 235, 0.15)" : undefined,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff" }}>
                      {scen.name}
                    </h4>
                    {isSelected && (
                      <span
                        style={{
                          background: "var(--primary-blue)",
                          color: "#fff",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        SELECTED
                      </span>
                    )}
                  </div>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                    {scen.description}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderTop: "1px solid var(--border-color)",
                    paddingTop: "0.5rem",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>Objective: <strong>{scen.objective.type}</strong></span>
                  <span>Coins: <strong>{scen.starting_resources.coins}</strong></span>
                  <span>Ticks: <strong>{scen.ticks}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team Selection Section */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff", fontSize: "1.25rem" }}>
              2. Draft Allied Squad ({selectedTeam.length} / 4)
            </h3>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Pick up to four companions with complementary elemental types.
            </span>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              color: "var(--text-main)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={useUploaded}
              onChange={(e) => setUseUploaded(e.target.checked)}
            />
            <span>Include Uploaded Creatures</span>
          </label>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {filteredCreatures.map((c) => {
            const isSelected = selectedTeam.includes(c.id);
            return (
              <CreatureCard
                key={c.id}
                creature={c}
                selected={isSelected}
                onSelect={toggleCreature}
              />
            );
          })}
        </div>
      </div>

      {/* Live Win Rate Forecast & Launch Bar */}
      <div
        className="arcade-panel"
        style={{
          background: "linear-gradient(135deg, #161b22 0%, #1e293b 100%)",
          borderColor: "var(--border-color)",
          padding: "1.5rem",
          position: "sticky",
          bottom: "1rem",
          zIndex: 50,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.5rem",
            alignItems: "center",
          }}
        >
          {/* Predictive Win Rate */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <span style={{ fontWeight: 800, color: "#fff", fontSize: "0.95rem" }}>
                Live Monte Carlo Forecast
              </span>
              {isPredicting && (
                <span style={{ fontSize: "0.75rem", color: "var(--coin-gold)" }}>Updating...</span>
              )}
            </div>
            {prediction ? (
              <WinRateBar
                rate={prediction.win_rate}
                ci={prediction.confidence_interval_percent}
                label={`${prediction.seed_count} Seeds Simulation`}
              />
            ) : (
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Draft at least one creature to calculate win probability.
              </div>
            )}
          </div>

          {/* Seed & AI Profile Settings */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "100px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Simulation Seed
              </label>
              <div style={{ display: "flex", gap: "4px" }}>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value) || 1000)}
                  aria-label="Seed number"
                  style={{
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    color: "#fff",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setSeed(Math.floor(Math.random() * 90000) + 1000)}
                  className="btn-arcade btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  title="Randomize Seed"
                >
                  🎲
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: "120px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Opponent AI Profile
              </label>
              <select
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                aria-label="Opponent AI Personality"
                style={{
                  width: "100%",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  color: "#fff",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                }}
              >
                <option value="opportunistic">Opportunistic (Balanced)</option>
                <option value="aggressive">Aggressive (Rush)</option>
                <option value="defensive">Defensive (Stall)</option>
              </select>
            </div>
          </div>

          {/* Start Battle Button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleStartBattle}
              disabled={selectedTeam.length === 0 || isStarting}
              className="btn-arcade btn-primary"
              style={{
                width: "100%",
                padding: "0.9rem 1.5rem",
                fontSize: "1.1rem",
                letterSpacing: "0.02em",
              }}
            >
              {isStarting ? "Initializing Engine..." : "⚔ ENTER BATTLE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
