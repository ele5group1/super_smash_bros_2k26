"""Predictive analytics: Monte Carlo simulations, Wilson & Normal confidence intervals, calibration, and state predictions.

Each calculation function is pure and does not access the database directly.
"""

import math
from typing import Dict, List, Optional, Any, Tuple
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
) -> Tuple[float, float, float, str]:
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
) -> WinRatePredictionModel:
    """
    Runs seed_count deterministic battles with seeds base_seed + i.
    Returns win rate, 95% interval (Normal or Wilson), survivor distribution,
    average coins, and calibrated empirical comparison if uploaded battles provided.
    """
    team_ids = tuple(sorted([c.id for c in team]))
    cache_key = (scenario.id, team_ids, seed_count, base_seed, include_mismatched)

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
            if sorted(b.player_team) == sorted([c.id for c in team]):
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
        _PREDICTION_CACHE[cache_key] = result

    return result


def predict_from_state(
    state: Dict[str, Any],
    scenario: Scenario,
    all_known_creatures: Dict[str, Creature],
    seed_count: int = 100,
    base_seed: int = 2000,
) -> StatePredictionModel:
    """
    Given a mid-battle state, runs Monte Carlo predictions from that state forward.
    STRICTLY ONLY uses information the player could see on screen:
    - current_tick
    - visible player creature HPs
    - visible player coins
    - visible alive enemy creatures
    Does NOT read hidden enemy AI decision scores or hidden boss plans.
    """
    current_tick = state.get("current_tick", 1)
    player_creature_ids = state.get("player_team", [])
    creature_hps = state.get("creature_hps", {})

    player_creatures: List[Creature] = []
    for cid in player_creature_ids:
        if cid in all_known_creatures:
            c = all_known_creatures[cid]
            # Copy with remaining visible HP
            rem_hp = creature_hps.get(cid, c.hp)
            if rem_hp > 0:
                player_creatures.append(c.model_copy(update={"hp": rem_hp}))

    # Visible enemies
    visible_enemies: List[Creature] = []
    for eid in scenario.enemy_team:
        if eid in all_known_creatures:
            e = all_known_creatures[eid]
            e_rem_hp = creature_hps.get(eid, e.hp)
            if e_rem_hp > 0:
                visible_enemies.append(e.model_copy(update={"hp": e_rem_hp}))

    if not player_creatures:
        return StatePredictionModel(
            current_tick=current_tick,
            seed_count=seed_count,
            predicted_win_rate=0.0,
            predicted_win_rate_percent=0.0,
            confidence_interval_95=0.0,
            ci_lower=0.0,
            ci_upper=0.0,
            visible_allies_alive=0,
            visible_enemies_alive=len(visible_enemies),
        )

    # Run simulations from mid-battle state forward
    wins = 0
    for i in range(seed_count):
        eng = TickEngine(
            scenario=scenario,
            player_creatures=player_creatures,
            enemy_creatures=visible_enemies,
            seed=base_seed + i,
        )
        res = eng.run()
        if res.outcome == "win":
            wins += 1

    rate = wins / seed_count
    ci_half, ci_lower, ci_upper, _ = compute_confidence_interval(wins, seed_count)

    return StatePredictionModel(
        current_tick=current_tick,
        seed_count=seed_count,
        predicted_win_rate=round(rate, 4),
        predicted_win_rate_percent=round(rate * 100, 1),
        confidence_interval_95=round(ci_half * 100, 2),
        ci_lower=round(ci_lower * 100, 1),
        ci_upper=round(ci_upper * 100, 1),
        visible_allies_alive=len(player_creatures),
        visible_enemies_alive=len(visible_enemies),
    )


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
