from test_stage2 import create

from app.db import get_db
from app.gigs import today_date
from app.main import app
from app.models import Gig


def test_shared_sessions_and_note_conflict(client, auth, sample):
    second = {
        "Authorization": "Bearer "
        + client.post("/api/auth/login", json={"password": "local-test-password"}).json()["token"]
    }
    url = "/api/gigs/" + create(client, sample)["id"]
    assert (
        client.patch(
            url, headers=auth, json={"notes": "Saved on phone", "notes_original": ""}
        ).status_code
        == 200
    )
    assert client.get(url, headers=second).json()["notes"] == "Saved on phone"
    conflict = client.patch(
        url, headers=second, json={"notes": "Stale laptop draft", "notes_original": ""}
    )
    assert conflict.status_code == 409
    assert client.get(url, headers=auth).json()["notes"] == "Saved on phone"
    client.patch(url, headers=second, json={"status": "Approved"})
    assert client.get(url, headers=auth).json()["status"] == "Approved"
    step = client.get(url, headers=auth).json()["steps"][0]
    client.patch(url + "/steps/" + step["id"], headers=second, json={"done": True})
    assert client.get(url, headers=auth).json()["completed_steps"] == 1


def test_due_followup_stays_current_when_all_steps_are_checked(client, auth, sample):
    gig = create(client, sample)
    url = "/api/gigs/" + gig["id"]
    client.patch(url, headers=auth, json={"status": "Approved"})
    client.patch(url, headers=auth, json={"status": "Sent"})
    with next(app.dependency_overrides[get_db]()) as db:
        model = db.get(Gig, gig["id"])
        model.followup_1_due = today_date()
        for step in model.steps:
            step.done = True
        db.commit()
    today = client.get("/api/today", headers=auth).json()
    assert today["current_gig"]["id"] == gig["id"]
    assert today["next_step"] is None
    assert len(today["followups"]) == 1
