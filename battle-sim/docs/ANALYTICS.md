# Battle Simulator Analytics Engine Specification

## 1. Overview & Architecture

The **Puffcap Arena Analytics Engine** provides a multi-tiered analytics pipeline for deterministic, tick-based battle simulations and uploaded community datasets.

The analytics system is organized into five specialized modules under `backend/app/analytics/`:
- **Descriptive (`descriptive.py`)**: Post-match summaries, individual combatant telemetry, tick-by-tick HP timelines, and lane/tile spatial heatmaps.
- **Diagnostic (`diagnostic.py`)**: Root-cause defeat traces, aggregate ranked loss causes, decision score gap auditing, and counterfactual branch simulations.
- **Predictive (`predictive.py`)**: Pre-match and in-battle win-rate estimation with 95% confidence intervals (using Normal and Wilson score approximations) and survivor count distributions.
- **Prescriptive (`prescriptive.py`)**: Multi-action tactical comparison and top-three action recommendations with natural language explanations.
- **Balance & Sensitivity (`balance.py`)**: Scenario archetype win-rate audits against a 25%–75% target band, dominant strategy detection, and parameter sensitivity sweeps.

---

## 2. Descriptive Analytics

### 2.1 Battle Summary (`GET /api/battles/{id}/analytics/summary`)
Computes macro battle metrics directly from the deterministic event log:
- **Outcome**: Winner (`player`, `enemy`, `draw`).
- **Pacing**: Total ticks elapsed and pacing category (`fast` if $\le 15$ ticks, `balanced` if $16-35$ ticks, `prolonged` if $> 35$ ticks).
- **Damage Totals**: Total physical and elemental damage dealt by player squad vs enemy squad.
- **Economy**: Coins earned from question blocks/caches vs coins spent on tactical abilities.

### 2.2 Creature Telemetry (`GET /api/battles/{id}/analytics/creatures`)
Tracks individual performance for all participants:
- `damage_dealt`: Cumulative damage inflicted on opponents.
- `damage_taken`: Total incoming damage absorbed.
- `healing_done`: Health restored to allies.
- `shield_absorbed`: Incoming damage nullified by protective barriers.
- `moves_used`: Count and breakdown of moves cast.
- `statuses_applied`: Burns, stuns, and shields applied.
- `survived`: Boolean survival indicator.
- `final_hp`: Health remaining at battle end.

### 2.3 Health Timeline (`GET /api/battles/{id}/analytics/timeline`)
Generates a tick-by-tick array of active HP values for all player and enemy combatants, recording status effect transitions and lane movements.

### 2.4 Spatial Heatmap (`GET /api/battles/{id}/analytics/heatmap`)
Constructs an occupancy frequency matrix indexed by `[lane][tile_index]`, highlighting high-traffic choke points, hazard hotspots, and exit contest zones.

---

## 3. Diagnostic Analytics

### 3.1 Defeat Cause Trace (`GET /api/battles/{id}/analytics/cause-trace`)
When a creature is eliminated, the engine performs backwards event-log traversal to identify:
1. **Fatal Tick**: The precise tick of death.
2. **Primary Cause**: `direct_attack`, `hazard_damage` (lava, ambush, pipe spike), or `status_tick` (burn).
3. **Killer / Source**: Attacking opponent ID or hazard name.
4. **Preceding HP Trend**: Damage burst sustained in the 3 ticks prior to elimination.

### 3.2 Ranked Loss Causes (`GET /api/analytics/loss-causes`)
Aggregates defeat causes across multiple battles for a given scenario, grouping by catalyst (e.g., "Pipe Ambush Hazard", "Flame Spit Burn", "Overwhelmed Frontline") with average elimination ticks and tactical mitigation recommendations.

### 3.3 Decision Audit (`GET /api/battles/{id}/analytics/decisions`)
Every AI turn evaluates multiple tactical options and logs an `options_considered` array with numerical scores.
- The auditor compares the chosen action score against the highest-scoring candidate:
  $$\Delta = \text{Score}_{\text{best}} - \text{Score}_{\text{chosen}}$$
- Any action with $\Delta > \text{threshold}$ (default 0.05) is flagged as sub-optimal.

### 3.4 Counterfactual Branching (`POST /api/battles/{id}/counterfactual`)
Allows designers and players to select any historical decision tick $T$ and replace the action with an alternative action $A_{\text{alt}}$:
1. State is restored to tick $T-1$.
2. Action $A_{\text{alt}}$ is injected at tick $T$.
3. The battle runs forward to completion using the identical seed.
4. Returns side-by-side comparison of original vs counterfactual outcomes.

---

## 4. Predictive Analytics

### 4.1 Win Rate & Confidence Intervals (`POST /api/plan/predict`)
Runs $N$ deterministic Monte Carlo simulations across seeds:
- **Win Rate**: $p = \frac{\text{wins}}{N}$
- **Normal Approximation** (used when $0.05 < p < 0.95$ and $N \cdot p \ge 5$ and $N(1-p) \ge 5$):
  $$CI = 1.96 \times \sqrt{\frac{p(1-p)}{N}}$$
- **Wilson Score Interval** (used for extreme values $p \le 0.05$ or $p \ge 0.95$):
  $$p_{\text{center}} = \frac{p + \frac{z^2}{2N}}{1 + \frac{z^2}{N}}, \quad CI = \frac{z}{1 + \frac{z^2}{N}} \sqrt{\frac{p(1-p)}{N} + \frac{z^2}{4N^2}}$$
- **Survivor Distribution**: Histogram counting frequency of $0, 1, 2, 3, 4$ surviving squad members.

### 4.2 In-Battle State Prediction (`predict_from_state`)
Predicts win rate from any mid-battle turn respecting hidden-information privacy:
- Evaluates only visible player creatures ($HP > 0$), visible enemy creatures ($HP > 0$), and visible coins.
- Does not inspect future hazard queues, enemy hidden branch seeds, or unrevealed map blocks.

---

## 5. Prescriptive Analytics

### 5.1 Tactical Option Comparison (`POST /api/plan/compare`)
Compares discrete strategy options (e.g., early heal spend vs coin conservation) across multiple simulation seeds, returning win rates, 95% confidence intervals, and coin economy impact.

### 5.2 Recommendation Engine (`POST /api/plan/recommend`)
Analyzes candidate tactical actions from the current board state and surfaces the top-three actions ranked by projected win rate, accompanied by 95% confidence bounds and concise tactical rationale.

---

## 6. Balance & Sensitivity Auditing

### 6.1 Scenario Balance Report (`GET /api/author/scenarios/{id}/balance`)
Evaluates standard squad archetypes against the scenario:
- **Target Band**: Win rates must fall within $25\% - 75\%$.
- **Dominant Strategy**: Flagged if any team achieves $> 75\%$ win rate (overpowered) or $< 25\%$ win rate (underpowered).
- **Pacing**: Flags scenarios with timeout rates $> 5\%$.

### 6.2 Sensitivity Sweep (`POST /api/author/scenarios/{id}/sensitivity`)
Sweeps a scenario parameter (e.g., `enemy_hp_multiplier` from $0.5\times$ to $1.5\times$) across $K$ intervals, plotting the win-rate sensitivity curve to identify design tipping points.

---

## 7. Data Calibration & Mismatch Policy

- **Non-Blending Rule**: Simulated runs and uploaded runs are analyzed independently. When viewed simultaneously, metrics are displayed side-by-side without blending.
- **Replay Verification**: Uploaded battles are validated via deterministic engine replay. If uploaded logs diverge from engine replay (mismatch), they are excluded from calibration reports by default unless `include_mismatched=true` is explicitly passed.
