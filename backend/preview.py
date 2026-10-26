"""Disposable local UI verification. Never points at production; deletes its DB on exit."""

import os
import tempfile
from pathlib import Path


def main():
    with tempfile.TemporaryDirectory(prefix="gigs-preview-") as directory:
        os.environ["DATABASE_URL"] = f"sqlite:///{Path(directory) / 'preview.db'}"
        os.environ["INITIAL_PASSWORD"] = "preview-only-password"
        os.environ["MUSE_API_TOKEN"] = "preview-only-muse-token"
        import uvicorn
        from alembic import command
        from alembic.config import Config
        from fastapi.testclient import TestClient

        from app.main import app

        command.upgrade(Config("alembic.ini"), "head")
        with TestClient(app) as client:
            response = client.post(
                "/api/gigs",
                headers={"X-Muse-Token": "preview-only-muse-token"},
                json={
                    "business_name": "TEST ONLY — Lotus Studio",
                    "business_type": "Salon & wellness",
                    "city_area": "Kothrud, Pune",
                    "contact_name": "Test contact",
                    "contact_whatsapp": "+910000000000",
                    "contact_email": "test@example.invalid",
                    "source": "Test fixture — not a real lead",
                    "problem_noticed": "Services are listed only on social media. A customer has to call to find prices or book an appointment.",
                    "why_it_fits": "A simple local business site with services, a photo gallery and a WhatsApp booking link is a good fit for your skills.",
                    "price_min": 8000,
                    "price_max": 12000,
                    "demo_link": "https://example.com",
                    "outreach_whatsapp": "Hello! I have an idea for a simple salon website that makes services and bookings easier to find. May I show you a demo?",
                    "outreach_email": "Hello, I would love to show you a simple website concept for your salon. Would a short call this week work?",
                    "steps": [
                        {"position": 1, "title": "Approve this gig and read the problem + demo"},
                        {
                            "position": 2,
                            "title": "Send the WhatsApp message yourself",
                            "detail": "Copy the message, review it, paste it in WhatsApp and tap send yourself. Then mark the gig Sent.",
                        },
                        {"position": 3, "title": "Wait for a reply; follow up on Day 3"},
                        {"position": 4, "title": "Book a call and ask scope first"},
                        {"position": 5, "title": "Send the exact written quote after the call"},
                        {"position": 6, "title": "Collect the 50% advance before building"},
                        {"position": 7, "title": "Build, deliver and collect the balance"},
                    ],
                },
            )
            assert response.status_code == 201
        uvicorn.run(app, host="127.0.0.1", port=8000)


if __name__ == "__main__":
    main()
