"""Fit Chapter 5 candidates with independent train/validation/test partitions.

Default data are clearly identified simulator-generated records, kept out of the booth DB.
Use --source gameplay once enough distinct, timestamped configurations have accumulated.
"""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import random
import tempfile


def metrics(y, probabilities, threshold=0.5):
    import numpy as np
    from sklearn.metrics import (accuracy_score, average_precision_score, balanced_accuracy_score,
        brier_score_loss, confusion_matrix, f1_score, log_loss, precision_score, recall_score, roc_auc_score)
    predicted = (np.asarray(probabilities) >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, predicted, labels=[0,1]).ravel()
    return {"samples": len(y), "positive_prevalence": float(np.mean(y)), "threshold": threshold,
            "confusion_matrix": {"tn":int(tn),"fp":int(fp),"fn":int(fn),"tp":int(tp)},
            "accuracy": float(accuracy_score(y,predicted)), "balanced_accuracy": float(balanced_accuracy_score(y,predicted)),
            "precision": float(precision_score(y,predicted,zero_division=0)),
            "recall": float(recall_score(y,predicted,zero_division=0)),
            "specificity": float(tn/(tn+fp)) if tn+fp else None,
            "f1": float(f1_score(y,predicted,zero_division=0)),
            "brier": float(brier_score_loss(y,probabilities)),
            "log_loss": float(log_loss(y,probabilities,labels=[0,1])),
            "roc_auc": float(roc_auc_score(y,probabilities)) if len(set(y))==2 else None,
            "average_precision": float(average_precision_score(y,probabilities)),
            "false_optimism_cost_per_round": float((2*fp+fn)/len(y)),
            "calibration": [{"range":f"{low/10:.1f}–{(low+2)/10:.1f}", "count":len(indices),
                             "predicted":float(np.mean([probabilities[i] for i in indices])),
                             "observed":float(np.mean([y[i] for i in indices]))}
                            for low in range(0,10,2)
                            if (indices := [i for i,p in enumerate(probabilities) if low/10 <= p and (p < (low+2)/10 or low==8)])]}


def synthetic_dataset(storage, configurations=300, repeats=12):
    from app.analytics.learned import prebattle_features, scenario_signature
    from app.engine.tick import TickEngine
    rng = random.Random(20261019)
    scenarios = sorted(storage.get_all_scenarios(), key=lambda s:s.id)
    roster = storage.get_all_creatures(source_filter='builtin')
    # Use the ten visitor-facing fighters, never enemy bosses as player training choices.
    player_ids = ['ember_fox','flame_salamander','bubble_toad','stream_turtle','moss_shroom',
                  'bramble_hound','volt_hedgehog','spark_finch','crag_golem','pebble_armadillo']
    cmap = {c.id:c for c in roster}
    records, seen = [], set()
    while len(seen) < configurations:
        scenario = scenarios[len(seen) % len(scenarios)]
        ids = rng.sample(player_ids, rng.choice([2,3,4]))
        spend = rng.choice([n for n in [0,5,10] if n <= scenario.starting_coins])
        personality = rng.choice(['aggressive','defensive','opportunistic'])
        features = prebattle_features(scenario,[cmap[c] for c in ids],[cmap[c] for c in scenario.enemy_team],spend,personality)
        group = sha256(json.dumps(features,sort_keys=True).encode()).hexdigest()
        if group in seen:
            continue
        seen.add(group)
        for j in range(repeats):
            # Disjoint seed blocks and configuration groups across all partitions.
            seed = 10000000 + (len(seen)-1)*100 + j
            battle = TickEngine(scenario,[cmap[c] for c in ids],[cmap[c] for c in scenario.enemy_team],
                                seed=seed,early_heal_spend=spend,personality=personality).run()
            records.append({"group":group, "seed":seed, "features":features, "label":int(battle.outcome=='win'),
                            "source":"synthetic", "engine_version":battle.engine_version})
    return records, [scenario_signature(s,roster) for s in scenarios]


def gameplay_dataset(storage):
    from app.analytics.learned import prebattle_features, scenario_signature
    from app.engine.models import Creature, Scenario
    roster = storage.get_all_creatures()
    current = {c.id:c for c in roster}
    scenarios = {s.id:s for s in storage.get_all_scenarios()}
    signatures = [scenario_signature(s,roster) for s in storage.get_all_scenarios()]
    records, seen = [], set()
    for battle in sorted(storage.get_battles(), key=lambda b:b.created_at or ''):
        meta = battle.metadata
        if battle.source != 'simulated' or not meta.get('visitor_session') or not battle.created_at:
            continue
        if not all(k in meta for k in ['players','enemies','scenario','early_heal_spend']):
            continue
        scenario = Scenario(**meta['scenario'])
        if (battle.engine_version != '1.1.0' or scenario.id not in scenarios
                or scenario.model_dump() != scenarios[scenario.id].model_dump()
                or any(c['id'] not in current or Creature(**c).model_dump() != current[c['id']].model_dump()
                       for c in meta['players']+meta['enemies'])):
            continue
        features = prebattle_features(scenario,[Creature(**c) for c in meta['players']],
                                      [Creature(**c) for c in meta['enemies']],meta['early_heal_spend'],battle.personality)
        group = sha256(json.dumps(features,sort_keys=True).encode()).hexdigest()
        unique = (group,battle.seed,battle.engine_version)
        if unique in seen:
            continue
        seen.add(unique)
        records.append({"group":group,"seed":battle.seed,"features":features,"label":int(battle.outcome=='win'),
                        "source":"gameplay","created_at":battle.created_at,"engine_version":battle.engine_version})
    return records, signatures


def split_records(records, source):
    if source == 'synthetic':
        groups = sorted({r['group'] for r in records})
        random.Random(41).shuffle(groups)
        n = len(groups)
        sets = [set(groups[:int(.6*n)]),set(groups[int(.6*n):int(.8*n)]),set(groups[int(.8*n):])]
        splits = [[r for r in records if r['group'] in group] for group in sets]
    else:
        # Preserve time order, purging configurations previously observed in earlier partitions.
        n = len(records)
        train = records[:int(.6*n)]
        training_groups = {r['group'] for r in train}
        validation = [r for r in records[int(.6*n):int(.8*n)] if r['group'] not in training_groups]
        earlier = training_groups | {r['group'] for r in validation}
        test = [r for r in records[int(.8*n):] if r['group'] not in earlier]
        splits = [train,validation,test]
    for name,rows in zip(['training','validation','test'],splits):
        if len(rows) < 30 or len({r['label'] for r in rows}) != 2:
            raise ValueError(f"Insufficient {name} evidence: need at least 30 retained rows with wins and losses. Collect more distinct configurations; do not reuse test data for tuning.")
    return splits


def fit_and_export(records, signatures, directory, source):
    import joblib
    import numpy as np
    import sklearn
    from sklearn.dummy import DummyClassifier
    from sklearn.feature_extraction import DictVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.neighbors import KNeighborsClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.tree import DecisionTreeClassifier, export_text
    train,validation,test = split_records(records,source)
    def xy(rows): return [r['features'] for r in rows],[r['label'] for r in rows]
    tx,ty=xy(train); vx,vy=xy(validation); ex,ey=xy(test)
    candidates = [
        ('Training prevalence baseline',DummyClassifier(strategy='prior')),
        ('Logistic regression',LogisticRegression(C=1.0,max_iter=1500,random_state=41)),
        ('Pruned decision tree',DecisionTreeClassifier(max_depth=5,min_samples_leaf=25,random_state=41)),
        ('K nearest neighbors',KNeighborsClassifier(n_neighbors=min(21,len(train)),weights='uniform',algorithm='brute'))]
    models, scores = {}, []
    for name,estimator in candidates:
        model=Pipeline([('encode',DictVectorizer()),('scale',StandardScaler(with_mean=False)),('model',estimator)])
        model.fit(tx,ty)
        models[name]=model
        scores.append({'model':name,'training':metrics(ty,model.predict_proba(tx)[:,1]),
                       'validation':metrics(vy,model.predict_proba(vx)[:,1])})
    # Primary metric fixed before comparison: probability quality for strategy support.
    selected=min(scores,key=lambda r:r['validation']['brier'])['model']
    model=models[selected]
    vp=model.predict_proba(vx)[:,1]
    thresholds=[float(x) for x in np.linspace(.2,.8,13)]
    threshold=min(thresholds,key=lambda t:(metrics(vy,vp,t)['false_optimism_cost_per_round'],abs(t-.5)))
    # Test set is evaluated only after selection and threshold are frozen; no refit on test.
    heldout=metrics(ey,model.predict_proba(ex)[:,1],threshold)
    baseline=models['Training prevalence baseline']
    baseline_test=metrics(ey,baseline.predict_proba(ex)[:,1],.5)
    dataset='\n'.join(json.dumps(r,sort_keys=True) for r in records)+'\n'
    digest=sha256(dataset.encode()).hexdigest()
    directory.mkdir(parents=True,exist_ok=True)
    (directory/'training_records.jsonl').write_text(dataset,encoding='utf-8')
    model_file=f'classifier-{digest[:12]}.joblib'
    joblib.dump(model,directory/model_file)
    feature_names=model['encode'].get_feature_names_out().tolist()
    estimator=model['model']
    importance = getattr(estimator,'feature_importances_',None)
    if importance is None and hasattr(estimator,'coef_'): importance=np.abs(estimator.coef_[0])
    drivers=sorted([{'feature':name,'importance':float(value)} for name,value in zip(feature_names,importance)],key=lambda x:-x['importance'])[:10] if importance is not None else []
    report={'status':'trained','created_at':datetime.now(timezone.utc).isoformat(),
            'data_source':source,'selected_model':selected,'sklearn_version':sklearn.__version__,
            'feature_version':1,'model_file':model_file,'model_sha256':sha256((directory/model_file).read_bytes()).hexdigest(),
            'player_ids': sorted({r['features'][f'slot_{i}'] for r in records for i in range(4)} - {'empty'}),
            'roster_ids': sorted({r['features'][f'slot_{i}'] for r in records for i in range(4)} - {'empty'}) + ['pyro_tyrant','thorn_biter','pipe_lurker','iron_spikeling','thunder_wasp','bowser_boss'],
            'training_domain': {key: sorted({r['features'][key] for r in train}) for key in ['team_size','potion_spend','personality']},
            'dataset_sha256':digest,'scenario_signatures':signatures,'threshold':threshold,
            'target':'Win the selected scenario before its tick limit; positive class=win',
            'unit':'One completed round','prediction_moment':'Before battle, after squad and potion selection',
            'primary_metric':'Validation Brier score; lower is better',
            'threshold_policy':'Illustrative false optimism cost 2, missed-win cost 1; tune only on validation, not a measured visitor preference.',
            'split_method':'60/20/20 by configuration group' if source=='synthetic' else 'Chronological 60/20/20, purge configurations seen in earlier partitions',
            'split_counts':dict(zip(['training','validation','test'],map(len,[train,validation,test]))),
            'group_counts':dict(zip(['training','validation','test'],[len({r['group'] for r in rows}) for rows in [train,validation,test]])),
            'excluded_by_split':len(records)-sum(map(len,[train,validation,test])),
            'candidates':scores,'test':heldout,'baseline_test':baseline_test,
            'test_improves_baseline':heldout['brier'] < baseline_test['brier'],
            'global_associations':drivers,
            'tree_rules':export_text(estimator,feature_names=feature_names,max_depth=3) if isinstance(estimator,DecisionTreeClassifier) else None,
            'limitations':['Synthetic evaluation validates the simulator distribution, not real visitor behavior.' if source=='synthetic' else 'Self-selected gameplay may be confounded; chronological test coverage can be sparse.',
                           'No seasonality model: this target is a battle outcome, not a time-series forecast.',
                           'Global importance is predictive association, not a causal treatment effect.',
                           'Repeated seeds within a configuration are clustered; test groups are disjoint and uncertainty is not inferred from IID row assumptions.',
                           'The final test is a report, not a model-selection input. Future revisions require a new test cohort.']}
    temporary=directory/'report.tmp'
    temporary.write_text(json.dumps(report,indent=2),encoding='utf-8');temporary.replace(directory/'report.json')
    return report


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source',choices=['synthetic','gameplay'],default='synthetic')
    parser.add_argument('--configurations',type=int,default=300)
    parser.add_argument('--repeats',type=int,default=12)
    parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parent/'models')
    args=parser.parse_args()
    if not 50 <= args.configurations <= 1000 or not 2 <= args.repeats <= 30:
        parser.error('Use 50–1000 configurations and 2–30 repetitions')
    # Synthetic generation seeds a scratch DB and never adds fake visitor sessions.
    with tempfile.TemporaryDirectory() as temp:
        if args.source=='synthetic': os.environ['BATTLE_SIM_DB']=str(Path(temp)/'training.db')
        from app.storage import db
        records,signatures=synthetic_dataset(db,args.configurations,args.repeats) if args.source=='synthetic' else gameplay_dataset(db)
        try: report=fit_and_export(records,signatures,args.output,args.source)
        except ValueError as error: parser.exit(2,str(error)+'\n')
        print(json.dumps({'selected':report['selected_model'],'split_counts':report['split_counts'],
                          'test_brier':report['test']['brier'],'baseline_brier':report['baseline_test']['brier'],
                          'report':str(args.output/'report.json')},indent=2))


if __name__=='__main__': main()
