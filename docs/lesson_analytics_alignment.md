# Analytics aligned with Chapters 4, 5, and 6

## What changed and why

The original program's primary probability estimate was Monte Carlo simulation, not a model learned from historical rows. That remains a useful simulator estimate. A separate supervised model is now trained, evaluated, and displayed beside it. Chapter 4 adds evidence-based exploration and association checks; Chapter 6 adds an explicit decision model. EDA and mathematical decision analysis do not themselves need to be “trained.”

The supplied slides are reference material. The binary target and constrained simulation setting determine which methods fit; the program does not implement every method simply because it appears in a lesson.

| Lesson content | Program application | Evidence |
| --- | --- | --- |
| Chapter 4 slides 9–23: structure, distributions, quality, emerging questions | Analytics → Explore and investigate outcomes: counts, mean/median/quartiles/range, IQR flags, missing snapshots, unknown strategy, source/scenario filters | No records are removed solely for being an IQR outlier. Exact deterministic replays are excluded from the cohort analysis. |
| Chapter 4 slides 30–56: comparison, localization, cohorts, contribution, causal limits | Compare potion/scenario/squad cohorts with explicit win denominators and UTC window. Separate combat, hazard, and status HP loss. Offer a next investigation. | Differences can reflect player selection, squad composition, and repeated players; they do not establish an intervention effect. |
| Chapter 4 slides 61–74: expected counts → Pearson χ² → residuals → Cramér's V | Computed contingency table with observed/expected counts, signed residuals, squared contributions, nominal p-value, and strength | No Yates correction, matching the worked lesson table. A conservative all-expected-counts ≥5 guard withholds sparse-table p-values. Independence of visitor rounds is not established, so even displayed p-values are nominal/exploratory. |
| Chapter 4 slides 75–93: historical time patterns versus forecasts | UTC hourly cohorts are available; seasonal decomposition is explicitly deferred | One exhibition day does not establish repeated seasonal cycles or a defensible period. |
| Chapter 5 slides 6–25, 52–59: target, baseline, candidates, partitions, leakage | Win probability before combat; prior-probability baseline, logistic regression, pruned decision tree, K nearest neighbors; pipeline-fitted encoding/scaling | Pre-battle features only. No final HP, actual duration, survivors, final coins, or outcome in the predictors. |
| Chapter 5 slides 30–48: choose metrics for the prediction product | Validation Brier score determines the model; final report adds log loss, calibration, precision/recall/F1, confusion matrix, ROC-AUC, average precision, and accuracy | Probability quality matters for strategic choices. Threshold is selected on validation using an explicit illustrative false-optimism cost; final test is not used to tune it. |
| Chapter 6 slides 7–13: variables, preferences, constraints, uncertainty | Strategy Lab: choose win chance, survival, or balanced utility; set minimum initial coin reserve | Only implementable potion choices satisfying the initial budget/reserve constraint are recommended. |
| Chapter 6 slides 18–25: simulation, expected utility, sensitivity | Matched-seed simulation comparison, failure probability and survivor downside measures in the response, preference-sensitivity comparison, fresh-seed validation | Best among listed alternatives, not a global optimum. Simulation-based effects apply to the model, not automatically to real visitors. |
| Chapter 6 slides 28, 41–42: prediction to decision to monitored outcome | Apply the plan to gameplay; save simulation and learned predictions before the result; evaluate the same learned model version on played rounds | Recommendations continue using direct simulation rather than treating classifier feature weights as causal treatment effects. |

## Trained model and data

The included training run generated **3,600 simulated battles** from **300 distinct scenario/ordered-squad/potion/personality configurations**, with 12 seeds per configuration. The data are stored in `battle-sim/backend/models/training_records.jsonl`; they are not inserted into visitor records.

Split: **2,160 training rows / 720 validation rows / 720 final test rows**, with **180 / 60 / 60 disjoint configuration groups**. Seeds also differ across partitions. These test new configurations within known built-in scenarios, not entirely unseen games or real visitor behavior. Repetitions within a configuration are clustered; row counts should not be confused with independent configurations.

All candidates use a scikit-learn pipeline, fitting DictVectorizer and StandardScaler on the training partition only. Fixed candidate settings are logistic C=1, decision-tree maximum depth 5/minimum leaf 25, and KNN k=21. No tuning against final test outcomes is performed. The model with lowest validation Brier is retained without refitting on test data.

| Candidate | Validation Brier |
| --- | --- |
| Training-prevalence baseline | 0.2487 |
| Logistic regression | 0.0731 |
| Pruned decision tree | 0.1218 |
| K nearest neighbors | 0.1286 |

Selected: **logistic regression**. Final test Brier **0.0605** versus baseline **0.2506**; classification accuracy **92.5%** at the threshold chosen on validation. These numbers concern the recorded synthetic test set. They are not exhibition results. The complete report, calibration bins, counts, confusion matrix, provenance, checksums, package version, and limitations are in `battle-sim/backend/models/report.json`.

The learned probability is displayed during squad selection. If the scenario/roster content, player coverage, feature schema, or installed scikit-learn version is outside the validated scope, the program declines to score and retains the simulation estimate. The model file is a locally generated artifact; uploads are never treated as executable model files.

## Chapter 6 decision model

Decision: choose a potion budget from {0, 5, 10} coins for the current squad.

Hard constraints: spend ≥0, spend ≤starting coins−minimum initial reserve, squad of 1–4 distinct known fighters. The reserve applies **before combat**, not to the final balance after moves and pickups.

Available objectives:

- **Win probability:** mean completion indicator.
- **Survival:** expected survivors divided by initial squad size.
- **Balanced:** 0.7×win indicator + 0.2×survivor fraction + 0.1×min(1, final coins/starting coins), averaged across trials. These weights are an explicit illustrative preference, not weights learned from visitors.

Recommendation selection uses matched seeds 3000 onward. After selecting a plan, the plan and no-potion baseline are tested on separate matched seeds 800000 onward. The report shows the utility difference and an approximate paired 95% interval. Small samples and simulation assumptions limit this approximation. Users may see a zero or negative held-out benefit; it is not hidden or replaced with a fixed uplift.

Sensitivity compares the best listed potion under all three objectives. It is a preference-sensitivity analysis, not a formal robust-optimization guarantee. Classifier coefficients are used only to explain predictive associations and never as evidence that buying a potion causes a win.

## Reproducing training and collecting better evidence

From `battle-sim/backend`:

```powershell
python -m pip install -r requirements.txt
python train_lesson_models.py --source synthetic --configurations 300 --repeats 12
```

This uses a scratch SQLite database. The report records the dataset fingerprint and model checksum. Reproducing an identical fixed run is useful for verification; new design choices require a new untouched test cohort rather than repeated optimization against this report.

After collecting enough timestamped visitor rounds with complete starting snapshots, distinct configurations, and both wins and losses:

```powershell
python train_lesson_models.py --source gameplay --output models/gameplay_candidate
```

Gameplay training retains time order, purges configurations seen in earlier partitions, excludes exact replay duplicates and incompatible/legacy configurations, and refuses inadequate partitions. This is a candidate model folder, not automatic promotion over the current synthetic model. Review its validation/test evidence first. To serve a reviewed candidate, set `BATTLE_MODEL_DIR` to its absolute directory before starting the backend.

Collect actual pre-battle choices, timestamps, terminal IDs, outcomes, and complete initial snapshots. Keep test data independent. A large number of repeats from one squad is not a substitute for varied squads/scenarios/plans or independent visitors. The live report measures forecasts saved before gameplay and separates model versions.

## Remaining limits

- Training currently uses simulated data; real visitor generalization is unproven.
- Prediction and ranking quality do not establish causal intervention effects.
- No live player identifier is collected, so dependence across a person's repeated rounds cannot be resolved.
- No seasonal forecast, LP/MIP, neural network, or reinforcement learning is added: none is required by this finite, pre-battle binary-outcome problem.
- Physical three-device exhibition operation and morning/afternoon evidence still require rehearsal and actual participation.
