"""Predictive analytics: Monte Carlo simulation with confidence intervals and calibration."""

import math
from typing import Dict, List, Optional, Any, Tuple
from app.engine.models import Scenario, Creature
from app.engine.tick import TickEngine
from app.storage import db

# In-memory result cache
_PREDICTION_CACHE: Dict[Tuple, Dict[str, Any]] = {}
_BATCH_JOBS: Dict[str, Dict[str, Any]] = {}


def run_monte_carlo_prediction(
    scenario: Scenario,
    player_creatures: List[Creature],
    enemy_creatures: List[Creature],
    seed_count: int = 300,
    calibrate_with_upload_id: Optional[str] = None,
    job_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Runs Monte Carlo simulations across seeds and calculates statistical win rates."""
    cache_key = (
        scenario.id,
        tuple(sorted([c.id for c in player_creatures])),
        seed_count,
        calibrate_with_upload_id,
    )
    if cache_key in _PREDICTION_CACHE:
        return _PREDICTION_CACHE[cache_key]

    wins = 0
    survivor_dist = [0, 0, 0, 0, 0]  # 0, 1, 2, 3, 4 alive
    total_coins_left = 0
    total_ticks = 0

    base_seed = 1000

    for i in range(seed_count):
        s = base_seed + i * 7919
        engine = TickEngine(
            scenario=scenario,
            player_creatures=player_creatures,
            enemy_creatures=enemy_creatures,
            seed=s,
        )
        res = engine.run()
        if res.outcome == "win":
            wins += 1

        survivors_idx = min(4, max(0, res.survivors))
        survivor_dist[survivors_idx] += 1
        total_coins_left += res.coins_left
        total_ticks += res.ticks_elapsed

        if job_id and (i % 25 == 0 or i == seed_count - 1):
            _BATCH_JOBS[job_id] = {
                "progress": round((i + 1) / seed_count, 2),
                "completed": False,
            }

    win_rate = wins / seed_count
    # 95% Confidence Interval using normal approximation: 1.96 * sqrt(p * (1 - p) / n)
    ci = 1.96 * math.sqrt(max(0.0001, win_rate * (1.0 - win_rate)) / seed_count) * 100
    avg_coins = round(total_coins_left / seed_count, 1)
    avg_ticks = round(total_ticks / seed_count, 1)

    result: Dict[str, Any] = {
        "scenario_id": scenario.id,
        "team": [c.id for c in player_creatures],
        "seed_count": seed_count,
        "win_rate": round(win_rate, 4),
        "win_rate_percent": round(win_rate * 100, 1),
        "confidence_interval_percent": round(ci, 2),
        "survivor_distribution": survivor_dist,
        "survivor_distribution_percent": [round(c / seed_count * 100, 1) for c in survivor_dist],
        "avg_coins_left": avg_coins,
        "avg_ticks": avg_ticks,
        "calibration": None,
    }

    # Calibration with uploaded dataset if requested
    if calibrate_with_upload_id:
        uploaded_battles = [
            b
            for b in db.get_battles(scenario_id=scenario.id)
            if b.source == f"upload:{calibrate_with_upload_id}"
            and sorted(b.player_team) == sorted([c.id for c in player_creatures])
        ]

        if uploaded_battles:
            up_total = len(uploaded_battles)
            up_wins = sum(1 for b in uploaded_battles if b.outcome == "win")
            up_win_rate = up_wins / up_total
            gap = round(win_rate - up_win_rate, 4)

            result["calibration"] = {
                "upload_id": calibrate_with_upload_id,
                "uploaded_samples": up_total,
                "uploaded_win_rate": round(up_win_rate, 4),
                "uploaded_win_rate_percent": round(up_win_rate * 100, 1),
                "gap": gap,
                "gap_percent": round(gap * 100, 1),
                "interpretation": (
                    f"Simulated rate is {abs(round(gap * 100, 1))}% "
                    + ("higher than" if gap > 0 else "lower than")
                    + " uploaded empirical data."
                ),
            }
        else:
            result["calibration"] = {
                "upload_id": calibrate_with_upload_id,
                "uploaded_samples": 0,
                "uploaded_win_rate": None,
                "gap": None,
                "message": "No matching uploaded battles found for this scenario and team.",
            }

    _PREDICTION_CACHE[cache_key] = result
    if job_id:
        _BATCH_JOBS[job_id] = {"progress": 1.0, "completed": True, "result": result}

    return result


def get_job_progress(job_id: str) -> Optional[Dict[str, Any]]:
    return _BATCH_JOBS.get(job_id)
