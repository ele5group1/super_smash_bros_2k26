"""Game balance auditing and parameter sensitivity sweeps for Scenario Author mode.

Pure calculation functions returning Pydantic models.
"""

from typing import Dict, List, Optional, Any
from app.engine.models import Scenario, Creature, BattleRecord
from app.engine.tick import TickEngine
from .models import (
    TeamBalanceEvaluationModel,
    BalancePacingModel,
    BalanceReportModel,
    SensitivitySweepPointModel,
    SensitivitySweepReportModel,
)


DEFAULT_ARCHETYPES = [
    {"name": "Balanced Duo", "team": ["ember_fox", "bubble_toad"]},
    {"name": "Heavy Strikers", "team": ["flame_salamander", "crag_golem"]},
    {"name": "Speed & Sustain", "team": ["volt_hedgehog", "moss_shroom"]},
    {"name": "Full Squad", "team": ["ember_fox", "bubble_toad", "moss_shroom", "crag_golem"]},
]


def balance_report(
    scenario: Scenario,
    standard_team_set: Optional[List[Dict[str, Any]]] = None,
    seed_count: int = 50,
    all_creatures_map: Optional[Dict[str, Creature]] = None,
    calibrate_with_battles: Optional[List[BattleRecord]] = None,
) -> BalanceReportModel:
    """
    Audits a scenario's game balance across standardized test squads.
    Computes overall win rate, pacing metrics, dominant strategies, and flags if outside 25%–75%.
    """
    archetypes = standard_team_set or DEFAULT_ARCHETYPES
    cmap = all_creatures_map or {}
    enemy_creatures = [cmap[cid] for cid in scenario.enemy_team if cid in cmap]

    evaluations: List[TeamBalanceEvaluationModel] = []
    total_wins = 0
    total_runs = 0
    total_ticks = 0
    timeouts = 0

    for arch in archetypes:
        name = arch.get("name", "Team")
        team_ids = arch.get("team", [])
        creatures = [cmap[cid] for cid in team_ids if cid in cmap]
        if not creatures:
            continue

        wins = 0
        arch_ticks = 0
        n = seed_count

        for i in range(n):
            eng = TickEngine(
                scenario=scenario,
                player_creatures=creatures,
                enemy_creatures=enemy_creatures,
                seed=4000 + i * 31,
            )
            res = eng.run()
            if res.outcome == "win":
                wins += 1
            if res.ticks_elapsed >= scenario.ticks:
                timeouts += 1
            arch_ticks += res.ticks_elapsed

        rate = wins / n
        total_wins += wins
        total_runs += n
        total_ticks += arch_ticks

        evaluations.append(
            TeamBalanceEvaluationModel(
                team_name=name,
                team=team_ids,
                win_rate_percent=round(rate * 100, 1),
                avg_ticks=round(arch_ticks / n, 1),
                dominant=False,
            )
        )

    overall_win_rate = total_wins / max(1, total_runs)
    avg_ticks = round(total_ticks / max(1, total_runs), 1)
    timeout_pct = round(timeouts / max(1, total_runs) * 100, 1)

    # Check for dominant strategies: team winning more than 20 points above average
    dominant_notes: List[str] = []
    has_dominant = False
    for ev in evaluations:
        if ev.win_rate_percent > (overall_win_rate * 100 + 20.0):
            ev.dominant = True
            has_dominant = True
            dominant_notes.append(
                f"Team '{ev.team_name}' outperforms the archetype average by "
                f"+{round(ev.win_rate_percent - overall_win_rate * 100, 1)}% (Dominant Strategy)."
            )

    # Balance target band: 25% - 75%
    is_balanced = 0.25 <= overall_win_rate <= 0.75
    flag_reason = None
    if overall_win_rate < 0.25:
        flag_reason = f"Scenario is too harsh: overall win rate is {round(overall_win_rate * 100, 1)}% (< 25% target band)."
    elif overall_win_rate > 0.75:
        flag_reason = f"Scenario is too lenient: overall win rate is {round(overall_win_rate * 100, 1)}% (> 75% target band)."

    pacing_rating = "balanced"
    if timeout_pct > 30.0:
        pacing_rating = "prolonged"
    elif avg_ticks < scenario.ticks * 0.35:
        pacing_rating = "fast"

    pacing_model = BalancePacingModel(
        avg_ticks=avg_ticks,
        max_ticks=scenario.ticks,
        timeout_percent=timeout_pct,
        pacing_rating=pacing_rating,
    )

    return BalanceReportModel(
        scenario_id=scenario.id,
        scenario_name=scenario.name,
        overall_win_rate_percent=round(overall_win_rate * 100, 1),
        target_band="25% - 75%",
        is_balanced=is_balanced,
        balance_flag=flag_reason,
        dominant_strategies_detected=has_dominant,
        dominant_strategy_notes=dominant_notes,
        pacing=pacing_model,
        teams_evaluated=evaluations,
    )


def sensitivity_sweep(
    scenario: Scenario,
    parameter: str,
    values: List[Any],
    seed_count: int = 30,
    all_creatures_map: Optional[Dict[str, Creature]] = None,
) -> SensitivitySweepReportModel:
    """
    Reruns balance evaluations across a range of values for a given parameter.
    Supported parameters: 'ticks', 'starting_coins', 'hazard_damage'.
    """
    points: List[SensitivitySweepPointModel] = []
    balanced_values = []

    for val in values:
        # Create modified scenario copy
        modified_scenario = scenario.model_copy(deep=True)
        if parameter == "ticks":
            modified_scenario.ticks = int(val)
        elif parameter == "starting_coins":
            modified_scenario.starting_resources["coins"] = int(val)
        elif parameter == "hazard_damage":
            for h in modified_scenario.hazard_schedule:
                h.params["damage"] = int(val)

        rep = balance_report(
            scenario=modified_scenario,
            seed_count=seed_count,
            all_creatures_map=all_creatures_map,
        )

        win_rate = rep.overall_win_rate_percent / 100.0
        if rep.is_balanced:
            balanced_values.append(val)

        points.append(
            SensitivitySweepPointModel(
                parameter_value=val,
                win_rate=round(win_rate, 4),
                win_rate_percent=rep.overall_win_rate_percent,
                is_balanced=rep.is_balanced,
            )
        )

    opt_range = (
        f"{min(balanced_values)} to {max(balanced_values)}"
        if balanced_values
        else "No evaluated values produced a win rate inside the 25%–75% band."
    )

    return SensitivitySweepReportModel(
        scenario_id=scenario.id,
        parameter=parameter,
        values=values,
        points=points,
        optimal_range=opt_range,
    )
