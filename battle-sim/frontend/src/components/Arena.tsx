import React, { useState, useEffect, useRef } from "react";
import { BattleRecord, Scenario, Creature } from "../api";
import { CreatureAvatar } from "./CreatureCard";

interface ArenaProps {
  battle: BattleRecord;
  scenario?: Scenario | null;
  creaturesMap: Record<string, Creature>;
}

export const Arena: React.FC<ArenaProps> = ({ battle, scenario, creaturesMap }) => {
  const [currentTick, setCurrentTick] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 4x
  const [activeEffect, setActiveEffect] = useState<{ text: string; type: string } | null>(null);

  const maxTicks = battle.ticks_elapsed || 40;
  const timerRef = useRef<number | null>(null);

  // Derive state at currentTick from event log
  const playerHps: Record<string, number> = {};
  const enemyHps: Record<string, number> = {};
  let currentCoins = scenario?.starting_resources?.coins || 20;

  // Initialize maximum HPs
  battle.player_team.forEach((cid) => {
    playerHps[cid] = creaturesMap[cid]?.hp || 120;
  });
  if (scenario?.enemy_team) {
    scenario.enemy_team.forEach((eid) => {
      enemyHps[eid] = creaturesMap[eid]?.hp || 150;
    });
  }

  // Active hazards at current tick
  const activeHazards = scenario?.hazard_schedule?.filter((h) => h.tick === currentTick) || [];

  // Replay events up to currentTick
  for (const ev of battle.events) {
    if (ev.tick > currentTick) break;
    if (ev.coin_change) currentCoins += ev.coin_change;
    if (ev.target) {
      if (ev.target in playerHps) playerHps[ev.target] = ev.hp_after;
      if (ev.target in enemyHps) enemyHps[ev.target] = ev.hp_after;
    }
  }

  // Animation playback loop
  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / playbackSpeed;
      timerRef.current = window.setInterval(() => {
        setCurrentTick((prev) => {
          if (prev >= maxTicks) {
            setIsPlaying(false);
            return maxTicks;
          }
          return prev + 1;
        });
      }, interval);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, maxTicks]);

  // Flash hit/pickup events on tick change
  useEffect(() => {
    const tickEvents = battle.events.filter((e) => e.tick === currentTick);
    const hit = tickEvents.find((e) => e.ko || e.damage > 0 || e.pickup || e.hazard_hit);
    if (hit) {
      let text = hit.action;
      let type = "hit";
      if (hit.ko) {
        text = `KO! ${hit.target || hit.actor}`;
        type = "ko";
      } else if (hit.pickup) {
        text = `+Pickup: ${hit.pickup}`;
        type = "pickup";
      } else if (hit.hazard_hit) {
        text = `Hazard: ${hit.hazard_hit}`;
        type = "hazard";
      }
      setActiveEffect({ text, type });
      const t = setTimeout(() => setActiveEffect(null), 700);
      return () => clearTimeout(t);
    } else {
      setActiveEffect(null);
    }
  }, [currentTick, battle]);

  const lanesCount = scenario?.lanes || 3;

  return (
    <div className="arcade-panel" style={{ padding: "1.25rem" }}>
      {/* Control Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn-arcade btn-primary"
            style={{ padding: "0.5rem 1rem", fontSize: "0.9rem" }}
            aria-label={isPlaying ? "Pause battle playback" : "Play battle animation"}
          >
            {isPlaying ? "❚❚ Pause" : "▶ Play"}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTick((prev) => Math.max(1, prev - 1));
            }}
            disabled={currentTick <= 1}
            className="btn-arcade btn-secondary"
            style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
            aria-label="Step backward one tick"
          >
            ⏮ Step
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTick((prev) => Math.min(maxTicks, prev + 1));
            }}
            disabled={currentTick >= maxTicks}
            className="btn-arcade btn-secondary"
            style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
            aria-label="Step forward one tick"
          >
            Step ⏭
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTick(1);
            }}
            className="btn-arcade btn-secondary"
            style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
            aria-label="Reset battle animation to beginning"
          >
            Reset
          </button>
        </div>

        {/* Speed Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Speed:</span>
          {[0.5, 1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`btn-arcade ${playbackSpeed === spd ? "btn-accent" : "btn-secondary"}`}
              style={{ padding: "3px 8px", fontSize: "0.8rem", borderRadius: "4px" }}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Coin indicator & Tick badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              background: "#422006",
              border: "1px solid var(--coin-gold)",
              padding: "4px 10px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontWeight: 800,
              color: "var(--coin-gold)",
            }}
          >
            <span>🪙 Coins:</span>
            <span>{currentCoins}</span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 900,
              fontSize: "1.1rem",
              color: "#fff",
            }}
          >
            Tick {currentTick} / {maxTicks}
          </div>
        </div>
      </div>

      {/* Scrubber slider */}
      <div style={{ marginBottom: "1.25rem" }}>
        <input
          type="range"
          min={1}
          max={maxTicks}
          value={currentTick}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentTick(Number(e.target.value));
          }}
          aria-label="Tick Scrubber"
          style={{
            width: "100%",
            accentColor: "var(--border-highlight)",
            cursor: "pointer",
          }}
        />
      </div>

      {/* Main Visual Arena Grid */}
      <div
        style={{
          position: "relative",
          background:
            scenario?.id === "pipe_ambush"
              ? "linear-gradient(180deg, #0284c7 0%, #075985 45%, #14532d 100%)"
              : scenario?.id === "castle_siege"
              ? "linear-gradient(180deg, #18181b 0%, #450a0a 55%, #7f1d1d 100%)"
              : scenario?.id === "coin_race"
              ? "linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)"
              : "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)",
          borderRadius: "12px",
          border: "2px solid #334155",
          padding: "1rem",
          minHeight: "260px",
          overflow: "hidden",
          boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Floating pop-up effect banner */}
        {activeEffect && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 30,
              background:
                activeEffect.type === "ko"
                  ? "var(--primary-red)"
                  : activeEffect.type === "hazard"
                  ? "var(--hazard-purple)"
                  : "var(--primary-yellow)",
              color: activeEffect.type === "hazard" || activeEffect.type === "ko" ? "#fff" : "#000",
              fontWeight: 900,
              fontSize: "0.95rem",
              padding: "4px 14px",
              borderRadius: "20px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              animation: "bounce 0.4s ease-out",
            }}
          >
            {activeEffect.text}
          </div>
        )}

        {/* Lanes Render */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {Array.from({ length: lanesCount }).map((_, laneIdx) => {
            const laneHazard = activeHazards.find((h) => h.lane === laneIdx);
            return (
              <div
                key={laneIdx}
                style={{
                  position: "relative",
                  height: "70px",
                  background: laneHazard
                    ? "rgba(239, 68, 68, 0.25)"
                    : "rgba(255, 255, 255, 0.04)",
                  borderRadius: "8px",
                  border: laneHazard ? "2px dashed #ef4444" : "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 10px",
                  transition: "background 0.2s ease",
                }}
              >
                {/* Lane Label */}
                <span
                  style={{
                    position: "absolute",
                    left: "6px",
                    top: "4px",
                    fontSize: "0.65rem",
                    color: "rgba(255,255,255,0.3)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Lane {laneIdx + 1}
                </span>

                {/* Left side: Player creatures on this lane */}
                <div style={{ display: "flex", gap: "8px", zIndex: 10 }}>
                  {battle.player_team
                    .filter((_, idx) => idx % lanesCount === laneIdx)
                    .map((cid) => {
                      const c = creaturesMap[cid];
                      const hp = playerHps[cid] ?? 100;
                      const isDead = hp <= 0;
                      return (
                        <div
                          key={cid}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            opacity: isDead ? 0.35 : 1,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <CreatureAvatar
                            type={c?.type || "fire"}
                            avatar={c?.avatar}
                            id={c?.id}
                            size={36}
                          />
                          <div
                            style={{
                              width: "38px",
                              height: "4px",
                              background: "#334155",
                              borderRadius: "2px",
                              marginTop: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.max(0, Math.min(100, (hp / (c?.hp || 100)) * 100))}%`,
                                height: "100%",
                                background: hp < 30 ? "#ef4444" : "#10b981",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Center interactables: Pipes and Question Blocks */}
                <div style={{ display: "flex", gap: "16px", zIndex: 5 }}>
                  {scenario?.map
                    ?.filter((t) => t.lane === laneIdx)
                    .map((t, tidx) => (
                      <div
                        key={tidx}
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background:
                            t.tile_type === "pipe"
                              ? "#15803d"
                              : t.tile_type === "question_block"
                              ? "#d97706"
                              : t.tile_type === "exit"
                              ? "#2563eb"
                              : "rgba(255,255,255,0.08)",
                          color: "#fff",
                        }}
                      >
                        {t.tile_type === "pipe"
                          ? "🕳 Pipe"
                          : t.tile_type === "question_block"
                          ? "? Block"
                          : t.tile_type === "exit"
                          ? "🏁 Exit"
                          : t.tile_type}
                      </div>
                    ))}
                </div>

                {/* Right side: Enemies on this lane */}
                <div style={{ display: "flex", gap: "8px", zIndex: 10 }}>
                  {scenario?.enemy_team
                    ?.filter((_, idx) => idx % lanesCount === laneIdx)
                    .map((eid) => {
                      const c = creaturesMap[eid];
                      const hp = enemyHps[eid] ?? 100;
                      const isDead = hp <= 0;
                      return (
                        <div
                          key={eid}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            opacity: isDead ? 0.35 : 1,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <CreatureAvatar
                            type={c?.type || "stone"}
                            avatar={c?.avatar}
                            id={c?.id}
                            size={36}
                          />
                          <div
                            style={{
                              width: "38px",
                              height: "4px",
                              background: "#334155",
                              borderRadius: "2px",
                              marginTop: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.max(0, Math.min(100, (hp / (c?.hp || 100)) * 100))}%`,
                                height: "100%",
                                background: hp < 30 ? "#ef4444" : "#f59e0b",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Status Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
          marginTop: "1.25rem",
        }}
      >
        {/* Allied Squad Status */}
        <div style={{ background: "var(--bg-surface)", borderRadius: "8px", padding: "0.75rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            ALLIED SQUAD HP
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {battle.player_team.map((cid) => {
              const c = creaturesMap[cid];
              const maxHp = c?.hp || 100;
              const hp = playerHps[cid] ?? maxHp;
              const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
              return (
                <div key={cid} style={{ fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>{c?.name || cid}</span>
                    <strong style={{ color: hp <= 0 ? "#ef4444" : "#fff" }}>
                      {hp} / {maxHp}
                    </strong>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "#334155", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: hp < 30 ? "#ef4444" : "#10b981", transition: "width 0.2s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Enemy Squad Status */}
        <div style={{ background: "var(--bg-surface)", borderRadius: "8px", padding: "0.75rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            OPPOSING FORCES HP
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {scenario?.enemy_team?.map((eid) => {
              const c = creaturesMap[eid];
              const maxHp = c?.hp || 120;
              const hp = enemyHps[eid] ?? maxHp;
              const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
              return (
                <div key={eid} style={{ fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span>{c?.name || eid}</span>
                    <strong style={{ color: hp <= 0 ? "#ef4444" : "#fff" }}>
                      {hp} / {maxHp}
                    </strong>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "#334155", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: hp < 30 ? "#ef4444" : "#f59e0b", transition: "width 0.2s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
