"""Prescriptive analytics: options comparisons and tactical state-based recommendations.

Pure calculation functions returning Pydantic models.
"""

from typing import Dict, List, Optional, Any
from app.engine.models import Scenario, Creature
from app.engine.tick import TickEngine
from .predictive import compute_confidence_interval, predict_win_rate
from .models import (
    PlanCompareResultModel,
    RecommendedActionModel,
    RecommendationReportModel,
)


def compare_options(
    scenario: Scenario,
    team: List[Creature],
    options: List[Dict[str, Any]],
    seed_count: int = 100,
    base_seed: int = 1000,
    enemy_creatures: Optional[List[Creature]] = None,
    all_creatures_map: Optional[Dict[str, Creature]] = None,
) -> List[PlanCompareResultModel]:
    """
    Evaluates alternative team compositions or spending strategies across seed_count trials.
    Returns a ranked comparison table ordered descending by win rate.
    """
    results: List[PlanCompareResultModel] = []
    cmap = all_creatures_map or {c.id: c for c in team}

    for opt in options:
        opt_name = str(opt.get("name", "Option"))
        opt_team_ids = opt.get("team", [c.id for c in team])
        early_heal_spend = int(opt.get("early_heal_spend", 0))

        opt_team = [cmap[cid] for cid in opt_team_ids if cid in cmap]
        if not opt_team:
            opt_team = team

        wins = 0
        total_coins = 0
        total_survivors = 0

        for i in range(seed_count):
            eng = TickEngine(
                scenario=scenario,
                player_creatures=opt_team,
                enemy_creatures=enemy_creatures or [],
                seed=base_seed + i,
                early_heal_spend=early_heal_spend,
            )
            res = eng.run()
            if res.outcome == "win":
                wins += 1
            total_coins += res.coins_left
            total_survivors += res.survivors

        rate = wins / seed_count
        ci_half, ci_lower, ci_upper, _ = compute_confidence_interval(wins, seed_count)

        results.append(
            PlanCompareResultModel(
                name=opt_name,
                team=[c.id for c in opt_team],
                early_heal_spend=early_heal_spend,
                win_rate=round(rate, 4),
                win_rate_percent=round(rate * 100, 1),
                confidence_interval_95=round(ci_half * 100, 2),
                ci_lower=round(ci_lower * 100, 1),
                ci_upper=round(ci_upper * 100, 1),
                avg_survivors=round(total_survivors / seed_count, 2),
                avg_coins_left=round(total_coins / seed_count, 1),
            )
        )

    results.sort(key=lambda r: r.win_rate, reverse=True)
    return results


def recommend_action(
    state: Dict[str, Any],
    candidate_actions: List[Dict[str, Any]],
    scenario: Scenario,
    all_known_creatures: Dict[str, Creature],
    seed_count: int = 50,
) -> RecommendationReportModel:
    """
    Evaluates candidate tactical actions from the current mid-battle state
    and returns the top three actions with win rate, 95% interval, and an explanation.
    """
    player_team_ids = state.get("player_team", [])
    creature_hps = state.get("creature_hps", {})
    coins = state.get("coins", 20)

    # Base visible player creatures
    base_allies: List[Creature] = []
    for cid in player_team_ids:
        if cid in all_known_creatures:
            c = all_known_creatures[cid]
            hp = creature_hps.get(cid, c.hp)
            if hp > 0:
                base_allies.append(c.model_copy(update={"hp": hp}))

    # Base visible enemies
    base_enemies: List[Creature] = []
    for eid in scenario.enemy_team:
        if eid in all_known_creatures:
            e = all_known_creatures[eid]
            hp = creature_hps.get(eid, e.hp)
            if hp > 0:
                base_enemies.append(e.model_copy(update={"hp": hp}))

    evaluated_candidates: List[RecommendedActionModel] = []

    # If no candidates provided, evaluate standard tactical spends
    candidates = candidate_actions or [
        {"action": "Spend 0 coins (Conserve economy)", "early_heal": 0},
        {"action": "Spend 5 coins for Emergency Heal", "early_heal": 5},
        {"action": "Spend 10 coins for Tactical Reinforce", "early_heal": 10},
    ]

    for cand in candidates:
        action_name = cand.get("action", "Action")
        heal_spend = cand.get("early_heal", 0)

        wins = 0
        for i in range(seed_count):
            eng = TickEngine(
                scenario=scenario,
                player_creatures=base_allies,
                enemy_creatures=base_enemies,
                seed=3000 + i,
                early_heal_spend=heal_spend,
            )
            res = eng.run()
            if res.outcome == "win":
                wins += 1

        rate = wins / seed_count
        ci_half, ci_lower, ci_upper, _ = compute_confidence_interval(wins, seed_count)

        explanation = (
            f"Expected {round(rate * 100, 1)}% win rate by securing critical allied HP thresholds while retaining coin reserves."
            if heal_spend > 0
            else f"Expected {round(rate * 100, 1)}% win rate by hoarding coins for late-stage turn versatility."
        )

        evaluated_candidates.append(
            RecommendedActionModel(
                action=action_name,
                predicted_win_rate=round(rate, 4),
                predicted_win_rate_percent=round(rate * 100, 1),
                confidence_interval_95=round(ci_half * 100, 2),
                ci_lower=round(ci_lower * 100, 1),
                ci_upper=round(ci_upper * 100, 1),
                explanation=explanation,
            )
        )

    evaluated_candidates.sort(key=lambda c: c.predicted_win_rate, reverse=True)
    top_three = evaluated_candidates[:3]

    best = top_three[0]
    summary_advice = (
        f"Optimal move: '{best.action}' yields the highest projected win rate of "
        f"{best.predicted_win_rate_percent}% (±{best.confidence_interval_95}%)."
    )
    best_spend = next((c.get("early_heal", 0) for c in candidates if c.get("action") == best.action), 0)
    legacy_options = [
        {
            "spend": next((c.get("early_heal", 0) for c in candidates if c.get("action") == r.action), 0),
            "reserve_kept": max(0, coins - next((c.get("early_heal", 0) for c in candidates if c.get("action") == r.action), 0)),
            "win_rate": r.predicted_win_rate,
            "win_rate_percent": r.predicted_win_rate_percent,
            "avg_coins_left": round(coins - next((c.get("early_heal", 0) for c in candidates if c.get("action") == r.action), 0), 1),
        }
        for r in top_three
    ]

    return RecommendationReportModel(
        scenario_id=scenario.id,
        team=player_team_ids,
        top_recommendations=top_three,
        summary_advice=summary_advice,
        best_spend=best_spend,
        best_win_rate_percent=best.predicted_win_rate_percent,
        explanation=summary_advice,
        options=legacy_options,
    )


# --- Backward Compatible Wrappers ---

def compare_plan_options(
    scenario: Scenario,
    options: List[Dict[str, Any]],
    seed_count: int = 100,
) -> List[Dict[str, Any]]:
    from app.storage import db
    all_c = {c.id: c for c in db.get_all_creatures()}
    enemy_c: List[Creature] = [c for cid in scenario.enemy_team if (c := db.get_creature(cid)) is not None]
    default_team: List[Creature] = [c for cid in scenario.enemy_team if (c := db.get_creature(cid)) is not None]

    models = compare_options(
        scenario=scenario,
        team=default_team,
        options=options,
        seed_count=seed_count,
        enemy_creatures=enemy_c,
        all_creatures_map=all_c,
    )
    return [m.model_dump() for m in models]


def recommend_best_actions(
    scenario: Scenario,
    team_ids: List[str],
    current_coins: int = 20,
) -> Dict[str, Any]:
    from app.storage import db
    all_c = {c.id: c for c in db.get_all_creatures()}
    state = {"player_team": team_ids, "coins": current_coins, "current_tick": 1, "creature_hps": {}}
    report = recommend_action(state, [], scenario, all_c, seed_count=50)

    # Legacy format expected by frontend PlanScreen
    options = [
        {
            "spend": i * 5,
            "reserve_kept": max(0, current_coins - i * 5),
            "win_rate": rec.predicted_win_rate,
            "win_rate_percent": rec.predicted_win_rate_percent,
            "avg_coins_left": round(current_coins - i * 5, 1),
        }
        for i, rec in enumerate(report.top_recommendations)
    ]
    best_opt = options[0] if options else {"spend": 0, "win_rate_percent": 50.0, "reserve_kept": 20}

    return {
        "scenario_id": scenario.id,
        "team": team_ids,
        "best_spend": best_opt["spend"],
        "best_win_rate_percent": best_opt["win_rate_percent"],
        "explanation": report.summary_advice,
        "options": options,
    }


def audit_scenario_balance(scenario: Scenario, calibrate_with_upload_id: Optional[str] = None) -> Dict[str, Any]:
    from .balance import balance_report
    from app.storage import db
    upload_battles = None
    if calibrate_with_upload_id:
        upload_battles = db.get_battles(scenario_id=scenario.id, source_filter=f"upload:{calibrate_with_upload_id}")
    all_c = {c.id: c for c in db.get_all_creatures()}
    rep = balance_report(scenario, all_creatures_map=all_c, calibrate_with_battles=upload_battles)
    return rep.model_dump()
