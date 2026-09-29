"""Focused Super Admin authorization and governance API tests."""

from app.auth.security import create_access_token, hash_password
from app.models import User

from conftest import auth_headers, login, register


def privileged_headers(user: User) -> dict[str, str]:
    return auth_headers(create_access_token(user.user_id, user.role))


def privileged_user(db_session, *, email: str, role: str, phone: str) -> User:
    user = User(
        full_name=role.replace("admin", " admin").title(),
        email=email,
        phone=phone,
        password_hash=hash_password("TestPass123"),
        role=role,
        status="active",
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_superadmin_is_not_publicly_registrable(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "fullName": "Not Allowed", "email": "no-super@example.com",
            "phone": "+923000001010", "password": "TestPass123",
            "confirmPassword": "TestPass123", "role": "superadmin",
        },
    )
    assert response.status_code == 403


def test_superadmin_routes_enforce_role_and_dashboard(client, db_session):
    register(client, "ordinary@example.com", "customer")
    customer_token = login(client, "ordinary@example.com")
    admin = privileged_user(db_session, email="admin-auth@example.com", role="admin", phone="+923000001011")
    superadmin = privileged_user(db_session, email="super-auth@example.com", role="superadmin", phone="+923000001012")

    assert client.get("/api/v1/super-admin/dashboard", headers=auth_headers(customer_token)).status_code == 403
    assert client.get("/api/v1/super-admin/dashboard", headers=privileged_headers(admin)).status_code == 403
    response = client.get("/api/v1/super-admin/dashboard", headers=privileged_headers(superadmin))
    assert response.status_code == 200
    assert {"totalUsers", "admins", "milkBatches", "openCases"} <= response.json().keys()


def test_admin_escalates_and_superadmin_resolves_case(client, db_session):
    admin = privileged_user(db_session, email="case-admin@example.com", role="admin", phone="+923000001013")
    superadmin = privileged_user(db_session, email="case-super@example.com", role="superadmin", phone="+923000001014")
    admin_headers = privileged_headers(admin)
    super_headers = privileged_headers(superadmin)

    created = client.post(
        "/api/v1/admin/escalations",
        headers=admin_headers,
        json={
            "caseType": "technical", "category": "account-access",
            "title": "Admin cannot access farm", "description": "Repeated access failure needs platform review.",
            "priority": "high", "adminRemarks": "Normal recovery steps were unsuccessful.",
        },
    )
    assert created.status_code == 201, created.text
    case_id = created.json()["id"]

    rows = client.get("/api/v1/super-admin/cases?status=pending", headers=super_headers)
    assert rows.status_code == 200
    assert any(row["id"] == case_id for row in rows.json())

    no_notes = client.patch(
        f"/api/v1/super-admin/cases/{case_id}", headers=super_headers,
        json={"status": "resolved"},
    )
    assert no_notes.status_code == 400
    resolved = client.patch(
        f"/api/v1/super-admin/cases/{case_id}", headers=super_headers,
        json={"status": "resolved", "resolutionNotes": "Identity and farm assignment verified."},
    )
    assert resolved.status_code == 200, resolved.text
    assert resolved.json()["status"] == "resolved"


def test_admin_hierarchy_application_and_assignment(client, db_session):
    regular_admin = privileged_user(db_session, email="hier-admin@example.com", role="admin", phone="+923000001015")
    superadmin = privileged_user(db_session, email="hier-super@example.com", role="superadmin", phone="+923000001016")
    applicant_json = register(client, "admin-applicant@example.com", "customer")
    farmer_json = register(client, "assignment-farmer@example.com", "farmer")
    farmer_headers = auth_headers(farmer_json["accessToken"])
    farm = client.post(
        "/api/v1/farms", headers=farmer_headers,
        json={"farmName": "Assignment Farm", "location": "Lahore"},
    )
    assert farm.status_code == 201, farm.text

    admin_headers = privileged_headers(regular_admin)
    super_headers = privileged_headers(superadmin)
    forbidden = client.patch(
        f"/api/v1/admin/users/{regular_admin.user_id}/status",
        headers=admin_headers, json={"status": "suspended"},
    )
    assert forbidden.status_code in (400, 403)
    self_change = client.patch(
        f"/api/v1/super-admin/users/{superadmin.user_id}/status",
        headers=super_headers, json={"status": "suspended"},
    )
    assert self_change.status_code == 400

    application = client.post(
        "/api/v1/super-admin/admin-applications", headers=super_headers,
        json={"applicantUserId": applicant_json["user"]["id"], "reason": "Regional farm support"},
    )
    assert application.status_code == 201, application.text
    approved = client.patch(
        f"/api/v1/super-admin/admin-applications/{application.json()['id']}",
        headers=super_headers, json={"status": "approved", "reviewNotes": "Approved for demo operations."},
    )
    assert approved.status_code == 200, approved.text
    applicant_id = applicant_json["user"]["id"]
    assert db_session.get(User, applicant_id).role == "admin"

    assignment = client.post(
        "/api/v1/super-admin/admin-assignments", headers=super_headers,
        json={"adminId": applicant_id, "farmId": farm.json()["id"]},
    )
    assert assignment.status_code == 201, assignment.text
    revoked = client.delete(
        f"/api/v1/super-admin/admin-assignments/{assignment.json()['id']}", headers=super_headers,
    )
    assert revoked.status_code == 200


def test_settings_reject_secret_storage(client, db_session):
    superadmin = privileged_user(db_session, email="settings-super@example.com", role="superadmin", phone="+923000001017")
    headers = privileged_headers(superadmin)
    assert client.patch(
        "/api/v1/super-admin/settings/api_key", headers=headers, json={"value": "do-not-store"},
    ).status_code == 400
    saved = client.patch(
        "/api/v1/super-admin/settings/support.contacts", headers=headers,
        json={"value": [{"name": "Technical Team", "email": "support@example.com"}]},
    )
    assert saved.status_code == 200, saved.text
    contacts = client.get("/api/v1/super-admin/support-contacts", headers=headers)
    assert contacts.status_code == 200
    assert contacts.json()[0]["email"] == "support@example.com"
