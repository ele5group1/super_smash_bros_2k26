# Analytics

Every panel labels its data as Actual or Simulated. Never blend them silently. Small groups (n < 20) are labeled.

## Descriptive: what happened

- Total matches, Faction A and Faction B win rates, draw rate.
- Average and median turns, match duration, 95th-percentile duration.
- Role pick rate, composition win rate (exact unordered trio), and lead-order win rate (ordered lineup, reported separately).
- Intervals: Wilson 95% for every proportion.

## Diagnostic: why it happened

- Outcomes grouped by first lead, role combination, first three turns, timeout count, and opponent role matchup.
- Every group shows its sample size.
- Compare mirror roles and faction symmetry using simulation.
- No causal claims from observational data. Write "associated with", not "caused by".

## Predictive: what is likely next

Draft model (logistic regression)
- Inputs: five binary role indicators per side, point totals, lead role (one-hot), faction flag, cross-side role pairs.
- Target: whether Faction A won. Draws are excluded from training.
- Train on seeded simulated matches first, then on actual matches once there are enough. Use randomized legal drafts to avoid a biased dataset.

Mid-battle model
- Inputs: turn number, alive count per side, normalized total HP, active HP fractions, active energy, remaining shield, active roles, relative speed.
- Target: Faction A win probability.
- Use only information known at prediction time. Do not use future events.

Evaluation
- Split by match ID, never by turn row. 70/15/15 with a fixed seed.
- Report accuracy, Brier score, ROC AUC where both classes exist, and calibration bins.
- Baselines: majority class, and a simple HP-advantage heuristic. A model that does not beat its baseline is not shown as a prediction.
- Store model_version, training size, split seed, training date, and metrics.
- Before enough data exists, show simulation-derived estimates clearly labeled as such. Never present invented accuracy.

## Prescriptive: what should we do

Draft recommender
- Enumerate all 60 ordered trios per faction that fit the budget of 12.
- For each candidate, estimate win rate against the opponent's known faction and draft, using 200–1000 seeded simulated matches with a fixed opponent policy and a shared seed set.
- Rank by estimated win rate, then lower cost, then alphabetical ID.
- If the opponent's lineup is hidden, average over a distribution of plausible legal lineups.
- Report the recommendation, its cost, the predicted chance, the baseline alternative, and the simulation count.
- Show "insufficient evidence" when results vary too much between seed batches.
- The recommender suggests. It never forces a choice.

Pseudocode:

```ts
function recommend(roster: Character[], budget: number, opponent: OpponentContext) {
  const choices = permutations(roster, 3).filter(team => sum(team.map(x => x.cost)) <= budget);
  const ranked = choices.map(team => ({
    team,
    score: simulateWinRate(team, opponent, { trials: 500, seed: 20261027 }),
  }));
  return ranked.sort((a, b) => b.score - a.score || cost(a.team) - cost(b.team) || id(a.team).localeCompare(id(b.team)))[0];
}
```

## Dashboard panels

- Live status: rooms, connected players, active matches, last sync.
- Overview: counts, faction wins, durations.
- Characters: picks, wins, intervals.
- Compositions: trio and order comparisons.
- Models: Brier score, calibration, test n, model_version.
- Export: matches.csv and actions.csv, with the formula-injection guard.

Refresh by push after each resolved turn or match, throttled to once every 1–2 seconds.

## Tests for analytics

- Known fixtures produce the expected counts.
- No train/test leakage: the same match ID never appears in two splits.
- Wilson intervals match known values.
- CSV export round-trips with identical rows.
