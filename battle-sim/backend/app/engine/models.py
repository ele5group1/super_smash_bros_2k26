"""Pydantic data models for the battle simulation engine, scenarios, and events."""

from __future__ import annotations
from enum import Enum
from typing import Dict, List, Literal, Optional, Any
from pydantic import BaseModel, Field, field_validator


class CreatureType(str, Enum):
    FIRE = "fire"
    WATER = "water"
    GRASS = "grass"
    ELECTRIC = "electric"
    STONE = "stone"


TYPE_CHART: Dict[str, Dict[str, float]] = {
    "fire": {"grass": 2.0, "water": 0.5, "stone": 0.5, "fire": 1.0, "electric": 1.0},
    "water": {"fire": 2.0, "stone": 2.0, "electric": 0.5, "grass": 0.5, "water": 1.0},
    "grass": {"water": 2.0, "stone": 2.0, "fire": 0.5, "grass": 1.0, "electric": 1.0},
    "electric": {"water": 2.0, "grass": 0.5, "stone": 0.5, "electric": 1.0, "fire": 1.0},
    "stone": {"fire": 2.0, "electric": 2.0, "water": 0.5, "grass": 0.5, "stone": 1.0},
}


class Move(BaseModel):
    id: str
    name: str
    type: CreatureType
    power: int = Field(default=20, ge=0, le=200)
    accuracy: float = Field(default=1.0, ge=0.0, le=1.0)
    cost_coins: int = Field(default=0, ge=0, le=50)
    target_type: Literal["single_enemy", "all_enemies", "self", "ally"] = "single_enemy"
    effect: Optional[Literal["burn", "stun", "heal", "shield", "boost_speed"]] = None
    effect_chance: float = Field(default=0.0, ge=0.0, le=1.0)


# Standard default moves for built-in creatures
BUILTIN_MOVES: Dict[str, Move] = {
    # Standard Fire moves & Mario/Pokemon specials
    "flame_spit": Move(id="flame_spit", name="Flame Spit", type=CreatureType.FIRE, power=25, accuracy=0.95, effect="burn", effect_chance=0.25),
    "ember_burst": Move(id="ember_burst", name="Ember Burst", type=CreatureType.FIRE, power=40, accuracy=0.85, cost_coins=2),
    "fire_shield": Move(id="fire_shield", name="Fire Shield", type=CreatureType.FIRE, power=0, accuracy=1.0, target_type="self", effect="shield", effect_chance=1.0, cost_coins=1),
    "fireball": Move(id="fireball", name="Fireball", type=CreatureType.FIRE, power=32, accuracy=0.95, effect="burn", effect_chance=0.25),
    "flamethrower": Move(id="flamethrower", name="Flamethrower", type=CreatureType.FIRE, power=48, accuracy=0.90, effect="burn", effect_chance=0.35, cost_coins=2),
    "fire_spin": Move(id="fire_spin", name="Fire Spin", type=CreatureType.FIRE, power=36, accuracy=0.90, cost_coins=1),
    "fire_breath": Move(id="fire_breath", name="Fire Breath", type=CreatureType.FIRE, power=54, accuracy=0.85, effect="burn", effect_chance=0.4, cost_coins=3),
    "bowser_bomb": Move(id="bowser_bomb", name="Bowser Bomb", type=CreatureType.FIRE, power=50, accuracy=0.85, cost_coins=2),

    # Water moves
    "spout_splash": Move(id="spout_splash", name="Spout Splash", type=CreatureType.WATER, power=24, accuracy=0.95),
    "bubble_barrier": Move(id="bubble_barrier", name="Bubble Barrier", type=CreatureType.WATER, power=0, accuracy=1.0, target_type="self", effect="shield", effect_chance=1.0),
    "tidal_surge": Move(id="tidal_surge", name="Tidal Surge", type=CreatureType.WATER, power=42, accuracy=0.85, cost_coins=2),
    "hydro_pump": Move(id="hydro_pump", name="Hydro Pump", type=CreatureType.WATER, power=52, accuracy=0.85, cost_coins=3),
    "water_gun": Move(id="water_gun", name="Water Gun", type=CreatureType.WATER, power=28, accuracy=0.95),
    "skull_bash": Move(id="skull_bash", name="Skull Bash", type=CreatureType.WATER, power=40, accuracy=0.90, cost_coins=1),
    "shell_spin": Move(id="shell_spin", name="Shell Spin", type=CreatureType.WATER, power=34, accuracy=0.95, cost_coins=1),

    # Grass moves
    "vine_whip": Move(id="vine_whip", name="Vine Whip", type=CreatureType.GRASS, power=26, accuracy=0.95),
    "spore_heal": Move(id="spore_heal", name="Spore Heal", type=CreatureType.GRASS, power=0, accuracy=1.0, target_type="ally", effect="heal", effect_chance=1.0, cost_coins=1),
    "petal_tempest": Move(id="petal_tempest", name="Petal Tempest", type=CreatureType.GRASS, power=38, accuracy=0.90, cost_coins=2),
    "solar_beam": Move(id="solar_beam", name="Solar Beam", type=CreatureType.GRASS, power=56, accuracy=0.90, cost_coins=3),
    "razor_leaf": Move(id="razor_leaf", name="Razor Leaf", type=CreatureType.GRASS, power=35, accuracy=0.95),
    "poltergust_blast": Move(id="poltergust_blast", name="Poltergust Blast", type=CreatureType.GRASS, power=44, accuracy=0.90, effect="stun", effect_chance=0.3, cost_coins=2),
    "egg_throw": Move(id="egg_throw", name="Egg Throw", type=CreatureType.GRASS, power=32, accuracy=0.95),
    "tongue_lash": Move(id="tongue_lash", name="Tongue Lash", type=CreatureType.GRASS, power=28, accuracy=1.0),
    "flutter_jump": Move(id="flutter_jump", name="Flutter Jump", type=CreatureType.GRASS, power=0, accuracy=1.0, target_type="self", effect="shield", effect_chance=1.0),

    # Electric moves
    "spark_zap": Move(id="spark_zap", name="Spark Zap", type=CreatureType.ELECTRIC, power=24, accuracy=0.95, effect="stun", effect_chance=0.2),
    "thunder_bolt": Move(id="thunder_bolt", name="Thunder Bolt", type=CreatureType.ELECTRIC, power=45, accuracy=0.80, cost_coins=3),
    "thunderbolt": Move(id="thunderbolt", name="Thunderbolt", type=CreatureType.ELECTRIC, power=48, accuracy=0.90, effect="stun", effect_chance=0.25, cost_coins=2),
    "quick_attack": Move(id="quick_attack", name="Quick Attack", type=CreatureType.ELECTRIC, power=26, accuracy=1.0, effect="boost_speed", effect_chance=0.5),
    "electro_ball": Move(id="electro_ball", name="Electro Ball", type=CreatureType.ELECTRIC, power=42, accuracy=0.90, cost_coins=1),
    "green_fireball": Move(id="green_fireball", name="Green Fireball", type=CreatureType.ELECTRIC, power=34, accuracy=0.95, effect="stun", effect_chance=0.2),
    "charge_dash": Move(id="charge_dash", name="Charge Dash", type=CreatureType.ELECTRIC, power=18, accuracy=1.0, target_type="self", effect="boost_speed", effect_chance=1.0),

    # Stone / Physical / Psychic moves
    "pebble_throw": Move(id="pebble_throw", name="Pebble Throw", type=CreatureType.STONE, power=26, accuracy=0.90),
    "boulder_slam": Move(id="boulder_slam", name="Boulder Slam", type=CreatureType.STONE, power=44, accuracy=0.80, cost_coins=2),
    "rock_armor": Move(id="rock_armor", name="Rock Armor", type=CreatureType.STONE, power=0, accuracy=1.0, target_type="self", effect="shield", effect_chance=1.0),
    "super_jump": Move(id="super_jump", name="Super Jump Punch", type=CreatureType.STONE, power=38, accuracy=0.95, cost_coins=1),
    "ground_pound": Move(id="ground_pound", name="Ground Pound", type=CreatureType.STONE, power=45, accuracy=0.90, cost_coins=2),
    "dragon_claw": Move(id="dragon_claw", name="Dragon Claw", type=CreatureType.STONE, power=42, accuracy=0.95, cost_coins=1),
    "shadow_ball": Move(id="shadow_ball", name="Shadow Ball", type=CreatureType.STONE, power=46, accuracy=0.90, cost_coins=2),
    "hypnosis": Move(id="hypnosis", name="Hypnosis", type=CreatureType.STONE, power=0, accuracy=0.80, effect="stun", effect_chance=0.75, cost_coins=1),
    "sludge_bomb": Move(id="sludge_bomb", name="Sludge Bomb", type=CreatureType.STONE, power=40, accuracy=0.90, effect="burn", effect_chance=0.3),
    "psystrike": Move(id="psystrike", name="Psystrike", type=CreatureType.STONE, power=55, accuracy=0.90, cost_coins=3),
    "aura_sphere": Move(id="aura_sphere", name="Aura Sphere", type=CreatureType.STONE, power=45, accuracy=1.0, cost_coins=2),
    "whirling_fortress": Move(id="whirling_fortress", name="Whirling Fortress", type=CreatureType.STONE, power=42, accuracy=0.90, cost_coins=1),
    "headbonk": Move(id="headbonk", name="Headbonk", type=CreatureType.STONE, power=28, accuracy=0.95),
    "rock_throw": Move(id="rock_throw", name="Rock Throw", type=CreatureType.STONE, power=32, accuracy=0.90),

    # Boss Specials
    "giga_flame": Move(id="giga_flame", name="Giga Flame Eruption", type=CreatureType.FIRE, power=60, accuracy=0.90, effect="burn", effect_chance=0.5, cost_coins=2),
    "whirlwind_shell": Move(id="whirlwind_shell", name="Whirlwind Shell", type=CreatureType.STONE, power=52, accuracy=0.85, cost_coins=2),
    "cataclysmic_stomp": Move(id="cataclysmic_stomp", name="Cataclysmic Stomp", type=CreatureType.STONE, power=65, accuracy=0.80, cost_coins=3),
}

# --- Synergies Dual Combos Registry ---
SYNERGY_REGISTRY: Dict[tuple[str, str], Dict[str, Any]] = {
    ("mario", "charizard"): {
        "name": "Inferno Stomp",
        "type": CreatureType.FIRE,
        "power": 65,
        "description": "Mario launches from Charizard's fiery wing for an incandescent crater strike.",
        "effect": "burn",
    },
    ("luigi", "gengar"): {
        "name": "Poltergeist Haunt",
        "type": CreatureType.STONE,
        "power": 60,
        "description": "Luigi and Gengar phase through spectral shadows to disorient and stun all opponents.",
        "effect": "stun",
    },
    ("bubble_toad", "stream_turtle"): {
        "name": "Tsunami Bastion",
        "type": CreatureType.WATER,
        "power": 52,
        "description": "A tidal surge floods enemy lanes while coating all allies in crystalline aqua shields.",
        "effect": "shield",
    },
    ("ember_fox", "flame_salamander"): {
        "name": "Twin Magma Burst",
        "type": CreatureType.FIRE,
        "power": 62,
        "description": "Cross-lane fire torrent engulfs targets in intense searing magma.",
        "effect": "burn",
    },
    ("spark_finch", "volt_hedgehog"): {
        "name": "Thunder Cross Spark",
        "type": CreatureType.ELECTRIC,
        "power": 58,
        "description": "Supercharged atmospheric and ground lightning arcs collide in an electric shockwave.",
        "effect": "stun",
    },
    ("moss_shroom", "bramble_hound"): {
        "name": "Verdant Overgrowth",
        "type": CreatureType.GRASS,
        "power": 54,
        "description": "Ancient thorny vines erupt to ensnare foes while restoring vigor to allies.",
        "effect": "heal",
    },
    ("crag_golem", "pebble_armadillo"): {
        "name": "Avalanche Cataclysm",
        "type": CreatureType.STONE,
        "power": 64,
        "description": "A pulverizing seismic tremor rolls across lanes, crushing enemy armor.",
        "effect": "shield",
    },
    ("pikachu", "mario"): {
        "name": "Super Volt Tackle",
        "type": CreatureType.ELECTRIC,
        "power": 62,
        "description": "Mario propels Pikachu with high-jump momentum for a max-voltage meteor dash.",
        "effect": "boost_speed",
    },
}


class Creature(BaseModel):
    id: str
    name: str
    type: CreatureType
    hp: int = Field(..., ge=1, le=500, description="Hit points between 1 and 500")
    attack: int = Field(default=30, ge=1, le=200)
    speed: int = Field(..., ge=1, le=100, description="Speed between 1 and 100")
    moves: List[str] = Field(default_factory=list)
    source: str = "builtin"
    avatar: Optional[str] = None

    @field_validator("id", "name")
    @classmethod
    def not_empty(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Field cannot be empty")
        return s

    @field_validator("moves", mode="before")
    @classmethod
    def parse_moves(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            parts = [p.strip() for p in v.split(";") if p.strip()]
            return parts
        return list(v) if v else []


class MapTile(BaseModel):
    scenario_id: Optional[str] = None
    lane: int = Field(default=0, ge=0, le=10)
    tile_index: int = Field(default=0, ge=0, le=20)
    tile_type: Literal[
        "normal", "pipe", "question_block", "hazard_zone", "exit", "lava", "coin_cache"
    ] = "normal"


class HazardSchedule(BaseModel):
    scenario_id: Optional[str] = None
    tick: int = Field(..., ge=1, le=100)
    type: str = Field(..., min_length=1)
    lane: int = Field(default=0, ge=0, le=10)
    params: Dict[str, Any] = Field(default_factory=dict)


class ScenarioObjective(BaseModel):
    type: Literal["reach_exit", "defeat_all", "collect_coins", "survive_ticks", "defeat_boss"] = "reach_exit"
    min_survivors: int = Field(default=2, ge=1, le=4)
    target_coins: int = Field(default=0, ge=0)
    target_tick: int = Field(default=40, ge=1, le=100)
    target_boss_id: Optional[str] = None


class Scenario(BaseModel):
    id: str
    name: str
    description: str
    lanes: int = Field(default=3, ge=1, le=6)
    ticks: int = Field(default=40, ge=1, le=100)
    map: List[MapTile] = Field(default_factory=list)
    hazard_schedule: List[HazardSchedule] = Field(default_factory=list)
    objective: ScenarioObjective = Field(default_factory=ScenarioObjective)
    starting_resources: Dict[str, int] = Field(default_factory=lambda: {"coins": 20})
    enemy_team: List[str] = Field(default_factory=list)
    source: str = "builtin"

    @field_validator("id", "name")
    @classmethod
    def validate_strings(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Field cannot be empty")
        return s

    @property
    def starting_coins(self) -> int:
        return self.starting_resources.get("coins", 20)


class Event(BaseModel):
    battle_id: str = ""
    tick: int
    actor: Optional[str] = None
    action: str
    target: Optional[str] = None
    damage: int = 0
    hp_before: int = 0
    hp_after: int = 0
    position: Dict[str, int] = Field(default_factory=lambda: {"lane": 0, "tile": 0})
    status_change: Optional[str] = None
    hazard_hit: Optional[str] = None
    pickup: Optional[str] = None
    ko: bool = False
    coin_before: int = 0
    coin_after: int = 0
    coin_change: int = 0
    event_type: Literal[
        "hazard", "move", "status", "pickup", "death", "objective", "info", "block", "decision", "synergy", "boss_phase"
    ] = "info"
    options_considered: Optional[List[Dict[str, Any]]] = None
    chosen_action: Optional[str] = None



class BattleRecord(BaseModel):
    battle_id: str
    scenario_id: str
    seed: int = 1000
    engine_version: str = "1.0.0"
    player_team: List[str] = Field(default_factory=list)
    personality: Literal["aggressive", "defensive", "opportunistic"] = "opportunistic"
    outcome: Literal["win", "loss"]
    ticks_elapsed: int
    survivors: int = 0
    coins_left: int
    source: str = "simulated"
    events: List[Event] = Field(default_factory=list)
    created_at: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("survivors", mode="before")
    @classmethod
    def validate_survivors(cls, v: Any) -> int:
        if isinstance(v, list):
            return len(v)
        return int(v) if v is not None else 0


class BattleCreateRequest(BaseModel):
    session_kind: Literal["visitor", "preview"] = "visitor"
    early_heal_spend: int = Field(default=0, ge=0)
    terminal_id: Optional[str] = Field(default=None, max_length=64)
    scenario_id: str
    player_team: List[str] = Field(..., min_length=1, max_length=4)
    seed: int = 1000
    personality: Literal["aggressive", "defensive", "opportunistic"] = "opportunistic"


class CounterfactualRequest(BaseModel):
    tick: int = Field(..., ge=1, le=100)
    actor: str
    action_type: Literal["move_lane", "use_item", "cast_move", "early_heal"] = "cast_move"
    target: Optional[str] = None
    target_lane: Optional[int] = None
    heal_amount: Optional[int] = None
    move_id: Optional[str] = None


class PlanPredictRequest(BaseModel):
    early_heal_spend: int = Field(default=0, ge=0)
    scenario_id: str
    team: List[str] = Field(..., min_length=1, max_length=4)
    seed_count: int = Field(default=300, ge=10, le=5000)
    calibrate_with_upload_id: Optional[str] = None


class PlanCompareOption(BaseModel):
    name: str
    team: List[str] = Field(min_length=1, max_length=4)
    early_heal_spend: int = Field(default=0, ge=0)


class PlanCompareRequest(BaseModel):
    scenario_id: str
    options: List[PlanCompareOption] = Field(min_length=1, max_length=20)
    seed_count: int = Field(default=100, ge=10, le=1000)


class PlanRecommendRequest(BaseModel):
    scenario_id: str
    team: List[str] = Field(min_length=1, max_length=4)
    current_tick: int = Field(default=1, ge=1, le=1)
    current_coins: int = Field(default=20, ge=0)
    creature_hps: Dict[str, int] = Field(default_factory=dict)
