# Mario × Pokémon: Halloween Arcade

See the [project README](../README.md) for setup and tests and the [arcade operation guide](../docs/arcade_operation_guide.md) for gameplay, analytics methods, three-device operation, evidence collection, and limitations.

From this directory:

```powershell
python -m pytest backend/tests -q
cd frontend
npm run build
npm test
npx playwright test --config playwright.audit.config.ts
```

Start the server from `backend` with `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000` after installing requirements and building the frontend. SQLite defaults to `backend/battle_sim.db`; `BATTLE_SIM_DB` selects another file.

Generate independent synthetic predictive evaluation from `backend`:

```powershell
python evaluate_predictions.py --trials 200 --output ../../docs/predictive_validation.json
```

The original broad browser suites retain stale selectors; the audit configuration covers the repaired visitor/analytics workflow. Three physical devices and actual exhibition records remain required for the assignment.
