"""Prescriptive analytics: optimal spend comparisons, tactical action ranking, and scenario balance auditing."""

from typing import Dict, List, Optional, Any
from app.engine.models import Scenario
from app.engine.tick import TickEngine
from app.storage import db


def compare_plan_options(
    scenario: Scenario,
    options: List[Dict[str, Any]],
    seed_count: int = 100,
) -> List[Dict[str, Any]]:
    """Evaluates several team or spending options and returns a ranked comparison table."""
    results = []
    enemy_creatures = [db.get_creature(cid) for cid in scenario.enemy_team if db.get_creature(cid)]

    for opt in options:
        opt_name = opt.get("name", "Option")
        team_ids = opt.get("team", [])
        heal_spend = opt.get("early_heal_spend", 0)

        player_creatures = [db.get_creature(cid) for cid in team_ids if db.get_creature(cid)]
        if not player_creatures:
            continue

        wins = 0
        total_coins = 0
        total_survivors = 0

        for i in range(seed_count):
            eng = TickEngine(
                scenario=scenario,
                player_creatures=player_creatures,
                enemy_creatures=enemy_creatures,
                seed=1000 + i * 7919,
                early_heal_spend=heal_spend,
            )
            res = eng.run()
            if res.outcome == "win":
                wins += 1
            total_coins += res.coins_left
            total_survivors += res.survivors

        rate = wins / seed_count
        results.append({
            "name": opt_name,
            "team": team_ids,
            "early_heal_spend": heal_spend,
            "win_rate": round(rate, 4),
            "win_rate_percent": round(rate * 100, 1),
            "avg_survivors": round(total_survivors / seed_count, 2),
            "avg_coins_left": round(total_coins / seed_count, 1),
        })

    # Sort descending by win rate
    results.sort(key=lambda r: r["win_rate"], reverse=True)
    return results


def recommend_best_actions(
    scenario: Scenario,
    team_ids: List[str],
    current_coins: int = 20,
) -> Dict[str, Any]:
    """Generates prescriptive recommendations for spending and tactics."""
    player_creatures = [db.get_creature(cid) for cid in team_ids if db.get_creature(cid)]
    enemy_creatures = [db.get_creature(cid) for cid in scenario.enemy_team if db.get_creature(cid)]

    spends = [0, 5, 10, 15, 20]
    evaluations = []

    for sp in spends:
        wins = 0
        total_coins = 0
        n = 100
        for i in range(n):
            eng = TickEngine(
                scenario=scenario,
                player_creatures=player_creatures,
                enemy_creatures=enemy_creatures,
                seed=1000 + i * 7919,
                early_heal_spend=sp,
            )
            res = eng.run()
            if res.outcome == "win":
                wins += 1
            total_coins += res.coins_left

        rate = wins / n
        evaluations.append({
            "spend": sp,
            "reserve_kept": 20 - sp,
            "win_rate": round(rate, 4),
            "win_rate_percent": round(rate * 100, 1),
            "avg_coins_left": round(total_coins / n, 1),
        })

    evaluations.sort(key=lambda e: e["win_rate"], reverse=True)
    best = evaluations[0]

    return {
        "scenario_id": scenario.id,
        "team": team_ids,
        "best_spend": best["spend"],
        "best_win_rate_percent": best["win_rate_percent"],
        "explanation": (
            f"Allocating {best['spend']} coins to early survivability maximizes win rate at "
            f"{best['win_rate_percent']}%, preserving {best['reserve_kept']} coins for later emergency revives."
        ),
        "options": evaluations,
    }


def audit_scenario_balance(
    scenario: Scenario,
    calibrate_with_upload_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Audits a scenario's game balance by testing against standard archetypes.
    Flags balance warnings if win rate falls outside 25% - 75%.
    """
    # Standard candidate test teams
    archetypes = [
        {"name": "Balanced Duo", "team": ["ember_fox", "bubble_toad"]},
        {"name": "Heavy Strikers", "team": ["flame_salamander", "crag_golem"]},
        {"name": "Speed & Sustain", "team": ["volt_hedgehog", "moss_shroom"]},
        {"name": "Full Squad", "team": ["ember_fox", "bubble_toad", "moss_shroom", "crag_golem"]},
    ]

    archetype_results = []
    total_wins = 0
    total_runs = 0
    total_ticks = 0
    timeouts = 0

    enemy_creatures = [db.get_creature(cid) for cid in scenario.enemy_team if db.get_creature(cid)]

    for arch in archetypes:
        player_creatures = [db.get_creature(cid) for cid in arch["team"] if db.get_creature(cid)]
        wins = 0
        n = 50
        for i in range(n):
            eng = TickEngine(
                scenario=scenario,
                player_creatures=player_creatures,
                enemy_creatures=enemy_creatures,
                seed=2000 + i * 5431,
            )
            res = eng.run()
            if res.outcome == "win":
                wins += 1
            if res.ticks_elapsed >= scenario.ticks:
                timeouts += 1
            total_ticks += res.ticks_elapsed

        rate = wins / n
        total_wins += wins
        total_runs += n
        archetype_results.append({
            "archetype": arch["name"],
            "team": arch["team"],
            "win_rate_percent": round(rate * 100, 1),
        })

    overall_win_rate = total_wins / max(1, total_runs)
    avg_ticks = round(total_ticks / max(1, total_runs), 1)
    timeout_share = round(timeouts / max(1, total_runs) * 100, 1)

    # Balance check: 25% - 75% target band
    is_balanced = 0.25 <= overall_win_rate <= 0.75
    flag_reason = None
    if overall_win_rate < 0.25:
        flag_reason = f"Too difficult: overall win rate is only {round(overall_win_rate * 100, 1)}% (< 25% target threshold)."
    elif overall_win_rate > 0.75:
        flag_reason = f"Too easy: overall win rate is {round(overall_win_rate * 100, 1)}% (> 75% target threshold)."

    result: Dict[str, Any] = {
        "scenario_id": scenario.id,
        "scenario_name": scenario.name,
        "is_balanced": is_balanced,
        "overall_win_rate_percent": round(overall_win_rate * 100, 1),
        "target_band": "25% - 75%",
        "balance_flag": flag_reason,
        "pacing": {
            "avg_ticks": avg_ticks,
            "max_ticks": scenario.ticks,
            "timeout_percent": timeout_share,
        },
        "archetypes": archetype_results,
        "hazard_impact": [
            {"tick": h.tick, "type": h.type, "lane": h.lane, "damage": h.params.get("damage", 25)}
            for h in scenario.hazard_schedule
        ],
        "calibration": None,
    }

    if calibrate_with_upload_id:
        uploaded_battles = [
            b
            for b in db.get_battles(scenario_id=scenario.id)
            if b.source == f"upload:{calibrate_with_upload_id}"
        ]
        if uploaded_battles:
            up_rate = sum(1 for b in uploaded_battles if b.outcome == "win") / len(uploaded_battles)
            gap = overall_win_rate - up_rate
            result["calibration"] = {
                "upload_id": calibrate_with_upload_id,
                "uploaded_samples": len(uploaded_battles),
                "uploaded_win_rate_percent": round(up_rate * 100, 1),
                "gap_percent": round(gap * 100, 1),
            }

    return result
