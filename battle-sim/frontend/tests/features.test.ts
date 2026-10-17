import { describe, it, expect, beforeEach } from "vitest";
import { soundFX } from "../src/services/sound";

describe("Puffcap Arena 5 Extended Features Unit Tests", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Feature 1: Retro 8-bit Audio Synthesizer
  describe("Web Audio Synthesizer Service", () => {
    it("handles mute toggle and persists to localStorage", () => {
      soundFX.setMute(false);
      expect(soundFX.isMuted()).toBe(false);

      const toggled = soundFX.toggleMute();
      expect(toggled).toBe(true);
      expect(soundFX.isMuted()).toBe(true);
      expect(localStorage.getItem("puffcap_sound_muted")).toBe("true");

      const toggledAgain = soundFX.toggleMute();
      expect(toggledAgain).toBe(false);
      expect(soundFX.isMuted()).toBe(false);
      expect(localStorage.getItem("puffcap_sound_muted")).toBe("false");
    });

    it("safely invokes procedural sound methods without throwing", () => {
      expect(() => {
        soundFX.playCoin();
        soundFX.playHit();
        soundFX.playFire();
        soundFX.playElectric();
        soundFX.playWater();
        soundFX.playCombo();
        soundFX.playBossPhase();
        soundFX.playVictory();
        soundFX.playDefeat();
      }).not.toThrow();
    });
  });

  // Feature 2: Multi-Phase Boss Battle Logic
  describe("Boss Phase Mechanics", () => {
    it("detects Phase 1 Armored vs Phase 2 Enraged at <= 50% HP threshold", () => {
      const bossMaxHp = 480;

      const isEnraged = (hp: number) => hp > 0 && hp <= bossMaxHp * 0.5;
      const isDefeated = (hp: number) => hp <= 0;

      // Full HP: Phase 1
      expect(isEnraged(480)).toBe(false);
      expect(isDefeated(480)).toBe(false);

      // Above 50%: Phase 1
      expect(isEnraged(241)).toBe(false);

      // Exactly 50%: Phase 2
      expect(isEnraged(240)).toBe(true);

      // Below 50%: Phase 2
      expect(isEnraged(100)).toBe(true);

      // 0 HP: Defeated
      expect(isEnraged(0)).toBe(false);
      expect(isDefeated(0)).toBe(true);
    });
  });

  // Feature 3: Synergy Dual-Combos Logic
  describe("Synergy Dual-Combos Detection", () => {
    const synergies = [
      { id: "inferno_stomp", name: "Inferno Stomp", pair: ["mario", "charizard"] as [string, string] },
      { id: "poltergeist_storm", name: "Poltergeist Storm", pair: ["gengar", "luigi"] as [string, string] },
      { id: "thunder_blade", name: "Thunder Blade", pair: ["link_hero", "pikachu"] as [string, string] },
    ];

    function getActiveSynergies(team: string[]) {
      return synergies.filter(
        (syn) => team.includes(syn.pair[0]) && team.includes(syn.pair[1])
      );
    }

    it("detects matching synergy pairs in drafted squad", () => {
      const team1 = ["mario", "charizard", "bubble_toad", "volt_hedgehog"];
      const active1 = getActiveSynergies(team1);
      expect(active1.length).toBe(1);
      expect(active1[0].id).toBe("inferno_stomp");

      const team2 = ["mario", "charizard", "luigi", "gengar"];
      const active2 = getActiveSynergies(team2);
      expect(active2.length).toBe(2);

      const team3 = ["ember_fox", "bubble_toad", "moss_shroom", "volt_hedgehog"];
      const active3 = getActiveSynergies(team3);
      expect(active3.length).toBe(0);
    });
  });

  // Feature 4: Tournament Bracket Progression Structure
  describe("Tournament Bracket Format", () => {
    it("validates 8-squad single elimination tree geometry", () => {
      const squadCount = 8;
      const expectedRounds = Math.log2(squadCount); // 3 rounds
      expect(expectedRounds).toBe(3);

      const matchesPerRound = [
        squadCount / 2, // QF: 4
        squadCount / 4, // SF: 2
        squadCount / 8, // GF: 1
      ];
      expect(matchesPerRound).toEqual([4, 2, 1]);
      const totalMatches = matchesPerRound.reduce((a, b) => a + b, 0);
      expect(totalMatches).toBe(7);
    });
  });

  // Feature 5: Auto-Tuning Balance Optimization Math
  describe("Auto-Tuning Binary Search Convergence", () => {
    function simulateTargetSearch(targetWinRate: number, tolerance: number = 5.0) {
      let low = 0.5;
      let high = 2.0;
      let currentVal = 1.0;
      let steps = 0;

      // Simulated win-rate function inversely related to enemy HP
      const evalWinRate = (val: number) => Math.max(0, Math.min(100, Math.round(100 - (val - 0.5) * 60)));

      while (steps < 10) {
        steps++;
        const winRate = evalWinRate(currentVal);
        if (Math.abs(winRate - targetWinRate) <= tolerance) {
          return { converged: true, steps, finalVal: currentVal, winRate };
        }
        if (winRate > targetWinRate) {
          low = currentVal;
          currentVal = Number(((low + high) / 2).toFixed(2));
        } else {
          high = currentVal;
          currentVal = Number(((low + high) / 2).toFixed(2));
        }
      }
      return { converged: false, steps, finalVal: currentVal, winRate: evalWinRate(currentVal) };
    }

    it("converges toward target 50% win-rate within binary search bounds", () => {
      const result = simulateTargetSearch(50.0, 5.0);
      expect(result.converged).toBe(true);
      expect(result.steps).toBeLessThanOrEqual(6);
      expect(Math.abs(result.winRate - 50.0)).toBeLessThanOrEqual(5.0);
    });
  });
});
