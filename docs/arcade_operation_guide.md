# Mario × Pokémon: Halloween Arcade

See [Chapter 4–6 alignment and training](lesson_analytics_alignment.md) for the trained classifier, statistical diagnostics, selectable decision objectives, and evaluation details added from the lessons.

## Concept and visitor round

Luigi's Haunted Pipe Escape is a squad strategy simulation. Mario and Pokémon allies navigate cursed warp pipes, Piranha ambushes, and pumpkin fire. Choose one to four fighters; the featured escape requires at least two survivors to reach tile 7. Other scenarios have their own objectives.

1. Open **Enter haunted pipes** on the home screen.
2. Draft a squad. Its order sets initial lanes. Inspect the objective and hazard schedule.
3. Open **Compare strategies**. Compare no potion with affordable 5/10-coin potions; review win estimates and confidence bounds.
4. Apply the recommendation or another plan. A potion is bought before combat and activates once when a living ally reaches half HP. It restores up to four HP per coin, capped at maximum HP. It cannot revive a defeated ally. An unused potion is not refunded.
5. Launch the round, watch the replay, and open the report. Compare the saved pre-battle prediction with the actual outcome.
6. Inspect possible contributors, revise the squad or plan, and retry. Budget roughly 3–5 minutes for selection, analysis, replay, and retry; confirm this with visitors before the exhibition.

The combat simulation is automatic after the player's planning choices. Tick replay controls change playback, not the saved outcome. Character elemental classes and abilities are simplified for this project; they are not a full implementation of either franchise's rules. Stable legacy IDs such as `ember_fox` remain in exports, while the UI uses Mario/Pokémon names. Some portraits remain stylized placeholders.

## Three-device configuration

Use one server laptop and at least two separate visitor devices on the same LAN. The server laptop can also serve as the control-center device. Each browser uses the same server URL and SQLite database; browser local storage keeps only that terminal's preferences and identifier.

From the repository root in PowerShell:

```powershell
cd battle-sim/frontend
npm install
npm run build
cd ../backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Find the laptop's LAN IPv4 address with `ipconfig`. On both visitor devices open `http://<server-LAN-IP>:8000/scenarios/haunted_pipes`; on the control laptop open `http://localhost:8000/analytics`. `localhost` on a phone refers to the phone, not the server. If needed, allow the server through Windows Firewall on the private booth network. No public deployment is required.

The control center refreshes every 10 seconds, offers manual refresh, and shows terminal IDs and recent rounds. Two simultaneous requests produce separate battle IDs. API/browser tests exercise this architecture, but they do not replace the instructor's required demonstration with three physical devices.

## Chapters 1–6 and analytics methods

| Chapter | Demonstration |
| --- | --- |
| 1: Analytics value | A visitor compares expected outcomes before choosing a plan, then uses the report to revise it. |
| 2: Problem framing | Maximize objective completion probability. Decisions: scenario, ordered squad, potion spending. Constraints: 1–4 distinct fighters, starting coin budget, survivor/exit/other scenario objective. KPIs: wins, survivors, ticks, remaining coins. |
| 3: Data | Seeded simulation events, actual selected plans, snapshots, terminal IDs, timestamps, saved predictions, and outcomes are persisted. Upload validation supports supplementary datasets. |
| 4: Exploration/diagnosis | Outcome summaries, damage, HP/coin timelines, team aggregates, observed hazard/heavy-strike contributors, and same-seed counterfactuals. Heuristic contributors are not proof of causality. Heatmaps count events/damage, not elapsed occupancy. |
| 5: Prediction | Monte Carlo simulation: 100 trials for squad preview and saved forecasts; 100 for strategy comparison; 50 for recommendations. Normal or Wilson 95% bounds are calculated from actual wins. At p≈0.5, 100 trials give roughly ±9.8 percentage points, so close differences are uncertain. |
| 6: Prescription | Enumerate feasible potion options using matched seeds within a comparison. Rank by win rate, then lower spending, then survivors. Players can apply or reject the recommendation. Separate comparison and recommendation seed sets reveal sampling variability. |

The saved forecast uses seeds disjoint from that round's seed and matches its squad, scenario, potion, and AI personality. The control center evaluates saved forecasts against accumulated played outcomes with **Brier score**, mean `(predicted probability − observed outcome)^2`, and calibration bins. Lower Brier score is better; zero is perfect. Repeated seeds/configurations and self-selected squads can create dependence, so visitor data should not be described as a randomized experiment. Predictions from imported records are kept separate from the live evaluation.

For reproducible synthetic validation, from `battle-sim/backend` run:

```powershell
python evaluate_predictions.py --trials 200 --output ../../docs/predictive_validation.json
```

This creates an isolated database, uses three fixed squads, evaluates no-potion/5/10-coin plans, and separates plan-selection, forecasting, and evaluation seeds. It does not insert trials into visitor records. The output is model-consistency evidence, not exhibition evidence or proof of real-world accuracy.

## Recording, recovery, and evidence

- The default database is `battle-sim/backend/battle_sim.db`. Set `BATTLE_SIM_DB` before starting to choose another path. Schema migration adds metadata without replacing historical battle records.
- New records save the starting HP/coins, ordered creature and scenario snapshots, potion budget, engine version, terminal ID, prediction, UTC creation timestamp, outcome, and events. Counterfactuals use saved configurations where available.
- Home-page automatic previews are excluded from visitor evaluation and normal battle listings. Imported records are not counted as new visitor rounds.
- If a page loses connectivity, the dashboard retries; reopen a saved battle from **Recent sessions** after reconnecting. Battle IDs in URLs remain retrievable after server restart. A submitted request may finish even when its response is lost: check the recent-session list before retrying, because request deduplication is not implemented.
- Back up the database with the server stopped, or use SQLite's backup facility. Keep chargers connected and confirm the booth network before opening.
- Download `/api/export/battles?format=json` after morning and afternoon operation. JSON includes metadata, forecasts, terminal IDs, UTC timestamps, and events; legacy CSV does not carry every new field. Manila time is UTC+8. Keep actual exhibition evidence separate from testing/synthetic validation files.

## Verification checklist and remaining limits

Run two physical visitor terminals at once; verify distinct round IDs and both terminals on the third device. Exercise a potion and no-potion round, show a valid recommendation, compare a forecast and actual outcome, and explain the uncertainty. Restart the server and retrieve both saved rounds. Disconnect/reconnect one terminal. Confirm actual visitor timing and collect October 27 morning/afternoon evidence.

Mid-battle forecasts from incomplete state are rejected; supported advice is pre-battle. Legacy imported logs without initial state cannot reconstruct unobserved HP exactly. Old engine-version logs may not replay under the corrected engine. The original broad browser suites contain stale assertions; `playwright.audit.config.ts` targets the repaired flow. This is a local classroom arcade, with no authentication or separation of author/admin privileges; keep operator controls on the supervised booth network.

For submission, include source/build, dependency files, this guide, the analytical scripts and validation results, datasets/schema description, known limitations, and the actual morning/afternoon logs. The assignment calls for a live instructor demonstration, not a recorded video.
