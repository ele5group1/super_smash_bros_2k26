"""Diagnostic analytics: root-cause tracing, aggregate loss categorization, decision auditing, and counterfactual simulation.

Each function is pure: it takes event logs or BattleRecords and returns Pydantic models,
with no database access inside the calculation.
"""

from typing import Dict, List, Optional, Any
from app.engine.models import BattleRecord, Scenario, Creature, CounterfactualRequest, Event
from app.engine.tick import TickEngine
from .models import (
    CauseTraceEventModel,
    CauseTraceModel,
    LossCauseShareModel,
    LossCausesReportModel,
    DecisionAuditItemModel,
    DecisionAuditReportModel,
    CauseTraceDiffModel,
    CounterfactualResponseModel,
)


def cause_trace(battle: BattleRecord) -> CauseTraceModel:
    """
    Analyzes an event log for a defeat and constructs a root-cause trace
    walking backward from the loss to the pivotal turning points.
    """
    if battle.outcome != "loss":
        return CauseTraceModel(
            battle_id=battle.battle_id,
            is_defeat=False,
            earliest_pivotal_tick=None,
            root_cause=None,
            explanation="Battle resulted in victory; no defeat cause to trace.",
            events=[],
        )

    turning_points: List[CauseTraceEventModel] = []
    player_team_set = set(battle.player_team)

    lethal_hazards: List[Dict[str, Any]] = []
    heavy_strikes: List[Dict[str, Any]] = []
    first_player_ko_tick: Optional[int] = None
    first_ko_actor: Optional[str] = None
    first_ko_target: Optional[str] = None
    coin_depletion_tick: Optional[int] = None

    for ev in battle.events:
        if ev.coin_after <= 0 and coin_depletion_tick is None and ev.coin_change < 0:
            coin_depletion_tick = ev.tick

        if ev.target in player_team_set:
            if ev.ko and first_player_ko_tick is None:
                first_player_ko_tick = ev.tick
                first_ko_actor = ev.actor
                first_ko_target = ev.target

            if ev.hazard_hit:
                lethal_hazards.append({
                    "tick": ev.tick,
                    "target": ev.target,
                    "hazard": ev.hazard_hit,
                    "damage": ev.damage,
                    "desc": f"Map hazard '{ev.hazard_hit}' struck {ev.target} dealing {ev.damage} damage.",
                })
            elif ev.damage >= 30:
                heavy_strikes.append({
                    "tick": ev.tick,
                    "actor": ev.actor,
                    "target": ev.target,
                    "damage": ev.damage,
                    "desc": f"Heavy strike by enemy {ev.actor} hit {ev.target} for {ev.damage} damage.",
                })

    root_cause = "attrition"
    earliest_tick = battle.ticks_elapsed
    explanation = f"Defeat occurred at tick {battle.ticks_elapsed} due to sustained attrition across combat rounds."

    if lethal_hazards:
        h = lethal_hazards[0]
        root_cause = "hazard_vulnerability"
        earliest_tick = h["tick"]
        explanation = f"Pivotal loss caused by fatal hazard exposure: {h['target']} was devastated by {h['hazard']} at tick {h['tick']}."
        turning_points.append(
            CauseTraceEventModel(
                tick=h["tick"],
                event_id=f"haz_{h['tick']}_{h['target']}",
                category="hazard",
                description=h["desc"],
                target=h["target"],
                damage=h["damage"],
            )
        )
    elif heavy_strikes:
        s = heavy_strikes[0]
        root_cause = "burst_damage"
        earliest_tick = s["tick"]
        explanation = f"Critical loss triggered by enemy damage burst: {s['actor']} landed a massive {s['damage']} damage hit on {s['target']} at tick {s['tick']}."
        turning_points.append(
            CauseTraceEventModel(
                tick=s["tick"],
                event_id=f"burst_{s['tick']}_{s['target']}",
                category="burst_damage",
                description=s["desc"],
                target=s["target"],
                damage=s["damage"],
            )
        )

    if coin_depletion_tick is not None and coin_depletion_tick <= 15:
        turning_points.append(
            CauseTraceEventModel(
                tick=coin_depletion_tick,
                event_id=f"econ_{coin_depletion_tick}",
                category="economy",
                description=f"Coin reserves completely exhausted at tick {coin_depletion_tick}, disabling emergency support moves.",
            )
        )
        if coin_depletion_tick < earliest_tick:
            earliest_tick = coin_depletion_tick

    if first_player_ko_tick is not None:
        turning_points.append(
            CauseTraceEventModel(
                tick=first_player_ko_tick,
                event_id=f"ko_{first_player_ko_tick}_{first_ko_target}",
                category="casualty",
                description=f"First allied casualty: {first_ko_target} was knocked out by {first_ko_actor or 'damage'} at tick {first_player_ko_tick}.",
                target=first_ko_target,
            )
        )
        if first_player_ko_tick < earliest_tick:
            earliest_tick = first_player_ko_tick

    turning_points.sort(key=lambda p: p.tick)

    return CauseTraceModel(
        battle_id=battle.battle_id,
        is_defeat=True,
        earliest_pivotal_tick=earliest_tick,
        root_cause=root_cause,
        explanation=explanation,
        events=turning_points,
    )


def loss_causes(
    battles: List[BattleRecord],
    scenario_id: Optional[str] = None,
    source: str = "both",
) -> LossCausesReportModel:
    """
    Ranks causes of defeat across a set of loss records:
    - hazard_damage: heavy or fatal hazard strikes
    - healing_spent_early: coin reserves spent on early heals before pivotal hit
    - coins_never_used: team lost while holding substantial unspent coins (>= 10 coins)
    - single_hazard_wipe: multiple allies taken down by a single hazard tick
    - type_disadvantage: disproportionate damage taken from super-effective elemental attacks
    """
    loss_battles = [b for b in battles if b.outcome == "loss"]
    total = len(loss_battles)

    if total == 0:
        return LossCausesReportModel(
            scenario_id=scenario_id,
            source=source,
            total_losses_analyzed=0,
            causes=[],
            primary_cause=None,
        )

    cause_counts = {
        "hazard_damage": 0,
        "healing_spent_early": 0,
        "coins_never_used": 0,
        "single_hazard_wipe": 0,
        "type_disadvantage": 0,
    }

    for b in loss_battles:
        player_set = set(b.player_team)
        has_hazard = False
        hazard_kos = 0
        has_early_heal = False
        has_type_disadvantage = False

        for ev in b.events:
            if ev.target in player_set:
                if ev.hazard_hit:
                    has_hazard = True
                    if ev.ko:
                        hazard_kos += 1
                if "Early Heal" in ev.action or (ev.status_change == "healed" and ev.tick <= 5):
                    has_early_heal = True
                if ev.damage >= 35:
                    has_type_disadvantage = True

        if hazard_kos >= 2:
            cause_counts["single_hazard_wipe"] += 1
        elif has_hazard:
            cause_counts["hazard_damage"] += 1
        elif has_type_disadvantage:
            cause_counts["type_disadvantage"] += 1
        elif b.coins_left >= 10:
            cause_counts["coins_never_used"] += 1
        elif has_early_heal:
            cause_counts["healing_spent_early"] += 1
        else:
            cause_counts["hazard_damage"] += 1

    descriptions = {
        "hazard_damage": "Direct environmental and hazard zone damage compromised HP pools.",
        "single_hazard_wipe": "Catastrophic hazard event incapacitated multiple allies in one tick.",
        "type_disadvantage": "Elemental weaknesses exploited by heavy opposing damage strikes.",
        "coins_never_used": "Squad was defeated while retaining significant unspent coin reserves (>= 10 coins).",
        "healing_spent_early": "Coin investment in early healing depleted reserves before decisive end-game turns.",
    }

    shares: List[LossCauseShareModel] = []
    for c_name, count in sorted(cause_counts.items(), key=lambda x: x[1], reverse=True):
        shares.append(
            LossCauseShareModel(
                cause=c_name,
                count=count,
                share_percent=round(count / total * 100, 1),
                description=descriptions.get(c_name, ""),
            )
        )

    primary = shares[0].cause if shares and shares[0].count > 0 else None

    return LossCausesReportModel(
        scenario_id=scenario_id,
        source=source,
        total_losses_analyzed=total,
        causes=shares,
        primary_cause=primary,
    )


def decision_audit(battle: BattleRecord, threshold: float = 0.15) -> DecisionAuditReportModel:
    """
    Compares the chosen action's score to the best option's score for every decision event.
    Flags decisions where the gap exceeds the threshold (default 0.15).
    """
    flagged_decisions: List[DecisionAuditItemModel] = []
    total_decisions = 0

    for ev in battle.events:
        if ev.event_type == "decision" and ev.options_considered:
            total_decisions += 1
            best_opt = max(ev.options_considered, key=lambda o: o.get("score", 0.0))
            best_score = float(best_opt.get("score", 0.0))
            best_action = str(best_opt.get("action", ""))

            # Find score of chosen action
            chosen_action = ev.chosen_action or ev.action
            chosen_opt = next((o for o in ev.options_considered if o.get("action") == chosen_action), None)
            chosen_score = float(chosen_opt.get("score", 0.0)) if chosen_opt else (
                float(ev.options_considered[0].get("score", 0.0))
            )

            gap = round(best_score - chosen_score, 3)

            is_flagged = gap > threshold
            if is_flagged:
                flagged_decisions.append(
                    DecisionAuditItemModel(
                        tick=ev.tick,
                        actor=ev.actor or "actor",
                        chosen_action=chosen_action,
                        chosen_score=round(chosen_score, 2),
                        best_action=best_action,
                        best_score=round(best_score, 2),
                        score_gap=gap,
                        flagged=True,
                        options_considered=ev.options_considered,
                    )
                )

    flagged_decisions.sort(key=lambda d: d.tick)

    return DecisionAuditReportModel(
        battle_id=battle.battle_id,
        threshold=threshold,
        total_decisions=total_decisions,
        flagged_decisions_count=len(flagged_decisions),
        decisions=flagged_decisions,
    )


def counterfactual(
    battle: BattleRecord,
    change: CounterfactualRequest,
    scenario: Scenario,
    player_creatures: List[Creature],
    enemy_creatures: List[Creature],
) -> CounterfactualResponseModel:
    """
    Reruns the exact battle seed with one changed decision and computes diffs,
    including the first divergent tick and cause-trace shift.
    """
    engine = TickEngine(
        scenario=scenario,
        player_creatures=player_creatures,
        enemy_creatures=enemy_creatures,
        seed=battle.seed,
        personality=battle.personality,
        counterfactual=change,
    )
    new_battle = engine.run()

    # Find first divergent tick
    first_diff_tick: Optional[int] = None
    min_len = min(len(battle.events), len(new_battle.events))
    for i in range(min_len):
        e1 = battle.events[i]
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

    if first_diff_tick is None and len(battle.events) != len(new_battle.events):
        first_diff_tick = new_battle.events[min_len - 1].tick if min_len > 0 else 1

    # Compute cause-trace diff if applicable
    orig_trace = cause_trace(battle)
    new_trace = cause_trace(new_battle)

    cause_diff = None
    if orig_trace.is_defeat or new_trace.is_defeat:
        explanation = (
            f"Intervention at tick {change.tick} shifted combat outcome from {battle.outcome.upper()} to {new_battle.outcome.upper()}."
            if battle.outcome != new_battle.outcome
            else f"Intervention altered combat pacing by {new_battle.ticks_elapsed - battle.ticks_elapsed} ticks without changing the overall outcome."
        )
        cause_diff = CauseTraceDiffModel(
            original_pivotal_tick=orig_trace.earliest_pivotal_tick,
            new_pivotal_tick=new_trace.earliest_pivotal_tick,
            original_cause=orig_trace.root_cause,
            new_cause=new_trace.root_cause,
            explanation=explanation,
        )

    return CounterfactualResponseModel(
        original_battle_id=battle.battle_id,
        new_battle_id=new_battle.battle_id,
        seed=battle.seed,
        outcome_changed=battle.outcome != new_battle.outcome,
        original_outcome=battle.outcome,
        new_outcome=new_battle.outcome,
        first_divergent_tick=first_diff_tick,
        ticks_diff=new_battle.ticks_elapsed - battle.ticks_elapsed,
        survivors_diff=new_battle.survivors - battle.survivors,
        coins_diff=new_battle.coins_left - battle.coins_left,
        cause_trace_diff=cause_diff,
    )


# --- Backward Compatible Wrapper for existing screens ---

def trace_defeat_causes(battle: BattleRecord) -> Dict[str, Any]:
    trace = cause_trace(battle)
    return {
        "is_defeat": trace.is_defeat,
        "root_cause": trace.root_cause,
        "explanation": trace.explanation,
        "turning_points": [
            {
                "tick": ev.tick,
                "category": ev.category,
                "title": ev.description.split(":")[0] if ":" in ev.description else ev.category.title(),
                "description": ev.description,
            }
            for ev in trace.events
        ],
        "recommendation": (
            "Consider repositioning out of danger lanes or reserving coins for shields."
            if trace.root_cause == "hazard_vulnerability"
            else "Add a creature with defensive shields or high elemental advantage."
        ),
    }


def run_counterfactual_battle(
    original_battle: BattleRecord,
    scenario: Scenario,
    player_creatures: List[Creature],
    enemy_creatures: List[Creature],
    cf_request: CounterfactualRequest,
) -> Dict[str, Any]:
    resp = counterfactual(original_battle, cf_request, scenario, player_creatures, enemy_creatures)
    return {
        "outcome_changed": resp.outcome_changed,
        "original_outcome": resp.original_outcome,
        "new_outcome": resp.new_outcome,
        "first_diff_tick": resp.first_divergent_tick,
        "survivors_diff": resp.survivors_diff,
        "ticks_diff": resp.ticks_diff,
        "coins_diff": resp.coins_diff,
        "cause_trace_diff": resp.cause_trace_diff.model_dump() if resp.cause_trace_diff else None,
    }
