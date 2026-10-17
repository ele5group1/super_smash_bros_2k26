"""SQLite storage layer for creatures, scenarios, battles, events, and uploads."""

import json
import os
import sqlite3
from pathlib import Path
from typing import List, Optional, Dict, Any
from .engine.models import (
    Creature,
    CreatureType,
    Scenario,
    MapTile,
    HazardSchedule,
    ScenarioObjective,
    BattleRecord,
    Event,
)

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "battle_sim.db"

BUILTIN_CREATURES_DATA = [
    {
        "id": "ember_fox",
        "name": "Ember Fox",
        "type": "fire",
        "hp": 120,
        "attack": 45,
        "speed": 65,
        "moves": ["flame_spit", "ember_burst", "fire_shield"],
        "source": "builtin",
        "avatar": "fox",
    },
    {
        "id": "flame_salamander",
        "name": "Flame Salamander",
        "type": "fire",
        "hp": 160,
        "attack": 52,
        "speed": 45,
        "moves": ["flame_spit", "ember_burst"],
        "source": "builtin",
        "avatar": "salamander",
    },
    {
        "id": "bubble_toad",
        "name": "Bubble Toad",
        "type": "water",
        "hp": 140,
        "attack": 38,
        "speed": 50,
        "moves": ["spout_splash", "bubble_barrier", "tidal_surge"],
        "source": "builtin",
        "avatar": "toad",
    },
    {
        "id": "stream_turtle",
        "name": "Stream Turtle",
        "type": "water",
        "hp": 180,
        "attack": 35,
        "speed": 30,
        "moves": ["spout_splash", "bubble_barrier"],
        "source": "builtin",
        "avatar": "turtle",
    },
    {
        "id": "moss_shroom",
        "name": "Moss Shroom",
        "type": "grass",
        "hp": 150,
        "attack": 36,
        "speed": 40,
        "moves": ["vine_whip", "spore_heal", "petal_tempest"],
        "source": "builtin",
        "avatar": "shroom",
    },
    {
        "id": "bramble_hound",
        "name": "Bramble Hound",
        "type": "grass",
        "hp": 130,
        "attack": 44,
        "speed": 58,
        "moves": ["vine_whip", "petal_tempest"],
        "source": "builtin",
        "avatar": "hound",
    },
    {
        "id": "volt_hedgehog",
        "name": "Volt Hedgehog",
        "type": "electric",
        "hp": 110,
        "attack": 48,
        "speed": 75,
        "moves": ["spark_zap", "thunder_bolt", "charge_dash"],
        "source": "builtin",
        "avatar": "hedgehog",
    },
    {
        "id": "spark_finch",
        "name": "Spark Finch",
        "type": "electric",
        "hp": 105,
        "attack": 42,
        "speed": 80,
        "moves": ["spark_zap", "charge_dash"],
        "source": "builtin",
        "avatar": "finch",
    },
    {
        "id": "crag_golem",
        "name": "Crag Golem",
        "type": "stone",
        "hp": 210,
        "attack": 46,
        "speed": 25,
        "moves": ["pebble_throw", "boulder_slam", "rock_armor"],
        "source": "builtin",
        "avatar": "golem",
    },
    {
        "id": "pebble_armadillo",
        "name": "Pebble Armadillo",
        "type": "stone",
        "hp": 170,
        "attack": 38,
        "speed": 42,
        "moves": ["pebble_throw", "rock_armor"],
        "source": "builtin",
        "avatar": "armadillo",
    },
    # Enemy boss & minion creatures
    {
        "id": "pyro_tyrant",
        "name": "Pyro Tyrant",
        "type": "fire",
        "hp": 280,
        "attack": 55,
        "speed": 40,
        "moves": ["flame_spit", "ember_burst"],
        "source": "builtin",
        "avatar": "tyrant",
    },
    {
        "id": "thorn_biter",
        "name": "Thorn Biter",
        "type": "grass",
        "hp": 120,
        "attack": 42,
        "speed": 50,
        "moves": ["vine_whip"],
        "source": "builtin",
        "avatar": "biter",
    },
    {
        "id": "pipe_lurker",
        "name": "Pipe Lurker",
        "type": "water",
        "hp": 130,
        "attack": 40,
        "speed": 48,
        "moves": ["spout_splash"],
        "source": "builtin",
        "avatar": "lurker",
    },
    {
        "id": "iron_spikeling",
        "name": "Iron Spikeling",
        "type": "stone",
        "hp": 140,
        "attack": 44,
        "speed": 35,
        "moves": ["pebble_throw"],
        "source": "builtin",
        "avatar": "spikeling",
    },
    {
        "id": "thunder_wasp",
        "name": "Thunder Wasp",
        "type": "electric",
        "hp": 115,
        "attack": 46,
        "speed": 70,
        "moves": ["spark_zap"],
        "source": "builtin",
        "avatar": "wasp",
    },
    {
        "id": "bowser_boss",
        "name": "Giga Bowser (Boss)",
        "type": "fire",
        "hp": 480,
        "attack": 62,
        "speed": 38,
        "moves": ["giga_flame", "whirlwind_shell", "cataclysmic_stomp", "bowser_bomb"],
        "source": "builtin",
        "avatar": "bowser",
    },
]


class Storage:
    def __init__(self, db_path: Optional[str | Path] = None):
        self.db_path = str(db_path or DEFAULT_DB_PATH)
        self.init_db()

    def get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, timeout=20.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        return conn

    def init_db(self) -> None:
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        with self.get_conn() as conn:
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS creatures (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                hp INTEGER NOT NULL,
                attack INTEGER NOT NULL,
                speed INTEGER NOT NULL,
                moves TEXT NOT NULL,
                source TEXT DEFAULT 'builtin',
                avatar TEXT,
                upload_id TEXT
            );

            CREATE TABLE IF NOT EXISTS scenarios (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                lanes INTEGER NOT NULL,
                ticks INTEGER NOT NULL,
                objective_json TEXT NOT NULL,
                starting_coins INTEGER NOT NULL,
                enemy_team TEXT NOT NULL,
                source TEXT DEFAULT 'builtin',
                upload_id TEXT
            );

            CREATE TABLE IF NOT EXISTS hazards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scenario_id TEXT NOT NULL,
                tick INTEGER NOT NULL,
                type TEXT NOT NULL,
                lane INTEGER NOT NULL,
                params_json TEXT NOT NULL,
                upload_id TEXT,
                FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS map_tiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scenario_id TEXT NOT NULL,
                lane INTEGER NOT NULL,
                tile_index INTEGER NOT NULL,
                tile_type TEXT NOT NULL,
                upload_id TEXT,
                FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS battles (
                battle_id TEXT PRIMARY KEY,
                scenario_id TEXT NOT NULL,
                seed INTEGER NOT NULL,
                engine_version TEXT NOT NULL,
                player_team TEXT NOT NULL,
                personality TEXT NOT NULL,
                outcome TEXT NOT NULL,
                ticks_elapsed INTEGER NOT NULL,
                survivors INTEGER NOT NULL,
                coins_left INTEGER NOT NULL,
                source TEXT DEFAULT 'simulated',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                upload_id TEXT
            );

            CREATE TABLE IF NOT EXISTS battle_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                battle_id TEXT NOT NULL,
                tick INTEGER NOT NULL,
                actor TEXT,
                action TEXT NOT NULL,
                target TEXT,
                damage INTEGER DEFAULT 0,
                hp_before INTEGER DEFAULT 0,
                hp_after INTEGER DEFAULT 0,
                status_change TEXT,
                hazard_hit TEXT,
                pickup TEXT,
                ko BOOLEAN DEFAULT 0,
                coin_change INTEGER DEFAULT 0,
                event_type TEXT NOT NULL,
                lane INTEGER DEFAULT 0,
                tile INTEGER DEFAULT 0,
                coin_before INTEGER DEFAULT 0,
                coin_after INTEGER DEFAULT 0,
                options_considered_json TEXT,
                chosen_action TEXT,
                FOREIGN KEY (battle_id) REFERENCES battles(battle_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS uploads (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                filename TEXT NOT NULL,
                row_count INTEGER DEFAULT 0,
                status TEXT NOT NULL,
                errors_json TEXT DEFAULT '[]',
                warnings_json TEXT DEFAULT '[]',
                preview_json TEXT DEFAULT '[]',
                upload_group TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # Ensure columns exist on battle_events for migration compatibility
            cols = {row["name"] for row in conn.execute("PRAGMA table_info(battle_events)").fetchall()}
            if "lane" not in cols:
                conn.execute("ALTER TABLE battle_events ADD COLUMN lane INTEGER DEFAULT 0")
            if "tile" not in cols:
                conn.execute("ALTER TABLE battle_events ADD COLUMN tile INTEGER DEFAULT 0")
            if "coin_before" not in cols:
                conn.execute("ALTER TABLE battle_events ADD COLUMN coin_before INTEGER DEFAULT 0")
            if "coin_after" not in cols:
                conn.execute("ALTER TABLE battle_events ADD COLUMN coin_after INTEGER DEFAULT 0")
            if "options_considered_json" not in cols:
                conn.execute("ALTER TABLE battle_events ADD COLUMN options_considered_json TEXT")
            if "chosen_action" not in cols:
                conn.execute("ALTER TABLE battle_events ADD COLUMN chosen_action TEXT")

        self._seed_builtins()

    def _seed_builtins(self) -> None:
        with self.get_conn() as conn:
            valid_ids = [c["id"] for c in BUILTIN_CREATURES_DATA]
            placeholders = ",".join("?" for _ in valid_ids)
            conn.execute(
                f"DELETE FROM creatures WHERE source = 'builtin' AND id NOT IN ({placeholders})",
                valid_ids,
            )
            for c in BUILTIN_CREATURES_DATA:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO creatures (id, name, type, hp, attack, speed, moves, source, avatar)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        c["id"],
                        c["name"],
                        c["type"],
                        c["hp"],
                        c["attack"],
                        c["speed"],
                        ";".join(str(m) for m in c["moves"]) if isinstance(c["moves"], list) else str(c["moves"]),
                        c["source"],
                        c.get("avatar"),
                    ),
                )

        # Seed scenarios from backend/scenarios folder if present
        scenarios_dir = Path(__file__).resolve().parent.parent / "scenarios"
        if scenarios_dir.exists():
            for f in scenarios_dir.glob("*.json"):
                try:
                    with open(f, "r", encoding="utf-8") as sf:
                        data = json.load(sf)
                        scenario = Scenario(**data)
                        self.save_scenario(scenario, upload_id=None, source="builtin")
                except Exception as e:
                    print(f"Error loading initial scenario {f}: {e}")

    # --- Creatures ---
    def get_all_creatures(self, source_filter: Optional[str] = None) -> List[Creature]:
        with self.get_conn() as conn:
            query = "SELECT * FROM creatures"
            params: List[Any] = []
            if source_filter == "builtin":
                query += " WHERE source = 'builtin'"
            elif source_filter == "uploaded":
                query += " WHERE source != 'builtin'"
            rows = conn.execute(query, params).fetchall()
            return [
                Creature(
                    id=r["id"],
                    name=r["name"],
                    type=CreatureType(r["type"]),
                    hp=r["hp"],
                    attack=r["attack"],
                    speed=r["speed"],
                    moves=r["moves"].split(";") if r["moves"] else [],
                    source=r["source"],
                    avatar=r["avatar"],
                )
                for r in rows
            ]

    def get_creature(self, creature_id: str) -> Optional[Creature]:
        with self.get_conn() as conn:
            r = conn.execute("SELECT * FROM creatures WHERE id = ?", (creature_id,)).fetchone()
            if not r:
                return None
            return Creature(
                id=r["id"],
                name=r["name"],
                type=CreatureType(r["type"]),
                hp=r["hp"],
                attack=r["attack"],
                speed=r["speed"],
                moves=r["moves"].split(";") if r["moves"] else [],
                source=r["source"],
                avatar=r["avatar"],
            )

    def save_creature(self, c: Creature, upload_id: Optional[str] = None, source: Optional[str] = None) -> None:
        src = source or (f"upload:{upload_id}" if upload_id else c.source or "builtin")
        with self.get_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO creatures (id, name, type, hp, attack, speed, moves, source, avatar, upload_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    c.id,
                    c.name,
                    c.type.value if hasattr(c.type, "value") else str(c.type),
                    c.hp,
                    c.attack,
                    c.speed,
                    ";".join(c.moves),
                    src,
                    c.avatar,
                    upload_id,
                ),
            )

    # --- Scenarios ---
    def get_all_scenarios(self, source_filter: Optional[str] = None) -> List[Scenario]:
        with self.get_conn() as conn:
            query = "SELECT * FROM scenarios"
            if source_filter == "builtin":
                query += " WHERE source = 'builtin'"
            elif source_filter == "uploaded":
                query += " WHERE source != 'builtin'"
            rows = conn.execute(query).fetchall()
            scenarios = []
            for r in rows:
                sc = self._hydrate_scenario(r, conn)
                scenarios.append(sc)
            return scenarios

    def get_scenario(self, scenario_id: str) -> Optional[Scenario]:
        with self.get_conn() as conn:
            r = conn.execute("SELECT * FROM scenarios WHERE id = ?", (scenario_id,)).fetchone()
            if not r:
                return None
            return self._hydrate_scenario(r, conn)

    def _hydrate_scenario(self, r: sqlite3.Row, conn: sqlite3.Connection) -> Scenario:
        sid = r["id"]
        # Fetch tiles
        tile_rows = conn.execute("SELECT * FROM map_tiles WHERE scenario_id = ?", (sid,)).fetchall()
        tiles = [
            MapTile(
                scenario_id=tr["scenario_id"],
                lane=tr["lane"],
                tile_index=tr["tile_index"],
                tile_type=tr["tile_type"],
            )
            for tr in tile_rows
        ]
        # Fetch hazards
        hazard_rows = conn.execute("SELECT * FROM hazards WHERE scenario_id = ?", (sid,)).fetchall()
        hazards = [
            HazardSchedule(
                scenario_id=hr["scenario_id"],
                tick=hr["tick"],
                type=hr["type"],
                lane=hr["lane"],
                params=json.loads(hr["params_json"]),
            )
            for hr in hazard_rows
        ]
        obj_dict = json.loads(r["objective_json"]) if r["objective_json"] else {}
        return Scenario(
            id=r["id"],
            name=r["name"],
            description=r["description"],
            lanes=r["lanes"],
            ticks=r["ticks"],
            map=tiles,
            hazard_schedule=hazards,
            objective=ScenarioObjective(**obj_dict),
            starting_resources={"coins": r["starting_coins"]},
            enemy_team=r["enemy_team"].split(";") if r["enemy_team"] else [],
            source=r["source"],
        )

    def save_scenario(
        self,
        s: Scenario,
        upload_id: Optional[str] = None,
        source: Optional[str] = None,
    ) -> None:
        src = source or (f"upload:{upload_id}" if upload_id else s.source or "builtin")
        with self.get_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO scenarios
                (id, name, description, lanes, ticks, objective_json, starting_coins, enemy_team, source, upload_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    s.id,
                    s.name,
                    s.description,
                    s.lanes,
                    s.ticks,
                    s.objective.model_dump_json(),
                    s.starting_coins,
                    ";".join(s.enemy_team),
                    src,
                    upload_id,
                ),
            )
            # Re-insert tiles
            conn.execute("DELETE FROM map_tiles WHERE scenario_id = ?", (s.id,))
            for t in s.map:
                conn.execute(
                    """
                    INSERT INTO map_tiles (scenario_id, lane, tile_index, tile_type, upload_id)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (s.id, t.lane, t.tile_index, t.tile_type, upload_id),
                )
            # Re-insert hazards
            conn.execute("DELETE FROM hazards WHERE scenario_id = ?", (s.id,))
            for h in s.hazard_schedule:
                conn.execute(
                    """
                    INSERT INTO hazards (scenario_id, tick, type, lane, params_json, upload_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (s.id, h.tick, h.type, h.lane, json.dumps(h.params), upload_id),
                )

    # --- Battles ---
    def save_battle(
        self,
        b: BattleRecord,
        upload_id: Optional[str] = None,
        source: Optional[str] = None,
    ) -> None:
        src = source or (f"upload:{upload_id}" if upload_id else b.source or "simulated")
        with self.get_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO battles
                (battle_id, scenario_id, seed, engine_version, player_team, personality, outcome, ticks_elapsed, survivors, coins_left, source, upload_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    b.battle_id,
                    b.scenario_id,
                    b.seed,
                    b.engine_version,
                    ";".join(b.player_team),
                    b.personality,
                    b.outcome,
                    b.ticks_elapsed,
                    b.survivors,
                    b.coins_left,
                    src,
                    upload_id,
                ),
            )
            # Delete old events if replacing
            conn.execute("DELETE FROM battle_events WHERE battle_id = ?", (b.battle_id,))
            for ev in b.events:
                lane = ev.position.get("lane", 0) if isinstance(ev.position, dict) else getattr(ev.position, "lane", 0)
                tile = ev.position.get("tile", 0) if isinstance(ev.position, dict) else getattr(ev.position, "tile", 0)
                opts_json = json.dumps(ev.options_considered) if ev.options_considered else None
                conn.execute(
                    """
                    INSERT INTO battle_events
                    (battle_id, tick, actor, action, target, damage, hp_before, hp_after, status_change, hazard_hit, pickup, ko, coin_change, event_type, lane, tile, coin_before, coin_after, options_considered_json, chosen_action)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        b.battle_id,
                        ev.tick,
                        ev.actor,
                        ev.action,
                        ev.target,
                        ev.damage,
                        ev.hp_before,
                        ev.hp_after,
                        ev.status_change,
                        ev.hazard_hit,
                        ev.pickup,
                        1 if ev.ko else 0,
                        ev.coin_change,
                        ev.event_type,
                        lane,
                        tile,
                        ev.coin_before,
                        ev.coin_after,
                        opts_json,
                        ev.chosen_action,
                    ),
                )

    def get_battle(self, battle_id: str) -> Optional[BattleRecord]:
        with self.get_conn() as conn:
            r = conn.execute("SELECT * FROM battles WHERE battle_id = ?", (battle_id,)).fetchone()
            if not r:
                return None
            ev_rows = conn.execute(
                "SELECT * FROM battle_events WHERE battle_id = ? ORDER BY id ASC", (battle_id,)
            ).fetchall()
            events = []
            for er in ev_rows:
                opts = None
                if "options_considered_json" in er.keys() and er["options_considered_json"]:
                    try:
                        opts = json.loads(er["options_considered_json"])
                    except Exception:
                        opts = None
                lane = er["lane"] if "lane" in er.keys() else 0
                tile = er["tile"] if "tile" in er.keys() else 0
                cb = er["coin_before"] if "coin_before" in er.keys() else 0
                ca = er["coin_after"] if "coin_after" in er.keys() else 0
                chosen = er["chosen_action"] if "chosen_action" in er.keys() else None

                events.append(
                    Event(
                        battle_id=er["battle_id"],
                        tick=er["tick"],
                        actor=er["actor"],
                        action=er["action"],
                        target=er["target"],
                        damage=er["damage"],
                        hp_before=er["hp_before"],
                        hp_after=er["hp_after"],
                        position={"lane": lane, "tile": tile},
                        status_change=er["status_change"],
                        hazard_hit=er["hazard_hit"],
                        pickup=er["pickup"],
                        ko=bool(er["ko"]),
                        coin_before=cb,
                        coin_after=ca,
                        coin_change=er["coin_change"],
                        event_type=er["event_type"],
                        options_considered=opts,
                        chosen_action=chosen,
                    )
                )
            return BattleRecord(
                battle_id=r["battle_id"],
                scenario_id=r["scenario_id"],
                seed=r["seed"],
                engine_version=r["engine_version"],
                player_team=r["player_team"].split(";") if r["player_team"] else [],
                personality=r["personality"],
                outcome=r["outcome"],
                ticks_elapsed=r["ticks_elapsed"],
                survivors=r["survivors"],
                coins_left=r["coins_left"],
                source=r["source"],
                events=events,
                created_at=r["created_at"],
            )

    def get_battles(
        self,
        scenario_id: Optional[str] = None,
        source_filter: Optional[str] = None,
        include_events: bool = False,
    ) -> List[BattleRecord]:
        with self.get_conn() as conn:
            query = "SELECT * FROM battles WHERE 1=1"
            params: List[Any] = []
            if scenario_id:
                query += " AND scenario_id = ?"
                params.append(scenario_id)
            if source_filter == "simulated":
                query += " AND source = 'simulated'"
            elif source_filter == "uploaded":
                query += " AND source LIKE 'upload:%'"
            elif source_filter and source_filter.startswith("upload:"):
                query += " AND source = ?"
                params.append(source_filter)
            query += " ORDER BY created_at DESC"
            rows = conn.execute(query, params).fetchall()
            results = []
            for r in rows:
                events = []
                if include_events:
                    ev_rows = conn.execute(
                        "SELECT * FROM battle_events WHERE battle_id = ? ORDER BY id ASC", (r["battle_id"],)
                    ).fetchall()
                    for er in ev_rows:
                        opts = None
                        if "options_considered_json" in er.keys() and er["options_considered_json"]:
                            try:
                                opts = json.loads(er["options_considered_json"])
                            except Exception:
                                opts = None
                        lane = er["lane"] if "lane" in er.keys() else 0
                        tile = er["tile"] if "tile" in er.keys() else 0
                        cb = er["coin_before"] if "coin_before" in er.keys() else 0
                        ca = er["coin_after"] if "coin_after" in er.keys() else 0
                        chosen = er["chosen_action"] if "chosen_action" in er.keys() else None
                        events.append(
                            Event(
                                battle_id=er["battle_id"],
                                tick=er["tick"],
                                actor=er["actor"],
                                action=er["action"],
                                target=er["target"],
                                damage=er["damage"],
                                hp_before=er["hp_before"],
                                hp_after=er["hp_after"],
                                position={"lane": lane, "tile": tile},
                                status_change=er["status_change"],
                                hazard_hit=er["hazard_hit"],
                                pickup=er["pickup"],
                                ko=bool(er["ko"]),
                                coin_before=cb,
                                coin_after=ca,
                                coin_change=er["coin_change"],
                                event_type=er["event_type"],
                                options_considered=opts,
                                chosen_action=chosen,
                            )
                        )
                results.append(
                    BattleRecord(
                        battle_id=r["battle_id"],
                        scenario_id=r["scenario_id"],
                        seed=r["seed"],
                        engine_version=r["engine_version"],
                        player_team=r["player_team"].split(";") if r["player_team"] else [],
                        personality=r["personality"],
                        outcome=r["outcome"],
                        ticks_elapsed=r["ticks_elapsed"],
                        survivors=r["survivors"],
                        coins_left=r["coins_left"],
                        source=r["source"],
                        events=events,
                        created_at=r["created_at"],
                    )
                )
            return results

    # --- Uploads ---
    def save_upload(self, upload_data: Dict[str, Any]) -> None:
        with self.get_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO uploads
                (id, kind, filename, row_count, status, errors_json, warnings_json, preview_json, upload_group)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    upload_data["id"],
                    upload_data["kind"],
                    upload_data["filename"],
                    upload_data.get("row_count", 0),
                    upload_data["status"],
                    json.dumps(upload_data.get("errors", [])),
                    json.dumps(upload_data.get("warnings", [])),
                    json.dumps(upload_data.get("preview", [])),
                    upload_data.get("upload_group"),
                ),
            )

    def get_uploads(self) -> List[Dict[str, Any]]:
        with self.get_conn() as conn:
            rows = conn.execute("SELECT * FROM uploads ORDER BY created_at DESC").fetchall()
            return [
                {
                    "id": r["id"],
                    "kind": r["kind"],
                    "filename": r["filename"],
                    "row_count": r["row_count"],
                    "status": r["status"],
                    "errors": json.loads(r["errors_json"] or "[]"),
                    "warnings": json.loads(r["warnings_json"] or "[]"),
                    "preview": json.loads(r["preview_json"] or "[]"),
                    "upload_group": r["upload_group"],
                    "created_at": r["created_at"],
                }
                for r in rows
            ]

    def get_upload(self, upload_id: str) -> Optional[Dict[str, Any]]:
        with self.get_conn() as conn:
            r = conn.execute("SELECT * FROM uploads WHERE id = ?", (upload_id,)).fetchone()
            if not r:
                return None
            return {
                "id": r["id"],
                "kind": r["kind"],
                "filename": r["filename"],
                "row_count": r["row_count"],
                "status": r["status"],
                "errors": json.loads(r["errors_json"] or "[]"),
                "warnings": json.loads(r["warnings_json"] or "[]"),
                "preview": json.loads(r["preview_json"] or "[]"),
                "upload_group": r["upload_group"],
                "created_at": r["created_at"],
            }

    def delete_upload(self, upload_id: str) -> bool:
        """Removes the upload and every record imported from it, and nothing else."""
        with self.get_conn() as conn:
            # Delete battles and cascade events
            battle_ids = [
                r["battle_id"]
                for r in conn.execute("SELECT battle_id FROM battles WHERE upload_id = ?", (upload_id,)).fetchall()
            ]
            for bid in battle_ids:
                conn.execute("DELETE FROM battle_events WHERE battle_id = ?", (bid,))
            conn.execute("DELETE FROM battles WHERE upload_id = ?", (upload_id,))

            # Delete scenarios and cascade hazards/tiles
            scenario_ids = [
                r["id"]
                for r in conn.execute("SELECT id FROM scenarios WHERE upload_id = ?", (upload_id,)).fetchall()
            ]
            for sid in scenario_ids:
                conn.execute("DELETE FROM hazards WHERE scenario_id = ?", (sid,))
                conn.execute("DELETE FROM map_tiles WHERE scenario_id = ?", (sid,))
            conn.execute("DELETE FROM scenarios WHERE upload_id = ?", (upload_id,))

            # Delete orphan hazards/tiles referencing upload_id
            conn.execute("DELETE FROM hazards WHERE upload_id = ?", (upload_id,))
            conn.execute("DELETE FROM map_tiles WHERE upload_id = ?", (upload_id,))

            # Delete creatures
            conn.execute("DELETE FROM creatures WHERE upload_id = ?", (upload_id,))

            # Delete upload row
            cursor = conn.execute("DELETE FROM uploads WHERE id = ?", (upload_id,))
            return cursor.rowcount > 0


# Global storage instance
db = Storage()
