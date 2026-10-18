# Assignment readiness audit — October 18, 2026

Historical audit, recorded before the implementation fixes. See [the operation guide](arcade_operation_guide.md) for the updated workflow and remaining physical-device verification.

Original verdict: substantial simulation prototype, but not yet ready to claim compliance with the instructor's verification requirements. All four analytics categories have executable implementations; correctness and gameplay integration need repair before demonstration.

Scope: repository source, supplied assignment PDF (13 pages), isolated backend tests, TypeScript checking, and targeted API/engine probes. No application implementation was changed. Physical three-device operation, browser rendering, exhibition-duration reliability, and visitor round duration were not verified. The PDF is assessment evidence, not an instruction to submit or operate external services.

## Requirements mapped to the implementation

| Requirement | Assessment | Evidence and remaining work |
| --- | --- | --- |
| Playable simulation with meaningful choices | Partially satisfied | Scenario and squad selection affect seeded battles; prediction is shown during selection. Battle execution completes server-side before replay. A strategy simulation is acceptable; real-time controls are not required by the PDF. Demonstrate a clear choose → predict → simulate → learn → retry loop lasting approximately 3–5 minutes. |
| Mario × Pokémon concept | Partially satisfied | Mario/Pokémon presentation images and platform-style hazards exist. A fresh database actually seeds Ember Fox, Bubble Toad, etc., rather than the Mario/Pikachu roster advertised in README. Align reproducible seed data, names, mechanics, and documentation. |
| Recognizable Halloween atmosphere | Gap | Reviewed built-in scenarios and screens do not establish a clear Halloween setting. Add a coherent haunted scenario, objectives, hazards, and presentation; a dark color scheme alone is weak evidence. |
| Chapter 1: value of analytics | Partial | Show how a player uses information to change a decision and compare the result. |
| Chapter 2: problem framing | Partial | Objectives, survivors, ticks, coins, and squad limits exist. Explicitly document decision variables, budget, objective function, and tradeoffs. |
| Chapter 3: data | Substantial foundation | SQLite event logs, battle outcomes, uploads, validation, and export exist. Save complete chosen strategy/configuration and distinguish visitor sessions from other generated records. |
| Chapter 4: descriptive/diagnostic | Implemented, defective | Reports and counterfactuals exist; see correctness findings below. |
| Chapter 5: predictive | Implemented, evaluation incomplete | Monte Carlo estimates and intervals are real. Uploaded-data comparison exists, but no demonstrated evaluation on independent visitor outcomes was found. Confidence intervals quantify simulation sampling uncertainty, not predictive accuracy. |
| Chapter 6: prescriptive | Implemented, not dependable yet | Options are simulated and ranked, but spend feasibility, intervention effects, displayed values, and applying a recommendation need repair. |
| Three separate physical devices | Unverified | Shared FastAPI/SQLite architecture is suitable in principle. Demonstrate two visitor terminals with overlapping sessions and a control-center device receiving both sets of results. WebSockets are optional; refresh or polling can suffice. |
| Updated common analytics | Partial/broken | Aggregates use stored battles, but the aggregate screen has a response-shape error and only fetches on mount/filter changes. Add a clear refresh mechanism or polling. |
| Recovery and repeated rounds | Partial | Saved battles can be retrieved and new battles created. Verify restart, disconnection/retry behavior, and duplicate-submission handling on the actual booth network. |
| Submission and exhibition evidence | Preparation needed | Consolidate running instructions, methods/evaluation, three-device architecture, known limits, and timestamped morning/afternoon records. PDF specifies exhibition October 27, 2026; Canvas header shows October 28 submission date. |

## Priority findings

### 1. Aggregate analytics will fail on the real response (high)

`frontend/src/api.ts:getLossCauses` declares an array, but `/api/analytics/loss-causes` returns a report object. `AnalyticsScreen.tsx:36` assigns that object directly and line 46 calls `.reduce()` on it. A targeted API probe confirmed the response is a dictionary/object. This breaks the shared analytics demonstration.

Fix: define the real report type and extract its cause collection, including a zero-record case. Verify the screen against the actual API rather than only mocks.

### 2. Displayed analytical claims are fabricated or mismatched (high)

`PlanScreen.tsx:85` replaces the calculated interval with a fixed ±6 percentage points. Line 245 always displays `+14%` projected improvement. Line 244 reads `recommended_coins_to_spend`, while the API supplies `best_spend`, so it normally displays the fallback 5 coins. The screen says 100 recommendation runs although the endpoint uses 50. The selection screen also reads `confidence_interval_percent` instead of the backend's `confidence_interval_95`/bounds.

Fix: render backend bounds and trial counts, use `best_spend`, and calculate improvement against an explicit baseline using comparable seeds and settings. Remove any unsupported improvement claim. Derive strategy squad size and healer status from returned team IDs, not result index: the backend sorts by win rate, invalidating the index assumptions at lines 89–90.

### 3. Prescriptive spending has no healing benefit and can be infeasible (high)

`engine/tick.py:79` deducts spending at initialization. Lines 138–155 heal characters already initialized at maximum HP. Probe: spending 5 coins produced HP 120 → 120, coins 20 → 15, yet logged damage `-20` as if healing occurred.

`analytics/prescriptive.py:recommend_action` reads current coins for output but starts simulations with scenario coins and does not filter unaffordable actions. A request with zero coins returned spending choices of 5 and 10 and negative `avg_coins_left` values. `PlanCompareOption` also lacks nonnegative/budget validation.

Fix: define an effective intervention (e.g. heal when HP falls below a threshold, buy a shield, or purchase a stat bonus), apply real budget constraints, and log actual HP restored. Rank feasible choices only. Re-evaluate the winning strategy on additional seeds before claiming a reliable benefit.

### 4. Recommended spending cannot be executed through the normal battle API (high)

`BattleCreateRequest` and `main.py:create_and_run_battle` accept scenario, squad, seed, and personality, but no recommended spending/strategy. PlanScreen has no action applying its result to a playable round. A player can use team predictions, but cannot reproduce the recommended spending intervention in normal gameplay.

Fix: carry the selected strategy into battle creation, apply the same rules in simulation and gameplay, persist it, and compare predicted versus actual outcomes. This is central to the PDF's requirement that analytics influence decisions.

### 5. Mid-battle analysis restarts instead of continuing (high if exposed)

`predict_from_state` and `recommend_action` recreate an engine with reduced HP but reset positions, time, coins, status effects, and hazard timing. Reduced HP also becomes maximum HP. Current tick is not used to resume the engine. These are restart approximations, not defensible predictions of the remaining battle.

Fix: resume from a complete state snapshot or restrict/label the feature as pre-battle analysis until continuation exists. The privacy test checks hidden-information behavior, not correct state continuation.

### 6. Descriptive summaries contain incorrect starting values (medium)

`analytics/descriptive.py:hp_timeline` assumes all characters begin with 100 HP and all scenarios with 20 coins. Fresh roster HP varies. Ticks without events retain initialized values rather than carrying state forward. `position_heatmap` counts events as `time_spent`, which is not elapsed occupancy. Untouched creatures can retain `final_hp=0` in creature statistics.

Fix: persist initial state, reconstruct state across every tick, and use labels matching the measured quantity. Verify against a small hand-calculated battle with nondefault resources and untouched creatures.

### 7. Diagnostic text overstates causal evidence (medium)

`analytics/diagnostic.py:cause_trace` collects every hazard hit into `lethal_hazards` and calls the first one “fatal hazard exposure,” without requiring a knockout or showing that removing it changes the outcome. A minor hazard can therefore be blamed for a later unrelated defeat.

Fix: distinguish observed contributing factors from confirmed counterfactual effects. Show damage share, actual knockout events, and a matched rerun before making stronger causal claims. The PDF explicitly permits “why might it have happened”; certainty is unnecessary.

### 8. Prediction caching ignores relevant state (medium)

`analytics/predictive.py:predict_win_rate` keys its cache by scenario ID and sorted team IDs, seed count and base seed. Changes to scenario contents, character statistics, enemies, and squad order are not represented. Squad order assigns lanes in the engine, so sorting can conflate distinct configurations even without edits.

Fix: use a configuration/version fingerprint that preserves order where order affects simulation, or invalidate appropriately. Add a regression check using reordered squads and edited scenario data.

### 9. Fresh installation does not match the advertised roster (medium)

A temporary database seeded the original creature roster (Ember Fox, Flame Salamander, Bubble Toad, Stream Turtle, etc.). README claims Mario, Luigi, Pikachu and other named characters. A locally edited database is not a reproducible distribution.

Fix: include intended seed data/migrations or consistently describe the original crossover-inspired creatures. Make Halloween recognizable in the distributed build.

## Recommended analytical design

Problem: choose a squad and affordable strategy that maximize the chance of completing a haunted Mario/Pokémon arena objective while preserving survivors and coins.

1. Descriptive: report actual outcome, squad, chosen strategy, damage, hazard losses, remaining resources, and session comparisons.
2. Diagnostic: identify observed contributors and compare a controlled alternative using the same seed/configuration. Label heuristic explanations honestly.
3. Predictive: use Monte Carlo trials to estimate completion probability with actual confidence bounds. Justify trial count by desired precision and booth latency. Save predictions before gameplay, then evaluate independent outcomes using Brier score and a calibration table; separate simulated evaluation from visitor evidence.
4. Prescriptive: enumerate feasible squad/strategy options under the coin budget. Compare them using the same seed set and clearly stated tie-breakers; show baseline, proposed action, cost, expected benefit, and uncertainty. Allow the player to apply or reject the proposal and record that choice.

Shared session records should include session/battle ID, creation/completion timestamps, optional terminal ID, scenario/configuration version, ordered squad, strategy, seed, predicted probability, recommendation, player selection, and actual result. Terminal IDs are useful for demonstration evidence, although the PDF does not mandate that particular schema.

## Completion order and acceptance checks

1. Repair API/UI contracts and remove fabricated values. Open every analytics screen with both empty and populated data.
2. Repair strategy effects and feasibility; integrate selected strategy into ordinary battles. Confirm zero coins cannot buy an action and positive spending produces its stated effect.
3. Correct descriptive state reconstruction and diagnostic wording; fix prediction cache and restrict or repair mid-battle analysis.
4. Document/evaluate prediction quality on independent outcomes. Keep a record of evaluated sample counts and configuration versions.
5. Add a reproducible Halloween crossover scenario and concise visitor rules. Time a complete visitor round including analysis and retry.
6. Deploy one shared server reachable over the booth LAN. Use two physical visitor devices concurrently; verify unique battles and both results on the third device. Restart the server and recover saved records; test a connection interruption.
7. Assemble the submission folder and operation checklist. Export separate timestamped records for the October 27 morning and afternoon sessions after they actually occur.

## Validation performed

- Backend: 24 tests passed, using a temporary SQLite database so gameplay data was not modified. Initial sandbox temp-path failures were resolved by supplying an isolated pytest base directory.
- TypeScript: `tsc --noEmit` completed successfully with Node symlink-preservation flags.
- Targeted probes confirmed the loss-causes object response, unaffordable recommendation options, ineffective early healing, and original fresh-install roster. The probe process encountered a Windows file-lock error during temporary database cleanup after printing results; this does not invalidate the returned API/engine evidence.
- Frontend: 15 tests passed across three files; React test-environment `act(...)` warnings were emitted. Physical device operation and browser end-to-end behavior remain unverified.

Passing existing tests does not establish rubric compliance: important UI/API contracts, feasibility, evaluation quality, and three-device workflows are not established by those tests.
