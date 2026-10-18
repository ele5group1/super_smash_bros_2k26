"""Predictive analytics: Monte Carlo simulations, Wilson & Normal confidence intervals, calibration, and state predictions.

Each calculation function is pure and does not access the database directly.
"""

import math
from typing import Dict, List, Optional, Any, Tuple, Literal
from app.engine.models import Scenario, Creature, BattleRecord
from app.engine.tick import TickEngine
from .models import (
    WinRatePredictionModel,
    CalibrationModel,
    StatePredictionModel,
)

# In-memory prediction cache keyed by (scenario_id, team_tuple, seed_count, base_seed)
_PREDICTION_CACHE: Dict[Tuple, WinRatePredictionModel] = {}
_BATCH_JOBS: Dict[str, Dict[str, Any]] = {}


def compute_confidence_interval(
    wins: int,
    n: int,
    confidence_level: float = 0.95,
) -> Tuple[float, float, float, Literal["normal", "wilson"]]:
    """
    Computes a 95% confidence interval for a proportion.
    Uses Normal approximation when p is well within (0.05, 0.95) and n*p >= 5.
    Uses the Wilson score interval when near 0 or 1.
    Returns: (half_width, lower_bound, upper_bound, method)
    """
    if n <= 0:
        return 0.0, 0.0, 0.0, "normal"

    p = wins / n
    z = 1.96  # 95% confidence

    # Use Wilson score when near 0 or 1 or small expected successes
    use_wilson = p <= 0.05 or p >= 0.95 or (n * p < 5) or (n * (1 - p) < 5)

    if use_wilson:
        denominator = 1.0 + (z ** 2) / n
        center = (p + (z ** 2) / (2 * n)) / denominator
        half_width = (z / denominator) * math.sqrt((p * (1.0 - p) / n) + ((z ** 2) / (4 * (n ** 2))))
        lower = max(0.0, center - half_width)
        upper = min(1.0, center + half_width)
        return round(half_width, 4), round(lower, 4), round(upper, 4), "wilson"
    else:
        half_width = z * math.sqrt((p * (1.0 - p)) / n)
        lower = max(0.0, p - half_width)
        upper = min(1.0, p + half_width)
        return round(half_width, 4), round(lower, 4), round(upper, 4), "normal"


def predict_win_rate(
    scenario: Scenario,
    team: List[Creature],
    seed_count: int = 300,
    base_seed: int = 1000,
    enemy_creatures: Optional[List[Creature]] = None,
    calibrate_with_battles: Optional[List[BattleRecord]] = None,
    include_mismatched: bool = False,
    mismatched_battle_ids: Optional[set] = None,
    early_heal_spend: int = 0,
    personality: Literal["aggressive", "defensive", "opportunistic"] = "opportunistic",
) -> WinRatePredictionModel:
    """
    Runs seed_count deterministic battles with seeds base_seed + i.
    Returns win rate, 95% interval (Normal or Wilson), survivor distribution,
    average coins, and calibrated empirical comparison if uploaded battles provided.
    """
    cache_key = (scenario.model_dump_json(),
                 tuple(c.model_dump_json() for c in team),
                 tuple(c.model_dump_json() for c in (enemy_creatures or [])),
                 seed_count, base_seed, early_heal_spend, personality)

    if cache_key in _PREDICTION_CACHE and calibrate_with_battles is None:
        return _PREDICTION_CACHE[cache_key]

    enemies = enemy_creatures or []
    wins = 0
    survivor_dist = [0, 0, 0, 0, 0]
    total_coins = 0
    total_ticks = 0

    for i in range(seed_count):
        s = base_seed + i
        engine = TickEngine(
            scenario=scenario,
            player_creatures=team,
            enemy_creatures=enemies,
            seed=s,
            early_heal_spend=early_heal_spend,
            personality=personality,
        )
        res = engine.run()
        if res.outcome == "win":
            wins += 1

        survivors_idx = min(4, max(0, res.survivors))
        survivor_dist[survivors_idx] += 1
        total_coins += res.coins_left
        total_ticks += res.ticks_elapsed

    win_rate = wins / seed_count
    ci_half, ci_lower, ci_upper, method = compute_confidence_interval(wins, seed_count)

    # Calibration logic
    calibration_model: Optional[CalibrationModel] = None
    if calibrate_with_battles is not None:
        mismatched_ids = mismatched_battle_ids or set()
        valid_uploaded: List[BattleRecord] = []
        excluded_count = 0

        for b in calibrate_with_battles:
            if (b.player_team == [c.id for c in team] and b.scenario_id == scenario.id
                    and b.metadata.get("early_heal_spend", 0) == early_heal_spend
                    and b.personality == personality):
                if b.battle_id in mismatched_ids and not include_mismatched:
                    excluded_count += 1
                else:
                    valid_uploaded.append(b)

        if valid_uploaded:
            up_total = len(valid_uploaded)
            up_wins = sum(1 for b in valid_uploaded if b.outcome == "win")
            up_rate = up_wins / up_total
            up_ci, _, _, _ = compute_confidence_interval(up_wins, up_total)
            gap = round(win_rate - up_rate, 4)
            combined_width = ci_half + up_ci
            gap_exceeds = abs(gap) > combined_width

            note = (
                f"Simulated rate is {abs(round(gap * 100, 1))}% "
                + ("higher" if gap > 0 else "lower")
                + f" than uploaded empirical rate ({round(up_rate * 100, 1)}%)."
            )
            if gap_exceeds:
                note += " Discrepancy exceeds combined 95% confidence interval width!"

            calibration_model = CalibrationModel(
                upload_id=valid_uploaded[0].source if valid_uploaded else None,
                simulated_win_rate=round(win_rate, 4),
                simulated_win_rate_percent=round(win_rate * 100, 1),
                simulated_interval=round(ci_half * 100, 2),
                uploaded_win_rate=round(up_rate, 4),
                uploaded_win_rate_percent=round(up_rate * 100, 1),
                uploaded_interval=round(up_ci * 100, 2),
                gap=gap,
                gap_percent=round(gap * 100, 1),
                gap_exceeds_interval=gap_exceeds,
                uploaded_samples=up_total,
                mismatched_samples_excluded=excluded_count,
                note=note,
            )
        else:
            calibration_model = CalibrationModel(
                simulated_win_rate=round(win_rate, 4),
                simulated_win_rate_percent=round(win_rate * 100, 1),
                simulated_interval=round(ci_half * 100, 2),
                uploaded_win_rate=None,
                uploaded_win_rate_percent=None,
                gap=None,
                gap_percent=None,
                gap_exceeds_interval=False,
                uploaded_samples=0,
                mismatched_samples_excluded=excluded_count,
                note="No matching uploaded battles found for this scenario and squad.",
            )

    result = WinRatePredictionModel(
        scenario_id=scenario.id,
        team=[c.id for c in team],
        seed_count=seed_count,
        base_seed=base_seed,
        win_rate=round(win_rate, 4),
        win_rate_percent=round(win_rate * 100, 1),
        confidence_interval_95=round(ci_half * 100, 2),
        confidence_interval_percent=round(ci_half * 100, 2),
        interval_method=method,
        ci_lower=round(ci_lower * 100, 1),
        ci_upper=round(ci_upper * 100, 1),
        survivor_distribution=survivor_dist,
        survivor_distribution_percent=[round(s / seed_count * 100, 1) for s in survivor_dist],
        avg_coins_left=round(total_coins / seed_count, 1),
        avg_ticks=round(total_ticks / seed_count, 1),
        calibration=calibration_model,
    )

    if calibrate_with_battles is None:
        if len(_PREDICTION_CACHE) >= 128:
            _PREDICTION_CACHE.pop(next(iter(_PREDICTION_CACHE)))
        _PREDICTION_CACHE[cache_key] = result

    return result


def predict_from_state(
    state: Dict[str, Any],
    scenario: Scenario,
    all_known_creatures: Dict[str, Creature],
    seed_count: int = 100,
    base_seed: int = 2000,
) -> StatePredictionModel:
    """Compatibility entry point restricted to complete pre-battle configurations."""
    if (state.get("current_tick", 1) != 1 or state.get("creature_hps")
            or state.get("coins", scenario.starting_coins) != scenario.starting_coins):
        raise ValueError("Only pre-battle predictions are supported; incomplete state cannot be resumed")
    ids = state.get("player_team", [])
    if not ids or any(cid not in all_known_creatures for cid in ids):
        raise ValueError("Choose a known pre-battle squad")
    team = [all_known_creatures[cid] for cid in ids]
    enemies = [all_known_creatures[cid] for cid in scenario.enemy_team]
    pred = predict_win_rate(scenario, team, seed_count=seed_count, base_seed=base_seed, enemy_creatures=enemies)
    return StatePredictionModel(current_tick=1, seed_count=seed_count,
        predicted_win_rate=pred.win_rate, predicted_win_rate_percent=pred.win_rate_percent,
        confidence_interval_95=pred.confidence_interval_95, ci_lower=pred.ci_lower, ci_upper=pred.ci_upper,
        visible_allies_alive=len(team), visible_enemies_alive=len(enemies))


# --- Backward Compatible Wrappers ---

def run_monte_carlo_prediction(
    scenario: Scenario,
    player_creatures: List[Creature],
    enemy_creatures: List[Creature],
    seed_count: int = 300,
    calibrate_with_upload_id: Optional[str] = None,
    job_id: Optional[str] = None,
) -> Dict[str, Any]:
    pred = predict_win_rate(
        scenario=scenario,
        team=player_creatures,
        seed_count=seed_count,
        base_seed=1000,
        enemy_creatures=enemy_creatures,
    )
    res = pred.model_dump()
    if job_id:
        _BATCH_JOBS[job_id] = {"progress": 1.0, "status": "completed", "result": res}
    return res


def get_job_progress(job_id: str) -> Optional[Dict[str, Any]]:
    return _BATCH_JOBS.get(job_id)


def set_job_progress(job_id: str, progress: float, status: str = "running", result: Any = None, error: Any = None):
    _BATCH_JOBS[job_id] = {"progress": progress, "status": status, "result": result, "error": error}
