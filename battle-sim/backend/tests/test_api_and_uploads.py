"""Comprehensive test suite for API endpoints, uploads, security, and replay validation."""

import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.storage import db
from app.uploads.archive import extract_zip_in_memory
from app.uploads.parsers import parse_csv_content
from app.uploads.replay import verify_battle_replay
from app.uploads.export import sanitize_cell


@pytest.fixture
def client():
    return TestClient(app)


# --- Endpoint Tests ---
def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_get_scenarios_and_creatures(client):
    # GET /api/scenarios
    res = client.get("/api/scenarios")
    assert res.status_code == 200
    scenarios = res.json()
    assert len(scenarios) >= 3
    assert any(s["id"] == "pipe_ambush" for s in scenarios)

    # GET /api/scenarios/{id}
    res_one = client.get("/api/scenarios/pipe_ambush")
    assert res_one.status_code == 200
    assert "Pipe Ambush" in res_one.json()["name"]

    # GET /api/creatures
    res_c = client.get("/api/creatures")
    assert res_c.status_code == 200
    creatures = res_c.json()
    assert len(creatures) >= 10


def test_battle_lifecycle_and_analytics(client):
    # POST /api/battles
    payload = {
        "scenario_id": "pipe_ambush",
        "player_team": ["ember_fox", "bubble_toad"],
        "seed": 2048,
        "personality": "aggressive",
    }
    res = client.post("/api/battles", json=payload)
    assert res.status_code == 200
    data = res.json()
    battle_id = data["battle_id"]
    assert "outcome" in data
    assert data["event_count"] > 0

    # GET /api/battles/{id}
    res_get = client.get(f"/api/battles/{battle_id}")
    assert res_get.status_code == 200
    battle_data = res_get.json()["battle"]
    assert len(battle_data["events"]) > 0

    # GET /api/battles/{id}/analytics/descriptive
    res_desc = client.get(f"/api/battles/{battle_id}/analytics/descriptive")
    assert res_desc.status_code == 200
    desc_data = res_desc.json()
    assert "creatures_stats" in desc_data
    assert "hp_timeline" in desc_data
    assert "heatmap" in desc_data

    # GET /api/battles/{id}/analytics/diagnostic
    res_diag = client.get(f"/api/battles/{battle_id}/analytics/diagnostic")
    assert res_diag.status_code == 200
    assert "root_cause" in res_diag.json()

    # POST /api/battles/{id}/counterfactual
    cf_payload = {
        "tick": 2,
        "actor": "ember_fox",
        "action_type": "move_lane",
        "target_lane": 2,
    }
    res_cf = client.post(f"/api/battles/{battle_id}/counterfactual", json=cf_payload)
    assert res_cf.status_code == 200
    assert "new_battle" in res_cf.json()


def test_plan_and_author_endpoints(client):
    # POST /api/plan/predict
    pred_payload = {
        "scenario_id": "pipe_ambush",
        "team": ["ember_fox", "bubble_toad"],
        "seed_count": 50,
    }
    res_pred = client.post("/api/plan/predict", json=pred_payload)
    assert res_pred.status_code == 200
    pred = res_pred.json()
    assert 0.0 <= pred["win_rate"] <= 1.0
    assert "confidence_interval_percent" in pred
    assert len(pred["survivor_distribution"]) == 5

    # POST /api/plan/compare
    comp_payload = {
        "scenario_id": "pipe_ambush",
        "options": [
            {"name": "No Early Spend", "team": ["ember_fox", "bubble_toad"], "early_heal_spend": 0},
            {"name": "Early Spend 5", "team": ["ember_fox", "bubble_toad"], "early_heal_spend": 5},
        ],
        "seed_count": 30,
    }
    res_comp = client.post("/api/plan/compare", json=comp_payload)
    assert res_comp.status_code == 200
    assert len(res_comp.json()) == 2

    # POST /api/plan/recommend
    rec_payload = {
        "scenario_id": "pipe_ambush",
        "team": ["ember_fox", "bubble_toad"],
        "current_coins": 20,
    }
    res_rec = client.post("/api/plan/recommend", json=rec_payload)
    assert res_rec.status_code == 200
    assert "best_spend" in res_rec.json()

    # GET /api/author/scenarios/{id}/balance
    res_bal = client.get("/api/author/scenarios/pipe_ambush/balance")
    assert res_bal.status_code == 200
    bal_data = res_bal.json()
    assert "is_balanced" in bal_data
    assert "pacing" in bal_data


# --- Upload Security & Parsing Tests ---
def test_zip_slip_rejection():
    # Construct a malicious zip with path traversal
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as zf:
        zf.writestr("../../etc/passwd", "evil_content")
    zip_bytes = zip_buf.getvalue()

    extracted, errors = extract_zip_in_memory(zip_bytes)
    assert len(errors) > 0
    assert "path traversal" in errors[0].lower() or "security" in errors[0].lower()


def test_size_limit_rejection(client):
    # Upload payload > 10 MB
    large_content = b"0" * (10 * 1024 * 1024 + 1024)
    res = client.post(
        "/api/uploads",
        data={"kind": "creatures"},
        files={"file": ("huge.json", large_content, "application/json")},
    )
    assert res.status_code == 413


def test_all_or_nothing_upload_validation(client):
    # CSV with 2 valid rows and 1 invalid row (HP > 500)
    csv_content = (
        "id,name,type,hp,attack,speed,moves\r\n"
        "valid_one,Valid One,fire,100,30,50,flame_spit\r\n"
        "bad_row,Bad Mon,water,999,30,50,spout_splash\r\n"
        "valid_two,Valid Two,grass,100,30,50,vine_whip\r\n"
    )
    res = client.post(
        "/api/uploads",
        data={"kind": "creatures"},
        files={"file": ("partial_test.csv", csv_content.encode("utf-8"), "text/csv")},
    )
    assert res.status_code == 400
    data = res.json()
    assert data["status"] == "rejected"
    assert any("line 3" in err for err in data["errors"])

    # Ensure none of the rows were partially saved
    assert db.get_creature("valid_one") is None
    assert db.get_creature("valid_two") is None


def test_quoted_multiline_csv():
    # RFC 4180: multiline quoted text with commas
    csv_text = (
        'id,name,description\r\n'
        'scen_multi,"Scenario with, comma","Line 1 of description\r\nLine 2 of description"\r\n'
    )
    rows, errors, warnings = parse_csv_content(csv_text.encode("utf-8"), "test.csv")
    assert len(errors) == 0
    assert len(rows) == 1
    assert rows[0]["name"] == "Scenario with, comma"
    assert "Line 1" in rows[0]["description"] and "Line 2" in rows[0]["description"]


def test_bom_and_crlf_handling():
    # UTF-8 with BOM and CRLF
    bom = b"\xef\xbb\xbf"
    csv_bytes = bom + b"id,name,type,hp,attack,speed,moves\r\nbom_mon,BOM Creature,fire,120,40,60,flame_spit\r\n"
    rows, errors, warnings = parse_csv_content(csv_bytes, "bom.csv")
    assert len(errors) == 0
    assert len(rows) == 1
    assert rows[0]["id"] == "bom_mon"


def test_formula_injection_guard():
    assert sanitize_cell("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_cell("+12345") == "'+12345"
    assert sanitize_cell("-12345") == "'-12345"
    assert sanitize_cell("@import") == "'@import"
    assert sanitize_cell("Regular text") == "Regular text"


def test_replay_verification_match_and_mismatch():
    # Match test: replaying a deterministic battle produced by the engine
    scen = db.get_scenario("pipe_ambush")
    p_team = [db.get_creature("ember_fox"), db.get_creature("bubble_toad")]
    e_team = [db.get_creature(cid) for cid in scen.enemy_team]
    from app.engine.tick import TickEngine
    eng = TickEngine(scen, p_team, e_team, seed=555)
    clean_battle = eng.run()

    report = verify_battle_replay(clean_battle)
    assert report["status"] == "match"

    # Mismatch test: tamper with an event's damage
    tampered_events = [e.model_copy() for e in clean_battle.events]
    if tampered_events:
        tampered_events[0].damage += 99
    tampered_battle = clean_battle.model_copy(update={"events": tampered_events})
    mismatch_rep = verify_battle_replay(tampered_battle)
    assert mismatch_rep["status"] == "mismatch"
    assert mismatch_rep["first_differing_tick"] is not None


def test_upload_delete_isolation(client):
    # Upload sample valid creatures
    with open("backend/samples/creatures.json", "rb") as f:
        file_bytes = f.read()

    res = client.post(
        "/api/uploads",
        data={"kind": "creatures"},
        files={"file": ("creatures.json", file_bytes, "application/json")},
    )
    assert res.status_code == 200
    upload_id = res.json()["id"]

    # Verify creature was created with upload source
    assert db.get_creature("sample_puff_bird") is not None

    # Delete upload
    del_res = client.delete(f"/api/uploads/{upload_id}")
    assert del_res.status_code == 200

    # Verify creature was removed
    assert db.get_creature("sample_puff_bird") is None
    # Verify built-in creatures remain untouched
    assert db.get_creature("ember_fox") is not None


def test_round_trip_export_and_reimport(client):
    # 1. Export creatures to CSV
    exp_res = client.get("/api/export/creatures?format=csv")
    assert exp_res.status_code == 200
    csv_data = exp_res.content

    # 2. Re-import the CSV
    up_res = client.post(
        "/api/uploads",
        data={"kind": "creatures"},
        files={"file": ("exported_creatures.csv", csv_data, "text/csv")},
    )
    assert up_res.status_code == 200
    data = up_res.json()
    assert data["status"] == "valid"
    assert data["row_count"] >= 10
