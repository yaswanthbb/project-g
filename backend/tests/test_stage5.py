from datetime import timedelta

from sqlalchemy import select
from test_stage2 import create

from app import push
from app.db import get_db
from app.gigs import today_date
from app.main import app
from app.models import Gig, PushDelivery, PushDevice, PushEvent


def db_for_test():
    return next(app.dependency_overrides[get_db]())


def register(client, auth):
    assert (
        client.post(
            "/api/push/devices", headers=auth, json={"token": "test-fcm-device-token-not-real"}
        ).status_code
        == 200
    )


def test_two_followups_only_and_no_reset(client, auth, sample):
    register(client, auth)
    gig = create(client, sample)
    url = "/api/gigs/" + gig["id"]
    sent = []

    def sender(token, event):
        sent.append(event.id)

    with db_for_test() as db:
        assert push.dispatch(db, sender=sender)["sent"] == 1
    client.patch(url, headers=auth, json={"status": "Approved"})
    client.patch(url, headers=auth, json={"status": "Sent"})
    base = today_date()
    with db_for_test() as db:
        assert push.dispatch(db, sender=sender, on_date=base + timedelta(days=2))["sent"] == 0
        assert push.dispatch(db, sender=sender, on_date=base + timedelta(days=3))["sent"] == 1
        assert push.dispatch(db, sender=sender, on_date=base + timedelta(days=3))["sent"] == 0
        assert push.dispatch(db, sender=sender, on_date=base + timedelta(days=7))["sent"] == 1
        assert push.dispatch(db, sender=sender, on_date=base + timedelta(days=30))["sent"] == 0
        assert len(db.scalars(select(PushEvent)).all()) == 3
    assert len(sent) == 3


def test_due_actions_and_cancellation(client, auth, sample, monkeypatch):
    gig = create(client, sample)
    url = "/api/gigs/" + gig["id"]
    client.patch(url, headers=auth, json={"status": "Approved"})
    client.patch(url, headers=auth, json={"status": "Sent"})
    due = today_date() + timedelta(days=7)
    monkeypatch.setattr("app.gigs.today_date", lambda: due)
    data = client.get("/api/today", headers=auth).json()
    assert [x["number"] for x in data["followups"]] == [1, 2]
    assert (
        client.patch(url + "/followups/1", headers=auth, json={"action": "sent"}).status_code == 200
    )
    assert len(client.get("/api/today", headers=auth).json()["followups"]) == 1
    assert client.get(url, headers=auth).json()["followup_2_due"] == due.isoformat()
    for status in ["Replied", "Call booked", "Won", "Paid advance", "Delivered", "Lost"]:
        payload = {"status": status}
        if status == "Won":
            payload.update(quoted_price=10000)
        if status == "Paid advance":
            payload.update(advance_amount=5000, advance_paid_at=today_date().isoformat())
        assert client.patch(url, headers=auth, json=payload).status_code == 200
        assert client.get("/api/today", headers=auth).json()["followups"] == []
        with db_for_test() as db:
            push.enqueue_due(db, due)
            assert all(
                not push.eligible(e, db.get(Gig, gig["id"]), due)
                for e in db.scalars(select(PushEvent))
            )


def test_transient_failure_retries_and_logout_removes_device(client, auth, sample):
    register(client, auth)
    create(client, sample)

    def failure(token, event):
        raise RuntimeError("provider unavailable")

    with db_for_test() as db:
        stats = push.dispatch(db, sender=failure)
        assert stats["failed"] == 1 and stats["sent"] == 0
        delivery = db.scalar(select(PushDelivery))
        assert delivery.delivered_at is None
        delivery.next_attempt_at = None
        db.commit()
        assert push.dispatch(db, sender=lambda t, e: None)["sent"] == 1
        assert push.dispatch(db, sender=lambda t, e: None)["sent"] == 0
    client.post("/api/auth/logout", headers=auth)
    with db_for_test() as db:
        assert db.scalars(select(PushDevice)).all() == []


def test_reminder_endpoint_secret_and_missing_firebase(client, monkeypatch):
    monkeypatch.setattr(push.settings(), "reminder_api_token", "test-reminder-only")
    assert client.post("/api/internal/reminders").status_code == 401
    assert (
        client.post(
            "/api/internal/reminders", headers={"X-Reminder-Token": "test-reminder-only"}
        ).status_code
        == 503
    )
    assert (
        client.post("/api/push/devices", json={"token": "test-token-no-session"}).status_code == 401
    )
