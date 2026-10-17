"""Deterministic tick loop for resolving scenario battles."""

from __future__ import annotations
import uuid
from typing import Dict, List, Optional, Any, Literal
from .models import (
    Creature,
    Move,
    Scenario,
    Event,
    BattleRecord,
    CounterfactualRequest,
    TYPE_CHART,
    BUILTIN_MOVES,
)
from .rng import SeededRNG
from .ai import AIDecisionMaker


class TickEngine:
    """Executes a deterministic battle tick loop between a player team and enemy forces."""

    def __init__(
        self,
        scenario: Scenario,
        player_creatures: List[Creature],
        enemy_creatures: List[Creature],
        seed: int = 1000,
        personality: Literal["aggressive", "defensive", "opportunistic"] = "opportunistic",
        battle_id: Optional[str] = None,
        counterfactual: Optional[CounterfactualRequest] = None,
        early_heal_spend: int = 0,
    ):
        self.scenario = scenario
        self.seed = seed
        self.rng = SeededRNG(seed)
        self.personality: Literal["aggressive", "defensive", "opportunistic"] = (
            personality if personality in ("aggressive", "defensive", "opportunistic") else "opportunistic"
        )
        self.battle_id = battle_id or str(uuid.uuid4())
        self.counterfactual = counterfactual
        self.early_heal_spend = early_heal_spend

        # Player and Enemy creature entities
        self.player_team: List[Dict[str, Any]] = []
        for i, c in enumerate(player_creatures):
            self.player_team.append({
                "id": c.id,
                "creature": c,
                "hp": c.hp,
                "max_hp": c.hp,
                "lane": i % self.scenario.lanes,
                "tile": 0,
                "status": None,  # "burn", "stun", "shield", "regen"
                "status_timer": 0,
                "powerup": None,
                "powerup_timer": 0,
                "is_player": True,
            })

        self.enemy_team: List[Dict[str, Any]] = []
        for i, c in enumerate(enemy_creatures):
            self.enemy_team.append({
                "id": c.id,
                "creature": c,
                "hp": c.hp,
                "max_hp": c.hp,
                "lane": i % self.scenario.lanes,
                "tile": 7,  # Default opposing tile
                "status": None,
                "status_timer": 0,
                "powerup": None,
                "powerup_timer": 0,
                "is_player": False,
            })

        self.player_coins = self.scenario.starting_coins - self.early_heal_spend
        self.enemy_coins = 10
        self.events: List[Event] = []
        self.enemy_ai = AIDecisionMaker(personality)
        self.player_ai = AIDecisionMaker("opportunistic")

    def _add_event(
        self,
        tick: int,
        action: str,
        actor: Optional[str] = None,
        target: Optional[str] = None,
        damage: int = 0,
        hp_before: int = 0,
        hp_after: int = 0,
        status_change: Optional[str] = None,
        hazard_hit: Optional[str] = None,
        pickup: Optional[str] = None,
        ko: bool = False,
        coin_change: int = 0,
        coin_before: Optional[int] = None,
        coin_after: Optional[int] = None,
        event_type: Literal[
            "hazard", "move", "status", "pickup", "death", "objective", "info", "block", "decision"
        ] = "info",
        lane: int = 0,
        tile: int = 0,
        options_considered: Optional[List[Dict[str, Any]]] = None,
        chosen_action: Optional[str] = None,
    ) -> Event:
        cb = self.player_coins if coin_before is None else coin_before
        ca = (cb + coin_change) if coin_after is None else coin_after
        ev = Event(
            battle_id=self.battle_id,
            tick=tick,
            actor=actor,
            action=action,
            target=target,
            damage=damage,
            hp_before=hp_before,
            hp_after=hp_after,
            position={"lane": lane, "tile": tile},
            status_change=status_change,
            hazard_hit=hazard_hit,
            pickup=pickup,
            ko=ko,
            coin_before=cb,
            coin_after=ca,
            coin_change=coin_change,
            event_type=event_type,
            options_considered=options_considered,
            chosen_action=chosen_action,
        )
        self.events.append(ev)
        return ev

    def run(self) -> BattleRecord:
        """Runs the battle until victory, defeat, or max ticks reached."""
        # Handle early heal spend at start if requested
        if self.early_heal_spend > 0 and self.player_team:
            heal_per_creature = self.early_heal_spend * 4
            heal_target = min(self.player_team, key=lambda p: p["hp"])
            old_hp = heal_target["hp"]
            heal_target["hp"] = min(heal_target["max_hp"], heal_target["hp"] + heal_per_creature)
            self._add_event(
                tick=1,
                actor="player",
                action=f"Early Heal ({self.early_heal_spend} coins spent)",
                target=heal_target["id"],
                damage=-heal_per_creature,
                hp_before=old_hp,
                hp_after=heal_target["hp"],
                status_change="healed",
                coin_change=-self.early_heal_spend,
                coin_before=self.scenario.starting_coins,
                coin_after=self.player_coins,
                event_type="info",
                lane=heal_target["lane"],
                tile=heal_target["tile"],
            )

        max_ticks = self.scenario.ticks
        current_tick = 1
        outcome: Optional[Literal["win", "loss"]] = None

        while current_tick <= max_ticks:
            # Step 1: Scheduled hazards fire
            self._fire_hazards(current_tick)

            # Check if all player creatures died to hazard
            if not any(p["hp"] > 0 for p in self.player_team):
                outcome = "loss"
                break

            # Step 2: Power-up timers decrement
            self._decrement_timers()

            # Step 3: Creatures act sorted by speed descending then id ascending
            all_alive = [c for c in (self.player_team + self.enemy_team) if c["hp"] > 0]
            # Deterministic sort: speed DESC, then id ASC
            all_alive.sort(key=lambda c: (-c["creature"].speed, c["id"]))

            for actor in all_alive:
                if actor["hp"] <= 0:
                    continue  # Knocked out during earlier turn in this tick

                # Check stun
                if actor.get("status") == "stun":
                    self._add_event(
                        tick=current_tick,
                        actor=actor["id"],
                        action="Stunned - turn skipped",
                        target=None,
                        event_type="status",
                        hp_before=actor["hp"],
                        hp_after=actor["hp"],
                        lane=actor["lane"],
                        tile=actor["tile"],
                    )
                    continue

                self._resolve_actor_turn(actor, current_tick)

                # Check victory/defeat after each creature action
                if not any(p["hp"] > 0 for p in self.player_team):
                    outcome = "loss"
                    break
                if not any(e["hp"] > 0 for e in self.enemy_team):
                    outcome = "win"
                    break

            if outcome is not None:
                break

            # Step 4: Status effects apply (burn damage, regen)
            self._apply_status_effects(current_tick)

            # Step 5: Deaths resolve
            self._resolve_deaths(current_tick)

            # Check if all player creatures wiped out
            if not any(p["hp"] > 0 for p in self.player_team):
                outcome = "loss"
                break

            # Step 6: Check scenario objective
            if self._check_objective_achieved():
                outcome = "win"
                self._add_event(
                    tick=current_tick,
                    action="Objective Achieved!",
                    event_type="objective",
                    hp_before=0,
                    hp_after=0,
                    lane=0,
                    tile=0,
                )
                break

            current_tick += 1

        if outcome is None:
            # Reached max ticks: evaluate final objective
            survivors = sum(1 for p in self.player_team if p["hp"] > 0)
            if self.scenario.objective.type == "reach_exit":
                # Must have reached exit (tile >= 7) with >= min_survivors
                at_exit = sum(1 for p in self.player_team if p["hp"] > 0 and p["tile"] >= 6)
                outcome = "win" if at_exit >= self.scenario.objective.min_survivors else "loss"
            elif self.scenario.objective.type == "collect_coins":
                outcome = "win" if self.player_coins >= self.scenario.objective.target_coins else "loss"
            else:
                outcome = "win" if survivors >= self.scenario.objective.min_survivors else "loss"

        ticks_elapsed = min(current_tick, max_ticks)
        survivors_count = sum(1 for p in self.player_team if p["hp"] > 0)

        final_outcome: Literal["win", "loss"] = outcome or "loss"
        return BattleRecord(
            battle_id=self.battle_id,
            scenario_id=self.scenario.id,
            seed=self.seed,
            engine_version="1.0.0",
            player_team=[p["id"] for p in self.player_team],
            personality=self.personality,
            outcome=final_outcome,
            ticks_elapsed=ticks_elapsed,
            survivors=survivors_count,
            coins_left=self.player_coins,
            source="simulated",
            events=self.events,
        )

    def _fire_hazards(self, tick: int) -> None:
        """Triggers any scheduled hazards for this tick."""
        for h in self.scenario.hazard_schedule:
            if h.tick == tick:
                damage = h.params.get("damage", 25)
                # Find targets in this hazard's lane
                targets = [c for c in (self.player_team + self.enemy_team) if c["lane"] == h.lane and c["hp"] > 0]
                for target in targets:
                    old_hp = target["hp"]
                    actual_damage = damage
                    if target.get("powerup") == "shield":
                        actual_damage = max(1, damage // 2)

                    target["hp"] = max(0, target["hp"] - actual_damage)
                    ko = target["hp"] == 0

                    status_applied = None
                    if h.params.get("burn") and target["hp"] > 0:
                        target["status"] = "burn"
                        target["status_timer"] = 3
                        status_applied = "burn"

                    self._add_event(
                        tick=tick,
                        actor=f"hazard:{h.type}",
                        action=f"Hazard {h.type.replace('_', ' ').title()} struck lane {h.lane}",
                        target=target["id"],
                        damage=actual_damage,
                        hp_before=old_hp,
                        hp_after=target["hp"],
                        hazard_hit=h.type,
                        status_change=status_applied,
                        ko=ko,
                        event_type="hazard",
                        lane=target["lane"],
                        tile=target["tile"],
                    )

    def _decrement_timers(self) -> None:
        """Decrements status and power-up durations."""
        for c in self.player_team + self.enemy_team:
            if c.get("powerup_timer", 0) > 0:
                c["powerup_timer"] -= 1
                if c["powerup_timer"] == 0:
                    c["powerup"] = None

            if c.get("status_timer", 0) > 0:
                c["status_timer"] -= 1
                if c["status_timer"] == 0:
                    c["status"] = None

    def _resolve_actor_turn(self, actor: Dict[str, Any], tick: int) -> None:
        """Resolves action for a single creature."""
        is_player = actor["is_player"]
        allies = self.player_team if is_player else self.enemy_team
        enemies = self.enemy_team if is_player else self.player_team
        coins = self.player_coins if is_player else self.enemy_coins

        # Check for Counterfactual intervention
        if (
            self.counterfactual
            and self.counterfactual.tick == tick
            and self.counterfactual.actor == actor["id"]
        ):
            self._apply_counterfactual_action(actor, tick)
            return

        # Determine active hazard lanes for AI safety checks
        hazard_lanes = [h.lane for h in self.scenario.hazard_schedule if h.tick == tick]

        decision_maker = self.player_ai if is_player else self.enemy_ai
        decision = decision_maker.choose_action(actor, allies, enemies, hazard_lanes, coins, self.rng)

        # Log AI Decision event
        if decision.get("options_considered"):
            self._add_event(
                tick=tick,
                actor=actor["id"],
                action=f"Decision for {actor['id']}: {decision.get('chosen_action')}",
                target=decision.get("target")["id"] if decision.get("target") else None,
                event_type="decision",
                lane=actor["lane"],
                tile=actor["tile"],
                hp_before=actor["hp"],
                hp_after=actor["hp"],
                options_considered=decision.get("options_considered"),
                chosen_action=decision.get("chosen_action"),
            )

        # Execute decision
        if decision["action_type"] == "move_lane" and decision["target_lane"] is not None:
            actor["lane"] = decision["target_lane"]
            self._add_event(
                tick=tick,
                actor=actor["id"],
                action=f"Switched to lane {actor['lane']}",
                target=None,
                event_type="info",
                hp_before=actor["hp"],
                hp_after=actor["hp"],
                lane=actor["lane"],
                tile=actor["tile"],
            )
        elif decision["action_type"] == "cast_move" and decision["move"] and decision["target"]:
            move: Move = decision["move"]
            target = decision["target"]
            cost = decision["cost"]

            if is_player:
                self.player_coins = max(0, self.player_coins - cost)
            else:
                self.enemy_coins = max(0, self.enemy_coins - cost)

            self._execute_move(actor, target, move, tick, is_player, cost)

        # Creature advances forward along the lane towards the goal / enemy
        if actor["hp"] > 0:
            if is_player and actor["tile"] < 7:
                actor["tile"] += 1
                self._check_tile_interactables(actor, tick)
            elif not is_player and actor["tile"] > 0:
                actor["tile"] -= 1

    def _apply_counterfactual_action(self, actor: Dict[str, Any], tick: int) -> None:
        """Injects custom counterfactual action overriding standard choice."""
        cf = self.counterfactual
        if not cf:
            return

        if cf.action_type == "move_lane" and cf.target_lane is not None:
            actor["lane"] = cf.target_lane
            self._add_event(
                tick=tick,
                actor=actor["id"],
                action=f"[Counterfactual] Diverted to lane {actor['lane']}",
                target=None,
                event_type="info",
                hp_before=actor["hp"],
                hp_after=actor["hp"],
                lane=actor["lane"],
                tile=actor["tile"],
            )
        elif cf.action_type == "early_heal" and cf.heal_amount:
            old_hp = actor["hp"]
            actor["hp"] = min(actor["max_hp"], actor["hp"] + cf.heal_amount)
            self._add_event(
                tick=tick,
                actor=actor["id"],
                action=f"[Counterfactual] Used Emergency Heal (+{cf.heal_amount} HP)",
                target=actor["id"],
                damage=-cf.heal_amount,
                hp_before=old_hp,
                hp_after=actor["hp"],
                status_change="healed",
                event_type="info",
                lane=actor["lane"],
                tile=actor["tile"],
            )
        elif cf.action_type == "cast_move" and cf.move_id and cf.move_id in BUILTIN_MOVES:
            move = BUILTIN_MOVES[cf.move_id]
            enemies = self.enemy_team if actor["is_player"] else self.player_team
            alive_enemies = [e for e in enemies if e["hp"] > 0]
            if alive_enemies:
                target = alive_enemies[0]
                self._execute_move(actor, target, move, tick, actor["is_player"], move.cost_coins)

    def _execute_move(
        self,
        actor: Dict[str, Any],
        target: Dict[str, Any],
        move: Move,
        tick: int,
        is_player: bool,
        coin_cost: int,
    ) -> None:
        """Executes a move from actor to target."""
        # Check accuracy
        if self.rng.next_float() > move.accuracy:
            self._add_event(
                tick=tick,
                actor=actor["id"],
                action=f"Used {move.name} (Missed!)",
                target=target["id"],
                event_type="move",
                damage=0,
                hp_before=target["hp"],
                hp_after=target["hp"],
                coin_change=-coin_cost if coin_cost > 0 else 0,
                lane=actor["lane"],
                tile=actor["tile"],
            )
            return

        if move.target_type == "self" or (move.effect == "shield" and move.power == 0):
            actor["powerup"] = "shield"
            actor["powerup_timer"] = 3
            self._add_event(
                tick=tick,
                actor=actor["id"],
                action=f"Activated {move.name} (Shield up)",
                target=actor["id"],
                status_change="shield",
                event_type="move",
                hp_before=actor["hp"],
                hp_after=actor["hp"],
                coin_change=-coin_cost if coin_cost > 0 else 0,
                lane=actor["lane"],
                tile=actor["tile"],
            )
            return

        if move.effect == "heal" and move.power == 0:
            old_hp = target["hp"]
            target["hp"] = min(target["max_hp"], target["hp"] + 35)
            self._add_event(
                tick=tick,
                actor=actor["id"],
                action=f"Casted {move.name} on {target['id']}",
                target=target["id"],
                damage=-35,
                hp_before=old_hp,
                hp_after=target["hp"],
                status_change="healed",
                event_type="move",
                coin_change=-coin_cost if coin_cost > 0 else 0,
                lane=actor["lane"],
                tile=actor["tile"],
            )
            return

        # Offensive move
        base_power = move.power * (actor["creature"].attack / 40.0)
        target_type_str = target["creature"].type.value if hasattr(target["creature"].type, "value") else str(target["creature"].type)
        move_type_str = move.type.value if hasattr(move.type, "value") else str(move.type)
        type_mult = TYPE_CHART.get(move_type_str, {}).get(target_type_str, 1.0)
        
        shield_mult = 0.5 if target.get("powerup") == "shield" else 1.0
        final_damage = max(5, int(base_power * type_mult * shield_mult))

        old_hp = target["hp"]
        target["hp"] = max(0, target["hp"] - final_damage)
        is_ko = target["hp"] == 0

        # Status effect application
        status_change = None
        if move.effect and self.rng.next_float() < move.effect_chance and target["hp"] > 0:
            target["status"] = move.effect
            target["status_timer"] = 3
            status_change = move.effect

        self._add_event(
            tick=tick,
            actor=actor["id"],
            action=f"Used {move.name} on {target['id']}",
            target=target["id"],
            damage=final_damage,
            hp_before=old_hp,
            hp_after=target["hp"],
            status_change=status_change,
            ko=is_ko,
            coin_change=-coin_cost if coin_cost > 0 else 0,
            event_type="move",
            lane=actor["lane"],
            tile=actor["tile"],
        )

    def _check_tile_interactables(self, actor: Dict[str, Any], tick: int) -> None:
        """Inspects tile for question blocks, coin caches, or warp pipes."""
        for tile in self.scenario.map:
            if tile.lane == actor["lane"] and tile.tile_index == actor["tile"]:
                if tile.tile_type == "question_block":
                    self.player_coins += 5
                    self._add_event(
                        tick=tick,
                        actor=actor["id"],
                        action="Hit Question Block (+5 coins)",
                        target=None,
                        pickup="question_block",
                        coin_change=5,
                        event_type="block",
                        hp_before=actor["hp"],
                        hp_after=actor["hp"],
                        lane=actor["lane"],
                        tile=actor["tile"],
                    )
                elif tile.tile_type == "coin_cache":
                    self.player_coins += 8
                    self._add_event(
                        tick=tick,
                        actor=actor["id"],
                        action="Collected Coin Cache (+8 coins)",
                        target=None,
                        pickup="coin_cache",
                        coin_change=8,
                        event_type="pickup",
                        hp_before=actor["hp"],
                        hp_after=actor["hp"],
                        lane=actor["lane"],
                        tile=actor["tile"],
                    )

    def _apply_status_effects(self, tick: int) -> None:
        """Applies ongoing burn or regen effects."""
        for c in self.player_team + self.enemy_team:
            if c["hp"] <= 0:
                continue

            if c.get("status") == "burn":
                burn_damage = 8
                old_hp = c["hp"]
                c["hp"] = max(0, c["hp"] - burn_damage)
                ko = c["hp"] == 0
                self._add_event(
                    tick=tick,
                    actor=c["id"],
                    action="Took Burn Damage",
                    target=c["id"],
                    damage=burn_damage,
                    hp_before=old_hp,
                    hp_after=c["hp"],
                    status_change="burn",
                    ko=ko,
                    event_type="status",
                    lane=c["lane"],
                    tile=c["tile"],
                )

    def _resolve_deaths(self, tick: int) -> None:
        """Verifies knockout states."""
        for c in self.player_team + self.enemy_team:
            if c["hp"] <= 0 and not c.get("marked_dead"):
                c["marked_dead"] = True
                self._add_event(
                    tick=tick,
                    actor=c["id"],
                    action=f"{c['id']} was knocked out!",
                    target=c["id"],
                    ko=True,
                    event_type="death",
                    hp_before=0,
                    hp_after=0,
                    lane=c["lane"],
                    tile=c["tile"],
                )

    def _check_objective_achieved(self) -> bool:
        """Checks if current state satisfies win condition."""
        obj = self.scenario.objective
        if obj.type == "reach_exit":
            at_exit = sum(1 for p in self.player_team if p["hp"] > 0 and p["tile"] >= 7)
            return at_exit >= obj.min_survivors
        elif obj.type == "defeat_all":
            return not any(e["hp"] > 0 for e in self.enemy_team)
        elif obj.type == "collect_coins":
            return self.player_coins >= obj.target_coins
        return False
