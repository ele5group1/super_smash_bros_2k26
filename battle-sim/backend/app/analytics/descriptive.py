"""Descriptive analytics: summaries, creature statistics, timelines, and heatmaps."""

from typing import Dict, List, Any
from app.engine.models import BattleRecord


def compute_battle_descriptive_stats(battle: BattleRecord) -> Dict[str, Any]:
    """Computes descriptive analytics for a single battle."""
    creatures_stats: Dict[str, Dict[str, Any]] = {}
    for p in battle.player_team:
        creatures_stats[p] = {
            "id": p,
            "damage_dealt": 0,
            "damage_taken": 0,
            "kos": 0,
            "survived": True,
            "hazard_ticks": 0,
            "final_hp": 0,
        }

    # Track HP timeline per creature and coins timeline
    hp_timeline: List[Dict[str, Any]] = []
    current_hps = {p: 100 for p in battle.player_team}  # Will update from events
    current_coins = 20

    # Initialize first tick snapshot
    for ev in battle.events:
        if ev.actor in creatures_stats and ev.event_type == "move":
            creatures_stats[ev.actor]["damage_dealt"] += max(0, ev.damage)
            if ev.ko:
                creatures_stats[ev.actor]["kos"] += 1

        if ev.target in creatures_stats:
            if ev.damage > 0:
                creatures_stats[ev.target]["damage_taken"] += ev.damage
            current_hps[ev.target] = ev.hp_after
            if ev.ko:
                creatures_stats[ev.target]["survived"] = False
                creatures_stats[ev.target]["final_hp"] = 0
            else:
                creatures_stats[ev.target]["final_hp"] = ev.hp_after

        if ev.hazard_hit and ev.target in creatures_stats:
            creatures_stats[ev.target]["hazard_ticks"] += 1

        if ev.coin_change != 0:
            current_coins += ev.coin_change

    # Build timeline points per tick
    ticks_map: Dict[int, Dict[str, Any]] = {}
    for t in range(1, battle.ticks_elapsed + 1):
        ticks_map[t] = {
            "tick": t,
            "coins": current_coins,
            "creatures": dict(current_hps),
            "hazard_events": [],
            "ko_events": [],
        }

    running_hps = {p: 100 for p in battle.player_team}
    running_coins = 20
    for ev in battle.events:
        t = ev.tick
        if t in ticks_map:
            if ev.coin_change != 0:
                running_coins += ev.coin_change
            if ev.target in running_hps:
                running_hps[ev.target] = ev.hp_after
            ticks_map[t]["coins"] = running_coins
            ticks_map[t]["creatures"] = dict(running_hps)
            if ev.hazard_hit:
                ticks_map[t]["hazard_events"].append(ev.hazard_hit)
            if ev.ko:
                ticks_map[t]["ko_events"].append(ev.target)

    hp_timeline = [ticks_map[t] for t in sorted(ticks_map.keys())]

    # Heatmap of damage and KOs across 3 lanes x 8 tiles (0 to 7)
    heatmap: List[List[Dict[str, int]]] = [
        [{"damage": 0, "kos": 0} for _ in range(8)] for _ in range(3)
    ]
    for ev in battle.events:
        # Approximate location based on tick progression if tile not explicitly bound
        lane = 0
        if "lane 1" in ev.action.lower():
            lane = 1
        elif "lane 2" in ev.action.lower():
            lane = 2
        tile = min(7, max(0, ev.tick // 5))

        if ev.damage > 0:
            heatmap[lane][tile]["damage"] += ev.damage
        if ev.ko:
            heatmap[lane][tile]["kos"] += 1

    return {
        "battle_id": battle.battle_id,
        "scenario_id": battle.scenario_id,
        "outcome": battle.outcome,
        "ticks_elapsed": battle.ticks_elapsed,
        "survivors": battle.survivors,
        "coins_left": battle.coins_left,
        "creatures_stats": list(creatures_stats.values()),
        "hp_timeline": hp_timeline,
        "heatmap": heatmap,
    }


def aggregate_descriptive_stats(battles: List[BattleRecord]) -> Dict[str, Any]:
    """Aggregates descriptive metrics across multiple battles."""
    if not battles:
        return {
            "total_battles": 0,
            "win_rate": 0.0,
            "avg_ticks": 0.0,
            "avg_survivors": 0.0,
            "avg_coins_left": 0.0,
        }

    total = len(battles)
    wins = sum(1 for b in battles if b.outcome == "win")
    avg_ticks = sum(b.ticks_elapsed for b in battles) / total
    avg_survivors = sum(b.survivors for b in battles) / total
    avg_coins = sum(b.coins_left for b in battles) / total

    return {
        "total_battles": total,
        "win_rate": round(wins / total, 3),
        "avg_ticks": round(avg_ticks, 1),
        "avg_survivors": round(avg_survivors, 2),
        "avg_coins_left": round(avg_coins, 1),
    }
