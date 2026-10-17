# Battle Simulator Analytics Audit

This document audits the battle simulation engine's event logging, database persistence, upload schema validation, existing analytical capabilities, and missing prerequisites required for a production-grade analytics layer.

---

## 1. Event Log Audit: Existing vs Missing Fields

### Currently Logged Fields per Event (`app.engine.models.Event`)
In the existing codebase, each tick event records:
- `battle_id`: Unique identifier of the battle (`str`).
- `tick`: Simulation step number, 1-indexed (`int`).
- `actor`: Acting creature id or hazard source (`Optional[str]`).
- `action`: Human-readable summary string of the action taken (`str`).
- `target`: Target creature id, if applicable (`Optional[str]`).
- `damage`: Net damage applied or negative if healed (`int`).
- `hp_before`: Target's HP immediately prior to resolution (`int`).
- `hp_after`: Target's HP immediately following resolution (`int`).
- `status_change`: Applied status effect (`"burn"`, `"stun"`, `"shield"`, `"regen"`, or `"healed"`).
- `hazard_hit`: Hazard type identifier (`"pipe_sprout"`, `"lava"`, `"spike_floor"`, etc.).
- `pickup`: Collected board power-up (`"coin_chest"`, `"star_power"`, etc.).
- `ko`: Boolean flag indicating if target HP reached 0 (`bool`).
- `coin_change`: Delta in team coins (`int`).
- `event_type`: Categorical discriminator (`"hazard"`, `"move"`, `"status"`, `"pickup"`, `"death"`, `"objective"`, `"info"`, `"block"`).

### Missing Fields Required for Analytics
To support rich descriptive, diagnostic, predictive, and balance analytics, the following fields are required on every event or on decision events:
1. **`position` (`Dict[str, int]` with `"lane"` and `"tile"`)**:
   - *Current state*: Lane was occasionally encoded in the string `action` or approximated in heatmaps.
   - *Requirement*: Explicit coordinate tracking `{"lane": int, "tile": int}` per event so position heatmaps and lane density calculations are exact and non-heuristic.
2. **`coin_before` and `coin_after` (`int`)**:
   - *Current state*: Only `coin_change` was logged; economy curves had to reconstruct coin balances tick-by-tick.
   - *Requirement*: Explicit balances before and after each event.
3. **`options_considered` (`Optional[List[Dict[str, Any]]]` with `{action, score}`)**:
   - *Current state*: Completely absent. The AI selected actions without recording alternatives or comparative scores.
   - *Requirement*: On decision events (`event_type == "decision"` or actor decision points), record all candidate actions evaluated alongside their heuristic tactical scores (normalized 0.0 to 1.0).
4. **`chosen_action` (`Optional[str]`)**:
   - *Current state*: Absent.
   - *Requirement*: Identifies the specific action option selected by the decision maker.
5. **Backwards Compatibility Strategy**:
   - In `Event` model (`app/engine/models.py`), all new fields are optional or have defaults:
     - `position: Dict[str, int] = Field(default_factory=lambda: {"lane": 0, "tile": 0})`
     - `coin_before: int = 0`
     - `coin_after: int = 0`
     - `options_considered: Optional[List[Dict[str, Any]]] = None`
     - `chosen_action: Optional[str] = None`
   - Old battles without these fields load without validation failure.

---

## 2. Battle Storage and Querying Audit

### Storage Engine (`app/storage.py`)
- **Technology**: Local SQLite database (`battle_sim.db`) managed via `Storage` class with WAL mode.
- **Tables**:
  - `battles`: Stores header metadata (`battle_id`, `scenario_id`, `seed`, `engine_version`, `player_team`, `personality`, `outcome`, `ticks_elapsed`, `survivors`, `coins_left`, `source`, `upload_id`, `created_at`).
  - `battle_events`: Relational table storing individual events linked via `FOREIGN KEY (battle_id) REFERENCES battles(battle_id) ON DELETE CASCADE`.
- **Query Patterns**:
  - Battles are retrieved via `get_battle(battle_id)` (joins header and all sorted events).
  - Bulk retrieval via `get_battles(scenario_id, source)` allows filtering by scenario and dataset origin (`simulated` vs `upload:{id}`).
- **Schema Migration**:
  - `init_db()` will execute safe `ALTER TABLE battle_events ADD COLUMN ...` statements if `position_lane`, `position_tile`, `coin_before`, `coin_after`, `options_considered_json`, and `chosen_action` columns do not yet exist, preserving existing database rows.

---

## 3. Existing Analytics Codebase Audit

### Current Modules (`backend/app/analytics/`)
1. **`descriptive.py`**:
   - `compute_battle_descriptive_stats(battle)`: Reconstructs creature damage dealt/taken, KOs, survival, rough HP timeline, and an 8x3 damage/KO heatmap.
   - `aggregate_descriptive_stats(battles)`: Basic averages of win rate, ticks, survivors, and coins.
   - *Gaps*: Lacks modular pure functions returning typed Pydantic models (`battle_summary`, `creature_stats`, `team_stats`, `hp_timeline`, `position_heatmap`); does not break down time-spent density across tiles.
2. **`diagnostic.py`**:
   - `trace_defeat_causes(battle)`: Scans for first lethal hazard, heavy enemy strikes (>=30 dmg), coin depletion, and first player KO.
   - `run_counterfactual_battle(...)`: Re-simulates with modified tick decision and returns outcome and first differing tick.
   - *Gaps*: Does not return typed models; lacks `loss_causes` aggregate ranking across multiple losses; lacks `decision_audit` for score divergence; counterfactual does not return cause-trace diffs.
3. **`predictive.py`**:
   - `run_monte_carlo_prediction(...)`: Runs Monte Carlo across seeds using fixed step multiplier `7919`, computing a normal approximation CI.
   - *Gaps*: Lacks Wilson score interval when $p \approx 0$ or $p \approx 1$; lacks `predict_from_state` for mid-battle partial states without hidden opponent information; calibration blended interpretation rather than presenting clear side-by-side gap metrics; missing replay-mismatch filtering.
4. **`prescriptive.py`**:
   - `compare_plan_options(...)`: Evaluates early heal spend options.
   - `recommend_best_actions(...)`: Evaluates spending intervals 0, 5, 10, 15, 20.
   - `audit_scenario_balance(...)`: Tests against 4 hardcoded archetypes and flags if overall win rate is outside 25%–75%.
   - *Gaps*: Lacks generic parameter sensitivity sweep (`sensitivity_sweep`); does not isolate dominant strategy detection (>20 points above team average).

---

## 4. Upload Pipeline Audit

### Ingested Upload Formats (`app/uploads/validate.py`)
- **`battles.csv`**:
  - Columns: `battle_id`, `scenario_id`, `seed`, `engine_version`, `player_team`, `personality`, `outcome`, `ticks_elapsed`, `survivors`, `coins_left`.
- **`battle_events.csv`**:
  - Columns: `battle_id`, `tick`, `actor`, `action`, `target`, `damage`, `hp_after`, `coin_change`, `event_type`.
  - Missing columns to accept optionally: `lane`, `tile`, `coin_before`, `coin_after`, `chosen_action`, `options_considered`.
- **`battles.json`**:
  - Full serialized `List[BattleRecord]` including all `Event` objects.
- **Replay Verification (`app/uploads/replay.py`)**:
  - Every uploaded battle can be deterministically re-run from its `seed`, `scenario_id`, and `player_team`.
  - Mismatched replays are flagged with `status: "mismatch"`.
  - *Analytics Requirement*: Mismatched uploaded battles must be excluded from predictive modeling by default, and included only when `include_mismatched=true`.

---

## 5. Summary of Additions

| Component | Addition / Modification | Purpose |
| :--- | :--- | :--- |
| `Event` model | `position`, `coin_before`, `coin_after`, `options_considered`, `chosen_action` | Provides exact coordinates and AI decision deltas per tick. |
| `AIDecisionMaker` | Evaluate all moves and output `options_considered` with scores | Enables `decision_audit` to identify sub-optimal tactical choices. |
| `descriptive.py` | `battle_summary`, `creature_stats`, `team_stats`, `hp_timeline`, `position_heatmap` | Pure functional descriptive models. |
| `diagnostic.py` | `cause_trace`, `loss_causes`, `decision_audit`, `counterfactual` | Root cause tracing, aggregate loss categorization, and decision gap audit. |
| `predictive.py` | `predict_win_rate`, `predict_from_state`, Wilson CI, mismatch filter | Calibrated predictions with sound statistical bounds. |
| `prescriptive.py` | `compare_options`, `recommend_action` | Multi-scenario options ranking and state-based recommendations. |
| `balance.py` | `balance_report`, `sensitivity_sweep` | Author-mode balance auditing, dominant strategy detection, parameter sweeping. |
| API Layer | `/api/battles/{id}/analytics/*`, `/api/author/*`, `/api/jobs/{id}` | Standardized REST endpoints returning typed Pydantic models. |
| Frontend | `/analytics` route, Report tabs, Plan calibration & CI, Author sweep | Unified modern presentation with accessible tables and charts. |
