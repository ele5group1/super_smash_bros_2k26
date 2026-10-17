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
        # Target enemy with lowest HP
        sorted_enemies = sorted(enemies, key=lambda e: e["hp"])
        target = sorted_enemies[0]
        return {
            "action_type": "cast_move",
            "target_lane": None,
            "move": best_move,
            "target": target,
            "cost": best_move.cost_coins,
        }

    def _choose_defensive(
        self,
        actor: Dict[str, Any],
        moves: List[Move],
        allies: List[Dict[str, Any]],
        enemies: List[Dict[str, Any]],
        rng: SeededRNG,
    ) -> Dict[str, Any]:
        # Check if actor or ally is in danger
        actor_hp_pct = actor["hp"] / max(1, actor["creature"].hp)
        shield_or_heal = [m for m in moves if m.effect in ("shield", "heal")]

        if actor_hp_pct < 0.5 and shield_or_heal:
            # Pick shield/heal
            chosen = shield_or_heal[0]
            target = actor if chosen.target_type == "self" else sorted(allies, key=lambda a: a["hp"])[0]
            return {
                "action_type": "cast_move",
                "target_lane": None,
                "move": chosen,
                "target": target,
                "cost": chosen.cost_coins,
            }

        # Otherwise target enemy with highest attack to weaken them
        highest_atk_enemy = max(enemies, key=lambda e: e["creature"].attack)
        # Prefer moves with accuracy >= 0.9
        safe_moves = [m for m in moves if m.accuracy >= 0.9] or moves
        chosen = max(safe_moves, key=lambda m: m.power)
        return {
            "action_type": "cast_move",
            "target_lane": None,
            "move": chosen,
            "target": highest_atk_enemy,
            "cost": chosen.cost_coins,
        }

    def _choose_opportunistic(
        self,
        actor: Dict[str, Any],
        moves: List[Move],
        enemies: List[Dict[str, Any]],
        rng: SeededRNG,
    ) -> Dict[str, Any]:
        # Opportunistic calculates type effectiveness * power for every (move, enemy) pair
        best_score = -1.0
        best_move = moves[0]
        best_target = enemies[0]

        for m in moves:
            for e in enemies:
                target_type = e["creature"].type.value if hasattr(e["creature"].type, "value") else str(e["creature"].type)
                move_type = m.type.value if hasattr(m.type, "value") else str(m.type)
                type_mult = TYPE_CHART.get(move_type, {}).get(target_type, 1.0)
                
                # Bonus if target is low HP and this can finish them off
                kill_bonus = 1.5 if (m.power * type_mult >= e["hp"]) else 1.0
                score = m.power * type_mult * m.accuracy * kill_bonus

                if score > best_score:
                    best_score = score
                    best_move = m
                    best_target = e

        return {
            "action_type": "cast_move",
            "target_lane": None,
            "move": best_move,
            "target": best_target,
            "cost": best_move.cost_coins,
        }
