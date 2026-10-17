"""Diagnostic analytics: root-cause tracing for defeats and counterfactual reruns."""

from typing import Dict, List, Any, Optional
from app.engine.models import BattleRecord, Scenario, Creature, CounterfactualRequest
from app.engine.tick import TickEngine


def trace_defeat_causes(battle: BattleRecord) -> Dict[str, Any]:
    """
    Analyzes an event log for a defeat and constructs a root-cause trace
    walking backward from the loss to the pivotal turning points.
    """
    if battle.outcome != "loss":
        return {
            "is_defeat": False,
            "root_cause": None,
            "turning_points": [],
            "summary": "Battle resulted in victory; no defeat cause to trace.",
        }

    turning_points: List[Dict[str, Any]] = []
    player_team_set = set(battle.player_team)

    # Walk events backwards
    first_player_ko_tick: Optional[int] = None
    lethal_hazards: List[Dict[str, Any]] = []
    heavy_strikes: List[Dict[str, Any]] = []
    coin_depletion_tick: Optional[int] = None

    running_coins = 20
    for ev in battle.events:
        running_coins += ev.coin_change
        if running_coins <= 0 and coin_depletion_tick is None:
            coin_depletion_tick = ev.tick

        if ev.target in player_team_set:
            if ev.ko and first_player_ko_tick is None:
                first_player_ko_tick = ev.tick

            if ev.hazard_hit:
                lethal_hazards.append({
                    "tick": ev.tick,
                    "target": ev.target,
                    "hazard": ev.hazard_hit,
                    "damage": ev.damage,
                    "desc": f"Hazard '{ev.hazard_hit}' struck {ev.target} for {ev.damage} dmg",
                })
            elif ev.damage >= 30:
                heavy_strikes.append({
                    "tick": ev.tick,
                    "actor": ev.actor,
                    "target": ev.target,
                    "damage": ev.damage,
                    "desc": f"Heavy strike by {ev.actor} against {ev.target} dealing {ev.damage} dmg",
                })

    # Determine primary root cause
    root_cause = "attrition"
    explanation = "Gradual attrition across extended ticks depleted team HP."

    if lethal_hazards:
        root_cause = "hazard_vulnerability"
        haz = lethal_hazards[0]
        explanation = (
            f"At tick {haz['tick']}, {haz['target']} suffered fatal damage from {haz['hazard']}, "
            f"shifting the combat advantage irrevocably."
        )
        turning_points.append({
            "tick": haz["tick"],
            "category": "hazard",
            "title": f"Lethal Hazard Hit ({haz['hazard']})",
            "description": haz["desc"],
        })
    elif heavy_strikes:
        root_cause = "heavy_damage"
        strike = heavy_strikes[0]
        explanation = (
            f"At tick {strike['tick']}, enemy {strike['actor']} landed a massive {strike['damage']} damage hit "
            f"on {strike['target']}."
        )
        turning_points.append({
            "tick": strike["tick"],
            "category": "enemy_burst",
            "title": "Enemy Power Spike",
            "description": strike["desc"],
        })

    if coin_depletion_tick is not None and coin_depletion_tick <= 15:
        turning_points.append({
            "tick": coin_depletion_tick,
            "category": "economy",
            "title": "Early Coin Depletion",
            "description": f"Team exhausted coin reserves at tick {coin_depletion_tick}, disabling tactical moves.",
        })

    if first_player_ko_tick is not None:
        turning_points.append({
            "tick": first_player_ko_tick,
            "category": "casualty",
            "title": "First Casualty",
            "description": f"First allied creature fell at tick {first_player_ko_tick}.",
        })

    # Sort turning points chronologically
    turning_points.sort(key=lambda p: p["tick"])

    return {
        "is_defeat": True,
        "root_cause": root_cause,
        "explanation": explanation,
        "turning_points": turning_points,
        "recommendation": (
            "Consider holding coins for power-up blocks or repositioning out of danger lanes prior to tick 10."
            if root_cause == "hazard_vulnerability"
            else "Add a creature with defensive shields or high type advantage to absorb burst damage."
        ),
    }


def run_counterfactual_battle(
    original_battle: BattleRecord,
    scenario: Scenario,
    player_creatures: List[Creature],
    enemy_creatures: List[Creature],
    cf_request: CounterfactualRequest,
) -> Dict[str, Any]:
    """Reruns the battle using the identical seed with one modified decision and computes diffs."""
    engine = TickEngine(
        scenario=scenario,
        player_creatures=player_creatures,
        enemy_creatures=enemy_creatures,
        seed=original_battle.seed,
        personality=original_battle.personality,
        counterfactual=cf_request,
    )
    new_battle = engine.run()

    # Compare outcomes
    outcome_changed = original_battle.outcome != new_battle.outcome
    survivors_diff = new_battle.survivors - original_battle.survivors
    ticks_diff = new_battle.ticks_elapsed - original_battle.ticks_elapsed
    coins_diff = new_battle.coins_left - original_battle.coins_left

    # Find first differing tick
    first_diff_tick: Optional[int] = None
    min_ev = min(len(original_battle.events), len(new_battle.events))
    for i in range(min_ev):
        e1 = original_battle.events[i]
        e2 = new_battle.events[i]
        if (
            e1.tick != e2.tick
            or e1.actor != e2.actor
            or e1.action != e2.action
            or e1.damage != e2.damage
            or e1.hp_after != e2.hp_after
        ):
            first_diff_tick = e2.tick
            break

    if first_diff_tick is None and len(original_battle.events) != len(new_battle.events):
        first_diff_tick = cf_request.tick

    return {
        "original_outcome": original_battle.outcome,
        "new_outcome": new_battle.outcome,
        "outcome_changed": outcome_changed,
        "survivors_diff": survivors_diff,
        "ticks_diff": ticks_diff,
        "coins_diff": coins_diff,
        "first_differing_tick": first_diff_tick or cf_request.tick,
        "new_battle": new_battle,
    }
