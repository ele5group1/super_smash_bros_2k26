"""Data export in JSON and CSV/ZIP formats with formula-injection guard."""

import csv
import io
import json
import zipfile
from typing import List, Any
from app.engine.models import Creature, Scenario, BattleRecord


def sanitize_cell(value: Any) -> str:
    """Formula-injection guard: prefix cells starting with =, +, -, or @ with a single quote."""
    if value is None:
        return ""
    val_str = str(value)
    if val_str and val_str[0] in ("=", "+", "-", "@"):
        return f"'{val_str}"
    return val_str


def export_creatures_csv(creatures: List[Creature]) -> str:
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\r\n")
    writer.writerow(["id", "name", "type", "hp", "attack", "speed", "moves"])
    for c in creatures:
        moves_str = ";".join(c.moves)
        writer.writerow([
            sanitize_cell(c.id),
            sanitize_cell(c.name),
            sanitize_cell(c.type.value if hasattr(c.type, "value") else str(c.type)),
            sanitize_cell(c.hp),
            sanitize_cell(c.attack),
            sanitize_cell(c.speed),
            sanitize_cell(moves_str),
        ])
    return out.getvalue()


def export_creatures_json(creatures: List[Creature]) -> str:
    return json.dumps([c.model_dump() for c in creatures], indent=2)


def export_scenarios_zip(scenarios: List[Scenario]) -> bytes:
    """Creates a zip containing scenarios.csv, hazards.csv, and map_tiles.csv."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # scenarios.csv
        sc_out = io.StringIO()
        sc_writer = csv.writer(sc_out, lineterminator="\r\n")
        sc_writer.writerow([
            "id", "name", "description", "lanes", "ticks",
            "objective_type", "objective_min_survivors", "starting_coins", "enemy_team"
        ])
        for s in scenarios:
            sc_writer.writerow([
                sanitize_cell(s.id),
                sanitize_cell(s.name),
                sanitize_cell(s.description),
                sanitize_cell(s.lanes),
                sanitize_cell(s.ticks),
                sanitize_cell(s.objective.type),
                sanitize_cell(s.objective.min_survivors),
                sanitize_cell(s.starting_coins),
                sanitize_cell(";".join(s.enemy_team)),
            ])
        zf.writestr("scenarios.csv", sc_out.getvalue().encode("utf-8"))

        # hazards.csv
        haz_out = io.StringIO()
        haz_writer = csv.writer(haz_out, lineterminator="\r\n")
        haz_writer.writerow(["scenario_id", "tick", "type", "lane", "params_json"])
        for s in scenarios:
            for h in s.hazard_schedule:
                haz_writer.writerow([
                    sanitize_cell(s.id),
                    sanitize_cell(h.tick),
                    sanitize_cell(h.type),
                    sanitize_cell(h.lane),
                    sanitize_cell(json.dumps(h.params)),
                ])
        zf.writestr("hazards.csv", haz_out.getvalue().encode("utf-8"))

        # map_tiles.csv
        tile_out = io.StringIO()
        tile_writer = csv.writer(tile_out, lineterminator="\r\n")
        tile_writer.writerow(["scenario_id", "lane", "tile_index", "tile_type"])
        for s in scenarios:
            for t in s.map:
                tile_writer.writerow([
                    sanitize_cell(s.id),
                    sanitize_cell(t.lane),
                    sanitize_cell(t.tile_index),
                    sanitize_cell(t.tile_type),
                ])
        zf.writestr("map_tiles.csv", tile_out.getvalue().encode("utf-8"))

    return zip_buffer.getvalue()


def export_scenarios_json(scenarios: List[Scenario]) -> str:
    return json.dumps([s.model_dump() for s in scenarios], indent=2)


def export_battles_zip(battles: List[BattleRecord]) -> bytes:
    """Creates a zip containing battles.csv and battle_events.csv."""
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # battles.csv
        b_out = io.StringIO()
        b_writer = csv.writer(b_out, lineterminator="\r\n")
        b_writer.writerow([
            "battle_id", "scenario_id", "seed", "engine_version",
            "player_team", "personality", "outcome", "ticks_elapsed", "survivors", "coins_left"
        ])
        for b in battles:
            b_writer.writerow([
                sanitize_cell(b.battle_id),
                sanitize_cell(b.scenario_id),
                sanitize_cell(b.seed),
                sanitize_cell(b.engine_version),
                sanitize_cell(";".join(b.player_team)),
                sanitize_cell(b.personality),
                sanitize_cell(b.outcome),
                sanitize_cell(b.ticks_elapsed),
                sanitize_cell(b.survivors),
                sanitize_cell(b.coins_left),
            ])
        zf.writestr("battles.csv", b_out.getvalue().encode("utf-8"))

        # battle_events.csv
        ev_out = io.StringIO()
        ev_writer = csv.writer(ev_out, lineterminator="\r\n")
        ev_writer.writerow([
            "battle_id", "tick", "actor", "action", "target", "damage", "hp_after", "coin_change", "event_type",
            "lane", "tile", "coin_before", "coin_after", "chosen_action", "options_considered"
        ])
        for b in battles:
            for ev in b.events:
                lane = ev.position.get("lane", 0) if isinstance(ev.position, dict) else getattr(ev.position, "lane", 0)
                tile = ev.position.get("tile", 0) if isinstance(ev.position, dict) else getattr(ev.position, "tile", 0)
                opts_json = json.dumps(ev.options_considered) if ev.options_considered else ""
                ev_writer.writerow([
                    sanitize_cell(b.battle_id),
                    sanitize_cell(ev.tick),
                    sanitize_cell(ev.actor or ""),
                    sanitize_cell(ev.action),
                    sanitize_cell(ev.target or ""),
                    sanitize_cell(ev.damage),
                    sanitize_cell(ev.hp_after),
                    sanitize_cell(ev.coin_change),
                    sanitize_cell(ev.event_type),
                    sanitize_cell(lane),
                    sanitize_cell(tile),
                    sanitize_cell(ev.coin_before),
                    sanitize_cell(ev.coin_after),
                    sanitize_cell(ev.chosen_action or ""),
                    sanitize_cell(opts_json),
                ])
        zf.writestr("battle_events.csv", ev_out.getvalue().encode("utf-8"))

    return zip_buffer.getvalue()


def export_battles_json(battles: List[BattleRecord]) -> str:
    return json.dumps([b.model_dump() for b in battles], indent=2)
