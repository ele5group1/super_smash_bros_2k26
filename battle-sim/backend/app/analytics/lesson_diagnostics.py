"""Chapter 4: inspect, compare, localize, and qualify diagnostic evidence."""
from collections import Counter, defaultdict
from hashlib import sha256
import json
import math
import statistics

import numpy as np
from scipy.stats import chi2


def categorical_association(observed, labels):
    """Pearson chain without Yates correction, matching lesson slides 61–72."""
    table = np.asarray(observed, dtype=float)
    result = {"rows": labels, "columns": ["Loss", "Win"], "observed": table.tolist(),
              "expected": [], "residuals": [], "contributions": [], "chi_square": None,
              "degrees_of_freedom": 0, "nominal_p_value": None, "cramers_v": None,
              "adequate_expected_counts": False,
              "interpretation": "Need at least two nonempty groups and both outcomes."}
    if table.size == 0 and not labels:
        return result
    if table.ndim != 2 or table.shape[1] != 2 or len(labels) != table.shape[0]:
        raise ValueError("Use one loss/win count pair per group")
    if np.any(table < 0) or not np.all(np.isfinite(table)):
        raise ValueError("Counts must be finite and nonnegative")
    if table.shape[0] < 2 or table.sum() == 0 or np.any(table.sum(axis=0) == 0) or np.any(table.sum(axis=1) == 0):
        return result
    expected = np.outer(table.sum(axis=1), table.sum(axis=0)) / table.sum()
    residuals = (table-expected) / np.sqrt(expected)
    statistic = float(np.sum(residuals**2))
    df = table.shape[0]-1
    adequate = bool(np.all(expected >= 5))  # deliberately conservative for classroom inference
    result.update(expected=expected.tolist(), residuals=residuals.tolist(),
                  contributions=(residuals**2).tolist(), chi_square=statistic,
                  degrees_of_freedom=df, nominal_p_value=float(chi2.sf(statistic, df)) if adequate else None,
                  cramers_v=math.sqrt(statistic / float(table.sum())), adequate_expected_counts=adequate,
                  interpretation=("Nominal p-value assumes independent rounds; independence is not established by these logs. "
                                  "Residuals localize departures from independence. Association is not causation."
                                  if adequate else "Sparse expected counts: chi-square p-value withheld. Counts and residuals remain exploratory; collect more comparable independent rounds."))
    return result


def _summary(values):
    if not values:
        return {"count": 0, "mean": None, "median": None, "q1": None, "q3": None, "min": None, "max": None, "outlier_count": 0}
    q1, q3 = [float(x) for x in np.percentile(values, [25, 75])]
    iqr = q3-q1
    return {"count": len(values), "mean": statistics.mean(values), "median": statistics.median(values),
            "q1": q1, "q3": q3, "min": min(values), "max": max(values),
            "outlier_count": sum(x < q1-1.5*iqr or x > q3+1.5*iqr for x in values)}


def exploration_report(battles, dimension="potion"):
    if dimension not in ("potion", "scenario", "team_size"):
        raise ValueError("Unknown comparison dimension")
    records, seen, duplicates = [], set(), 0
    for battle in battles:
        # Deterministic replays are not fresh evidence.
        signature = json.dumps([battle.scenario_id, battle.metadata.get("scenario"), battle.player_team,
                                battle.metadata.get("players"), battle.metadata.get("early_heal_spend"),
                                battle.personality, battle.seed, battle.engine_version], sort_keys=True)
        key = sha256(signature.encode()).hexdigest()
        if key in seen:
            duplicates += 1
        else:
            records.append(battle); seen.add(key)
    groups = defaultdict(lambda: [0, 0])
    hourly = defaultdict(lambda: [0, 0])
    damage = Counter()
    for b in records:
        group = (f"{b.metadata['early_heal_spend']} coins" if "early_heal_spend" in b.metadata else "Unknown spend") if dimension == "potion" else (
            b.scenario_id if dimension == "scenario" else f"{len(b.player_team)} fighters")
        groups[group][int(b.outcome == "win")] += 1
        if b.created_at:
            hourly[b.created_at[:13]][int(b.outcome == "win")] += 1
        for event in b.events:
            if event.target in b.player_team and event.event_type != "decision" and event.damage > 0:
                actual = max(0, event.hp_before-event.hp_after)
                category = "Hazards" if event.hazard_hit or event.event_type == "hazard" else "Status effects" if event.event_type == "status" else "Combat"
                damage[category] += actual
    labels = sorted(groups)
    table = categorical_association([groups[g] for g in labels], labels)
    total_damage = sum(damage.values())
    return {"unit": "Completed round", "input_records": len(battles), "sample_count": len(records),
            "duplicates_excluded": duplicates,
            "missing_starting_snapshots": sum(not b.metadata.get("players") for b in records),
            "unknown_strategy_records": sum("early_heal_spend" not in b.metadata for b in records),
            "sources": dict(Counter(b.source for b in records)),
            "window": {"from": min((b.created_at for b in records if b.created_at), default=None),
                       "to": max((b.created_at for b in records if b.created_at), default=None), "timezone": "UTC"},
            "summaries": {"duration_ticks": _summary([b.ticks_elapsed for b in records]),
                          "survivors": _summary([b.survivors for b in records]),
                          "coins_left": _summary([b.coins_left for b in records])},
            "cohorts": [{"group": g, "rounds": sum(groups[g]), "losses": groups[g][0], "wins": groups[g][1],
                         "win_rate": groups[g][1]/sum(groups[g])} for g in labels],
            "association": table,
            "damage_contribution": [{"category": k, "damage": v, "share": v/total_damage if total_damage else 0}
                                    for k,v in damage.most_common()],
            "hourly": [{"hour": h, "rounds": sum(v), "win_rate": v[1]/sum(v)} for h,v in sorted(hourly.items())],
            "seasonality": "No seasonal decomposition fitted: repeated cycles and a defensible period have not been established.",
            "next_question": "Compare potion cohorts within the same scenario and squad; use matched simulation trials to investigate interventions.",
            "limitations": ["Visitor choices and repeated players can confound cohort differences.",
                            "Damage shares explain recorded HP loss, not the cause of defeat.",
                            "IQR flags identify records to inspect; no records were deleted as outliers."]}
