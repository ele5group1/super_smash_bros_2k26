"""Independent synthetic validation; never adds trials to visitor gameplay records."""
import argparse
import json
import os
from pathlib import Path
import tempfile


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--trials', type=int, default=200)
    args = parser.parse_args()
    if not 10 <= args.trials <= 5000:
        parser.error('Use 10–5000 trials')
    with tempfile.TemporaryDirectory() as temp:
        os.environ['BATTLE_SIM_DB'] = str(Path(temp) / 'validation.sqlite')
        from app.storage import db
        from app.analytics.predictive import predict_win_rate
        from app.analytics.prescriptive import recommend_action
        from app.engine.tick import TickEngine
        scenario = db.get_scenario('haunted_pipes')
        roster = {c.id: c for c in db.get_all_creatures()}
        enemies = [roster[c] for c in scenario.enemy_team]
        results = []
        for ids in [['ember_fox','bubble_toad'], ['ember_fox','bubble_toad','moss_shroom'],
                    ['ember_fox','bubble_toad','moss_shroom','volt_hedgehog']]:
            advice = recommend_action({'player_team':ids, 'coins':scenario.starting_coins}, [], scenario, roster, seed_count=100)
            for spend in sorted({0, 5, 10, advice.best_spend}):
                prediction = predict_win_rate(scenario, [roster[c] for c in ids], seed_count=args.trials,
                                              base_seed=50000, enemy_creatures=enemies, early_heal_spend=spend)
                outcomes = [int(TickEngine(scenario, [roster[c] for c in ids], enemies, seed=90000+i,
                                           early_heal_spend=spend).run().outcome == 'win') for i in range(args.trials)]
                results.append({'team':ids, 'spend':spend, 'recommended_spend':advice.best_spend,
                                'predicted':prediction.win_rate, 'observed':sum(outcomes)/len(outcomes),
                                'brier_score':sum((prediction.win_rate-y)**2 for y in outcomes)/len(outcomes),
                                'forecast_trials':args.trials, 'evaluation_trials':len(outcomes),
                                'forecast_interval_percent':[prediction.ci_lower,prediction.ci_upper]})
        report = {'data_source':'synthetic engine validation; not visitor evidence', 'scenario':'haunted_pipes',
                  'forecast_seed_start':50000, 'evaluation_seed_start':90000,
                  'method':'Select plans on seeds 3000–3099; estimate probabilities on separate seeds; evaluate all plans on matched held-out seeds.',
                  'limitations':'Tests consistency within this simulator, not real-world validity. Three fixed squads; more visitor data is needed. Intervals measure Monte Carlo uncertainty.',
                  'mean_brier_score':sum(r['brier_score'] for r in results)/len(results), 'results':results}
        Path(args.output).write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(f"Evaluated {len(results)} configurations, {sum(r['evaluation_trials'] for r in results)} independent trials. Mean Brier score: {report['mean_brier_score']:.4f}")


if __name__ == '__main__':
    main()
