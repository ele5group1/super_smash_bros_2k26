# Architecture, protocol, and data

## Stack

- Server: Node.js with TypeScript and Socket.IO. One process for the MVP.
- Clients: Phaser (TypeScript) for the playable terminals. A lighter Socket.IO page for the control dashboard.
- Database: SQLite in WAL mode with periodic backups.
- Validation: a schema library (for example, Zod) on every incoming message.
- Analytics: pure TypeScript functions that read the database and return typed results.

The server is authoritative. Clients render events and send intentions. Clients never calculate or submit HP, energy, or winners.

## Folder layout

```
boo-bash-arena/
  client/
    src/scenes/        Boot, Title, Lobby, Draft, Battle, Result
    src/ui/            HPBar, ActionMenu, CharacterCard
    src/net/           socket client and room state
    public/assets/     sprites, tiles, audio (original or licensed)
  server/
    src/game/          roster, rules, reducer, combat, AI
    src/rooms/         state machine, matchmaking
    src/analytics/     features, predictors, optimizer
    src/db/            schema, queries, migrations
  shared/              types and event payload schemas
  scripts/             simulation and balance testing
  docs/                rules, diagrams, validation
  tests/               unit, integration, load
```

## Phase machine

LOBBY → FACTION_LOCK → DRAFT → LINEUP_LOCK → BATTLE → RESULT → REMATCH or LOBBY.

The server only advances phases. It rejects any message that does not match the current phase.

## Network events

| Event | Direction | Minimum payload |
|---|---|---|
| room:create | client → server | playerName, clientVersion |
| room:join | client → server | roomCode, playerName |
| faction:select | client → server | roomId, faction |
| draft:lock | client → server | roomId, characterIds[3], orderedIds[3] |
| turn:lock | client → server | roomId, turnNumber, action, requestId |
| state:update | server → clients | phase, public state, currentTurn, serverTimestamp |
| turn:resolved | server → clients | turnNumber, action reveals, effects, HP, energy, faints, nextLead |
| match:finished | server → clients | winner, reason, summary |
| dashboard:update | server → dashboard | aggregate metrics, active room count |

Security rules:

- Room codes: 6 characters, random, with collision checks.
- Reconnect tokens: 128 bits.
- Per-socket rate limits.
- Monotonic turn numbers and request IDs. Duplicates and stale turns are ignored.
- Locked actions are never broadcast until both are locked or timed out.
- Dashboard is read-only for spectators and never shows secret choices before resolution.

## Database schema

```sql
CREATE TABLE matches (
  id TEXT PRIMARY KEY, room_code TEXT, started_at TEXT, ended_at TEXT,
  winner_faction TEXT, finish_reason TEXT, turns INTEGER,
  duration_seconds INTEGER, seed INTEGER, rules_version TEXT,
  model_version TEXT, source TEXT CHECK (source IN ('actual','simulated'))
);
CREATE TABLE players (
  id TEXT PRIMARY KEY, match_id TEXT NOT NULL REFERENCES matches(id),
  seat INTEGER, faction TEXT, anonymous_name TEXT
);
CREATE TABLE drafted_characters (
  match_id TEXT, player_id TEXT, character_id TEXT,
  lineup_position INTEGER, point_cost INTEGER,
  PRIMARY KEY (match_id, player_id, character_id)
);
CREATE TABLE turns (
  match_id TEXT, turn_no INTEGER, started_at TEXT, resolved_at TEXT,
  timeout_count INTEGER, PRIMARY KEY (match_id, turn_no)
);
CREATE TABLE actions (
  match_id TEXT, turn_no INTEGER, player_id TEXT, character_id TEXT,
  action_type TEXT, energy_before INTEGER, energy_after INTEGER,
  damage_dealt INTEGER, healing_done INTEGER, shield_added INTEGER,
  hp_before INTEGER, hp_after INTEGER, timed_out INTEGER,
  PRIMARY KEY (match_id, turn_no, player_id)
);
CREATE TABLE predictions (
  id TEXT PRIMARY KEY, match_id TEXT, phase TEXT, model_version TEXT,
  predicted_faction TEXT, probability REAL, feature_json TEXT,
  actual_outcome TEXT, created_at TEXT
);
CREATE TABLE recommendations (
  id TEXT PRIMARY KEY, match_id TEXT, player_id TEXT,
  roster_json TEXT, lineup_json TEXT, budget INTEGER,
  estimated_win_rate REAL, accepted INTEGER, model_version TEXT
);
CREATE INDEX idx_actions_match_player ON actions(match_id, player_id);
CREATE INDEX idx_matches_started ON matches(started_at);
CREATE INDEX idx_predictions_model ON predictions(model_version);
```

Indexes and a schema version number are required. Migrations must preserve older data.

## Data handling

- Store anonymous player IDs and optional nicknames only. No passwords or emails.
- Provide a way to delete exhibition data.
- Actual and simulated matches are separate rows (source column). Analytics filters must not blend them silently.

## Failure handling

- Server restart: restore unfinished rooms from the last snapshot, or mark them abandoned. Never silently award a win.
- Disconnect: see `01_rules.md`.
- Each match writes atomically (match and turn rows in one transaction).
