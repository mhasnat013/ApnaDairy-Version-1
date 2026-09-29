"""Integration tests: auth, roles, ownership, commerce, B2B, AI, trace."""

from datetime import datetime, timedelta, timezone

from conftest import auth_headers, login, register

from app.models import Farm


def _utcnow():
    return datetime.now(timezone.utc).isoformat()


def make_farmer_with_verified_farm(client, db_session, email="farmer1@t.local"):
    register(client, email, "farmer")
    token = login(client, email)
    h = auth_headers(token)
    r = client.post(
        "/api/v1/farms",
        json={"farmName": "Test Farm", "location": "Lahore, Pakistan", "capacityLiters": 500},
        headers=h,
    )
    assert r.status_code == 201, r.text
    farm_id = r.json()["id"]
    db_session.query(Farm).filter(Farm.farm_id == farm_id).update({"verification_status": "verified"})
    db_session.commit()
    return token, h, farm_id


def make_batch(client, h, farm_id, code="T-BATCH-001"):
    r = client.post(
        "/api/v1/batches",
        json={
            "farmId": farm_id,
            "batchCode": code,
            "milkingTime": _utcnow(),
            "quantityLiters": 100,
            "initialStorageTemp": 4.0,
        },
        headers=h,
    )
    assert r.status_code == 201, r.text
    return r.json()


def make_product(client, h, farm_id, batch_id=None):
    body = {
        "farmId": farm_id,
        "name": "Test Milk 1L",
        "category": "milk",
        "unitOfMeasure": "litre",
        "price": 180,
        "quantityAvailable": 50,
        "status": "active",
    }
    if batch_id:
        body["batchId"] = batch_id
    r = client.post("/api/v1/products", json=body, headers=h)
    assert r.status_code == 201, r.text
    return r.json()


# ---------------------------------------------------------------- auth -----

def test_register_login_me(client):
    register(client, "cust1@t.local", "customer")
    token = login(client, "cust1@t.local")
    r = client.get("/api/v1/auth/me", headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["email"] == "cust1@t.local"
    assert r.json()["role"] == "customer"


def test_missing_token_401(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_admin_registration_forbidden(client):
    r = client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Sneaky",
            "email": "sneaky@t.local",
            "phone": "+93000000001",
            "password": "TestPass123",
            "confirmPassword": "TestPass123",
            "role": "admin",
        },
    )
    assert r.status_code == 403


def test_wrong_role_403(client):
    register(client, "cust2@t.local", "customer")
    token = login(client, "cust2@t.local")
    # customer cannot hit farmer-only batch creation
    r = client.post(
        "/api/v1/batches",
        json={"milkingTime": _utcnow(), "quantityLiters": 10},
        headers=auth_headers(token),
    )
    assert r.status_code == 403
    # customer cannot hit admin endpoints
    r = client.get("/api/v1/admin/users", headers=auth_headers(token))
    assert r.status_code == 403


def test_admin_cannot_create_batches(client, db_session):
    # seed an admin directly (no public admin registration)
    from app.auth.security import hash_password
    from app.models import User

    db_session.add(
        User(
            full_name="Admin",
            email="admin@t.local",
            phone="+93000000002",
            password_hash=hash_password("AdminPass123"),
            role="admin",
            status="active",
            is_verified=True,
        )
    )
    db_session.commit()
    token = login(client, "admin@t.local", "AdminPass123")
    r = client.post(
        "/api/v1/batches",
        json={"milkingTime": _utcnow(), "quantityLiters": 10},
        headers=auth_headers(token),
    )
    assert r.status_code == 403  # admin can moderate, never create


def test_ownership_isolation(client, db_session):
    token_a, h_a, farm_a = make_farmer_with_verified_farm(client, db_session, "farmerA@t.local")
    batch = make_batch(client, h_a, farm_a, code="T-BATCH-A")
    make_farmer_with_verified_farm(client, db_session, "farmerB@t.local")
    token_b = login(client, "farmerB@t.local")
    # farmer B cannot see farmer A's batch
    r = client.get(f"/api/v1/batches/{batch['id']}", headers=auth_headers(token_b))
    assert r.status_code == 404
    # farmer B's own list is empty
    r = client.get("/api/v1/batches", headers=auth_headers(token_b))
    assert r.status_code == 200 and r.json() == []


# ------------------------------------------------------------- commerce -----

def test_cart_checkout_pay_track(client, db_session):
    ftoken, fh, farm_id = make_farmer_with_verified_farm(client, db_session, "farmerC@t.local")
    batch = make_batch(client, fh, farm_id, code="T-BATCH-C")
    product = make_product(client, fh, farm_id, batch["id"])

    register(client, "buyer1@t.local", "customer")
    ctoken = login(client, "buyer1@t.local")
    ch = auth_headers(ctoken)

    # cart
    r = client.put("/api/v1/cart", json={"items": [{"productId": product["id"], "quantity": 2}]}, headers=ch)
    assert r.status_code == 200
    assert r.json()["total"] == 360.0

    # checkout → order
    r = client.post("/api/v1/orders", json={"deliveryAddress": "123 Test St, Lahore"}, headers=ch)
    assert r.status_code == 201, r.text
    order = r.json()
    assert order["status"] == "pending"
    order_id = order["id"]

    # demo payment (simulated)
    r = client.post(f"/api/v1/orders/{order_id}/pay", json={"method": "card"}, headers=ch)
    assert r.status_code == 200, r.text
    pay = r.json()
    assert pay["status"] == "completed"
    assert pay["transactionRef"].startswith("DEMO-")

    # order now paid + delivery scheduled
    r = client.get(f"/api/v1/orders/{order_id}", headers=ch)
    assert r.json()["status"] == "paid"
    assert r.json()["delivery"]["status"] == "scheduled"

    # admin assigns a rider; rider delivers with tracking
    from app.auth.security import hash_password
    from app.models import User

    db_session.add(User(full_name="Rider", email="rider1@t.local", phone="+93000000003",
                        password_hash=hash_password("RiderPass123"), role="rider", status="active", is_verified=True))
    db_session.add(User(full_name="Admin2", email="admin2@t.local", phone="+93000000004",
                        password_hash=hash_password("AdminPass123"), role="admin", status="active", is_verified=True))
    db_session.commit()
    atoken = login(client, "admin2@t.local", "AdminPass123")
    rtoken = login(client, "rider1@t.local", "RiderPass123")
    rider_id = db_session.query(User).filter(User.email == "rider1@t.local").first().user_id

    delivery_id = client.get(f"/api/v1/orders/{order_id}", headers=ch).json()["delivery"]["id"]
    r = client.patch(f"/api/v1/deliveries/{delivery_id}/assign", json={"riderId": rider_id},
                     headers=auth_headers(atoken))
    assert r.status_code == 200, r.text

    rh = auth_headers(rtoken)
    r = client.post(f"/api/v1/deliveries/{delivery_id}/tracking",
                    json={"statusUpdate": "Left the farm hub"}, headers=rh)
    assert r.status_code == 201
    # forward-only state machine: walk the legal transitions
    for nxt in ("picked_up", "in_transit", "delivered"):
        r = client.patch(f"/api/v1/deliveries/{delivery_id}/status", json={"status": nxt}, headers=rh)
        assert r.status_code == 200, (nxt, r.text)
    assert r.json()["status"] == "delivered"
    # illegal backward jump is rejected
    r = client.patch(f"/api/v1/deliveries/{delivery_id}/status", json={"status": "assigned"}, headers=rh)
    assert r.status_code == 400

    # customer sees the tracking timeline
    r = client.get(f"/api/v1/deliveries/{delivery_id}/tracking", headers=ch)
    assert r.status_code == 200 and len(r.json()) == 1


# ------------------------------------------------------------------ B2B -----

def test_b2b_request_quote_accept(client, db_session):
    ftoken, fh, farm_id = make_farmer_with_verified_farm(client, db_session, "farmerD@t.local")
    product = make_product(client, fh, farm_id)

    register(client, "biz1@t.local", "business")
    btoken = login(client, "biz1@t.local")
    bh = auth_headers(btoken)

    r = client.post("/api/v1/b2b/requests",
                    json={"productId": product["id"], "quantityRequested": 200, "targetPrice": 170},
                    headers=bh)
    assert r.status_code == 201, r.text
    req_id = r.json()["id"]

    r = client.post(f"/api/v1/b2b/requests/{req_id}/quotations",
                    json={"bidPrice": 165, "quantityOffered": 200}, headers=fh)
    assert r.status_code == 201, r.text
    q_id = r.json()["id"]

    r = client.post(f"/api/v1/b2b/quotations/{q_id}/accept", headers=bh)
    assert r.status_code == 200
    assert r.json()["status"] == "accepted"

    # accepted quotation spawns a payable bulk order (status pending so the
    # standard payment -> delivery pipeline can run)
    r = client.get("/api/v1/orders", headers=bh)
    assert r.status_code == 200
    orders = [o for o in r.json() if o["status"] == "pending"]
    assert orders, r.json()
    # and the pending B2B order is payable end-to-end
    order_id = orders[0]["id"]
    # restock so the 200-unit bulk order can be paid (stock is validated at pay time)
    r = client.patch(f"/api/v1/products/{product['id']}", json={"quantityAvailable": 500}, headers=fh)
    assert r.status_code == 200, r.text
    r = client.post(f"/api/v1/orders/{order_id}/pay", json={"method": "bank_transfer"}, headers=bh)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "completed"
    r = client.get(f"/api/v1/orders/{order_id}", headers=bh)
    assert r.json()["status"] == "paid"


# ------------------------------------------------------------- AI / IoT -----

ADULTERATION_FEATURES = {
    "Cells": 250.0, "QValue": 0.5, "Fat": 3.8, "Protein": 3.2, "Lactose": 4.7,
    "Solids": 12.5, "FFA": 0.02, "Citrate": 0.18, "FrzPoint": -0.54,
    "SNF": 8.7, "MUN": 12.0, "Casein": 2.6,
}

FRESHNESS_FEATURES = {
    "time_since_milking_hours": 6.0, "avg_temperature_c": 4.2, "min_temperature_c": 3.5,
    "max_temperature_c": 5.1, "temperature_std_c": 0.4, "time_above_5c_hours": 0.2,
    "time_above_10c_hours": 0.0, "temperature_excursions": 0.0,
}


def test_ai_adulteration_probabilities_sum(client):
    register(client, "cust3@t.local", "customer")
    token = login(client, "cust3@t.local")
    r = client.post("/api/v1/predict/adulteration", json=ADULTERATION_FEATURES, headers=auth_headers(token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert abs(sum(body["adulterationProbabilities"].values()) - 1.0) < 0.01
    assert abs(sum(body["adulterantProbabilities"].values()) - 1.0) < 0.01
    assert "Demonstration prediction" in body["disclaimer"]


def test_ai_freshness_range(client):
    register(client, "cust4@t.local", "customer")
    token = login(client, "cust4@t.local")
    r = client.post("/api/v1/predict/freshness", json=FRESHNESS_FEATURES, headers=auth_headers(token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert 0 <= body["freshnessScore"] <= 100
    assert abs(sum(body["spoilageProbabilities"].values()) - 1.0) < 0.01
    assert "Demonstration prediction" in body["disclaimer"]


def test_simulate_and_score_batch(client, db_session):
    ftoken, fh, farm_id = make_farmer_with_verified_farm(client, db_session, "farmerE@t.local")
    batch = make_batch(client, fh, farm_id, code="T-BATCH-E")

    r = client.post(f"/api/v1/iot/batches/{batch['id']}/simulate",
                    json={"hoursBack": 24, "intervalMinutes": 60}, headers=fh)
    assert r.status_code == 201, r.text
    assert r.json()["count"] >= 24  # inclusive endpoints: 24h @ 60min = 25 readings
    assert r.json()["label"] == "Simulated IoT reading"

    r = client.post(f"/api/v1/batches/{batch['id']}/score", headers=fh)
    assert r.status_code == 201, r.text
    body = r.json()
    assert 0 <= body["freshnessScore"] <= 100
    assert "Demonstration prediction" in body["disclaimer"]


def test_public_batch_trace(client, db_session):
    ftoken, fh, farm_id = make_farmer_with_verified_farm(client, db_session, "farmerF@t.local")
    make_batch(client, fh, farm_id, code="TRACE-123")
    # no auth header — public
    r = client.get("/api/v1/batches/trace/TRACE-123")
    assert r.status_code == 200
    assert r.json()["batchCode"] == "TRACE-123"
    r = client.get("/api/v1/batches/trace/NOPE-999")
    assert r.status_code == 404


def test_public_catalog_bare_arrays(client):
    r = client.get("/api/v1/farms")
    assert r.status_code == 200 and isinstance(r.json(), list)
    r = client.get("/api/v1/products")
    assert r.status_code == 200 and isinstance(r.json(), list)


# --------------------------------------------------------------- admin -----

def test_admin_user_management_and_farm_approval(client, db_session):
    from app.auth.security import hash_password
    from app.models import User

    db_session.add(User(full_name="Root Admin", email="root@t.local", phone="+93000000005",
                        password_hash=hash_password("AdminPass123"), role="admin",
                        status="active", is_verified=True))
    db_session.commit()
    atoken = login(client, "root@t.local", "AdminPass123")
    ah = auth_headers(atoken)

    # list users (covers UserOut serialisation incl. address_line)
    r = client.get("/api/v1/admin/users", headers=ah)
    assert r.status_code == 200 and isinstance(r.json(), list)

    # farmer registers a farm (pending) → admin approves
    register(client, "farmerG@t.local", "farmer")
    gtoken = login(client, "farmerG@t.local")
    r = client.post("/api/v1/farms", json={"farmName": "G Farm", "location": "Multan, Pakistan"},
                    headers=auth_headers(gtoken))
    assert r.status_code == 201
    farm_id = r.json()["id"]

    r = client.get("/api/v1/admin/farms/pending", headers=ah)
    assert r.status_code == 200 and any(f["id"] == farm_id for f in r.json())

    r = client.post(f"/api/v1/admin/farms/{farm_id}/verify",
                    json={"verificationStatus": "verified"}, headers=ah)
    assert r.status_code == 200
    assert r.json()["verificationStatus"] == "verified"

    # audit log recorded
    r = client.get("/api/v1/admin/action-logs", headers=ah)
    assert r.status_code == 200
    assert any("farm_verified" in l["action"] for l in r.json())

    # platform overview
    r = client.get("/api/v1/admin/analytics/overview", headers=ah)
    assert r.status_code == 200
    assert r.json()["farms"] >= 1

    # admin cannot suspend themselves
    me = client.get("/api/v1/auth/me", headers=ah).json()
    r = client.patch(f"/api/v1/admin/users/{me['id']}/status", json={"status": "suspended"}, headers=ah)
    assert r.status_code == 400


def test_contact_and_notifications(client, db_session):
    register(client, "cust5@t.local", "customer")
    token = login(client, "cust5@t.local")
    h = auth_headers(token)
    # notifications start empty; unread count works
    r = client.get("/api/v1/notifications/unread-count", headers=h)
    assert r.status_code == 200 and r.json()["unread"] == 0
    # complaint round-trip (admin resolves → notification created)
    r = client.post("/api/v1/complaints", json={"subject": "Late delivery", "description": "Milk arrived late."}, headers=h)
    assert r.status_code == 201
    c_id = r.json()["id"]

    from app.auth.security import hash_password
    from app.models import User
    db_session.add(User(full_name="Admin3", email="admin3@t.local", phone="+93000000006",
                        password_hash=hash_password("AdminPass123"), role="admin",
                        status="active", is_verified=True))
    db_session.commit()
    atoken = login(client, "admin3@t.local", "AdminPass123")
    r = client.patch(f"/api/v1/complaints/{c_id}", json={"status": "resolved"}, headers=auth_headers(atoken))
    assert r.status_code == 200

    r = client.get("/api/v1/notifications/unread-count", headers=h)
    assert r.json()["unread"] >= 1
    r = client.post("/api/v1/notifications/read-all", headers=h)
    assert r.status_code == 200
