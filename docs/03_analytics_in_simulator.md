# Analytics in the Battle Simulator

Each analytics type maps onto one of the three modes (Simulate, Plan, Author) and draws on the tick loop, scenario schema, and outcome report from the concept.

| Mode | Player's question | Analytics types used |
|---|---|---|
| Simulate | What happened in this battle, and why? | Descriptive, diagnostic |
| Plan | What setup should I bring? | Predictive, prescriptive |
| Author | Is my scenario fair and fun? | All four, with full information |

## Simulate mode: post-battle report

- Battle summary: result, ticks elapsed, creatures alive, coins left, objective status
- Creature cards: damage dealt and taken, KOs, ticks in hazard zones, status effects applied
- Tick timeline: HP per creature and coin balance, with markers for hazards, pipe openings, blocks, and power-ups
- Position heatmap: where creatures spent time and where they were knocked out
- Cause trace: clicking a defeat walks backward to the event that made it unavoidable
- Counterfactual button: rerun the same seed with one decision altered and show the shift

Because battles are seeded, cause traces and counterfactuals are exact, not estimated.

## Plan mode: pre-battle guidance

- Predicted win rate: a fixed batch of seeds (for example, 200) shown as a range, such as "58% (±7%)"
- Matchup table: team candidates against the scenario, with win rate, expected survivors, and average coins remaining
- Suggested setup: the best-scoring variant of the current team, with predicted outcomes shown

Example: teams with one healer and a 20-coin reserve win more often than teams that spend everything at the start.

## Live guidance during a battle (optional)

If the game has a coach toggle, the sim pauses at chosen ticks and shows the top three actions with predicted win rates. It should:

- Use fewer seeds (for example, 30) and note that the estimate is rough
- Show only information the player has

## Author mode: scenario balance dashboard

- Balance check: flag scenarios whose win rate falls outside a target band (for example, 25–75%) and name the likely failure point
- Pacing view: average ticks to completion and share of timeouts
- Dominant strategies: teams or spending patterns that win far above average
- Hazard impact map: which hazards and tiles cause the most damage
- Sensitivity sweep: change one parameter (boss HP, block frequency, coin income) and plot the win-rate response

Designers see hidden hazard schedules and AI plans in this view, since the goal is tuning, not play.

## Shared infrastructure

- Event log: one schema across all modes, so the same analytics code serves players and designers
- Seeded runs: predictions and counterfactuals use the same engine as real battles
- Result cache: keyed by scenario version, team setup, and seed set
- Background compute: Plan-mode batches and Author sweeps run in the background with progress shown

## Open questions

- Whether confidence intervals show to all players or only advanced players
- Whether the coach is available in ranked or challenge scenarios
- How many seeds are enough for useful Plan-mode estimates
