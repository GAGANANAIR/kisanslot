import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app.main import app

with TestClient(app) as client:
    res = client.get("/api/v1/centres")
    print("Centres GET status:", res.status_code)
    print("Centres count:", len(res.json()))

    login_res = client.post("/api/v1/auth/login", json={
        "phone": "9876543210",
        "password": "Farmer@123"
    })
    print("Login status:", login_res.status_code)
    print("User name:", login_res.json().get("name"))
