# Mario × Pokémon: Halloween Arcade

A simulation-based strategy arcade with descriptive reports, diagnostic counterfactuals, Monte Carlo forecasts, and affordable potion recommendations that players can apply to actual rounds.

Start with **Luigi’s Haunted Pipe Escape**. Draft an ordered squad, compare plans, play, inspect the result, and revise your strategy. The shared control center tracks rounds across terminals and evaluates saved predictions using Brier score and calibration bins.

## Run

Python 3.11+ and Node.js 18+ are required. In PowerShell, from this repository:

```powershell
cd battle-sim/frontend
npm install
npm run build
cd ../backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000`. Other booth devices use the server laptop’s LAN IPv4 address instead of localhost. Open `/analytics` on the control-center device and `/scenarios/haunted_pipes` on the two visitor devices.

## Documentation and verification

- [Arcade operation guide](docs/arcade_operation_guide.md): rules, Chapters 1–6, analytics methods, three-device setup, recovery, submission evidence, and limitations.
- [Synthetic prediction validation](docs/predictive_validation.json): separate forecasting and held-out seeds; not visitor evidence.
- [Original audit](docs/assignment_readiness_audit_2026-10-18.md): findings before these changes.

```powershell
cd battle-sim
python -m pytest backend/tests -q
cd frontend
npm test
npx playwright test --config playwright.audit.config.ts
```

Browser verification uses an isolated database and port 8011. It covers the repaired flow on desktop and mobile viewports; physical three-device operation still requires a booth rehearsal.

## Data and design

FastAPI + SQLite, React + TypeScript, and a seeded Python simulation engine. Each played round retains its ordered squad, starting state, scenario/creature snapshots, potion budget, terminal, pre-battle forecast, outcome, and event log. JSON export preserves the new metadata. Home-page previews are excluded from ordinary session lists and prediction evaluation.

The display roster includes Mario, Luigi, Pikachu, Charizard, Blastoise, Venusaur, Yoshi, Raichu, Onix, and Graveler. Legacy creature IDs are retained for compatibility. Elemental classes, moves, and portraits are simplified; the simulator does not implement the full official game rules. Advice is pre-battle only.
