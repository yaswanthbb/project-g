import os

os.environ["INITIAL_PASSWORD"] = "local-test-password"
os.environ["MUSE_API_TOKEN"] = "local-test-muse-token"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db, make_engine
from app.main import app, seed_user


@pytest.fixture
def client(tmp_path):
    engine = make_engine(os.environ.get("TEST_DATABASE_URL", f"sqlite:///{tmp_path}/test.db"))
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine, expire_on_commit=False)
    with sessions() as db:
        seed_user(db)

    def override():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = override
    # Seeded above; no production database or background worker is started.
    c = TestClient(app, raise_server_exceptions=False)
    yield c
    c.close()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def auth(client):
    return {
        "Authorization": "Bearer "
        + client.post("/api/auth/login", json={"password": "local-test-password"}).json()["token"]
    }


@pytest.fixture
def sample():
    return {
        "business_name": "TEST ONLY — Lotus Studio",
        "business_type": "salon",
        "city_area": "Pune",
        "problem_noticed": "No website with service prices",
        "why_it_fits": "A simple five-page local business site",
        "outreach_whatsapp": "Hi, may I show you a website idea for your salon?",
        "price_min": 8000,
        "price_max": 15000,
        "steps": [
            {"position": 1, "title": "Read the problem and approve this gig"},
            {"position": 2, "title": "Copy and send the WhatsApp message yourself"},
        ],
    }
