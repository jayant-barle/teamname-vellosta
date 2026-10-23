"""
Integration tests for SignBridge FastAPI endpoints using starlette TestClient.
"""

import pytest
from starlette.testclient import TestClient
from signbridge.api.app import app

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"
    assert data["model_1hand_loaded"] is True
    assert data["model_2hand_loaded"] is True
    assert data["classes_1hand_count"] > 0
    assert data["classes_2hand_count"] > 0

def test_vocabulary_endpoint(client):
    response = client.get("/v1/vocabulary")
    assert response.status_code == 200
    data = response.json()
    assert "one_hand" in data
    assert "two_hands" in data
    assert len(data["one_hand"]) == 12
    assert len(data["two_hands"]) == 24
    assert data["total_classes"] == 36

def test_phrases_endpoint(client):
    response = client.get("/v1/phrases")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 8
    phrase_ids = [p["id"] for p in data]
    assert "hello" in phrase_ids
    assert "thank_you" in phrase_ids
    assert "help" in phrase_ids

def test_predict_one_hand_features(client):
    payload = {"features": [0.0] * 42}
    response = client.post("/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("recognized", "uncertain")
    assert data["model_type"] == "1-hand"
    assert data["hand_count"] == 1
    assert data["feature_count"] == 42
    assert data["label"] is not None
    assert "latency_ms" in data
    assert data["latency_ms"] >= 0.0

def test_predict_two_hands_features(client):
    payload = {"features": [0.0] * 84}
    response = client.post("/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("recognized", "uncertain")
    assert data["model_type"] == "2-hands"
    assert data["hand_count"] == 2
    assert data["feature_count"] == 84
    assert data["label"] is not None

def test_predict_invalid_feature_length(client):
    payload = {"features": [0.0] * 33}
    response = client.post("/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert "Invalid feature vector length: 33" in data["message"]

def test_predict_empty_payload(client):
    response = client.post("/v1/predict", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "no_detection"
    assert "No features or landmarks provided" in data["message"]

def test_predict_with_raw_landmarks(client):
    single_hand = [{"x": 0.05 * i, "y": 0.02 * i, "z": 0.0} for i in range(21)]
    payload = {"landmarks": [single_hand]}
    response = client.post("/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("recognized", "uncertain")
    assert data["hand_count"] == 1
    assert data["feature_count"] == 42

def test_predict_malformed_input(client):
    # Invalid confidence threshold (< 0.0)
    response = client.post("/v1/predict", json={"confidence_threshold": -0.5})
    assert response.status_code == 422
