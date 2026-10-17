"""Strict validation of creature rosters, scenarios, and battles (JSON, CSV, ZIP)."""

import json
from typing import Dict, List, Any
from app.engine.models import (
    Creature,
    CreatureType,
    Scenario,
    ScenarioObjective,
    HazardSchedule,
    MapTile,
    BattleRecord,
    Event,
)
from app.storage import db
from app.uploads.parsers import parse_csv_content, parse_json_content

MAX_ERRORS = 100
VALID_CREATURE_TYPES = {"fire", "water", "grass", "electric", "stone"}
VALID_EVENT_TYPES = {"hazard", "move", "status", "pickup", "death", "objective", "info", "block"}
VALID_TILE_TYPES = {"normal", "pipe", "question_block", "hazard_zone", "exit", "lava", "coin_cache"}
VALID_OBJECTIVE_TYPES = {"reach_exit", "defeat_all", "collect_coins", "survive_ticks"}


def validate_creatures_data(
    file_bytes: bytes,
    filename: str,
) -> Dict[str, Any]:
    """Validates creatures uploaded as JSON or CSV."""
    errors: List[str] = []
    warnings: List[str] = []
    creatures: List[Creature] = []
    seen_ids = set()

    is_json = filename.lower().endswith(".json")

    if is_json:
        data, parse_errs = parse_json_content(file_bytes)
        if parse_errs:
            return {"valid": False, "errors": parse_errs, "warnings": [], "row_count": 0, "data": []}
        if isinstance(data, dict):
            items = [data]
        elif isinstance(data, list):
            items = data
        else:
            return {"valid": False, "errors": [f"{filename}: Expected JSON object or list of objects"], "warnings": [], "row_count": 0, "data": []}

        for idx, item in enumerate(items, start=1):
            if len(errors) >= MAX_ERRORS:
                break
            cid = str(item.get("id", "")).strip()
            name = str(item.get("name", "")).strip()
            ctype = str(item.get("type", "")).strip().lower()
            hp = item.get("hp")
            speed = item.get("speed")
            attack = item.get("attack", 30)

            if not cid:
                errors.append(f"{filename} row {idx}: missing required field 'id'")
            elif cid in seen_ids:
                errors.append(f"{filename} row {idx}: duplicate creature id '{cid}'")
            seen_ids.add(cid)

            if not name:
                errors.append(f"{filename} row {idx}: missing required field 'name'")

            if ctype not in VALID_CREATURE_TYPES:
                errors.append(f"{filename} row {idx}: invalid creature type '{ctype}', must be one of {sorted(VALID_CREATURE_TYPES)}")

            if hp is None or not isinstance(hp, (int, float)) or hp < 1 or hp > 500:
                errors.append(f"{filename} row {idx}: hp must be 1–500")

            if speed is None or not isinstance(speed, (int, float)) or speed < 1 or speed > 100:
                errors.append(f"{filename} row {idx}: speed must be 1–100")

            if not errors:
                try:
                    c = Creature(**item)
                    creatures.append(c)
                except Exception as e:
                    errors.append(f"{filename} row {idx}: {str(e)}")

        return {
            "valid": len(errors) == 0,
            "errors": errors[:MAX_ERRORS],
            "warnings": warnings,
            "row_count": len(items),
            "data": creatures if len(errors) == 0 else [],
        }

    # CSV path
    rows, parse_errs, parse_warns = parse_csv_content(file_bytes, filename)
    errors.extend(parse_errs)
    warnings.extend(parse_warns)

    for row in rows:
        if len(errors) >= MAX_ERRORS:
            break
        line = row["_line_num"]
        cid = row.get("id", "").strip()
        name = row.get("name", "").strip()
        ctype = row.get("type", "").strip().lower()
        hp_str = row.get("hp", "").strip()
        speed_str = row.get("speed", "").strip()
        atk_str = row.get("attack", "30").strip()
        moves_str = row.get("moves", "").strip()

        if not cid:
            errors.append(f"{filename} line {line}: missing required field 'id'")
        elif cid in seen_ids:
            errors.append(f"{filename} line {line}: duplicate creature id '{cid}'")
        seen_ids.add(cid)

        if not name:
            errors.append(f"{filename} line {line}: missing required field 'name'")

        if ctype not in VALID_CREATURE_TYPES:
            errors.append(f"{filename} line {line}: invalid creature type '{ctype}', must be one of {sorted(VALID_CREATURE_TYPES)}")

        try:
            hp = int(hp_str)
            if hp < 1 or hp > 500:
                errors.append(f"{filename} line {line}: hp must be 1–500")
        except ValueError:
            errors.append(f"{filename} line {line}: hp must be 1–500")
            hp = 100

        try:
            speed = int(speed_str)
            if speed < 1 or speed > 100:
                errors.append(f"{filename} line {line}: speed must be 1–100")
        except ValueError:
            errors.append(f"{filename} line {line}: speed must be 1–100")
            speed = 50

        try:
            attack = int(atk_str) if atk_str else 30
        except ValueError:
            errors.append(f"{filename} line {line}: attack must be an integer")
            attack = 30

        if len(errors) == 0:
            moves = [m.strip() for m in moves_str.split(";") if m.strip()]
            creatures.append(
                Creature(
                    id=cid,
                    name=name,
                    type=CreatureType(ctype),
                    hp=hp,
                    attack=attack,
                    speed=speed,
                    moves=moves,
                )
            )

    return {
        "valid": len(errors) == 0,
        "errors": errors[:MAX_ERRORS],
        "warnings": warnings,
        "row_count": len(rows),
        "data": creatures if len(errors) == 0 else [],
    }


def validate_scenarios_bundle(
    files: Dict[str, bytes],
) -> Dict[str, Any]:
    """Validates scenarios, hazards, and map_tiles bundle."""
    errors: List[str] = []
    warnings: List[str] = []

    # Check for single json scenario
    if len(files) == 1 and list(files.keys())[0].lower().endswith(".json"):
        fname, fbytes = list(files.items())[0]
        data, parse_errs = parse_json_content(fbytes)
        if parse_errs:
            return {"valid": False, "errors": parse_errs, "warnings": [], "row_count": 0, "data": []}
        scen_items = [data] if isinstance(data, dict) else data
        scenarios = []
        for idx, item in enumerate(scen_items, start=1):
            try:
                sc = Scenario(**item)
                # Verify enemy team creatures exist
                for enemy_id in sc.enemy_team:
                    if not db.get_creature(enemy_id):
                        errors.append(f"{fname} row {idx}: unknown creature id '{enemy_id}' in enemy_team")
                scenarios.append(sc)
            except Exception as e:
                errors.append(f"{fname} row {idx}: {str(e)}")
        return {
            "valid": len(errors) == 0,
            "errors": errors[:MAX_ERRORS],
            "warnings": warnings,
            "row_count": len(scen_items),
            "data": scenarios if len(errors) == 0 else [],
        }

    # CSV multi-file bundle
    req_files = ["scenarios.csv"]
    for req in req_files:
        if req not in files and not any(k.lower().endswith(req) for k in files):
            errors.append(f"Missing required bundle file: '{req}'")

    if errors:
        return {"valid": False, "errors": errors, "warnings": [], "row_count": 0, "data": []}

    scenarios_fname = next(k for k in files if k.lower().endswith("scenarios.csv"))
    scen_rows, s_errs, s_warns = parse_csv_content(files[scenarios_fname], scenarios_fname)
    errors.extend(s_errs)
    warnings.extend(s_warns)

    scenario_ids = set()
    scenarios_map: Dict[str, Scenario] = {}

    for row in scen_rows:
        line = row["_line_num"]
        sid = row.get("id", "").strip()
        name = row.get("name", "").strip()
        desc = row.get("description", "").strip()
        obj_type = row.get("objective_type", "reach_exit").strip().lower()
        enemy_str = row.get("enemy_team", "").strip()

        if not sid:
            errors.append(f"{scenarios_fname} line {line}: missing required field 'id'")
        elif sid in scenario_ids:
            errors.append(f"{scenarios_fname} line {line}: duplicate scenario id '{sid}'")
        scenario_ids.add(sid)

        if not name:
            errors.append(f"{scenarios_fname} line {line}: missing required field 'name'")

        if obj_type not in VALID_OBJECTIVE_TYPES:
            errors.append(f"{scenarios_fname} line {line}: invalid objective_type '{obj_type}'")

        try:
            lanes = int(row.get("lanes", "3"))
            ticks = int(row.get("ticks", "40"))
            min_surv = int(row.get("objective_min_survivors", "2"))
            coins = int(row.get("starting_coins", "20"))
        except ValueError as e:
            errors.append(f"{scenarios_fname} line {line}: numeric parse error: {str(e)}")
            lanes, ticks, min_surv, coins = 3, 40, 2, 20

        enemy_team = [e.strip() for e in enemy_str.split(";") if e.strip()]
        for enemy_id in enemy_team:
            if not db.get_creature(enemy_id):
                errors.append(f"{scenarios_fname} line {line}: unknown creature id '{enemy_id}' in enemy_team")

        if len(errors) == 0:
            scenarios_map[sid] = Scenario(
                id=sid,
                name=name,
                description=desc,
                lanes=lanes,
                ticks=ticks,
                objective=ScenarioObjective(type=obj_type, min_survivors=min_surv),
                starting_resources={"coins": coins},
                enemy_team=enemy_team,
            )

    # Hazards CSV (optional or part of bundle)
    haz_fname = next((k for k in files if k.lower().endswith("hazards.csv")), None)
    if haz_fname:
        haz_rows, h_errs, h_warns = parse_csv_content(files[haz_fname], haz_fname)
        errors.extend(h_errs)
        warnings.extend(h_warns)

        for row in haz_rows:
            line = row["_line_num"]
            sid = row.get("scenario_id", "").strip()
            htick_str = row.get("tick", "").strip()
            htype = row.get("type", "").strip()
            hlane_str = row.get("lane", "0").strip()
            params_raw = row.get("params_json", "{}").strip()

            if sid not in scenario_ids:
                errors.append(f"{haz_fname} line {line}: unknown scenario_id '{sid}' (orphan row)")

            try:
                htick = int(htick_str)
                hlane = int(hlane_str)
            except ValueError:
                errors.append(f"{haz_fname} line {line}: tick and lane must be integers")
                htick, hlane = 1, 0

            try:
                params = json.loads(params_raw) if params_raw else {}
                if not isinstance(params, dict):
                    errors.append(f"{haz_fname} line {line}: params_json must be a JSON object")
            except Exception as e:
                errors.append(f"{haz_fname} line {line}: invalid params_json ({str(e)})")
                params = {}

            if len(errors) == 0 and sid in scenarios_map:
                scenarios_map[sid].hazard_schedule.append(
                    HazardSchedule(scenario_id=sid, tick=htick, type=htype, lane=hlane, params=params)
                )

    # Map Tiles CSV
    tiles_fname = next((k for k in files if k.lower().endswith("map_tiles.csv")), None)
    if tiles_fname:
        t_rows, t_errs, t_warns = parse_csv_content(files[tiles_fname], tiles_fname)
        errors.extend(t_errs)
        warnings.extend(t_warns)

        for row in t_rows:
            line = row["_line_num"]
            sid = row.get("scenario_id", "").strip()
            lane_str = row.get("lane", "0").strip()
            idx_str = row.get("tile_index", "0").strip()
            ttype = row.get("tile_type", "normal").strip().lower()

            if sid not in scenario_ids:
                errors.append(f"{tiles_fname} line {line}: unknown scenario_id '{sid}' (orphan row)")

            if ttype not in VALID_TILE_TYPES:
                errors.append(f"{tiles_fname} line {line}: invalid tile_type '{ttype}'")

            try:
                lane = int(lane_str)
                tile_idx = int(idx_str)
            except ValueError:
                errors.append(f"{tiles_fname} line {line}: lane and tile_index must be integers")
                lane, tile_idx = 0, 0

            if len(errors) == 0 and sid in scenarios_map:
                scenarios_map[sid].map.append(
                    MapTile(scenario_id=sid, lane=lane, tile_index=tile_idx, tile_type=ttype)
                )

    return {
        "valid": len(errors) == 0,
        "errors": errors[:MAX_ERRORS],
        "warnings": warnings,
        "row_count": len(scenarios_map),
        "data": list(scenarios_map.values()) if len(errors) == 0 else [],
    }


def validate_battles_bundle(
    files: Dict[str, bytes],
) -> Dict[str, Any]:
    """Validates battle records and event logs from JSON or CSV bundle."""
    errors: List[str] = []
    warnings: List[str] = []

    # Single JSON battles file
    if len(files) == 1 and list(files.keys())[0].lower().endswith(".json"):
        fname, fbytes = list(files.items())[0]
        data, parse_errs = parse_json_content(fbytes)
        if parse_errs:
            return {"valid": False, "errors": parse_errs, "warnings": [], "row_count": 0, "data": []}
        battles_raw = [data] if isinstance(data, dict) else data
        battles = []
        for idx, b_item in enumerate(battles_raw, start=1):
            try:
                b = BattleRecord(**b_item)
                # Verify ticks monotonicity
                prev_tick = 0
                for ev in b.events:
                    if ev.tick < prev_tick:
                        errors.append(f"{fname} row {idx}: tick {ev.tick} went backward from {prev_tick}")
                        break
                    prev_tick = ev.tick
                battles.append(b)
            except Exception as e:
                errors.append(f"{fname} row {idx}: {str(e)}")

        return {
            "valid": len(errors) == 0,
            "errors": errors[:MAX_ERRORS],
            "warnings": warnings,
            "row_count": len(battles_raw),
            "data": battles if len(errors) == 0 else [],
        }

    # CSV multi-file bundle (battles.csv + battle_events.csv)
    b_fname = next((k for k in files if k.lower().endswith("battles.csv")), None)
    if not b_fname:
        return {"valid": False, "errors": ["Missing required bundle file: 'battles.csv'"], "warnings": [], "row_count": 0, "data": []}

    b_rows, b_errs, b_warns = parse_csv_content(files[b_fname], b_fname)
    errors.extend(b_errs)
    warnings.extend(b_warns)

    battles_map: Dict[str, BattleRecord] = {}
    battle_ids = set()

    for row in b_rows:
        line = row["_line_num"]
        bid = row.get("battle_id", "").strip()
        sid = row.get("scenario_id", "").strip()
        seed_str = row.get("seed", "1000").strip()
        engine_ver = row.get("engine_version", "1.0.0").strip()
        p_team_str = row.get("player_team", "").strip()
        pers = row.get("personality", "opportunistic").strip().lower()
        outcome = row.get("outcome", "loss").strip().lower()

        if not bid:
            errors.append(f"{b_fname} line {line}: missing required field 'battle_id'")
        elif bid in battle_ids:
            errors.append(f"{b_fname} line {line}: duplicate battle_id '{bid}'")
        battle_ids.add(bid)

        if outcome not in ("win", "loss"):
            errors.append(f"{b_fname} line {line}: outcome must be 'win' or 'loss'")

        try:
            seed = int(seed_str)
            ticks_el = int(row.get("ticks_elapsed", "40"))
            surv = int(row.get("survivors", "0"))
            coins = int(row.get("coins_left", "0"))
        except ValueError as e:
            errors.append(f"{b_fname} line {line}: numeric parse error: {str(e)}")
            seed, ticks_el, surv, coins = 1000, 40, 0, 0

        p_team = [p.strip() for p in p_team_str.split(";") if p.strip()]

        if len(errors) == 0:
            battles_map[bid] = BattleRecord(
                battle_id=bid,
                scenario_id=sid,
                seed=seed,
                engine_version=engine_ver,
                player_team=p_team,
                personality=pers if pers in ("aggressive", "defensive", "opportunistic") else "opportunistic",
                outcome=outcome,
                ticks_elapsed=ticks_el,
                survivors=surv,
                coins_left=coins,
                events=[],
            )

    # battle_events.csv
    ev_fname = next((k for k in files if k.lower().endswith("battle_events.csv")), None)
    if ev_fname:
        ev_rows, ev_errs, ev_warns = parse_csv_content(files[ev_fname], ev_fname)
        errors.extend(ev_errs)
        warnings.extend(ev_warns)

        battle_last_tick: Dict[str, int] = {}

        for row in ev_rows:
            line = row["_line_num"]
            bid = row.get("battle_id", "").strip()
            tick_str = row.get("tick", "1").strip()
            actor = row.get("actor", "").strip() or None
            action = row.get("action", "").strip()
            target = row.get("target", "").strip() or None
            dmg_str = row.get("damage", "0").strip()
            hp_str = row.get("hp_after", "0").strip()
            coin_str = row.get("coin_change", "0").strip()
            etype = row.get("event_type", "info").strip().lower()

            if bid not in battle_ids:
                errors.append(f"{ev_fname} line {line}: unknown battle_id '{bid}' (orphan event row)")

            if etype not in VALID_EVENT_TYPES:
                errors.append(f"{ev_fname} line {line}: unknown event_type '{etype}'")

            try:
                tick = int(tick_str)
                damage = int(dmg_str) if dmg_str else 0
                hp_after = int(hp_str) if hp_str else 0
                coin_change = int(coin_str) if coin_str else 0
            except ValueError as e:
                errors.append(f"{ev_fname} line {line}: numeric parse error: {str(e)}")
                tick, damage, hp_after, coin_change = 1, 0, 0, 0

            # Tick monotonicity check within battle
            if bid in battle_last_tick and tick < battle_last_tick[bid]:
                errors.append(f"{ev_fname} line {line}: tick {tick} went backward from {battle_last_tick[bid]} in battle '{bid}'")
            battle_last_tick[bid] = tick

            if len(errors) == 0 and bid in battles_map:
                battles_map[bid].events.append(
                    Event(
                        battle_id=bid,
                        tick=tick,
                        actor=actor,
                        action=action,
                        target=target,
                        damage=damage,
                        hp_after=hp_after,
                        coin_change=coin_change,
                        event_type=etype,
                    )
                )

    return {
        "valid": len(errors) == 0,
        "errors": errors[:MAX_ERRORS],
        "warnings": warnings,
        "row_count": len(battles_map),
        "data": list(battles_map.values()) if len(errors) == 0 else [],
    }
