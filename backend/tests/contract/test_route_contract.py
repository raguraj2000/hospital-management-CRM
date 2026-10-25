"""Automated API Contract & URL Route Rule Tests."""

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from src.app_factory import create_app

WORKSPACE_DIR = Path(__file__).resolve().parent.parent.parent.parent


@pytest.fixture(scope="module")
def app():
    return create_app()


@pytest.fixture(scope="module")
def client(app):
    return TestClient(app)


def test_no_path_variables_in_api_routes(app):
    """
    Contract Rule A:
    Every business API must use `/api/{module_name}/{api_name}`.
    Exactly two path segments after `/api/`.
    No path variables such as {id}, {branch_id}, {param}.
    """
    violations = []
    business_routes = []
    openapi_paths = app.openapi()["paths"]

    for path in openapi_paths.keys():
        if not path.startswith("/api/"):
            continue

        business_routes.append(path)
        # Check for path parameter indicators: {param}
        if "{" in path or "}" in path or ":" in path:
            violations.append(f"Prohibited path variable found in route: {path}")

        # Check path segments count after /api/
        # e.g., /api/auth/login -> parts: ['api', module_name, api_name] -> length must be exactly 3
        parts = [p for p in path.split("/") if p]
        if len(parts) != 3 or parts[0] != "api":
            violations.append(f"Route does not have exactly 2 segments after /api/: {path} (segments: {parts})")

    assert not violations, "\n".join(violations)
    assert len(business_routes) >= 70, f"Expected at least 70 unique route patterns, found {len(business_routes)}"


def test_all_173_inventory_operations_accounted_for(app):
    """
    Verifies that all 173 operations from the inventory mapping JSON
    are accounted for and registered in the FastAPI application.
    """
    mapping_file = WORKSPACE_DIR / "docs" / "backend_migration" / "api_inventory_mapping.json"
    assert mapping_file.exists(), f"Mapping file not found at {mapping_file}!"

    with open(mapping_file, "r", encoding="utf-8") as f:
        inventory = json.load(f)

    assert len(inventory) == 173, f"Expected 173 inventory items, found {len(inventory)}"

    openapi_paths = app.openapi()["paths"]
    registered_endpoints = set()
    for path, methods_dict in openapi_paths.items():
        if path.startswith("/api/"):
            for m in methods_dict.keys():
                registered_endpoints.add((m.upper(), path))

    missing = []
    for item in inventory:
        endpoint = item["new_endpoint"]
        method = item["new_method"].upper()
        if (method, endpoint) not in registered_endpoints:
            missing.append(f"[{item['original_id']}] {method} {endpoint} (Legacy: {item['original_path']})")

    assert not missing, f"Missing {len(missing)} routes from FastAPI registry:\n" + "\n".join(missing)


def test_standard_response_envelope_on_unauthenticated_request(client):
    """
    Contract Rule C:
    Every API response must follow:
    {
      "status_code": 401,
      "message": "...",
      "data": null,
      "error": { "code": "...", "details": ... }
    }
    """
    response = client.get("/api/patients/list")
    data = response.json()

    assert response.status_code == 401
    assert data["status_code"] == 401
    assert "message" in data
    assert data["data"] is None
    assert data["error"] is not None
    assert "code" in data["error"]


def test_standard_response_envelope_on_validation_error(client):
    """
    FastAPI validation errors must be normalized into the standard 4-field envelope:
    {
      "status_code": 422,
      "message": "Request validation failed",
      "data": null,
      "error": { "code": "VALIDATION_ERROR", "details": [...] }
    }
    """
    # POST /api/auth/login without required password field
    response = client.post("/api/auth/login", json={})
    data = response.json()

    assert response.status_code == 422
    assert data["status_code"] == 422
    assert data["message"] == "Request validation failed"
    assert data["data"] is None
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert isinstance(data["error"]["details"], list)


def test_standard_response_envelope_on_not_found(client):
    """
    404 errors must return the standard 4-field envelope.
    """
    response = client.get("/api/unknown/endpoint")
    data = response.json()

    assert response.status_code == 404
    assert data["status_code"] == 404
    assert data["data"] is None
    assert data["error"]["code"] == "HTTP_404"


def test_liveness_endpoint(client):
    """
    Verifies that the observability health endpoint returns HTTP 200.
    """
    response = client.get("/health/liveness")
    assert response.status_code == 200
