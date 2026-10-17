# Super Mario x Pokémon: Scenario Battle Arena

A complete, runnable scenario-driven creature battle simulator with an arcade-style web interface, deterministic tick engine, descriptive/diagnostic/predictive/prescriptive analytics layer, and multi-format dataset upload pipeline (JSON, CSV, and ZIP).

Featuring **Super Mario & Pokémon** champions across 5 elemental types (`fire`, `water`, `grass`, `electric`, `stone`), warp pipes, question blocks, and dynamic stage hazards.

---

## Architecture Overview

- **Backend**: Python 3.11+, FastAPI, Pydantic v2 strict models, SQLite persistence, deterministic PRNG tick engine.
- **Frontend**: Single-page application built with React 18, Vite, TypeScript (strict mode), and pure SVG arena & charts.
- **Analytics Engine**:
  - **Descriptive**: Post-battle summaries, per-creature damage/KO/hazard statistics, tick HP timelines, and spatial threat heatmaps.
  - **Diagnostic**: Defeat root-cause backward tracing and counterfactual rerun engine.
  - **Predictive**: Monte Carlo simulation batches with 95% confidence intervals and survivor distribution.
  - **Prescriptive**: Ranked coin spending allocations and automated scenario balance auditing (25%–75% win rate band).
- **Upload Pipeline**: Supports JSON, RFC 4180 CSV, and multi-file ZIP bundles with line-numbered strict validation and formula-injection guards.

---

## Quick Start & Running

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Development Mode (Both Servers)
```bash
# From battle-sim/ directory:
make dev
```
- Frontend dev server: `http://localhost:5173` (proxies `/api` to port 8000)
- Backend API server: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/api/docs`

### Production Build & Single-Origin Hosting
```bash
# Build the React frontend
make build

# Start FastAPI backend (serves built frontend at / and API at /api)
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Open your browser at `http://localhost:8000`.

---

## Running Test Suites

```bash
# Run all tests (backend, frontend, and E2E)
make test

# Or run individual test suites:
python -m pytest backend/tests -v   # 17 pytest tests
cd frontend && npm test             # Vitest component & formatting tests
cd frontend && npx playwright test  # End-to-end smoke tests (Desktop & 390px Mobile)
```

---

## Docker Deployment

The application includes a multi-stage Dockerfile that compiles the React frontend and packages the FastAPI backend into a production container:

```bash
docker build -t puffcap-arena .
docker run -p 8000:8000 puffcap-arena
```
Access the application at `http://localhost:8000`. No environment variables or configuration required.

---

## Adding New Content

### 1. Adding a New Creature
Add a creature to `backend/app/storage.py` (or upload via `POST /api/uploads`):
```json
{
  "id": "magma_beetle",
  "name": "Magma Beetle",
  "type": "fire",
  "hp": 160,
  "attack": 50,
  "speed": 40,
  "moves": ["flame_spit", "fire_shield"]
}
```

### 2. Adding a New Scenario
Create a JSON file in `backend/scenarios/` (or via Author mode in the web UI):
```json
{
  "id": "lava_bridge",
  "name": "Molten Bridge Run",
  "description": "Cross the crumbly stone arches while dodging fire streams.",
  "lanes": 3,
  "ticks": 40,
  "starting_resources": { "coins": 20 },
  "objective": { "type": "reach_exit", "min_survivors": 2 },
  "enemy_team": ["pyro_tyrant", "thorn_biter"],
  "map": [
    { "lane": 0, "tile_index": 7, "tile_type": "exit" },
    { "lane": 1, "tile_index": 7, "tile_type": "exit" },
    { "lane": 2, "tile_index": 7, "tile_type": "exit" }
  ],
  "hazard_schedule": [
    { "tick": 10, "type": "fire_stream", "lane": 1, "params": { "damage": 25, "burn": true } }
  ]
}
```

---

## Data Upload Formats & Examples

### 1. Creatures (`creatures.csv` or `creatures.json`)
CSV format (`id,name,type,hp,attack,speed,moves`):
```csv
id,name,type,hp,attack,speed,moves
frost_owl,Frost Owl,water,130,42,65,spout_splash;bubble_barrier
thorn_beast,Thorn Beast,grass,170,48,35,vine_whip;spore_heal
```

### 2. Scenario Bundle (`scenarios_bundle.zip`)
Contains three CSV files:
- **`scenarios.csv`**:
  ```csv
  id,name,description,lanes,ticks,objective_type,objective_min_survivors,starting_coins,enemy_team
  custom_dungeon,Custom Dungeon,Deep dungeon maze,3,40,reach_exit,2,20,crag_golem;pyro_tyrant
  ```
- **`hazards.csv`**:
  ```csv
  scenario_id,tick,type,lane,params_json
  custom_dungeon,8,thud_block,1,"{""damage"": 30}"
  ```
- **`map_tiles.csv`**:
  ```csv
  scenario_id,lane,tile_index,tile_type
  custom_dungeon,0,4,pipe
  custom_dungeon,0,7,exit
  ```

### 3. Battles Bundle (`battles_bundle.zip`)
- **`battles.csv`**:
  ```csv
  battle_id,scenario_id,seed,engine_version,player_team,personality,outcome,ticks_elapsed,survivors,coins_left
  b_001,pipe_ambush,1000,1.0.0,ember_fox;bubble_toad,opportunistic,win,22,2,14
  ```
- **`battle_events.csv`**:
  ```csv
  battle_id,tick,actor,action,target,damage,hp_after,coin_change,event_type
  b_001,1,ember_fox,Used Flame Spit,thorn_biter,35,85,0,move
  ```
