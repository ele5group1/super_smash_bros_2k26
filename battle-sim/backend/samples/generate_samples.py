"""Generates sample files for testing and UI demonstrations."""

import io
import json
import sys
import zipfile
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.storage import db
from app.engine.models import Creature
from app.engine.tick import TickEngine
from app.uploads.export import (
    export_creatures_csv,
    export_creatures_json,
    export_scenarios_zip,
    export_battles_zip,
)

samples_dir = backend_dir / "samples"
samples_dir.mkdir(parents=True, exist_ok=True)

# 1. scenario.json (valid)
scen = db.get_scenario("pipe_ambush")
with open(samples_dir / "scenario.json", "w", encoding="utf-8") as f:
    json.dump(scen.model_dump(), f, indent=2)

# 2. creatures.json & creatures.csv (valid)
creatures = [
    Creature(id="sample_puff_bird", name="Puff Bird", type="electric", hp=125, attack=42, speed=68, moves=["spark_zap", "charge_dash"]),
    Creature(id="sample_vine_sprout", name="Vine Sprout", type="grass", hp=135, attack=36, speed=45, moves=["vine_whip", "spore_heal"]),
    Creature(id="sample_magma_slug", name="Magma Slug", type="fire", hp=155, attack=48, speed=32, moves=["flame_spit", "fire_shield"]),
]
with open(samples_dir / "creatures.json", "w", encoding="utf-8") as f:
    f.write(export_creatures_json(creatures))

with open(samples_dir / "creatures.csv", "w", encoding="utf-8", newline="") as f:
    f.write(export_creatures_csv(creatures))

# 3. battles.json matching engine output for seed 1000
p_team = [db.get_creature("ember_fox"), db.get_creature("bubble_toad")]
e_team = [db.get_creature(cid) for cid in scen.enemy_team]
engine = TickEngine(scen, p_team, e_team, seed=1000)
sample_battle = engine.run()
with open(samples_dir / "battles.json", "w", encoding="utf-8") as f:
    json.dump([sample_battle.model_dump()], f, indent=2)

# 4. scenarios_bundle.zip (valid)
scenarios_zip = export_scenarios_zip([scen])
with open(samples_dir / "scenarios_bundle.zip", "wb") as f:
    f.write(scenarios_zip)

# 5. battles_bundle.zip (valid)
battles_zip = export_battles_zip([sample_battle])
with open(samples_dir / "battles_bundle.zip", "wb") as f:
    f.write(battles_zip)

# 6. invalid_bundle.zip with known errors (orphan hazard, unknown creature type, invalid tile type)
inv_zip_buf = io.BytesIO()
with zipfile.ZipFile(inv_zip_buf, "w") as zf:
    sc_csv = "id,name,description,lanes,ticks,objective_type,objective_min_survivors,starting_coins,enemy_team\r\ninvalid_scen,Invalid Scenario,Test,3,40,reach_exit,2,20,unknown_mon_999\r\n"
    haz_csv = 'scenario_id,tick,type,lane,params_json\r\norphan_scen_id,5,biter_plant,1,"{""damage"": 20}"\r\n'
    tiles_csv = "scenario_id,lane,tile_index,tile_type\r\ninvalid_scen,0,1,unknown_tile_type\r\n"
    zf.writestr("scenarios.csv", sc_csv.encode("utf-8"))
    zf.writestr("hazards.csv", haz_csv.encode("utf-8"))
    zf.writestr("map_tiles.csv", tiles_csv.encode("utf-8"))

with open(samples_dir / "invalid_bundle.zip", "wb") as f:
    f.write(inv_zip_buf.getvalue())

print("All sample files generated successfully!")
