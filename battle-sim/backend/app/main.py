"""FastAPI backend application for the Mushroom Kingdom-style Scenario Battle Simulator."""

import uuid
from pathlib import Path
from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field

from fastapi import (
    FastAPI,
    File,
    Form,
    UploadFile,
    HTTPException,
    Query,
    BackgroundTasks,
    Response,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .storage import db
from .engine.models import (
    Creature,
    Scenario,
    BattleCreateRequest,
    CounterfactualRequest,
    PlanPredictRequest,
    PlanCompareRequest,
    PlanRecommendRequest,
)
from .engine.tick import TickEngine
from .analytics import (
    BattleSummaryModel,
    CreatureStatsModel,
    TeamStatsModel,
    HPTimelineModel,
    PositionHeatmapModel,
    CauseTraceModel,
    LossCausesReportModel,
    DecisionAuditReportModel,
    CounterfactualResponseModel,
    WinRatePredictionModel,
    StatePredictionModel,
    PlanCompareResultModel,
    RecommendationReportModel,
    BalanceReportModel,
    SensitivitySweepReportModel,
    JobStatusModel,
    battle_summary,
    creature_stats,
    team_stats,
    hp_timeline,
    position_heatmap,
    compute_battle_descriptive_stats,
    cause_trace,
    loss_causes,
    decision_audit,
    counterfactual,
    trace_defeat_causes,
    run_counterfactual_battle,
    predict_win_rate,
    predict_from_state,
    run_monte_carlo_prediction,
    get_job_progress,
    set_job_progress,
    compare_options,
    recommend_action,
    compare_plan_options,
    recommend_best_actions,
    audit_scenario_balance,
    balance_report,
    sensitivity_sweep,
)
from .uploads.archive import extract_zip_in_memory
from .uploads.validate import (
    validate_creatures_data,
    validate_scenarios_bundle,
    validate_battles_bundle,
)
from .uploads.replay import verify_battle_replay
from .uploads.export import (
    export_creatures_csv,
    export_creatures_json,
    export_scenarios_zip,
    export_scenarios_json,
    export_battles_zip,
    export_battles_json,
)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

app = FastAPI(
    title="Puffcap Kingdom: Scenario Battle Simulator",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# CORS middleware for development Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    # Content-Security-Policy & security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    if not request.url.path.startswith("/api/docs") and not request.url.path.startswith("/api/openapi.json"):
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: blob:; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "connect-src 'self' http://localhost:* http://127.0.0.1:*;"
        )
    return response


# --- Health ---
@app.get("/api/health")
def api_health():
    return {"status": "ok", "app": "Puffcap Kingdom Battle Simulator", "version": "1.0.0"}


# --- Scenarios and Creatures ---
@app.get("/api/scenarios", response_model=List[Scenario])
def get_scenarios(source: Optional[str] = Query(None, description="Filter: 'builtin', 'uploaded'")):
    return db.get_all_scenarios(source_filter=source)


@app.get("/api/scenarios/{scenario_id}", response_model=Scenario)
def get_scenario(scenario_id: str):
    scen = db.get_scenario(scenario_id)
    if not scen:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
    return scen


@app.post("/api/scenarios", response_model=Scenario)
def save_authored_scenario(scenario: Scenario):
    # Check enemy team valid
    for eid in scenario.enemy_team:
        if not db.get_creature(eid):
            raise HTTPException(status_code=400, detail=f"Unknown creature id '{eid}' in enemy team")
    db.save_scenario(scenario, upload_id=None, source="user_authored")
    return scenario


@app.get("/api/creatures", response_model=List[Creature])
def get_creatures(source: Optional[str] = Query(None, description="Filter: 'builtin', 'uploaded'")):
    return db.get_all_creatures(source_filter=source)


# --- Battles ---
@app.post("/api/battles")
def create_and_run_battle(req: BattleCreateRequest):
    scenario = db.get_scenario(req.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{req.scenario_id}' not found")

    player_creatures = []
    for cid in req.player_team:
        c = db.get_creature(cid)
        if not c:
            raise HTTPException(status_code=400, detail=f"Unknown creature '{cid}' in player team")
        player_creatures.append(c)

    enemy_creatures = []
    for cid in scenario.enemy_team:
        c = db.get_creature(cid)
        if not c:
            raise HTTPException(status_code=400, detail=f"Enemy creature '{cid}' not found in roster")
        enemy_creatures.append(c)

    battle_id = str(uuid.uuid4())
    engine = TickEngine(
        scenario=scenario,
        player_creatures=player_creatures,
        enemy_creatures=enemy_creatures,
        seed=req.seed,
        personality=req.personality,
        battle_id=battle_id,
    )
    record = engine.run()
    db.save_battle(record, upload_id=None, source="simulated")

    return {
        "battle_id": record.battle_id,
        "scenario_id": record.scenario_id,
        "outcome": record.outcome,
        "ticks_elapsed": record.ticks_elapsed,
        "survivors": record.survivors,
        "coins_left": record.coins_left,
        "event_count": len(record.events),
    }


@app.get("/api/battles/{battle_id}")
def get_battle_details(battle_id: str):
    battle = db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")

    # If uploaded battle, verify replay status
    replay_status = None
    if battle.source.startswith("upload:"):
        replay_status = verify_battle_replay(battle)

    return {
        "battle": battle,
        "replay_status": replay_status,
    }


# --- Analytics Endpoints ---

@app.get("/api/battles/{battle_id}/analytics/summary", response_model=BattleSummaryModel)
def get_battle_summary_endpoint(battle_id: str):
    battle = db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")
    return battle_summary(battle)


@app.get("/api/battles/{battle_id}/analytics/creatures", response_model=List[CreatureStatsModel])
def get_battle_creatures_analytics_endpoint(battle_id: str):
    battle = db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")
    return creature_stats(battle)


@app.get("/api/battles/{battle_id}/analytics/timeline", response_model=HPTimelineModel)
def get_battle_timeline_endpoint(battle_id: str):
    battle = db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")
    return hp_timeline(battle)


@app.get("/api/battles/{battle_id}/analytics/heatmap", response_model=PositionHeatmapModel)
def get_battle_heatmap_endpoint(battle_id: str):
    battle = db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")
    return position_heatmap(battle)


@app.get("/api/battles/{battle_id}/analytics/cause-trace", response_model=CauseTraceModel)
def get_battle_cause_trace_endpoint(battle_id: str):
    battle = db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")
    return cause_trace(battle)


@app.get("/api/battles/{battle_id}/analytics/decisions", response_model=DecisionAuditReportModel)
def get_battle_decisions_audit_endpoint(
    battle_id: str,
    threshold: float = Query(0.15, ge=0.0, le=1.0),
):
    battle = db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")
    return decision_audit(battle, threshold)


@app.get("/api/battles/{battle_id}/analytics/descriptive")
def get_battle_descriptive_analytics(battle_id: str):
    battle = db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")
    return compute_battle_descriptive_stats(battle)


@app.get("/api/battles/{battle_id}/analytics/diagnostic")
def get_battle_diagnostic_analytics(battle_id: str):
    battle = db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")
    return trace_defeat_causes(battle)


@app.post("/api/battles/{battle_id}/counterfactual", response_model=CounterfactualResponseModel)
def rerun_battle_counterfactual(battle_id: str, req: CounterfactualRequest):
    battle = db.get_battle(battle_id)
    if not battle:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")

    scenario = db.get_scenario(battle.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{battle.scenario_id}' not found")

    player_creatures: List[Creature] = [c for cid in battle.player_team if (c := db.get_creature(cid)) is not None]
    enemy_creatures: List[Creature] = [c for cid in scenario.enemy_team if (c := db.get_creature(cid)) is not None]

    result = counterfactual(
        battle=battle,
        change=req,
        scenario=scenario,
        player_creatures=player_creatures,
        enemy_creatures=enemy_creatures,
    )
    return result


@app.get("/api/analytics/team-stats", response_model=List[TeamStatsModel])
def get_aggregate_team_stats(
    scenario_id: Optional[str] = Query(None),
    source: Optional[str] = Query("both"),
):
    source_filter = None if source == "both" else source
    battles = db.get_battles(scenario_id=scenario_id, source_filter=source_filter, include_events=False)
    return team_stats(battles)


@app.get("/api/analytics/loss-causes", response_model=LossCausesReportModel)
def get_aggregate_loss_causes(
    scenario_id: Optional[str] = Query(None),
    source: Optional[str] = Query("both"),
):
    source_filter = None if source == "both" else source
    battles = db.get_battles(scenario_id=scenario_id, source_filter=source_filter, include_events=True)
    return loss_causes(battles, scenario_id=scenario_id, source=source or "both")


# --- Plan, Author, and Jobs ---

class AuthorSensitivityRequest(BaseModel):
    parameter: Literal["ticks", "starting_coins", "hazard_damage"] = "ticks"
    values: List[Any] = Field(default_factory=lambda: [20, 30, 40, 50, 60])
    seed_count: int = Field(default=30, ge=5, le=500)


@app.post("/api/plan/predict")
def predict_plan_outcomes(
    req: PlanPredictRequest,
    background_tasks: BackgroundTasks,
    async_mode: bool = False,
    include_mismatched: bool = False,
):
    scenario = db.get_scenario(req.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{req.scenario_id}' not found")

    player_creatures = []
    for cid in req.team:
        c = db.get_creature(cid)
        if not c:
            raise HTTPException(status_code=400, detail=f"Unknown creature '{cid}' in team")
        player_creatures.append(c)

    enemy_creatures: List[Creature] = [c for cid in scenario.enemy_team if (c := db.get_creature(cid)) is not None]

    calibrate_battles = None
    mismatched_ids = set()
    if req.calibrate_with_upload_id:
        raw_battles = db.get_battles(
            scenario_id=req.scenario_id,
            source_filter=f"upload:{req.calibrate_with_upload_id}",
            include_events=True,
        )
        for b in raw_battles:
            st = verify_battle_replay(b)
            if st.get("status") == "mismatch":
                mismatched_ids.add(b.battle_id)
        calibrate_battles = raw_battles

    job_id = str(uuid.uuid4())
    is_long_running = async_mode or req.seed_count > 500

    if is_long_running:
        set_job_progress(job_id, 0.05, status="queued")

        def _predict_task():
            set_job_progress(job_id, 0.2, status="running")
            res = predict_win_rate(
                scenario=scenario,
                team=player_creatures,
                seed_count=req.seed_count,
                base_seed=1000,
                enemy_creatures=enemy_creatures,
                calibrate_with_battles=calibrate_battles,
                include_mismatched=include_mismatched,
                mismatched_battle_ids=mismatched_ids,
            )
            set_job_progress(job_id, 1.0, status="completed", result=res.model_dump())

        background_tasks.add_task(_predict_task)
        return {"job_id": job_id, "status": "queued", "progress": 0.05}

    pred_res = predict_win_rate(
        scenario=scenario,
        team=player_creatures,
        seed_count=req.seed_count,
        base_seed=1000,
        enemy_creatures=enemy_creatures,
        calibrate_with_battles=calibrate_battles,
        include_mismatched=include_mismatched,
        mismatched_battle_ids=mismatched_ids,
    )
    return pred_res


@app.post("/api/plan/compare")
def compare_plan_alternatives(
    req: PlanCompareRequest,
    background_tasks: BackgroundTasks,
    async_mode: bool = False,
):
    scenario = db.get_scenario(req.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{req.scenario_id}' not found")

    all_c = {c.id: c for c in db.get_all_creatures()}
    enemy_c: List[Creature] = [c for cid in scenario.enemy_team if (c := db.get_creature(cid)) is not None]
    default_team: List[Creature] = [c for cid in scenario.enemy_team if (c := db.get_creature(cid)) is not None]

    job_id = str(uuid.uuid4())
    is_long_running = async_mode or len(req.options) > 5

    if is_long_running:
        set_job_progress(job_id, 0.05, status="queued")

        def _compare_task():
            set_job_progress(job_id, 0.2, status="running")
            models = compare_options(
                scenario=scenario,
                team=default_team,
                options=[o.model_dump() for o in req.options],
                seed_count=req.seed_count,
                enemy_creatures=enemy_c,
                all_creatures_map=all_c,
            )
            set_job_progress(job_id, 1.0, status="completed", result=[m.model_dump() for m in models])

        background_tasks.add_task(_compare_task)
        return {"job_id": job_id, "status": "queued", "progress": 0.05}

    models = compare_options(
        scenario=scenario,
        team=default_team,
        options=[o.model_dump() for o in req.options],
        seed_count=req.seed_count,
        enemy_creatures=enemy_c,
        all_creatures_map=all_c,
    )
    return models


@app.post("/api/plan/recommend", response_model=RecommendationReportModel)
def recommend_plan_actions(req: PlanRecommendRequest):
    scenario = db.get_scenario(req.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{req.scenario_id}' not found")
    all_c = {c.id: c for c in db.get_all_creatures()}
    state = {
        "player_team": req.team,
        "coins": req.current_coins,
        "current_tick": req.current_tick,
        "creature_hps": req.creature_hps,
    }
    return recommend_action(
        state=state,
        candidate_actions=[],
        scenario=scenario,
        all_known_creatures=all_c,
        seed_count=50,
    )


@app.get("/api/author/scenarios/{scenario_id}/balance", response_model=BalanceReportModel)
def audit_scenario_game_balance(
    scenario_id: str,
    calibrate_with_upload_id: Optional[str] = Query(None),
):
    scenario = db.get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")
    all_c = {c.id: c for c in db.get_all_creatures()}
    upload_battles = None
    if calibrate_with_upload_id:
        upload_battles = db.get_battles(scenario_id=scenario_id, source_filter=f"upload:{calibrate_with_upload_id}")
    return balance_report(scenario, all_creatures_map=all_c, calibrate_with_battles=upload_battles)


@app.post("/api/author/scenarios/{scenario_id}/sensitivity")
def run_scenario_sensitivity_sweep(
    scenario_id: str,
    req: AuthorSensitivityRequest,
    background_tasks: BackgroundTasks,
    async_mode: bool = False,
):
    scenario = db.get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")

    all_c = {c.id: c for c in db.get_all_creatures()}
    job_id = str(uuid.uuid4())
    is_long_running = async_mode or len(req.values) > 5

    if is_long_running:
        set_job_progress(job_id, 0.05, status="queued")

        def _sweep_task():
            set_job_progress(job_id, 0.2, status="running")
            rep = sensitivity_sweep(
                scenario=scenario,
                parameter=req.parameter,
                values=req.values,
                seed_count=req.seed_count,
                all_creatures_map=all_c,
            )
            set_job_progress(job_id, 1.0, status="completed", result=rep.model_dump())

        background_tasks.add_task(_sweep_task)
        return {"job_id": job_id, "status": "queued", "progress": 0.05}

    return sensitivity_sweep(
        scenario=scenario,
        parameter=req.parameter,
        values=req.values,
        seed_count=req.seed_count,
        all_creatures_map=all_c,
    )


@app.get("/api/jobs/{job_id}", response_model=JobStatusModel)
def get_job_status_endpoint(job_id: str):
    prog = get_job_progress(job_id)
    if not prog:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return JobStatusModel(
        job_id=job_id,
        status=prog.get("status", "running"),
        progress=prog.get("progress", 0.0),
        result=prog.get("result"),
        error=prog.get("error"),
    )


@app.get("/api/plan/progress/{job_id}")
def check_job_progress_legacy(job_id: str):
    prog = get_job_progress(job_id)
    if not prog:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return prog


# --- Heroes Directory Endpoint ---

HERO_LORE = {
    "ember_fox": {"role": "Burst Striker", "description": "Agile flame fox capable of blazing burst damage and personal flame shielding."},
    "flame_salamander": {"role": "Fire Bruiser", "description": "Durable amphibious salamander wielding potent flame breath and high baseline attack."},
    "bubble_toad": {"role": "Tactical Defender", "description": "Support creature specializing in bubble barriers and tide disruption."},
    "stream_turtle": {"role": "Tank & Sponge", "description": "High-HP aquatic defender built to absorb enemy assaults and secure lane control."},
    "moss_shroom": {"role": "Healer & Sustain", "description": "Vital team supporter wielding healing spores and sustained petal strikes."},
    "bramble_hound": {"role": "Speed Skirmisher", "description": "Fast-moving canine capable of flanking enemy lines and applying persistent pressure."},
    "volt_hedgehog": {"role": "Speed Blitzer", "description": "High-speed electric striker that outpaces opponents and applies tactical stuns."},
    "spark_finch": {"role": "Swift Scout", "description": "Rapid aerial scout with top-tier initiative for seizing tempo early in battle."},
    "crag_golem": {"role": "Juggernaut", "description": "Massive rocky titan with unparalleled HP and devastating boulder slams."},
    "pebble_armadillo": {"role": "Armor Vanguard", "description": "Resilient frontliner boasting rock armor to withstand heavy hazard zones."},
}

@app.get("/api/heroes")
def get_heroes_directory():
    from app.engine.models import BUILTIN_MOVES
    creatures = db.get_all_creatures(source_filter="builtin")
    heroes = []
    for c in creatures:
        lore = HERO_LORE.get(c.id, {"role": "Tactical Combatant", "description": "Resilient warrior of the Puffcap Kingdom arena."})
        moves_detail = []
        for m_id in c.moves:
            m = BUILTIN_MOVES.get(m_id)
            if m:
                moves_detail.append({
                    "id": m.id,
                    "name": m.name,
                    "type": m.type.value if hasattr(m.type, "value") else str(m.type),
                    "power": m.power,
                    "accuracy": m.accuracy,
                    "cost_coins": m.cost_coins,
                    "target_type": m.target_type,
                    "effect": m.effect,
                    "effect_chance": m.effect_chance,
                })
            else:
                moves_detail.append({
                    "id": m_id,
                    "name": m_id.replace("_", " ").title(),
                    "type": c.type.value if hasattr(c.type, "value") else str(c.type),
                    "power": 30,
                    "accuracy": 0.95,
                    "cost_coins": 0,
                    "target_type": "enemy",
                    "effect": None,
                    "effect_chance": 0.0,
                })
        heroes.append({
            "id": c.id,
            "name": c.name,
            "type": c.type.value if hasattr(c.type, "value") else str(c.type),
            "hp": c.hp,
            "attack": c.attack,
            "speed": c.speed,
            "moves": c.moves,
            "moves_detail": moves_detail,
            "avatar": c.avatar,
            "role": lore["role"],
            "description": lore["description"],
        })
    return heroes


# --- Uploads ---
@app.post("/api/uploads")
async def upload_data_files(
    file: UploadFile = File(...),
    kind: Literal["scenarios", "creatures", "battles"] = Form(...),
    upload_group: Optional[str] = Form(None),
):
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Uploaded file exceeds size limit of 10 MB (received {len(contents)} bytes)",
        )

    upload_id = str(uuid.uuid4())
    filename = file.filename or "upload"
    is_zip = filename.lower().endswith(".zip")

    files_dict: Dict[str, bytes] = {}
    if is_zip:
        extracted, zip_errs = extract_zip_in_memory(contents)
        if zip_errs:
            return JSONResponse(
                status_code=400,
                content={
                    "id": upload_id,
                    "kind": kind,
                    "filename": filename,
                    "status": "rejected",
                    "row_count": 0,
                    "errors": zip_errs,
                    "warnings": [],
                    "preview": [],
                },
            )
        files_dict = extracted
    else:
        files_dict = {filename: contents}

    # Strict Validation by kind
    report: Dict[str, Any] = {}
    if kind == "creatures":
        report = validate_creatures_data(contents, filename)
    elif kind == "scenarios":
        report = validate_scenarios_bundle(files_dict)
    elif kind == "battles":
        report = validate_battles_bundle(files_dict)

    if not report.get("valid"):
        # Save rejected upload record for audit
        upload_rec = {
            "id": upload_id,
            "kind": kind,
            "filename": filename,
            "status": "rejected",
            "row_count": 0,
            "errors": report.get("errors", []),
            "warnings": report.get("warnings", []),
            "preview": [],
            "upload_group": upload_group,
        }
        db.save_upload(upload_rec)
        return JSONResponse(status_code=400, content=upload_rec)

    # Valid: All-or-nothing transactional persistence
    parsed_items = report.get("data", [])
    preview_rows = []

    if kind == "creatures":
        for c in parsed_items:
            db.save_creature(c, upload_id=upload_id)
            if len(preview_rows) < 20:
                preview_rows.append(c.model_dump())
    elif kind == "scenarios":
        for s in parsed_items:
            db.save_scenario(s, upload_id=upload_id)
            if len(preview_rows) < 20:
                preview_rows.append(s.model_dump())
    elif kind == "battles":
        for b in parsed_items:
            db.save_battle(b, upload_id=upload_id)
            if len(preview_rows) < 20:
                preview_rows.append(b.model_dump())

    upload_rec = {
        "id": upload_id,
        "kind": kind,
        "filename": filename,
        "status": "valid",
        "row_count": report.get("row_count", len(parsed_items)),
        "errors": [],
        "warnings": report.get("warnings", []),
        "preview": preview_rows,
        "upload_group": upload_group,
    }
    db.save_upload(upload_rec)

    return upload_rec


@app.get("/api/uploads")
def list_uploads():
    return db.get_uploads()


@app.get("/api/uploads/{upload_id}")
def get_upload_details(upload_id: str):
    up = db.get_upload(upload_id)
    if not up:
        raise HTTPException(status_code=404, detail=f"Upload '{upload_id}' not found")
    return up


@app.delete("/api/uploads/{upload_id}")
def delete_upload_record(upload_id: str):
    up = db.get_upload(upload_id)
    if not up:
        raise HTTPException(status_code=404, detail=f"Upload '{upload_id}' not found")
    deleted = db.delete_upload(upload_id)
    return {"id": upload_id, "deleted": deleted, "message": "Upload and all associated imported records removed"}


@app.get("/api/uploads/{upload_id}/export")
def export_upload_data(upload_id: str, format: Literal["csv", "json"] = "json"):
    up = db.get_upload(upload_id)
    if not up:
        raise HTTPException(status_code=404, detail=f"Upload '{upload_id}' not found")

    kind = up["kind"]
    return export_kind_data(kind, format, upload_id=upload_id)


@app.get("/api/export/{kind}")
def export_kind_data(
    kind: Literal["creatures", "scenarios", "battles"],
    format: Literal["csv", "json"] = "json",
    upload_id: Optional[str] = None,
):
    if kind == "creatures":
        creatures = db.get_all_creatures()
        if upload_id:
            creatures = [c for c in creatures if c.source == f"upload:{upload_id}"]
        if format == "csv":
            content = export_creatures_csv(creatures)
            return Response(
                content=content,
                media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=creatures.csv"},
            )
        else:
            return Response(
                content=export_creatures_json(creatures),
                media_type="application/json",
                headers={"Content-Disposition": "attachment; filename=creatures.json"},
            )

    elif kind == "scenarios":
        scenarios = db.get_all_scenarios()
        if upload_id:
            scenarios = [s for s in scenarios if s.source == f"upload:{upload_id}"]
        if format == "csv":
            zip_bytes = export_scenarios_zip(scenarios)
            return Response(
                content=zip_bytes,
                media_type="application/zip",
                headers={"Content-Disposition": "attachment; filename=scenarios_bundle.zip"},
            )
        else:
            return Response(
                content=export_scenarios_json(scenarios),
                media_type="application/json",
                headers={"Content-Disposition": "attachment; filename=scenarios.json"},
            )

    elif kind == "battles":
        battles = db.get_battles()
        if upload_id:
            battles = [b for b in battles if b.source == f"upload:{upload_id}"]
        # Include events
        full_battles = []
        for b in battles:
            full = db.get_battle(b.battle_id)
            if full:
                full_battles.append(full)

        if format == "csv":
            zip_bytes = export_battles_zip(full_battles)
            return Response(
                content=zip_bytes,
                media_type="application/zip",
                headers={"Content-Disposition": "attachment; filename=battles_bundle.zip"},
            )
        else:
            return Response(
                content=export_battles_json(full_battles),
                media_type="application/json",
                headers={"Content-Disposition": "attachment; filename=battles.json"},
            )


# --- Serve Built Frontend Static Files in Production ---
dist_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")


@app.exception_handler(404)
async def spa_404_handler(request, exc):
    if not request.url.path.startswith("/api"):
        index_file = dist_dir / "index.html"
        if index_file.exists():
            return Response(content=index_file.read_bytes(), media_type="text/html")
    return JSONResponse(status_code=404, content={"detail": "Not Found"})
