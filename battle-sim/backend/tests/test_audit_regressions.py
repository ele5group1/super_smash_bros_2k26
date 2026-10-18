"""Acceptance coverage for analytics accuracy and playable strategy integration."""
from concurrent.futures import ThreadPoolExecutor
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.storage import db, Storage
from app.engine.models import BattleRecord, Event, Scenario, ScenarioObjective, HazardSchedule
from app.engine.tick import TickEngine
from app.analytics.descriptive import hp_timeline, creature_stats
from app.analytics.diagnostic import cause_trace
from app.analytics.predictive import predict_win_rate, _PREDICTION_CACHE
from app.analytics.prescriptive import recommend_action


def test_potion_restores_real_hp_and_is_used_only_once():
    player = db.get_creature('ember_fox')
    scenario = Scenario(id='potion', name='Potion check', description='Potion regression', ticks=3,
                        objective=ScenarioObjective(type='survive_ticks', min_survivors=1, target_tick=3),
                        hazard_schedule=[HazardSchedule(tick=1, type='haunt', lane=0, params={'damage': 70})])
    result = TickEngine(scenario, [player], [], early_heal_spend=5).run()
    heal = [e for e in result.events if e.action == 'Emergency potion triggered']
    assert len(heal) == 1
    assert (heal[0].hp_before, heal[0].hp_after, heal[0].damage) == (50, 70, -20)
    assert result.coins_left == 15
    assert result.outcome == 'win'
    assert result.ticks_elapsed == 3


def test_no_coin_recommendations_and_api_budget_validation():
    scenario = db.get_scenario('pipe_ambush')
    roster = {c.id: c for c in db.get_all_creatures()}
    report = recommend_action({'player_team': ['ember_fox'], 'coins': 0}, [], scenario, roster, seed_count=10)
    assert [o['spend'] for o in report.options] == [0]
    assert all(o['avg_coins_left'] >= 0 for o in report.options)
    with TestClient(app) as client:
        for spend in (-1, 999):
            response = client.post('/api/battles', json={'scenario_id': scenario.id, 'player_team': ['ember_fox'], 'early_heal_spend': spend})
            assert response.status_code == 422
        assert client.post('/api/plan/compare', json={'scenario_id': scenario.id, 'options': [{'name':'invalid', 'team':['missing'], 'early_heal_spend':0}]}).status_code == 400
        assert client.post('/api/plan/recommend', json={'scenario_id':scenario.id, 'team':['ember_fox'], 'current_tick':4}).status_code == 422


def test_timeline_carries_true_state_and_ignores_decision_target_hp():
    record = BattleRecord(battle_id='timeline', scenario_id='custom', player_team=['a','b'],
                          outcome='win', ticks_elapsed=3, survivors=2, coins_left=0,
                          metadata={'initial_hps': {'a':160,'b':80}, 'initial_coins':5},
                          events=[Event(tick=1, actor='enemy', target='a', action='hit', damage=30, hp_before=160, hp_after=130, coin_before=5, coin_after=5),
                                  Event(tick=1, actor='b', target='a', action='decide', event_type='decision', hp_before=80, hp_after=80),
                                  Event(tick=3, actor='a', action='spend', coin_before=5, coin_after=0, coin_change=-5)])
    timeline = hp_timeline(record)
    assert [p.creatures for p in timeline.ticks] == [{'a':130,'b':80}]*3
    assert [p.coins for p in timeline.ticks] == [5,5,0]
    stats = {c.id:c for c in creature_stats(record)}
    assert stats['b'].final_hp == 80
    assert stats['a'].final_hp == 130


def test_cache_distinguishes_order_and_configuration():
    scenario = db.get_scenario('pipe_ambush')
    team = [db.get_creature(c) for c in ['ember_fox','bubble_toad']]
    enemies = [db.get_creature(c) for c in scenario.enemy_team]
    _PREDICTION_CACHE.clear()
    for squad, stage in [(team,scenario),(team[::-1],scenario),(team,scenario.model_copy(update={'ticks':1}))]:
        predict_win_rate(stage, squad, seed_count=10, enemy_creatures=enemies)
    assert len(_PREDICTION_CACHE) == 3


def test_hazard_explanation_does_not_claim_fatal_cause():
    record = BattleRecord(battle_id='cause', scenario_id='s', player_team=['a'], outcome='loss',
                          ticks_elapsed=20, coins_left=0, events=[Event(tick=1, target='a', action='hazard', hazard_hit='Boo', damage=1, hp_before=100, hp_after=99)])
    text = cause_trace(record).explanation.lower()
    assert 'may have contributed' in text
    assert 'fatal' not in text


def test_overlapping_sessions_persist_plans_forecasts_and_common_analytics():
    def play(terminal):
        with TestClient(app) as client:
            response = client.post('/api/battles', json={'scenario_id':'haunted_pipes',
                'player_team':['ember_fox','bubble_toad','moss_shroom','volt_hedgehog'],
                'seed':900000+terminal, 'early_heal_spend':5, 'terminal_id':f'test-terminal-{terminal}'})
            assert response.status_code == 200, response.text
            return response.json()['battle_id']
    with ThreadPoolExecutor(max_workers=2) as pool:
        ids = list(pool.map(play, [1,2]))
    assert ids[0] != ids[1]
    reopened = Storage(db.db_path)
    for battle_id in ids:
        battle = reopened.get_battle(battle_id)
        assert battle.metadata['early_heal_spend'] == 5
        assert battle.metadata['prediction']['seed_count'] == 100
        assert not battle.metadata['prediction']['base_seed'] <= battle.seed < battle.metadata['prediction']['base_seed']+100
        assert battle.metadata['scenario']['id'] == 'haunted_pipes'
        assert battle.metadata['initial_coins'] + sum(e.coin_change for e in battle.events) == battle.coins_left
        assert hp_timeline(battle).ticks[-1].coins == battle.coins_left
    with TestClient(app) as client:
        evaluation = client.get('/api/analytics/evaluation?scenario_id=haunted_pipes').json()
        assert evaluation['sample_count'] >= 2
        assert 0 <= evaluation['brier_score'] <= 1
        assert set(ids) <= {b['battle_id'] for b in evaluation['recent_sessions']}
        assert isinstance(client.get('/api/analytics/loss-causes').json()['causes'], list)
        exported = client.get('/api/export/battles?format=json').json()
        assert set(ids) <= {b['battle_id'] for b in exported if b.get('metadata',{}).get('terminal_id')}


def test_empty_enemy_team_does_not_bypass_exit_or_survivor_goal():
    scenario = Scenario(id='exit', name='Exit', description='Exit regression', ticks=1, objective=ScenarioObjective(type='reach_exit', min_survivors=2))
    result = TickEngine(scenario, [db.get_creature('ember_fox')], []).run()
    assert result.outcome == 'loss'


def test_saved_configuration_replays_purchased_strategy():
    from app.uploads.replay import verify_battle_replay
    scenario = db.get_scenario('haunted_pipes')
    result = TickEngine(scenario, [db.get_creature(c) for c in ['ember_fox','bubble_toad']],
                        [db.get_creature(c) for c in scenario.enemy_team], seed=98765, early_heal_spend=5).run()
    assert verify_battle_replay(result)['status'] == 'match'


def test_preview_is_excluded_and_unknown_loss_is_not_invented_hazard():
    from app.analytics.diagnostic import loss_causes
    record = BattleRecord(battle_id='no-hazard', scenario_id='s', player_team=['a'],
                          outcome='loss', ticks_elapsed=1, survivors=1, coins_left=0, events=[])
    causes = {c.cause:c.count for c in loss_causes([record]).causes}
    assert causes['hazard_damage'] == 0
    assert causes['other_or_objective_failure'] == 1
    with TestClient(app) as client:
        before = client.get('/api/analytics/evaluation').json()['sample_count']
        result = client.post('/api/battles', json={'scenario_id':'haunted_pipes',
            'player_team':['ember_fox'], 'session_kind':'preview'}).json()
        assert db.get_battle(result['battle_id']).source == 'preview'
        assert result['battle_id'] not in {b.battle_id for b in db.get_battles()}
        assert client.get('/api/analytics/evaluation').json()['sample_count'] == before
