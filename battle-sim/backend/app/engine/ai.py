"""Opponent AI decision logic with distinct personality profiles."""

from typing import List, Dict, Any
from .models import Move, TYPE_CHART, BUILTIN_MOVES
from .rng import SeededRNG


class AIDecisionMaker:
    """Calculates actions for creatures based on personality profile and visible battlefield state."""

    def __init__(self, personality: str = "opportunistic"):
        self.personality = personality.lower()
        if self.personality not in ("aggressive", "defensive", "opportunistic"):
            self.personality = "opportunistic"

    def choose_action(
        self,
        actor: Dict[str, Any],
        allies: List[Dict[str, Any]],
        enemies: List[Dict[str, Any]],
        hazard_lanes: List[int],
        coins: int,
        rng: SeededRNG,
    ) -> Dict[str, Any]:
        """
        Returns a dictionary representing the chosen action:
        {
            "action_type": "move_lane" | "cast_move" | "rest",
            "target_lane": int | None,
            "move": Move | None,
            "target": Dict[str, Any] | None,
            "cost": int
        }
        """
        alive_enemies = [e for e in enemies if e["hp"] > 0]
        if not alive_enemies:
            return {"action_type": "rest", "target_lane": None, "move": None, "target": None, "cost": 0}

        # Available moves
        available_moves: List[Move] = []
        for mid in actor["creature"].moves:
            if mid in BUILTIN_MOVES:
                m = BUILTIN_MOVES[mid]
                if m.cost_coins <= coins:
                    available_moves.append(m)

        if not available_moves:
            # Fallback basic strike
            available_moves = [
                Move(id="basic_tackle", name="Tackle", type=actor["creature"].type, power=15, accuracy=1.0)
            ]

        # Check lane positioning: if current lane is under active hazard, defensive & opportunistic might shift
        current_lane = actor.get("lane", 0)
        if current_lane in hazard_lanes:
            if self.personality == "defensive" and rng.next_float() < 0.85:
                # shift to a safe lane
                safe_lanes = [l for l in [0, 1, 2] if l not in hazard_lanes]
                if safe_lanes:
                    target_lane = safe_lanes[0]
                    return {
                        "action_type": "move_lane",
                        "target_lane": target_lane,
                        "move": None,
                        "target": None,
                        "cost": 0,
                    }
            elif self.personality == "opportunistic" and rng.next_float() < 0.60:
                safe_lanes = [l for l in [0, 1, 2] if l not in hazard_lanes]
                if safe_lanes:
                    return {
                        "action_type": "move_lane",
                        "target_lane": safe_lanes[0],
                        "move": None,
                        "target": None,
                        "cost": 0,
                    }

        # Select move and target based on personality
        if self.personality == "aggressive":
            return self._choose_aggressive(actor, available_moves, alive_enemies, rng)
        elif self.personality == "defensive":
            return self._choose_defensive(actor, available_moves, allies, alive_enemies, rng)
        else:
            return self._choose_opportunistic(actor, available_moves, alive_enemies, rng)

    def _choose_aggressive(
        self,
        actor: Dict[str, Any],
        moves: List[Move],
        enemies: List[Dict[str, Any]],
        rng: SeededRNG,
    ) -> Dict[str, Any]:
        # Aggressive prioritizes highest raw power and lowest remaining enemy HP
        best_move = max(moves, key=lambda m: m.power)
        sorted_enemies = sorted(enemies, key=lambda e: e["hp"])
        target = sorted_enemies[0]

        options: List[Dict[str, Any]] = []
        for m in moves:
            for e in enemies:
                # Score based on power and target vulnerability
                raw_score = (m.power / 60.0) * 0.6 + (1.0 - min(1.0, e["hp"] / max(1, e["max_hp"]))) * 0.4
                norm_score = round(min(1.0, max(0.05, raw_score)), 2)
                options.append({"action": f"{m.name} -> {e['id']}", "score": norm_score})

        options.sort(key=lambda o: o["score"], reverse=True)
        chosen_str = f"{best_move.name} -> {target['id']}"

        return {
            "action_type": "cast_move",
            "target_lane": None,
            "move": best_move,
            "target": target,
            "cost": best_move.cost_coins,
            "options_considered": options,
            "chosen_action": chosen_str,
        }

    def _choose_defensive(
        self,
        actor: Dict[str, Any],
        moves: List[Move],
        allies: List[Dict[str, Any]],
        enemies: List[Dict[str, Any]],
        rng: SeededRNG,
    ) -> Dict[str, Any]:
        actor_hp_pct = actor["hp"] / max(1, actor["creature"].hp)
        shield_or_heal = [m for m in moves if m.effect in ("shield", "heal")]

        options: List[Dict[str, Any]] = []

        if actor_hp_pct < 0.5 and shield_or_heal:
            chosen = shield_or_heal[0]
            target = actor if chosen.target_type == "self" else sorted(allies, key=lambda a: a["hp"])[0]
            chosen_str = f"{chosen.name} -> {target['id']}"

            options.append({"action": chosen_str, "score": 0.95})
            for m in moves:
                if m != chosen and enemies:
                    options.append({"action": f"{m.name} -> {enemies[0]['id']}", "score": 0.45})

            return {
                "action_type": "cast_move",
                "target_lane": None,
                "move": chosen,
                "target": target,
                "cost": chosen.cost_coins,
                "options_considered": options,
                "chosen_action": chosen_str,
            }

        highest_atk_enemy = max(enemies, key=lambda e: e["creature"].attack)
        safe_moves = [m for m in moves if m.accuracy >= 0.9] or moves
        chosen = max(safe_moves, key=lambda m: m.power)
        chosen_str = f"{chosen.name} -> {highest_atk_enemy['id']}"

        for m in moves:
            for e in enemies:
                raw_score = (m.power / 60.0) * 0.5 + (m.accuracy * 0.3) + (e["creature"].attack / 60.0) * 0.2
                norm_score = round(min(1.0, max(0.05, raw_score)), 2)
                options.append({"action": f"{m.name} -> {e['id']}", "score": norm_score})

        options.sort(key=lambda o: o["score"], reverse=True)

        return {
            "action_type": "cast_move",
            "target_lane": None,
            "move": chosen,
            "target": highest_atk_enemy,
            "cost": chosen.cost_coins,
            "options_considered": options,
            "chosen_action": chosen_str,
        }

    def _choose_opportunistic(
        self,
        actor: Dict[str, Any],
        moves: List[Move],
        enemies: List[Dict[str, Any]],
        rng: SeededRNG,
    ) -> Dict[str, Any]:
        best_score = -1.0
        best_move = moves[0]
        best_target = enemies[0]

        options: List[Dict[str, Any]] = []

        for m in moves:
            for e in enemies:
                target_type = e["creature"].type.value if hasattr(e["creature"].type, "value") else str(e["creature"].type)
                move_type = m.type.value if hasattr(m.type, "value") else str(m.type)
                type_mult = TYPE_CHART.get(move_type, {}).get(target_type, 1.0)
                
                kill_bonus = 1.5 if (m.power * type_mult >= e["hp"]) else 1.0
                score = m.power * type_mult * m.accuracy * kill_bonus

                norm_score = round(min(1.0, max(0.05, score / 120.0)), 2)
                options.append({"action": f"{m.name} -> {e['id']}", "score": norm_score})

                if score > best_score:
                    best_score = score
                    best_move = m
                    best_target = e

        options.sort(key=lambda o: o["score"], reverse=True)
        chosen_str = f"{best_move.name} -> {best_target['id']}"

        return {
            "action_type": "cast_move",
            "target_lane": None,
            "move": best_move,
            "target": best_target,
            "cost": best_move.cost_coins,
            "options_considered": options,
            "chosen_action": chosen_str,
        }

