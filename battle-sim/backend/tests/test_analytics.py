import pytest
from starlette.testclient import TestClient
from app.main import app
from app.engine.models import (
    BattleRecord,
    Event,
    Creature,
    CreatureType,
    Scenario,
    MapTile,
    ScenarioObjective,
)
from app.analytics.descriptive import (
    battle_summary,
    creature_stats,
    hp_timeline,
    position_heatmap,
)
from app.analytics.diagnostic import (
    cause_trace,
    decision_audit,
    counterfactual,
)
from app.analytics.predictive import (
    compute_confidence_interval,
    predict_win_rate,
    predict_from_state,
)
from app.analytics.balance import (
    balance_report,
    sensitivity_sweep,
)
from app.storage import db

client = TestClient(app)


def test_heroes_directory_endpoint():
    """Verify GET /api/heroes returns rich profiles for original creatures only."""
    res = client.get("/api/heroes")
    assert res.status_code == 200
    heroes = res.json()
    assert len(heroes) >= 10

    known_ids = {h["id"] for h in heroes}
    assert "ember_fox" in known_ids
    assert "bubble_toad" in known_ids
    assert "moss_shroom" in known_ids
    assert "crag_golem" in known_ids
    assert "volt_hedgehog" in known_ids

    # Verify no trademarked third-party names
    forbidden_terms = ["pikachu", "charizard", "mario", "luigi", "bowser", "squirtle"]
    for h in heroes:
        for term in forbidden_terms:
            assert term not in h["id"].lower()
            assert term not in h["name"].lower()

        assert "role" in h
        assert "description" in h
        assert "moves_detail" in h
        assert len(h["moves_detail"]) > 0
        assert h["hp"] > 0
        assert h["attack"] > 0
        assert h["speed"] > 0


def test_descriptive_hand_built_battle():
    """Verify descriptive statistics on a hand-constructed deterministic battle record."""
    events = [
        Event(tick=1, actor="ember_fox", target="crag_golem", action="flame_spit", damage=25, lane=0, tile=2, coin_after=20),
        Event(tick=1, actor="crag_golem", target="ember_fox", action="pebble_throw", damage=30, lane=0, tile=2, coin_after=20),
        Event(tick=2, actor="ember_fox", target="crag_golem", action="ember_burst", damage=40, lane=0, tile=2, coin_after=18),
        Event(tick=3, actor="crag_golem", target="ember_fox", action="boulder_slam", damage=90, lane=0, tile=2, coin_after=18),
        Event(tick=3, actor="system", action="elimination", target="ember_fox", lane=0, tile=2),
    ]

    record = BattleRecord(
        battle_id="test_b1",
        scenario_id="pipe_ambush",
        outcome="loss",
        ticks_elapsed=3,
        survivors=["crag_golem"],
        coins_left=18,
        events=events,
        source="simulated",
    )

    summary = battle_summary(record)
    assert summary.outcome == "loss"
    assert summary.ticks_elapsed == 3
    assert summary.player_damage_dealt == 65
    assert summary.enemy_damage_dealt == 120
    assert summary.pacing_rating == "fast"

    c_stats = creature_stats(record)
    c_map = {c.creature_id: c for c in c_stats}
    assert "ember_fox" in c_map
    assert c_map["ember_fox"].damage_dealt == 65
    assert c_map["ember_fox"].damage_taken == 120
    assert not c_map["ember_fox"].survived

    h_map = position_heatmap(record, total_lanes=2, max_tiles=5)
    assert h_map.total_points > 0
    assert len(h_map.heatmap) == 2


def test_diagnostic_cause_trace_and_decision_audit():
    """Verify root cause analysis for defeated creatures and AI decision audit."""
    events = [
        Event(
            tick=1,
            actor="ember_fox",
            event_type="decision",
            action="flame_spit",
            chosen_action="flame_spit",
            options_considered=[
                {"action": "flame_spit", "score": 20.0},
                {"action": "fire_shield", "score": 35.0},
            ],
            lane=0,
            tile=1,
        ),
        Event(
            tick=2,
            actor="crag_golem",
            target="ember_fox",
            action="boulder_slam",
            damage=120,
            lane=0,
            tile=1,
        ),
        Event(
            tick=2,
            actor="system",
            action="elimination",
            target="ember_fox",
            lane=0,
            tile=1,
        ),
    ]

    record = BattleRecord(
        battle_id="test_diag",
        scenario_id="pipe_ambush",
        outcome="loss",
        ticks_elapsed=2,
        survivors=["crag_golem"],
        coins_left=20,
        events=events,
    )

    traces = cause_trace(record)
    assert len(traces) == 1
    assert traces[0].creature_id == "ember_fox"
    assert traces[0].fatal_tick == 2
    assert traces[0].killer == "crag_golem"

    audit = decision_audit(record, threshold=0.10)
    assert audit.total_decisions == 1
    assert len(audit.flagged_decisions) == 1
    assert audit.flagged_decisions[0].best_action == "fire_shield"
    assert audit.flagged_decisions[0].score_gap == 15.0


def test_wilson_and_normal_confidence_intervals():
    """Verify Wilson interval is triggered on extreme win rates and normal approximation otherwise."""
    # Extreme low (0 wins out of 100) -> Wilson
    ci_half_0, lower_0, upper_0, method_0 = compute_confidence_interval(0, 100)
    assert method_0 == "wilson"
    assert lower_0 >= 0.0
    assert upper_0 > 0.0

    # Extreme high (100 wins out of 100) -> Wilson
    ci_half_100, lower_100, upper_100, method_100 = compute_confidence_interval(100, 100)
    assert method_100 == "wilson"
    assert upper_100 <= 1.0

    # Moderate (50 wins out of 100) -> Normal
    ci_half_50, lower_50, upper_50, method_50 = compute_confidence_interval(50, 100)
    assert method_50 == "normal"
    assert 0.40 <= lower_50 <= 0.50
    assert 0.50 <= upper_50 <= 0.60


def test_predict_from_state_hidden_information_privacy():
    """Verify predict_from_state respects hidden-information boundaries."""
    scenario = db.get_scenario("pipe_ambush")
    all_c = {c.id: c for c in db.get_all_creatures()}

    # Visible state only
    visible_state = {
        "player_team": ["ember_fox", "bubble_toad"],
        "creature_hps": {"ember_fox": 80, "bubble_toad": 120},
        "coins": 15,
        "current_tick": 4,
    }

    pred = predict_from_state(visible_state, scenario, all_c, seed_count=30)
    assert 0.0 <= pred.win_rate <= 1.0
    assert pred.visible_player_count == 2
    assert pred.visible_enemy_count > 0


def test_balance_report_and_dominant_strategy():
    """Verify balance report detects target band (25%-75%) and flags dominant strategies."""
    scenario = db.get_scenario("pipe_ambush")
    all_c = {c.id: c for c in db.get_all_creatures()}

    report = balance_report(scenario, all_c)
    assert report.scenario_id == "pipe_ambush"
    assert len(report.archetypes) > 0
    assert report.target_band_min == 25.0
    assert report.target_band_max == 75.0

    # Sensitivity sweep
    sweep = sensitivity_sweep(scenario, "enemy_hp_multiplier", 0.6, 1.4, steps=3, all_creatures_map=all_c)
    assert len(sweep.points) == 3
    assert sweep.parameter == "enemy_hp_multiplier"
