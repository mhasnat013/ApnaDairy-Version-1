"""Simulated per-batch IoT/AI automation is persisted, bounded and authorized."""

from datetime import datetime, timedelta, timezone

from app.models import AIPrediction, Farm, IoTSensorReading
from conftest import auth_headers, login, register


def _farmer_batch(client, db, email: str, code: str):
    register(client, email, "farmer")
    token = login(client, email)
    headers = auth_headers(token)
    farm_response = client.post(
        "/api/v1/farms",
        json={"farmName": f"{code} Farm", "location": "Lahore, Pakistan"},
        headers=headers,
    )
    assert farm_response.status_code == 201, farm_response.text
    farm_id = farm_response.json()["id"]
    db.query(Farm).filter(Farm.farm_id == farm_id).update({"verification_status": "verified"})
    db.commit()
    batch_response = client.post(
        "/api/v1/batches",
        json={
            "farmId": farm_id,
            "batchCode": code,
            "milkingTime": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
            "quantityLiters": 80,
            "initialStorageTemp": 4.0,
        },
        headers=headers,
    )
    assert batch_response.status_code == 201, batch_response.text
    return headers, batch_response.json()["id"]


def test_manual_automation_persists_and_is_idempotent(client, db_session):
    headers, batch_id = _farmer_batch(client, db_session, "auto-farmer@t.local", "AUTO-001")
    # One earlier point lets the first cycle aggregate a real time series after
    # it adds its single bounded simulated point.
    db_session.add(IoTSensorReading(
        batch_id=batch_id,
        sensor_type="temperature",
        reading_value=4.1,
        unit="°C",
        recorded_at=datetime.now(timezone.utc) - timedelta(hours=1),
    ))
    db_session.commit()

    first = client.post(
        "/api/v1/iot/automation/run",
        json={"batchId": batch_id},
        headers=headers,
    )
    assert first.status_code == 201, first.text
    body = first.json()
    assert body["simulationLabel"] == "Simulated IoT reading"
    assert "Demonstration prediction" in body["predictionDisclaimer"]
    assert body["readingsCreated"] == 1
    assert body["predictionsCreated"] == 1
    assert db_session.query(IoTSensorReading).filter_by(batch_id=batch_id).count() == 2
    assert db_session.query(AIPrediction).filter_by(batch_id=batch_id).count() == 1

    # Same due window: no duplicate telemetry or prediction row.
    second = client.post(
        "/api/v1/iot/automation/run",
        json={"batchId": batch_id},
        headers=headers,
    )
    assert second.status_code == 201
    assert second.json()["readingsCreated"] == 0
    assert second.json()["predictionsCreated"] == 0

    status = client.get(
        f"/api/v1/iot/automation/status?batchId={batch_id}",
        headers=headers,
    )
    assert status.status_code == 200, status.text
    assert status.json()["mode"] == "simulated-demonstration"
    assert status.json()["latestPredictionAt"] is not None


def test_farmer_automation_requires_owned_batch(client, db_session):
    owner_headers, batch_id = _farmer_batch(client, db_session, "auto-owner@t.local", "AUTO-OWN")
    other_headers, _ = _farmer_batch(client, db_session, "auto-other@t.local", "AUTO-OTHER")

    missing_id = client.post("/api/v1/iot/automation/run", json={}, headers=other_headers)
    assert missing_id.status_code == 400
    denied = client.post(
        "/api/v1/iot/automation/run",
        json={"batchId": batch_id},
        headers=other_headers,
    )
    assert denied.status_code == 404
    assert owner_headers  # owner credentials were created successfully
