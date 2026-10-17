"""Unit tests for the deterministic battle simulation engine."""

import pytest
from app.engine.models import Creature, Scenario, CreatureType, CounterfactualRequest
from app.engine.rng import SeededRNG
from app.engine.tick import TickEngine
from app.storage import Storage


@pytest.fixture
def test_db(tmp_path):
    db_file = tmp_path / "test_sim.db"
    return Storage(db_file)


def test_seeded_rng_determinism():
    rng1 = SeededRNG(42)
    rng2 = SeededRNG(42)
    seq1 = [rng1.randint(1, 100) for _ in range(50)]
    seq2 = [rng2.randint(1, 100) for _ in range(50)]
    assert seq1 == seq2

    rng3 = SeededRNG(999)
    seq3 = [rng3.randint(1, 100) for _ in range(50)]
    assert seq1 != seq3


def test_engine_determinism(test_db):
    scenario = test_db.get_scenario("pipe_ambush")
    assert scenario is not None

    player_team = [
        test_db.get_creature("ember_fox"),
        test_db.get_creature("bubble_toad"),
    ]
    enemy_team = [test_db.get_creature(cid) for cid in scenario.enemy_team]

    # Run 1
    engine1 = TickEngine(scenario, player_team, enemy_team, seed=12345, personality="opportunistic")
    result1 = engine1.run()

    # Run 2 with identical seed and setup
    engine2 = TickEngine(scenario, player_team, enemy_team, seed=12345, personality="opportunistic")
    result2 = engine2.run()

    assert result1.outcome == result2.outcome
    assert result1.ticks_elapsed == result2.ticks_elapsed
    assert result1.survivors == result2.survivors
    assert result1.coins_left == result2.coins_left
    assert len(result1.events) == len(result2.events)

    for ev1, ev2 in zip(result1.events, result2.events):
        assert ev1.tick == ev2.tick
        assert ev1.actor == ev2.actor
        assert ev1.action == ev2.action
        assert ev1.damage == ev2.damage
        assert ev1.hp_after == ev2.hp_after
        assert ev1.ko == ev2.ko


def test_counterfactual_rerun(test_db):
    scenario = test_db.get_scenario("pipe_ambush")
    player_team = [test_db.get_creature("ember_fox"), test_db.get_creature("bubble_toad")]
    enemy_team = [test_db.get_creature(cid) for cid in scenario.enemy_team]

    # Baseline run
    baseline_eng = TickEngine(scenario, player_team, enemy_team, seed=777)
    baseline_res = baseline_eng.run()
    assert baseline_res.outcome in ("win", "loss")

    # Counterfactual intervention at tick 2: switch lane
    cf = CounterfactualRequest(tick=2, actor="ember_fox", action_type="move_lane", target_lane=2)
    cf_eng = TickEngine(scenario, player_team, enemy_team, seed=777, counterfactual=cf)
    cf_res = cf_eng.run()

    # Should execute and produce a valid battle log containing the counterfactual marker
    cf_events = [e for e in cf_res.events if "[Counterfactual]" in e.action]
    assert len(cf_events) > 0
    assert cf_events[0].tick == 2


def test_scenario_validation_strict():
    # Valid scenario
    valid_data = {
        "id": "valid_scen",
        "name": "Valid Scenario",
        "description": "A valid test scenario",
        "lanes": 3,
        "ticks": 40,
        "map": [],
        "hazard_schedule": [],
        "objective": {"type": "reach_exit", "min_survivors": 2},
        "starting_resources": {"coins": 20},
        "enemy_team": ["pipe_lurker"],
    }
    scen = Scenario(**valid_data)
    assert scen.id == "valid_scen"

    # Invalid scenario: invalid objective type
    with pytest.raises(Exception):
        bad_data = dict(valid_data, objective={"type": "invalid_mode"})
        Scenario(**bad_data)

    # Invalid creature stats: HP outside 1-500
    with pytest.raises(Exception):
        Creature(id="bad_creature", name="Bad", type=CreatureType.FIRE, hp=999, attack=30, speed=50)

    with pytest.raises(Exception):
        Creature(id="zero_speed", name="Bad", type=CreatureType.FIRE, hp=100, attack=30, speed=0)


def test_event_log_prerequisites_all_fields_present(test_db):
    """Verifies each tick's event record contains all required fields, and decisions include options and chosen action."""
    scenario = test_db.get_scenario("pipe_ambush")
    player_team = [test_db.get_creature("ember_fox"), test_db.get_creature("bubble_toad")]
    enemy_team = [test_db.get_creature(cid) for cid in scenario.enemy_team]

    engine = TickEngine(scenario, player_team, enemy_team, seed=1000)
    battle = engine.run()

    assert len(battle.events) > 0

    required_event_fields = [
        "battle_id", "tick", "actor", "action", "target", "damage",
        "hp_before", "hp_after", "position", "status_change",
        "hazard_hit", "pickup", "ko", "coin_before", "coin_after", "event_type"
    ]

    has_decision_event = False

    for ev in battle.events:
        dump = ev.model_dump()
        for field in required_event_fields:
            assert field in dump, f"Missing required field '{field}' in event: {dump}"

        assert isinstance(dump["position"], dict)
        assert "lane" in dump["position"]
        assert "tile" in dump["position"]
        assert isinstance(dump["position"]["lane"], int)
        assert isinstance(dump["position"]["tile"], int)
        assert isinstance(dump["coin_before"], int)
        assert isinstance(dump["coin_after"], int)
        assert isinstance(dump["damage"], int)
        assert isinstance(dump["ko"], bool)

        if ev.event_type == "decision":
            has_decision_event = True
            assert ev.options_considered is not None
            assert len(ev.options_considered) > 0
            for opt in ev.options_considered:
                assert "action" in opt
                assert "score" in opt
                assert isinstance(opt["score"], (int, float))
            assert ev.chosen_action is not None
            assert len(ev.chosen_action) > 0

    assert has_decision_event, "Battle log must contain decision events with options considered"

