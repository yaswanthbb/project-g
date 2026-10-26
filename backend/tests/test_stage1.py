from sqlalchemy import select

from app.db import get_db
from app.main import app
from app.models import PushEvent, User


def test_password_login_and_private_api(client):
    assert client.get("/api/gigs").status_code == 401
    assert (
        client.post("/api/auth/login", json={"password": "wrong-password"}).json()["detail"]
        == "Wrong password, try again"
    )
    result = client.post("/api/auth/login", json={"password": "local-test-password"})
    assert result.status_code == 200
    assert (
        client.get(
            "/api/gigs", headers={"Authorization": "Bearer " + result.json()["token"]}
        ).status_code
        == 200
    )
    with next(app.dependency_overrides[get_db]()) as db:
        assert db.get(User, "escnaor").password_hash.startswith("$2")


def test_muse_is_separate_and_queues_push(client, auth, sample):
    for headers in [{}, auth, {"X-Muse-Token": "wrong"}]:
        assert client.post("/api/gigs", json=sample, headers=headers).status_code == 401
    result = client.post(
        "/api/gigs", json=sample, headers={"X-Muse-Token": "local-test-muse-token"}
    )
    assert result.status_code == 201
    assert result.json()["status"] == "New"
    assert len(result.json()["steps"]) == 2
    with next(app.dependency_overrides[get_db]()) as db:
        assert len(db.scalars(select(PushEvent)).all()) == 1


def test_session_persists_until_logout_and_password_change(client, auth):
    other = client.post("/api/auth/login", json={"password": "local-test-password"}).json()["token"]
    result = client.post(
        "/api/auth/change-password",
        headers=auth,
        json={"current_password": "local-test-password", "password": "replacement-password"},
    )
    assert result.status_code == 200
    assert client.get("/api/gigs", headers={"Authorization": f"Bearer {other}"}).status_code == 401
    assert client.get("/api/gigs", headers=auth).status_code == 200
    assert client.post("/api/auth/logout", headers=auth).status_code == 200
    assert client.get("/api/gigs", headers=auth).status_code == 401
    assert (
        client.post("/api/auth/login", json={"password": "replacement-password"}).status_code == 200
    )


def test_short_wrong_password_is_still_plain_401(client):
    result = client.post("/api/auth/login", json={"password": "bad"})
    assert result.status_code == 401
    assert result.json()["detail"] == "Wrong password, try again"


def test_migration_and_first_setup(tmp_path, monkeypatch):
    from alembic import command
    from alembic.config import Config
    from fastapi.testclient import TestClient
    from sqlalchemy.orm import sessionmaker

    from app import main, push
    from app.db import make_engine

    engine = make_engine(f"sqlite:///{tmp_path}/migrated.db")
    cfg = Config("alembic.ini")
    cfg.attributes["connection"] = engine.connect()
    command.upgrade(cfg, "head")
    monkeypatch.setattr(main, "SessionLocal", sessionmaker(engine))
    monkeypatch.setattr(push, "SessionLocal", sessionmaker(engine))
    with TestClient(main.app) as c:
        assert c.get("/api/health").status_code == 200
    with sessionmaker(engine)() as db:
        original = db.get(User, "escnaor").password_hash
        main.seed_user(db)
        assert db.get(User, "escnaor").password_hash == original
    command.downgrade(cfg, "base")
    cfg.attributes["connection"].close()
    engine.dispose()
