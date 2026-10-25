"""Integration tests verifying multi-module clinical, financial, and reporting workflows."""

import pytest
from fastapi.testclient import TestClient
from src.api.dependencies import BranchContext, get_branch_context, get_current_user
from src.app_factory import create_app
from src.models.global_schema.users import User


@pytest.fixture(scope="module")
def app():
    application = create_app()

    # Create mock user and branch context for authenticated tests
    mock_user = User(
        id=1,
        username="doctor",
        mobile="9999999999",
        name="Dr. Test User",
        password_hash="mock_hash",
        is_active=True,
        is_platform_admin=False,
    )
    mock_context = BranchContext(
        user=mock_user,
        company_id=1,
        branch_id=1,
        code_prefix="HO",
    )

    application.dependency_overrides[get_current_user] = lambda: mock_user
    application.dependency_overrides[get_branch_context] = lambda: mock_context

    yield application

    application.dependency_overrides.clear()


@pytest.fixture(scope="module")
def client(app):
    with TestClient(app) as test_client:
        yield test_client


def test_reports_catalog_workflow(client):
    """Verifies that the reports catalog lists registered reports conforming to the standard contract."""
    response = client.get("/api/reports/catalog")
    assert response.status_code == 200
    body = response.json()
    assert body["status_code"] == 200
    assert body["error"] is None
    assert "reports" in body["data"]
    reports = body["data"]["reports"]
    assert len(reports) >= 5

    # Check structure of report metadata
    rep = reports[0]
    assert "id" in rep
    assert "title" in rep
    assert "category" in rep
    assert "parameters" in rep


def test_reports_generation_workflow(client):
    """Verifies dynamic report generation with parameters."""
    payload = {
        "report_id": "daily_cashier_summary",
        "parameters": {
            "start_date": "2026-10-01",
            "end_date": "2026-10-25"
        }
    }
    response = client.post("/api/reports/generate", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status_code"] == 200
    assert body["error"] is None
    report_data = body["data"]["report"]
    assert "columns" in report_data
    assert "rows" in report_data
    assert "summary" in report_data


def test_reports_export_workflow(client):
    """Verifies report export endpoint returns dynamic tabular CSV stream."""
    response = client.get("/api/reports/export?report_id=daily_cashier_summary&format=csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers.get("content-disposition", "")
    assert b"payment_method,transaction_count,total_amount_paise" in response.content


def test_prescriptions_suggestions_workflow(client):
    """Verifies clinical dosage and frequency suggestions."""
    r_dosage = client.get("/api/prescriptions/dosage-suggestions")
    assert r_dosage.status_code == 200
    b_dosage = r_dosage.json()
    assert b_dosage["status_code"] == 200
    assert "suggestions" in b_dosage["data"]

    r_freq = client.get("/api/prescriptions/frequency-suggestions")
    assert r_freq.status_code == 200
    b_freq = r_freq.json()
    assert b_freq["status_code"] == 200
    assert "suggestions" in b_freq["data"]


def test_branch_dashboard_workflow(client):
    """Verifies branch dashboard KPI aggregation endpoint."""
    response = client.get("/api/branch/dashboard")
    assert response.status_code == 200
    body = response.json()
    assert body["status_code"] == 200
    assert body["error"] is None
    assert "stats" in body["data"]
    stats = body["data"]["stats"]
    assert "total_patients" in stats
    assert "visits_count" in stats


def test_branch_charge_presets_workflow(client):
    """Verifies standardized procedure charge presets."""
    response = client.get("/api/branch/charge-presets")
    assert response.status_code == 200
    body = response.json()
    assert body["status_code"] == 200
    assert "presets" in body["data"]


def test_pharmacy_inventory_valuation_workflow(client):
    """Verifies pharmacy inventory valuation endpoint."""
    response = client.get("/api/pharmacy/inventory-valuation")
    assert response.status_code == 200
    body = response.json()
    assert body["status_code"] == 200
    assert "valuation" in body["data"]
    assert "total_cost_paise" in body["data"]["valuation"]


def test_billing_day_report_workflow(client):
    """Verifies daily cashier billing reconciliation report."""
    response = client.get("/api/billing/day-report")
    assert response.status_code == 200
    body = response.json()
    assert body["status_code"] == 200
    assert "day_report" in body["data"]
    assert "total_collected_paise" in body["data"]["day_report"]
