# Schedule, roles, and booth

## Eight-day schedule (Oct 19–27)

| Day | Deliverable |
|---|---|
| Oct 19 | Finalize rules, roster, visual mockups, database schema, repository, task list |
| Oct 20 | Combat reducer and unit tests |
| Oct 21 | Socket.IO rooms, secret-action protocol, lobby and draft |
| Oct 22 | Phaser battle HUD, action menu, simple animations |
| Oct 23 | Persistence, match results, dashboard, CSV export |
| Oct 24 | Simulation, baseline prediction, constrained recommender |
| Oct 25 | Balance tests, model evaluation, network and reconnect tests |
| Oct 26 | Three-device full rehearsal, documentation, bug fixes, asset polish |
| Oct 27 | Morning and afternoon arcade operation; collect logs and evidence |

Scope guard: if late, cut animation variety first. Do not cut three-device sync, recorded data, or the prescriptive recommender.

## Suggested group roles (4–5 members)

- Gameplay engineer: rules, reducer, tests, balance simulations.
- Frontend and pixel artist: Phaser scenes, sprites, UI, animations, accessibility.
- Backend and network engineer: rooms, state machine, Socket.IO, SQLite, reconnect.
- Analytics engineer: data cleaning, summaries, predictor, evaluation, recommender.
- QA and booth lead (or shared): three-device rehearsals, documentation, deployment, exhibition, evidence.

Every member must be able to explain their part.

## Booth checklist

- Server laptop on the same Wi-Fi or hotspot as both player devices and the dashboard device.
- Test that the firewall allows port 3000.
- QR code for the local URL, printed and on the booth table.
- Chargers, cables, and a spare hotspot.
- Offline setup that works with no internet.
- SQLite backup taken before each session.
- Same deployment version on all devices. Show a version mismatch warning.

## Submission (one shared Google Drive folder via Canvas)

- Working source, build, and deployment instructions.
- Datasets, analytics scripts, models, and balance results.
- Brief system documentation: concept, rules, architecture, three-device configuration, data sources, Chapters 1–6 mapping, predictive and prescriptive methods, run instructions, known limits.
- Exhibition evidence: session logs from both sessions.

## Open decisions

- Confirm the final five per faction (names in `02_roster.md`).
- Decide whether draws count as losses for the recommender's score.
- Decide the number of human pilot games before the exhibition (target 10–20).
- Choose which real-world rules will be adjusted after pilot testing, and record each change as a new rules_version.
