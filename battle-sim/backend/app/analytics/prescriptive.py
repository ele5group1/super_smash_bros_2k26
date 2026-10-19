"""Prescriptive analytics: pre-battle option comparisons and feasible recommendations.

Pure calculation functions returning Pydantic models.
"""

from typing import Dict, List, Optional, Any
import math
from app.engine.models import Scenario, Creature
from app.engine.tick import TickEngine
from .predictive import compute_confidence_interval
from .models import (
    PlanCompareResultModel,
    RecommendedActionModel,
    RecommendationReportModel,
)


def utility(win, survivors, coins, team_size, starting_coins, objective):
    if objective == "win_probability":
        return float(win)
    if objective == "survival":
        return survivors / max(1,team_size)
    if objective == "balanced":
        return .7*win + .2*survivors/max(1,team_size) + .1*min(1,coins/max(1,starting_coins))
    raise ValueError("Unknown decision objective")


def compare_options(
    scenario: Scenario,
    team: List[Creature],
    options: List[Dict[str, Any]],
    seed_count: int = 100,
    base_seed: int = 1000,
    enemy_creatures: Optional[List[Creature]] = None,
    all_creatures_map: Optional[Dict[str, Creature]] = None,
    objective: str = "win_probability",
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

        if (not 1 <= len(opt_team_ids) <= 4 or len(set(opt_team_ids)) != len(opt_team_ids)
                or any(cid not in cmap for cid in opt_team_ids)):
            raise ValueError("Each option needs one to four distinct known creatures")
        if not 0 <= early_heal_spend <= scenario.starting_coins:
            raise ValueError("Each option must fit the coin budget")
        opt_team = [cmap[cid] for cid in opt_team_ids]

        wins = 0
        total_coins = 0
        total_survivors = 0
        utilities, survivor_values = [], []
        scores = {name: [] for name in ("win_probability","survival","balanced")}

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
            survivor_values.append(res.survivors)
            utilities.append(utility(res.outcome == "win", res.survivors, res.coins_left,
                                     len(opt_team), scenario.starting_coins, objective))
            for name in scores:
                scores[name].append(utility(res.outcome=="win",res.survivors,res.coins_left,len(opt_team),scenario.starting_coins,name))

        rate = wins / seed_count
        ci_half, ci_lower, ci_upper, _ = compute_confidence_interval(wins, seed_count)

        results.append(
            PlanCompareResultModel(
                objective_value=sum(utilities)/seed_count,
                objective_scores={name:sum(values)/seed_count for name,values in scores.items()},
                failure_probability=1-rate,
                survivor_p10=sorted(survivor_values)[max(0, math.ceil(.1*seed_count)-1)],
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

    results.sort(key=lambda r: (-r.objective_value, r.early_heal_spend, -r.avg_survivors))
    return results


def recommend_action(
    state: Dict[str, Any],
    candidate_actions: List[Dict[str, Any]],
    scenario: Scenario,
    all_known_creatures: Dict[str, Creature],
    seed_count: int = 50,
    objective: str = "win_probability",
    min_reserve: int = 0,
) -> RecommendationReportModel:
    """
    Evaluates affordable pre-battle potion plans with matched trial seeds
    and returns the top three actions with win rate, 95% interval, and an explanation.
    """
    if state.get("current_tick", 1) != 1 or state.get("creature_hps"):
        raise ValueError("Recommendations support pre-battle planning only")
    ids = state.get("player_team", [])
    if not ids or len(ids) > 4 or len(set(ids)) != len(ids) or any(cid not in all_known_creatures for cid in ids):
        raise ValueError("Choose one to four distinct known creatures")
    coins = state.get("coins", scenario.starting_coins)
    if not 0 <= coins <= scenario.starting_coins:
        raise ValueError("Available coins must fit the scenario budget")
    if not 0 <= min_reserve <= coins:
        raise ValueError("Minimum reserve exceeds the available budget")
    planned_scenario = scenario.model_copy(update={"starting_resources": {"coins": coins}})
    candidates = candidate_actions or [
        {"action": "Keep coins for combat moves", "early_heal": 0},
        {"action": "Buy a 20 HP emergency potion", "early_heal": 5},
        {"action": "Buy a 40 HP emergency potion", "early_heal": 10},
    ]
    options = [{"name": c["action"], "team": ids, "early_heal_spend": c.get("early_heal", 0)}
               for c in candidates if 0 <= c.get("early_heal", 0) <= coins-min_reserve]
    if not any(o["early_heal_spend"] == 0 for o in options):
        options.append({"name": "Keep coins for combat moves", "team": ids, "early_heal_spend": 0})
    results = compare_options(planned_scenario, [all_known_creatures[cid] for cid in ids], options,
                              seed_count=seed_count, base_seed=3000,
                              enemy_creatures=[all_known_creatures[cid] for cid in scenario.enemy_team],
                              all_creatures_map=all_known_creatures, objective=objective)
    best = results[0]
    baseline = next(r for r in results if r.early_heal_spend == 0)
    # Freeze the selected decision, then compare with baseline on disjoint seeds.
    enemies = [all_known_creatures[cid] for cid in scenario.enemy_team]
    squad = [all_known_creatures[cid] for cid in ids]
    effects, win_effects = [], []
    for i in range(seed_count):
        a = TickEngine(planned_scenario,squad,enemies,seed=800000+i,early_heal_spend=best.early_heal_spend).run()
        b = TickEngine(planned_scenario,squad,enemies,seed=800000+i,early_heal_spend=0).run()
        effects.append(utility(a.outcome=="win",a.survivors,a.coins_left,len(ids),coins,objective)
                       - utility(b.outcome=="win",b.survivors,b.coins_left,len(ids),coins,objective))
        win_effects.append(int(a.outcome=="win")-int(b.outcome=="win"))
    mean_effect = sum(effects)/seed_count
    se = math.sqrt(sum((x-mean_effect)**2 for x in effects)/(seed_count-1)/seed_count) if seed_count>1 else 0
    holdout = {"seed_count":seed_count,"base_seed":800000,"mean_utility_change":mean_effect,
               "win_change_percentage_points":100*sum(win_effects)/seed_count,
               "approximate_95_interval":[mean_effect-1.96*se,mean_effect+1.96*se],
               "interpretation":"Paired normal approximation on held-out simulator seeds; small trial counts and model assumptions limit inference. No causal claim about real visitors."}
    sensitivity = [{"objective":name,"best_spend":max(results,key=lambda r:(r.objective_scores[name],-r.early_heal_spend)).early_heal_spend}
        for name in ["win_probability","survival","balanced"]]
    advice = (f"Best tested feasible plan for {objective}: {best.name}. Estimated win rate {best.win_rate_percent}% "
              f"(95% interval {best.ci_lower}%–{best.ci_upper}%). "
              "Ties favor lower spending. This searches the listed potion choices, not every possible strategy.")
    return RecommendationReportModel(
        scenario_id=scenario.id, team=ids, seed_count=seed_count,
        decision_model={"method":"Finite-alternative simulation decision analysis", "objective":objective,
                        "utility_formula": "P(win)" if objective=="win_probability" else "E(survivors/team_size)" if objective=="survival" else ".7*P(win)+.2*E(survivors/team_size)+.1*E(min(1,coins/start_coins))",
                        "weights_note":"Balanced weights are an explicit illustrative preference; the player may choose another objective.",
                        "variables":"Potion budget in {0,5,10} coins; squad fixed by player",
                        "hard_constraints":{"budget":coins,"minimum_initial_reserve":min_reserve,"team_size":len(ids)},
                        "scope":"Best among listed feasible alternatives under this simulator; not a global optimum."},
        holdout_comparison=holdout, sensitivity=sensitivity,
        best_spend=best.early_heal_spend, best_win_rate_percent=best.win_rate_percent,
        baseline_win_rate_percent=baseline.win_rate_percent,
        improvement_percentage_points=round(best.win_rate_percent-baseline.win_rate_percent, 1),
        explanation=advice, summary_advice=advice,
        top_recommendations=[RecommendedActionModel(
            action=r.name, predicted_win_rate=r.win_rate, predicted_win_rate_percent=r.win_rate_percent,
            confidence_interval_95=r.confidence_interval_95, ci_lower=r.ci_lower, ci_upper=r.ci_upper,
            explanation=f"Costs {r.early_heal_spend} coins. Potion activates once at or below half HP, if still alive.")
            for r in results[:3]],
        options=[dict(r.model_dump(), spend=r.early_heal_spend, reserve_kept=coins-r.early_heal_spend)
                 for r in results])


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

    return report.model_dump()


def audit_scenario_balance(scenario: Scenario, calibrate_with_upload_id: Optional[str] = None) -> Dict[str, Any]:
    from .balance import balance_report
    from app.storage import db
    upload_battles = None
    if calibrate_with_upload_id:
        upload_battles = db.get_battles(scenario_id=scenario.id, source_filter=f"upload:{calibrate_with_upload_id}")
    all_c = {c.id: c for c in db.get_all_creatures()}
    rep = balance_report(scenario, all_creatures_map=all_c, calibrate_with_battles=upload_battles)
    return rep.model_dump()
