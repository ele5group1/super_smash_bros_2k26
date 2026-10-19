"""Course examples and leakage/feasibility acceptance tests."""
import math
import pytest
from fastapi.testclient import TestClient

from app.analytics.learned import model_report, prebattle_features, score_prebattle
from app.analytics.lesson_diagnostics import categorical_association, exploration_report
from app.analytics.prescriptive import recommend_action
from app.engine.models import BattleRecord
from app.main import app
from app.storage import db, Storage
from train_lesson_models import split_records


def test_chapter_four_worked_table():
    # Chapter 4 slides 61–72: Web, Mobile, Branch × retained/churned.
    report = categorical_association([[150,50],[110,90],[160,40]], ['Web','Mobile','Branch'])
    assert report['expected'] == [[140,60]]*3
    assert report['chi_square'] == pytest.approx(33.3333333333)
    assert report['degrees_of_freedom'] == 2
    assert report['residuals'][1][1] == pytest.approx(30/math.sqrt(60))
    assert report['contributions'][1][1] == pytest.approx(15)
    assert report['cramers_v'] == pytest.approx(math.sqrt(33.3333333333/600))
    assert report['nominal_p_value'] < .00001


def test_sparse_and_degenerate_tables_do_not_claim_significance():
    sparse = categorical_association([[1,0],[0,1]], ['No potion','Potion'])
    assert sparse['chi_square'] == pytest.approx(2)
    assert sparse['nominal_p_value'] is None
    assert not sparse['adequate_expected_counts']
    assert categorical_association([[3,0],[2,0]],['a','b'])['chi_square'] is None
    assert categorical_association([],[])['chi_square'] is None


def test_replays_are_excluded_without_deleting_iqr_anomalies():
    original = BattleRecord(battle_id='a',scenario_id='s',player_team=['p'],seed=5,outcome='win',
                            ticks_elapsed=10,coins_left=0,metadata={'early_heal_spend':0})
    replay = original.model_copy(update={'battle_id':'b'})
    other = original.model_copy(update={'battle_id':'c','seed':6,'outcome':'loss','ticks_elapsed':100})
    report = exploration_report([original,replay,other])
    assert report['input_records'] == 3
    assert report['sample_count'] == 2
    assert report['duplicates_excluded'] == 1
    assert report['missing_starting_snapshots'] == 2


def test_grouped_training_split_has_no_configuration_or_seed_overlap():
    records = [{'group':str(g),'seed':g*10+i,'label':i%2} for g in range(100) for i in range(4)]
    partitions = split_records(records,'synthetic')
    for i,left in enumerate(partitions):
        for right in partitions[i+1:]:
            assert not {r['group'] for r in left} & {r['group'] for r in right}
            assert not {r['seed'] for r in left} & {r['seed'] for r in right}
    assert sum(map(len,partitions)) == len(records)


def test_inadequate_gameplay_training_refuses_to_invent_evidence():
    with pytest.raises(ValueError,match='Insufficient'):
        split_records([{'group':'a','seed':i,'label':0} for i in range(10)],'gameplay')


def test_trained_model_scores_only_validated_scope(tmp_path):
    storage = Storage(tmp_path/'scope.db')
    scenario = storage.get_scenario('haunted_pipes')
    roster = storage.get_all_creatures(source_filter='builtin')
    cmap = {c.id:c for c in roster}
    team = [cmap[c] for c in ['ember_fox','bubble_toad','moss_shroom']]
    enemies = [cmap[c] for c in scenario.enemy_team]
    features = prebattle_features(scenario,team,enemies,5)
    assert not set(features) & {'label','outcome','survivors','ticks_elapsed','coins_left','final_hp'}
    prediction = score_prebattle(scenario,team,enemies,5,roster=roster)
    assert prediction['available']
    assert 0 <= prediction['win_rate'] <= 1
    assert not score_prebattle(scenario,team[:1],enemies,5,roster=roster)['available']
    edited = scenario.model_copy(update={'ticks':1})
    assert not score_prebattle(edited,team,enemies,5,roster=roster)['available']
    assert model_report()['data_source'] == 'synthetic'


def test_prescription_enforces_initial_reserve_and_validates_frozen_action():
    scenario = db.get_scenario('haunted_pipes')
    roster = {c.id:c for c in db.get_all_creatures()}
    report = recommend_action({'player_team':['ember_fox','bubble_toad','moss_shroom'],'coins':20}, [],
                              scenario,roster,seed_count=12,objective='balanced',min_reserve=16)
    assert report.best_spend == 0
    assert [o['spend'] for o in report.options] == [0]
    assert report.decision_model['objective'] == 'balanced'
    assert report.holdout_comparison['base_seed'] == 800000
    assert report.holdout_comparison['mean_utility_change'] == 0


def test_lesson_api_empty_population_and_live_learned_prediction():
    with TestClient(app) as client:
        empty = client.get('/api/analytics/lessons?scenario_id=nonexistent').json()
        assert empty['exploration']['sample_count'] == 0
        assert empty['training']['status'] == 'trained'
        response = client.post('/api/plan/predict',json={'scenario_id':'haunted_pipes',
            'team':['ember_fox','bubble_toad'],'seed_count':10,'early_heal_spend':5})
        assert response.status_code == 200
        assert 'trained_prediction' in response.json()
        assert client.post('/api/plan/recommend',json={'scenario_id':'haunted_pipes',
            'team':['ember_fox','bubble_toad'],'current_coins':20,'min_reserve':21}).status_code == 422
