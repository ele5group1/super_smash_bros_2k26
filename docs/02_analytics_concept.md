# Analytics Layer

The analytics layer sits on top of the simulation engine. Every tick writes structured events (moves, damage, hazard triggers, power-up pickups, deaths), so every battle produces a complete, replayable record. The four analytics types each answer a different question about that record.

## Prerequisite: the event log

- Actions: who acted, what move, targets, outcome
- State changes: HP, status effects, position, and coins before and after
- Environment events: hazard spawns, pipe openings, block releases, power-up grants
- Decisions: options considered and the choice made, with the scores behind it

Battles are seeded and deterministic, so any logged battle can be reproduced exactly.

## 1. Descriptive: what happened

- Battle summaries: win rate, average ticks to victory, creatures lost, coins spent, per scenario and team
- Creature stats: damage dealt and taken, KOs, survival rate, time in hazard zones
- Heatmaps: where creatures die or take damage on a scenario map
- Timelines: HP and resources against ticks

Example: the exit pipe is reached in 38% of Pipe Ambush battles, and 61% of creature deaths happen within two tiles of the patrolling boss.

## 2. Diagnostic: why it happened

- Root-cause tracing: walk backward from a defeat to the decision or event that made it unavoidable
- Counterfactual replays: rerun the same seed with one change and report how the outcome shifts
- Decision audits: flag choices that scored well below the best option available to the actor
- Cause ranking: rank factors (hazard damage, type disadvantage, status, coin shortage) by contribution to a loss

Example: most losses trace back to spending all coins on healing by tick 15. Runs that held 20 coins until a power-up block appeared won more often.

## 3. Predictive: what will happen

- Win probability: Monte Carlo runs from the current state across many seeds
- Expected outcomes: likely survivors, remaining coins, ticks to completion
- Threat forecasting: predict hazard timing from the schedule and which creatures are at risk
- Matchup models: learn how team compositions perform against enemy sets in each scenario

Predictions carry uncertainty. "62% win chance (±8%)" is more honest than a single number.

## 4. Prescriptive: what to do

- Recommended moves: rank available actions by expected win probability and explain the top choice
- Team building: search team compositions and placements against a scenario
- Optimal spending: allocate coins across healing, moves, and reserves over the timeline
- Coaching output: turn diagnostics into concrete advice

Prescriptions come from the same simulation engine, so they never recommend moves the engine would not allow.

## How the layers connect

| Layer | Input | Output | Main use |
|---|---|---|---|
| Descriptive | Past battle logs | Summaries, heatmaps, stats | Understanding patterns |
| Diagnostic | Logs plus counterfactual reruns | Causes, decision audits | Learning from losses |
| Predictive | Current state plus simulations | Probabilities, forecasts | Live guidance, balance testing |
| Prescriptive | Predictions plus action search | Ranked actions, team suggestions | Playing and designing better |

## Design considerations

- Hidden information: player-facing analytics use only what the player knows. Designer-facing analytics can use everything.
- Balance feedback: a scenario with a 3% or 97% win rate should be flagged automatically.
- Compute cost: cache results by state hash, cap seeds for live displays, run deeper searches in the background.
- Explainability: every prescription shows the predicted outcomes behind it.
