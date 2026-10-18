"""Descriptive analytics: summaries, creature statistics, timelines, and position heatmaps.

Each calculation function is pure: it takes event logs or BattleRecords and returns Pydantic models,
with no database access inside the calculation.
"""

from typing import Dict, List, Any, Union, Optional
from collections import defaultdict

from app.engine.models import BattleRecord, Event
from .models import (
    BattleSummaryModel,
    CreatureStatsModel,
    TeamStatsModel,
    HPTimelinePointModel,
    HPTimelineModel,
    PositionHeatmapCellModel,
    PositionHeatmapModel,
)


def battle_summary(battle: BattleRecord) -> BattleSummaryModel:
    """Computes headline outcome, elapsed ticks, survivors, coins, and objective status."""
    is_win = battle.outcome == "win"
    objective_status = (
        "Objective Achieved: Target condition fulfilled."
        if is_win
        else f"Objective Incomplete: Team suffered defeat after {battle.ticks_elapsed} ticks with {battle.survivors} survivor(s)."
    )

    summary_sentence = (
        f"Team secured a decisive victory in {battle.ticks_elapsed} ticks with "
        f"{battle.survivors} creature(s) standing and {battle.coins_left} coins preserved."
        if is_win
        else f"Team fell in defeat at tick {battle.ticks_elapsed} with {battle.coins_left} coins remaining."
    )

    player_damage = sum(
        e.damage for e in battle.events
        if e.damage > 0 and e.event_type not in ("hazard", "status", "death")
        and ((e.actor in battle.player_team and e.target not in battle.player_team)
             or (not battle.player_team and e.target == "crag_golem"))
    )
    enemy_damage = sum(
        e.damage for e in battle.events
        if e.damage > 0 and e.event_type not in ("hazard", "status", "death")
        and (e.actor not in battle.player_team and e.target in battle.player_team
             if battle.player_team else e.target != "crag_golem")
    )
    pacing = "fast" if battle.ticks_elapsed <= 10 else ("slow" if battle.ticks_elapsed >= 30 else "moderate")

    return BattleSummaryModel(
        battle_id=battle.battle_id,
        scenario_id=battle.scenario_id,
        outcome=battle.outcome,
        ticks_elapsed=battle.ticks_elapsed,
        survivors=battle.survivors,
        coins_left=battle.coins_left,
        objective_status=objective_status,
        summary_sentence=summary_sentence,
        player_damage_dealt=player_damage,
        enemy_damage_dealt=enemy_damage,
        pacing_rating=pacing,
    )


def creature_stats(battle: BattleRecord) -> List[CreatureStatsModel]:
    """Computes individual performance statistics per creature from the event log."""
    stats_map: Dict[str, Dict[str, Any]] = {}
    team = list(battle.player_team)
    if not team and battle.events:
        team = list({e.actor for e in battle.events if e.actor and e.actor not in ("system", "crag_golem")})
    for cid in team:
        stats_map[cid] = {
            "id": cid,
            "damage_dealt": 0,
            "damage_taken": 0,
            "kos": 0,
            "ticks_spent_in_hazard_zones": 0,
            "status_effects_applied": 0,
            "survival": True,
            "final_hp": battle.metadata.get("initial_hps", {}).get(cid, 0),
        }

    for ev in battle.events:
        # Damage dealt and KOs by player creatures
        if ev.actor in stats_map and ev.target not in stats_map and ev.event_type != "death":
            stats_map[ev.actor]["damage_dealt"] += max(0, ev.damage)
            if ev.ko:
                stats_map[ev.actor]["kos"] += 1
            if ev.status_change and ev.status_change in ("burn", "stun"):
                stats_map[ev.actor]["status_effects_applied"] += 1

        # Damage taken and survival by player creatures
        if ev.target in stats_map and ev.event_type != "decision":
            if ev.damage > 0:
                stats_map[ev.target]["damage_taken"] += ev.damage
            stats_map[ev.target]["final_hp"] = ev.hp_after
            if ev.ko or ev.action == "elimination":
                stats_map[ev.target]["survival"] = False
                stats_map[ev.target]["final_hp"] = 0

        # Hazard interactions
        if ev.hazard_hit and ev.target in stats_map:
            stats_map[ev.target]["ticks_spent_in_hazard_zones"] += 1

    # In case battle finished without explicit KO event for a 0 HP creature
    if battle.survivors == 0:
        for cid in stats_map:
            if not any(ev.target == cid and ev.hp_after > 0 for ev in battle.events[-3:]):
                stats_map[cid]["survival"] = False

    return [CreatureStatsModel(**data) for data in stats_map.values()]


def team_stats(battles: List[BattleRecord]) -> List[TeamStatsModel]:
    """Computes win rate, average ticks to victory, survivors, and coins grouped by scenario and team."""
    if not battles:
        return []

    # Group by (scenario_id, tuple(sorted(player_team)))
    grouped: Dict[tuple, List[BattleRecord]] = defaultdict(list)
    for b in battles:
        key = (b.scenario_id, tuple(b.player_team))
        grouped[key].append(b)

    results: List[TeamStatsModel] = []
    for (scen_id, team_tuple), records in grouped.items():
        total = len(records)
        wins = [b for b in records if b.outcome == "win"]
        win_count = len(wins)
        win_rate = win_count / total

        # Average ticks to victory (for victories only, or overall if no victories)
        avg_victory_ticks = (
            sum(w.ticks_elapsed for w in wins) / win_count
            if win_count > 0
            else sum(b.ticks_elapsed for b in records) / total
        )
        avg_survivors = sum(b.survivors for b in records) / total
        avg_coins = sum(b.coins_left for b in records) / total

        results.append(
            TeamStatsModel(
                scenario_id=scen_id,
                team=list(team_tuple),
                sample_count=total,
                win_rate=round(win_rate, 4),
                win_rate_percent=round(win_rate * 100, 1),
                avg_ticks_to_victory=round(avg_victory_ticks, 1),
                avg_survivors=round(avg_survivors, 2),
                avg_coins_left=round(avg_coins, 1),
            )
        )

    results.sort(key=lambda t: t.win_rate, reverse=True)
    return results


def hp_timeline(battle: BattleRecord) -> HPTimelineModel:
    """Calculates HP per creature and coin balance per tick with event markers."""
    running_hps = dict(battle.metadata.get("initial_hps", {}))
    # For legacy imports, infer only values present in logs; do not invent 100 HP.
    for ev in battle.events:
        if ev.event_type != "decision" and ev.target in battle.player_team and ev.target not in running_hps and ev.hp_before > 0:
            running_hps[ev.target] = ev.hp_before
    running_coins = battle.metadata.get("initial_coins")
    if running_coins is None:
        running_coins = next((e.coin_before for e in battle.events if e.coin_before or e.coin_change), battle.coins_left)
    grouped = defaultdict(list)
    for ev in battle.events:
        grouped[ev.tick].append(ev)
    points = []
    for tick in range(1, max(1, battle.ticks_elapsed) + 1):
        hazards, kos, keys = [], [], []
        for ev in grouped[tick]:
            if ev.coin_before or ev.coin_after or ev.coin_change:
                running_coins = ev.coin_after
            if ev.event_type != "decision" and ev.target in battle.player_team and (ev.damage or ev.hp_before or ev.hp_after or ev.ko):
                running_hps[ev.target] = ev.hp_after
            if ev.hazard_hit:
                hazards.append(ev.hazard_hit)
            if ev.ko:
                kos.append(ev.target or "Creature")
            if ev.event_type == "objective":
                keys.append("Objective Achieved")
        points.append(HPTimelinePointModel(tick=tick, coins=running_coins,
                      creatures=dict(running_hps), hazard_events=hazards, ko_events=kos, key_events=keys))
    return HPTimelineModel(battle_id=battle.battle_id, ticks=points)


def position_heatmap(
    battles: Union[BattleRecord, List[BattleRecord]],
    lanes: int = 3,
    tiles: int = 8,
    total_lanes: Optional[int] = None,
    max_tiles: Optional[int] = None,
) -> PositionHeatmapModel:
    """Calculates time spent, damage dealt, and KO locations across lanes and tiles."""
    if total_lanes is not None:
        lanes = total_lanes
    if max_tiles is not None:
        tiles = max_tiles
    records = [battles] if isinstance(battles, BattleRecord) else battles

    # Grid [lanes][tiles]
    grid_data: List[List[Dict[str, int]]] = [
        [{"time_spent": 0, "kos": 0, "damage": 0} for _ in range(tiles)]
        for _ in range(lanes)
    ]

    for b in records:
        seen_kos = set()
        for ev in b.events:
            lane = 0
            tile = 0
            if isinstance(ev.position, dict):
                lane = ev.position.get("lane", 0)
                tile = ev.position.get("tile", 0)
            elif hasattr(ev.position, "lane"):
                lane = getattr(ev.position, "lane", 0)
                tile = getattr(ev.position, "tile", 0)

            # Bounds check
            l_idx = max(0, min(lanes - 1, lane))
            t_idx = max(0, min(tiles - 1, tile))

            grid_data[l_idx][t_idx]["time_spent"] += 1
            if ev.damage > 0:
                grid_data[l_idx][t_idx]["damage"] += ev.damage
            if ev.ko and ev.target not in seen_kos:
                grid_data[l_idx][t_idx]["kos"] += 1
                seen_kos.add(ev.target)

    # Build Pydantic model grid
    grid: List[List[PositionHeatmapCellModel]] = []
    flat_cells = []
    for l_idx in range(lanes):
        row = []
        for t_idx in range(tiles):
            cell = PositionHeatmapCellModel(
                lane=l_idx,
                tile=t_idx,
                time_spent=grid_data[l_idx][t_idx]["time_spent"],
                event_count=grid_data[l_idx][t_idx]["time_spent"],
                kos=grid_data[l_idx][t_idx]["kos"],
                damage=grid_data[l_idx][t_idx]["damage"],
            )
            row.append(cell)
            flat_cells.append({"lane": l_idx, "tile": t_idx, "score": cell.damage + cell.kos * 50, "damage": cell.damage, "kos": cell.kos})
        grid.append(row)

    flat_cells.sort(key=lambda c: c["score"], reverse=True)
    hottest = flat_cells[:3]

    hottest_desc = ", ".join([f"Lane {h['lane']}, Tile {h['tile']} ({h['damage']} dmg, {h['kos']} KOs)" for h in hottest if h['score'] > 0])
    text_summary = (
        f"Combat intensity peaked at {hottest_desc}."
        if hottest_desc
        else "Even combat distribution across lanes with minimal concentrated hazard hotspots."
    )

    return PositionHeatmapModel(
        lanes=lanes,
        tiles=tiles,
        grid=grid,
        hottest_cells=hottest,
        text_summary=text_summary,
    )


# --- Backward Compatible Wrapper for existing screens ---

def compute_battle_descriptive_stats(battle: BattleRecord) -> Dict[str, Any]:
    """Compatibility wrapper returning dictionary representation for legacy consumers."""
    summary = battle_summary(battle)
    c_stats = creature_stats(battle)
    timeline = hp_timeline(battle)
    hmap = position_heatmap(battle)

    # Legacy 2D array representation expected by older components: list of list of dicts
    legacy_heatmap = [
        [{"damage": cell.damage, "kos": cell.kos} for cell in row]
        for row in hmap.grid
    ]

    legacy_timeline = [
        {
            "tick": pt.tick,
            "coins": pt.coins,
            "creatures": pt.creatures,
            "hazard_events": pt.hazard_events,
            "ko_events": pt.ko_events,
        }
        for pt in timeline.ticks
    ]

    return {
        "battle_id": battle.battle_id,
        "scenario_id": battle.scenario_id,
        "outcome": summary.outcome,
        "ticks_elapsed": summary.ticks_elapsed,
        "survivors": summary.survivors,
        "coins_left": summary.coins_left,
        "objective_status": summary.objective_status,
        "summary_sentence": summary.summary_sentence,
        "creatures_stats": [dict(c.model_dump(), survived=c.survival, hazard_ticks=c.ticks_spent_in_hazard_zones) for c in c_stats],
        "hp_timeline": legacy_timeline,
        "heatmap_metric": "Event counts and logged damage; not time occupancy",
        "heatmap": legacy_heatmap,
    }
