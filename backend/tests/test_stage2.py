from datetime import timedelta

from app.gigs import today_date


def create(client, sample):
    return client.post(
        "/api/gigs", headers={"X-Muse-Token": "local-test-muse-token"}, json=sample
    ).json()


def test_pipeline_steps_skip_and_search(client, auth, sample):
    gig = create(client, sample)
    url = "/api/gigs/" + gig["id"]
    assert client.patch(url, headers=auth, json={"status": "Sent"}).status_code == 422
    assert not client.get(url, headers=auth).json()["outreach_allowed"]
    assert client.patch(url, headers=auth, json={"skipped": True}).status_code == 200
    assert client.get("/api/today", headers=auth).json()["new_gigs"] == []
    assert len(client.get("/api/gigs?q=Lotus&status=New", headers=auth).json()) == 1
    assert client.get("/api/gigs?q=absent", headers=auth).json() == []
    assert client.patch(url, headers=auth, json={"status": "Approved"}).json()["outreach_allowed"]
    assert client.get(url, headers=auth).json()["status"] == "Approved"
    for status in ["Sent", "Replied", "Sent", "Call booked"]:
        assert client.patch(url, headers=auth, json={"status": status}).status_code == 200
    step = gig["steps"][0]
    result = client.patch(url + "/steps/" + step["id"], headers=auth, json={"done": True}).json()
    assert result["completed_steps"] == 1
    assert result["steps"][0]["done_at"]
    assert client.get("/api/today", headers=auth).json()["next_step"]["position"] == 2
    assert (
        client.patch(url, headers=auth, json={"notes": "Agreed to call tomorrow"}).json()["notes"]
        == "Agreed to call tomorrow"
    )
    assert client.patch(url, headers=auth, json={"price_min": 20000}).status_code == 422
    assert client.patch(url, headers=auth, json={"business_name": None}).status_code == 422
    assert (
        client.patch(url + "/steps/not-a-step", headers=auth, json={"done": True}).status_code
        == 404
    )


def test_sent_clock_backwards_and_lost(client, auth, sample):
    gig = create(client, sample)
    url = "/api/gigs/" + gig["id"]
    client.patch(url, headers=auth, json={"status": "Approved"})
    sent = client.patch(url, headers=auth, json={"status": "Sent"}).json()
    assert sent["followup_1_due"] == (today_date() + timedelta(days=3)).isoformat()
    assert sent["followup_2_due"] == (today_date() + timedelta(days=7)).isoformat()
    client.patch(url, headers=auth, json={"status": "Replied"})
    back = client.patch(url, headers=auth, json={"status": "Sent"}).json()
    assert back["sent_at"] == sent["sent_at"]
    assert client.patch(url, headers=auth, json={"status": "Lost"}).json()["followup_1_due"] is None
    assert client.get("/api/today", headers=auth).json()["current_gig"] is None


def test_won_and_advance_are_enforced(client, auth, sample):
    url = "/api/gigs/" + create(client, sample)["id"]
    client.patch(url, headers=auth, json={"status": "Approved"})
    assert client.patch(url, headers=auth, json={"status": "Won"}).status_code == 422
    won = client.patch(url, headers=auth, json={"status": "Won", "quoted_price": 12000}).json()
    assert float(won["advance_amount"]) == 6000
    assert float(won["balance_amount"]) == 6000
    assert client.patch(url, headers=auth, json={"status": "Paid advance"}).status_code == 422
    assert client.patch(url, headers=auth, json={"advance_amount": 13000}).status_code == 422
    paid = client.patch(
        url,
        headers=auth,
        json={
            "status": "Paid advance",
            "advance_amount": 6000,
            "advance_paid_at": today_date().isoformat(),
        },
    )
    assert paid.status_code == 200
    assert float(paid.json()["total_received"]) == 6000
    assert client.patch(url, headers=auth, json={"status": "Delivered"}).status_code == 200


def test_new_has_required_data_and_no_filler(client, auth, sample):
    empty = client.get("/api/today", headers=auth).json()
    assert empty["current_gig"] is None and empty["followups"] == [] and empty["new_gigs"] == []
    sample["steps"] = []
    assert (
        client.post(
            "/api/gigs", headers={"X-Muse-Token": "local-test-muse-token"}, json=sample
        ).status_code
        == 422
    )
    sample["steps"] = [{"position": 1, "title": "Read"}]
    sample["outreach_whatsapp"] = ""
    url = "/api/gigs/" + create(client, sample)["id"]
    assert client.patch(url, headers=auth, json={"status": "Approved"}).status_code == 422
