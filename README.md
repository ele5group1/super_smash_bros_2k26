# Super Mario x Pokémon: Scenario Battle Arena

A full-stack, scenario-driven battle simulator pairing Super Mario and Pokémon champions with arcade-style environmental hazards, deterministic simulation engine, predictive/prescriptive analytics dashboards, and data upload pipelines (JSON, CSV, ZIP).

---

## Features

- **Iconic Roster**:
  - **Heroes**: Mario, Luigi, Pikachu, Charizard, Blastoise, Venusaur, Yoshi, Gengar, Onix, Raichu
  - **Enemies & Bosses**: King Bowser, Mewtwo, Koopa Troopa, Goomba, Piranha Plant, Electabuzz
  - **Signature Moves**: Fireball, Thunderbolt, Flamethrower, Hydro Pump, Solar Beam, Super Jump Punch, Bowser Bomb, Psystrike, etc.
- **Themed Arenas & Scenarios**:
  - **Mushroom Kingdom: Pipe Ambush**: World 1-1 warp pipes, question mark blocks, and flagpole exit.
  - **Bowser's Castle: Lava Siege**: Volcanic keep with crushing Thwomps and fiery lava surges.
  - **Pokémon Stadium: Championship Cup**: Bright stadium spotlights and electric surge hazards.
- **Deterministic Tick Simulation**:
  - Seeded PRNG engine for 100% reproducible outcomes.
  - Dynamic AI personalities (`aggressive`, `cautious`, `opportunistic`).
- **Full Analytics Suite**:
  - **Descriptive**: Post-battle summaries, per-creature damage/KO/hazard statistics, tick HP timelines, threat heatmaps.
  - **Diagnostic**: Defeat root-cause backward tracing and counterfactual rerun engine.
  - **Predictive**: Monte Carlo simulation batches with 95% confidence intervals and calibration against uploaded data.
  - **Prescriptive**: Ranked coin spending allocations and automated scenario balance auditing.
- **Data Ingestion & Export**:
  - Upload custom rosters, scenarios, and battle logs in JSON, RFC 4180 CSV, or multi-file ZIP bundles.
  - Formula-injection prevention and automated battle replay verification.

---

## Quick Start

### 1. Requirements
- Python 3.10+
- Node.js 18+ & npm

### 2. Run Locally (One Command)
```bash
cd battle-sim/backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Open **`http://localhost:8000`** in any web browser!

### 3. Development Mode
```bash
cd battle-sim

# Start backend (Port 8000)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

# Start frontend dev server (Port 5173, with API proxy)
cd frontend
npm run dev
```

---

## Test Suites

```bash
cd battle-sim

# Backend tests (17 passed)
python -m pytest backend/tests -v

# Frontend unit tests (4 passed)
cd frontend && npm test

# Playwright E2E smoke tests (Desktop Chrome + Mobile 390px Safari)
npm run test:e2e
```

---

## Repository Structure

- `battle-sim/backend/`: FastAPI backend, tick engine, analytics, SQLite persistence, and upload parsers.
- `battle-sim/frontend/`: React 18, Vite, TypeScript SPA with interactive SVG arena and analytics dashboards.
- `battle-sim/scenarios/`: Built-in JSON scenario configurations.
- `battle-sim/samples/`: Ready-to-upload sample datasets (CSV, JSON, ZIP).
- `docs/`: Design and architectural documentation.
