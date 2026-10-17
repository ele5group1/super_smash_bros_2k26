import React, { useState, useEffect, useRef } from "react";
import { BattleRecord, Scenario, Creature } from "../api";
import { CreatureAvatar } from "./CreatureCard";
import { TimelineStrip } from "./TimelineStrip";
import { EventTicker } from "./EventTicker";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { soundFX } from "../services/sound";

interface ArenaProps {
  battle: BattleRecord;
  scenario?: Scenario | null;
  creaturesMap: Record<string, Creature>;
  onTickChange?: (tick: number) => void;
}

export const Arena: React.FC<ArenaProps> = ({
  battle,
  scenario,
  creaturesMap,
  onTickChange,
}) => {
  const [currentTick, setCurrentTick] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeEffect, setActiveEffect] = useState<{ text: string; type: string } | null>(null);

  const maxTicks = battle.ticks_elapsed || 40;
  const timerRef = useRef<number | null>(null);

  // Notify parent of tick change
  useEffect(() => {
    onTickChange?.(currentTick);
  }, [currentTick, onTickChange]);

  // Derive squad states up to currentTick
  const playerHps: Record<string, number> = {};
  const enemyHps: Record<string, number> = {};
  let currentCoins = scenario?.starting_resources?.coins || 20;

  battle.player_team.forEach((cid) => {
    playerHps[cid] = creaturesMap[cid]?.hp || 120;
  });
  if (scenario?.enemy_team) {
    scenario.enemy_team.forEach((eid) => {
      enemyHps[eid] = creaturesMap[eid]?.hp || 150;
    });
  }

  const activeHazards = scenario?.hazard_schedule?.filter((h) => h.tick === currentTick) || [];

  for (const ev of battle.events) {
    if (ev.tick > currentTick) break;
    if (ev.coin_change) currentCoins += ev.coin_change;
    if (ev.target) {
      if (ev.target in playerHps) playerHps[ev.target] = ev.hp_after;
      if (ev.target in enemyHps) enemyHps[ev.target] = ev.hp_after;
    }
  }

  // Boss battle tracking
  const bossId = scenario?.enemy_team?.find(
    (eid) => eid.includes("boss") || eid === "bowser_boss" || (creaturesMap[eid]?.hp || 0) >= 280
  );
  const isBossBattle = scenario?.objective?.type === "defeat_boss" || !!bossId;
  const bossCreature = bossId ? creaturesMap[bossId] : null;
  const bossMaxHp = bossCreature?.hp || 480;
  const bossCurrentHp = bossId ? (enemyHps[bossId] ?? bossMaxHp) : 0;
  const bossHpPercent = Math.max(0, Math.min(100, Math.round((bossCurrentHp / bossMaxHp) * 100)));
  const isBossEnraged = bossCurrentHp > 0 && bossCurrentHp <= bossMaxHp * 0.5;

  // Playback timer loop
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

  // Keyboard shortcut Space to toggle play/pause, left/right arrows to step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTick((prev) => Math.min(maxTicks, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentTick((prev) => Math.max(1, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maxTicks]);

  // Flash combat effects and play retro 8-bit sound effects
  useEffect(() => {
    const tickEvents = battle.events.filter((e) => e.tick === currentTick);

    // 1. Boss Phase Shift
    const bossPhaseEvent = tickEvents.find((e) => e.event_type === "boss_phase");
    if (bossPhaseEvent) {
      soundFX.playBossPhase();
      setActiveEffect({ text: `🔥 BOSS ENRAGE: Phase 2 Molten Fury!`, type: "boss_phase" });
      const t = setTimeout(() => setActiveEffect(null), 1400);
      return () => clearTimeout(t);
    }

    // 2. Synergy Dual-Combo
    const synergyEvent = tickEvents.find((e) => e.event_type === "synergy");
    if (synergyEvent) {
      soundFX.playCombo();
      setActiveEffect({ text: `⚡ DUAL-COMBO: ${synergyEvent.action}`, type: "synergy" });
      const t = setTimeout(() => setActiveEffect(null), 1200);
      return () => clearTimeout(t);
    }

    // 3. Regular Hits / Hazard / Pickups
    const hit = tickEvents.find((e) => e.ko || e.damage > 0 || e.pickup || e.hazard_hit);
    if (hit) {
      let text = hit.action;
      let type = "hit";
      if (hit.ko) {
        text = `KO! ${hit.target || hit.actor}`;
        type = "ko";
        soundFX.playDefeat();
      } else if (hit.pickup) {
        text = `+Pickup: ${hit.pickup}`;
        type = "pickup";
        soundFX.playCoin();
      } else if (hit.hazard_hit) {
        text = `Hazard: ${hit.hazard_hit}`;
        type = "hazard";
        soundFX.playHit();
      } else {
        const act = (hit.action || "").toLowerCase();
        if (act.includes("flame") || act.includes("fire") || act.includes("ember") || act.includes("giga")) {
          soundFX.playFire();
        } else if (act.includes("thunder") || act.includes("volt") || act.includes("spark") || act.includes("shock")) {
          soundFX.playElectric();
        } else if (act.includes("water") || act.includes("hydro") || act.includes("splash") || act.includes("surf")) {
          soundFX.playWater();
        } else {
          soundFX.playHit();
        }
      }
      setActiveEffect({ text, type });
      const t = setTimeout(() => setActiveEffect(null), 600);
      return () => clearTimeout(t);
    } else {
      setActiveEffect(null);
    }

    // End of battle fanfare
    if (currentTick === maxTicks && currentTick > 1) {
      if (battle.outcome === "win") {
        soundFX.playVictory();
      } else {
        soundFX.playDefeat();
      }
    }
  }, [currentTick, battle, maxTicks]);

  const lanesCount = scenario?.lanes || 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Media Player Control Bar */}
      <div className="replay-controls" role="toolbar" aria-label="Battle playback controls">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Button
            id="replay-play-pause-btn"
            variant="primary"
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause playback" : "Play battle replay"}
          >
            {isPlaying ? "❚❚ Pause" : "▶ Play"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsPlaying(false);
              setCurrentTick((prev) => Math.max(1, prev - 1));
            }}
            disabled={currentTick <= 1}
            aria-label="Step back one tick"
          >
            ⏮ Step
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsPlaying(false);
              setCurrentTick((prev) => Math.min(maxTicks, prev + 1));
            }}
            disabled={currentTick >= maxTicks}
            aria-label="Step forward one tick"
          >
            Step ⏭
          </Button>
        </div>

        {/* Scrubber slider */}
        <input
          type="range"
          min={1}
          max={maxTicks}
          value={currentTick}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentTick(Number(e.target.value));
          }}
          className="replay-scrub-slider"
          aria-label="Replay scrub slider"
        />

        {/* Speed pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {[0.5, 1, 2, 4].map((spd) => (
            <button
              key={spd}
              type="button"
              className={`ui-btn ui-btn-sm ${playbackSpeed === spd ? "ui-btn-primary" : "ui-btn-ghost"}`}
              onClick={() => setPlaybackSpeed(spd)}
              style={{ minWidth: "32px", padding: "2px 6px", height: "26px", fontSize: "11px" }}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Ticks and Coins */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Badge variant="warning" size="sm">
            🪙 {currentCoins}
          </Badge>
          <Badge variant="neutral" size="sm">
            T{currentTick}/{maxTicks}
          </Badge>
        </div>
      </div>

      {/* Scaled Visual Arena */}
      <div
        style={{
          position: "relative",
          background: "linear-gradient(180deg, #090d16 0%, #111827 100%)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          padding: "var(--space-4)",
          minHeight: "260px",
          width: "100%",
          boxShadow: "inset 0 0 30px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
      >
        {/* Floating pop-up effect banner */}
        {activeEffect && (
          <div
            style={{
              position: "absolute",
              top: "14px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 30,
              background:
                activeEffect.type === "boss_phase"
                  ? "linear-gradient(90deg, #dc2626, #f97316)"
                  : activeEffect.type === "synergy"
                  ? "linear-gradient(90deg, #6366f1, #06b6d4)"
                  : activeEffect.type === "ko"
                  ? "var(--color-error)"
                  : activeEffect.type === "hazard"
                  ? "#a855f7"
                  : "var(--color-warning)",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "13px",
              padding: "6px 20px",
              borderRadius: "var(--radius-full)",
              boxShadow: "0 0 20px rgba(0,0,0,0.8)",
              animation: "pulse 0.4s ease infinite alternate",
            }}
          >
            {activeEffect.text}
          </div>
        )}

        {/* Multi-Phase Boss Health Bar (if Boss battle) */}
        {isBossBattle && bossCreature && (
          <div
            style={{
              marginBottom: "var(--space-3)",
              background: isBossEnraged
                ? "linear-gradient(90deg, rgba(220, 38, 38, 0.25) 0%, rgba(153, 27, 27, 0.4) 100%)"
                : "rgba(0, 0, 0, 0.4)",
              border: isBossEnraged ? "1px solid #ef4444" : "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-2) var(--space-3)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              boxShadow: isBossEnraged ? "0 0 15px rgba(239, 68, 68, 0.3)" : "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>👑</span>
                <span style={{ fontWeight: "bold", fontSize: "14px", color: isBossEnraged ? "#fca5a5" : "#fff" }}>
                  {bossCreature.name}
                </span>
                <Badge variant={bossCurrentHp <= 0 ? "neutral" : isBossEnraged ? "error" : "warning"} size="sm">
                  {bossCurrentHp <= 0 ? "DEFEATED" : isBossEnraged ? "🔥 PHASE 2: ENRAGED" : "PHASE 1: ARMORED"}
                </Badge>
              </div>

              <div style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                {bossCurrentHp} / {bossMaxHp} HP ({bossHpPercent}%)
              </div>
            </div>

            {/* Boss HP Bar */}
            <div
              style={{
                width: "100%",
                height: "10px",
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "5px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* 50% Phase Marker */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  background: "#fff",
                  opacity: 0.6,
                  zIndex: 2,
                }}
                title="Phase 2 Enrage threshold (50% HP)"
              />
              <div
                style={{
                  width: `${bossHpPercent}%`,
                  height: "100%",
                  background:
                    bossCurrentHp <= 0
                      ? "#4b5563"
                      : isBossEnraged
                      ? "linear-gradient(90deg, #f97316 0%, #dc2626 100%)"
                      : "linear-gradient(90deg, #eab308 0%, #22c55e 100%)",
                  transition: "width var(--duration-short) ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Lanes Render */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {Array.from({ length: lanesCount }).map((_, laneIdx) => {
            const laneHazard = activeHazards.find((h) => h.lane === laneIdx);
            return (
              <div
                key={laneIdx}
                style={{
                  position: "relative",
                  height: "74px",
                  background: laneHazard
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(255, 255, 255, 0.03)",
                  borderRadius: "var(--radius-md)",
                  border: laneHazard ? "1px dashed var(--color-error)" : "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 var(--space-3)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "4px",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}
                >
                  Lane {laneIdx + 1}
                </span>

                {/* Left side: Allies */}
                <div style={{ display: "flex", gap: "var(--space-2)", zIndex: 10 }}>
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
                            transition: "opacity var(--duration-short) ease",
                          }}
                        >
                          <CreatureAvatar
                            type={c?.type || "fire"}
                            avatar={c?.avatar}
                            id={c?.id}
                            size={38}
                          />
                          <div
                            style={{
                              width: "38px",
                              height: "4px",
                              background: "var(--bg-muted)",
                              borderRadius: "2px",
                              marginTop: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.max(0, Math.min(100, (hp / (c?.hp || 100)) * 100))}%`,
                                height: "100%",
                                background: hp < 30 ? "var(--color-error)" : "var(--color-success)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Center interactables: Hazards / Powerups */}
                <div style={{ display: "flex", gap: "var(--space-3)", zIndex: 5 }}>
                  {scenario?.map
                    ?.filter((t) => t.lane === laneIdx)
                    .map((t, tidx) => (
                      <div
                        key={tidx}
                        style={{
                          fontSize: "11px",
                          fontWeight: "bold",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          background:
                            t.tile_type === "pipe"
                              ? "#15803d"
                              : t.tile_type === "hazard_zone" || t.tile_type === "lava"
                              ? "var(--color-error)"
                              : t.tile_type === "exit"
                              ? "var(--accent-primary)"
                              : "var(--bg-muted)",
                          color: "#fff",
                        }}
                      >
                        {t.tile_type === "pipe"
                          ? "🕳 Pipe"
                          : t.tile_type === "hazard_zone" || t.tile_type === "lava"
                          ? "⚠️ Spikes"
                          : t.tile_type === "exit"
                          ? "🏁 Goal"
                          : t.tile_type}
                      </div>
                    ))}
                </div>

                {/* Right side: Enemies */}
                <div style={{ display: "flex", gap: "var(--space-2)", zIndex: 10 }}>
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
                            transition: "opacity var(--duration-short) ease",
                          }}
                        >
                          <CreatureAvatar
                            type={c?.type || "stone"}
                            avatar={c?.avatar}
                            id={c?.id}
                            size={38}
                          />
                          <div
                            style={{
                              width: "38px",
                              height: "4px",
                              background: "var(--bg-muted)",
                              borderRadius: "2px",
                              marginTop: "2px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.max(0, Math.min(100, (hp / (c?.hp || 100)) * 100))}%`,
                                height: "100%",
                                background: hp < 30 ? "var(--color-error)" : "var(--color-warning)",
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

      {/* Timeline Strip */}
      <TimelineStrip
        totalTicks={maxTicks}
        currentTick={currentTick}
        onSelectTick={(t) => {
          setIsPlaying(false);
          setCurrentTick(t);
        }}
        events={battle.events}
      />

      {/* Event Ticker */}
      <EventTicker events={battle.events} currentTick={currentTick} />
    </div>
  );
};
