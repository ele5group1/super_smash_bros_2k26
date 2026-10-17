"""Battle replay verification and event log match checks."""

from typing import Dict, Any
from app.engine.models import BattleRecord
from app.engine.tick import TickEngine
from app.storage import db


def verify_battle_replay(battle: BattleRecord) -> Dict[str, Any]:
    """
    Replays an uploaded battle through the tick engine and compares
    the simulated log against the uploaded event log.
    Returns:
    {
        "battle_id": str,
        "status": "match" | "mismatch" | "not_replayable",
        "first_differing_tick": Optional[int],
        "details": str
    }
    """
    if battle.seed is None or not battle.scenario_id or not battle.player_team:
        return {
            "battle_id": battle.battle_id,
            "status": "not_replayable",
            "first_differing_tick": None,
            "details": "Missing required fields (seed, scenario_id, or player_team) for engine replay.",
        }

    scenario = db.get_scenario(battle.scenario_id)
    if not scenario:
        return {
            "battle_id": battle.battle_id,
            "status": "not_replayable",
            "first_differing_tick": None,
            "details": f"Unknown scenario_id '{battle.scenario_id}' in engine database.",
        }

    player_creatures = []
    for cid in battle.player_team:
        c = db.get_creature(cid)
        if not c:
            return {
                "battle_id": battle.battle_id,
                "status": "not_replayable",
                "first_differing_tick": None,
                "details": f"Unknown creature '{cid}' in player_team.",
            }
        player_creatures.append(c)

    enemy_creatures = []
    for cid in scenario.enemy_team:
        c = db.get_creature(cid)
        if not c:
            return {
                "battle_id": battle.battle_id,
                "status": "not_replayable",
                "first_differing_tick": None,
                "details": f"Unknown enemy creature '{cid}' for scenario.",
            }
        enemy_creatures.append(c)

    # Replay through engine
    engine = TickEngine(
        scenario=scenario,
        player_creatures=player_creatures,
        enemy_creatures=enemy_creatures,
        seed=battle.seed,
        personality=battle.personality,
    )
    sim_battle = engine.run()

    if sim_battle.outcome != battle.outcome:
        return {
            "battle_id": battle.battle_id,
            "status": "mismatch",
            "first_differing_tick": min(battle.ticks_elapsed, sim_battle.ticks_elapsed),
            "details": f"Outcome mismatch: uploaded was '{battle.outcome}', replayed engine produced '{sim_battle.outcome}'.",
        }

    # Compare event logs
    uploaded_events = [e for e in battle.events if e.event_type in ("hazard", "move", "status", "death", "decision")]
    sim_events = [e for e in sim_battle.events if e.event_type in ("hazard", "move", "status", "death", "decision")]

    min_len = min(len(uploaded_events), len(sim_events))
    for i in range(min_len):
        u = uploaded_events[i]
        s = sim_events[i]
        if (
            u.tick != s.tick
            or u.damage != s.damage
            or (u.target and s.target and u.target != s.target)
            or u.ko != s.ko
        ):
            return {
                "battle_id": battle.battle_id,
                "status": "mismatch",
                "first_differing_tick": u.tick,
                "details": f"Event mismatch at tick {u.tick}: uploaded action '{u.action}' vs engine '{s.action}'.",
            }

    if len(uploaded_events) != len(sim_events):
        diff_tick = uploaded_events[min_len].tick if len(uploaded_events) > min_len else sim_events[min_len].tick
        return {
            "battle_id": battle.battle_id,
            "status": "mismatch",
            "first_differing_tick": diff_tick,
            "details": f"Event log length mismatch: uploaded had {len(uploaded_events)} key events, engine produced {len(sim_events)}.",
        }

    return {
        "battle_id": battle.battle_id,
        "status": "match",
        "first_differing_tick": None,
        "details": "Deterministic match: engine replay perfectly reproduces uploaded battle.",
    }
