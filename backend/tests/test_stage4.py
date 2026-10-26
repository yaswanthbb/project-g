from datetime import date
from uuid import uuid4

from test_stage2 import create

from app import finance
from app.db import get_db
from app.gigs import today_date
from app.main import app
from app.models import Gig


def test_month_totals_no_double_counting(client, auth, sample, monkeypatch):
    monkeypatch.setattr(finance, "today_date", lambda: date(2026, 11, 20))
    url = "/api/gigs/" + create(client, sample)["id"]
    client.patch(url, headers=auth, json={"status": "Approved"})
    client.patch(url, headers=auth, json={"status": "Won", "quoted_price": "12000.50"})
    # Use the model to place receipts in two months, independent of today's date.
    with next(app.dependency_overrides[get_db]()) as db:
        g = db.get(Gig, url.split("/")[-1])
        g.advance_paid_at = date(2026, 10, 1)
        g.balance_paid_at = date(2026, 11, 5)
        db.commit()
    retainer = client.post(
        "/api/retainers",
        headers=auth,
        json={
            "business_name": "TEST ONLY retainer",
            "monthly_amount": "1500.25",
            "next_due_date": "2026-10-31",
        },
    ).json()
    payment = {"id": str(uuid4()), "amount": "1500.25", "paid_at": "2026-10-20"}
    pay_url = f"/api/retainers/{retainer['id']}/payments"
    assert client.post(pay_url, headers=auth, json=payment).status_code == 201
    assert client.post(pay_url, headers=auth, json=payment).status_code == 201
    assert len(client.get(pay_url, headers=auth).json()) == 1
    retainer_now = client.get("/api/retainers", headers=auth).json()[0]
    assert retainer_now["next_due_date"] == "2026-11-30"
    oct_result = client.get("/api/earnings?month=2026-10", headers=auth).json()
    assert float(oct_result["advances"]) == 6000.25
    assert float(oct_result["balances"]) == 0
    assert float(oct_result["maintenance"]) == 1500.25
    assert float(oct_result["received"]) == 7500.5
    nov_result = client.get("/api/earnings?month=2026-11", headers=auth).json()
    assert float(nov_result["received"]) == 6000.25
    assert float(nov_result["pending_websites"]) == 0
    assert client.get("/api/earnings?month=2026-13", headers=auth).status_code == 422
    assert client.post(pay_url, headers=auth, json={**payment, "amount": 10}).status_code == 409


def test_portfolio_honest_labels_links_and_edits(client, auth, sample):
    gig = create(client, sample)
    data = {
        "title": "TEST ONLY demo",
        "niche": "salon",
        "link": "https://example.com",
        "kind": "demo",
        "gig_id": gig["id"],
    }
    item = client.post("/api/portfolio", headers=auth, json=data)
    assert item.status_code == 201
    assert item.json()["kind"] == "demo"
    assert len(client.get("/api/portfolio?gig_id=" + gig["id"], headers=auth).json()) == 1
    url = "/api/portfolio/" + item.json()["id"]
    assert (
        client.patch(url, headers=auth, json={"kind": "real_client"}).json()["kind"]
        == "real_client"
    )
    assert (
        client.post("/api/portfolio", headers=auth, json={**data, "kind": "client"}).status_code
        == 422
    )
    assert (
        client.post(
            "/api/portfolio", headers=auth, json={**data, "link": "javascript:alert(1)"}
        ).status_code
        == 422
    )
    assert client.patch(url, headers=auth, json={"title": None}).status_code == 422
    assert client.get("/api/earnings").status_code == 401
    assert client.get("/api/portfolio").status_code == 401
    assert client.get("/api/retainers").status_code == 401


def test_retainer_validation_and_due_amount(client, auth):
    data = {
        "business_name": "TEST ONLY retainer",
        "monthly_amount": 1000,
        "next_due_date": today_date().isoformat(),
    }
    item = client.post("/api/retainers", headers=auth, json=data).json()
    assert float(client.get("/api/earnings", headers=auth).json()["maintenance_due"]) == 1000
    assert (
        client.patch(
            "/api/retainers/" + item["id"], headers=auth, json={"active": False}
        ).status_code
        == 200
    )
    assert float(client.get("/api/earnings", headers=auth).json()["maintenance_due"]) == 0
    assert (
        client.post("/api/retainers", headers=auth, json={**data, "monthly_amount": 0}).status_code
        == 422
    )
