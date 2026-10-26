import asyncio
import logging
import secrets
import threading
from datetime import UTC, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal, get_db
from .gigs import pending_followups, today_date
from .models import Gig, PushDelivery, PushDevice, PushEvent, now
from .schemas import DeviceRegistration
from .security import require_session

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
_dispatch_lock = threading.Lock()


class UnregisteredDevice(Exception):
    pass


class FirebaseSender:
    def __init__(self):
        import firebase_admin
        from firebase_admin import credentials

        try:
            self.app = firebase_admin.get_app("gigs")
        except ValueError:
            self.app = firebase_admin.initialize_app(
                credentials.Certificate(settings().firebase_service_account_path), name="gigs"
            )

    def __call__(self, token, event):
        from firebase_admin import messaging

        try:
            messaging.send(
                messaging.Message(
                    token=token,
                    notification=messaging.Notification(
                        title=event.payload["title"], body=event.payload["body"]
                    ),
                    data={"gig_id": event.gig_id, "event_id": event.id},
                    android=messaging.AndroidConfig(
                        priority="high",
                        collapse_key=event.id,
                        ttl=timedelta(days=1),
                        notification=messaging.AndroidNotification(channel_id="gigs", tag=event.id),
                    ),
                ),
                app=self.app,
            )
        except messaging.UnregisteredError as exc:
            raise UnregisteredDevice from exc


def enqueue_due(db, on_date):
    for gig in db.scalars(select(Gig).where(Gig.status == "Sent")):
        for item in pending_followups(gig, on_date):
            key = f"followup:{gig.id}:{item['number']}"
            if db.get(PushEvent, key) is None:
                db.add(
                    PushEvent(
                        id=key,
                        gig_id=gig.id,
                        kind=f"followup_{item['number']}",
                        payload={
                            "title": f"Follow-up due: {gig.business_name}",
                            "body": f"Day {3 if item['number'] == 1 else 7} follow-up. Review the message and send it yourself.",
                        },
                    )
                )
    db.flush()


def eligible(event, gig, on_date):
    if event.kind == "new":
        return gig.status == "New" and not gig.skipped_at
    return any(f"followup_{f['number']}" == event.kind for f in pending_followups(gig, on_date))


def dispatch(db, sender=None, on_date=None):
    on_date = on_date or today_date()
    stats = {
        "sent": 0,
        "failed": 0,
        "pending": 0,
        "configured": bool(sender or settings().firebase_service_account_path),
    }
    if not _dispatch_lock.acquire(blocking=False):
        return {**stats, "busy": True}
    try:
        if db.bind.dialect.name == "postgresql" and not db.scalar(
            text("SELECT pg_try_advisory_xact_lock(5173001)")
        ):
            return {**stats, "busy": True}
        enqueue_due(db, on_date)
        if not stats["configured"]:
            db.commit()
            return stats
        sender = sender or FirebaseSender()
        devices = db.scalars(select(PushDevice).where(PushDevice.active.is_(True))).all()
        for event in db.scalars(
            select(PushEvent).where(PushEvent.delivered_at.is_(None)).order_by(PushEvent.created_at)
        ):
            gig = db.get(Gig, event.gig_id)
            if not gig or not eligible(event, gig, on_date):
                continue
            complete = bool(devices)
            for device in devices:
                if not device.active:
                    continue
                delivery = db.get(PushDelivery, (event.id, device.id))
                if delivery is None:
                    delivery = PushDelivery(event_id=event.id, device_id=device.id, attempts=0)
                    db.add(delivery)
                if delivery.delivered_at:
                    continue
                if (
                    delivery.next_attempt_at
                    and delivery.next_attempt_at.replace(
                        tzinfo=delivery.next_attempt_at.tzinfo or UTC
                    )
                    > now()
                ):
                    complete = False
                    continue
                delivery.attempts += 1
                try:
                    sender(device.token, event)
                    delivery.delivered_at = now()
                    stats["sent"] += 1
                except UnregisteredDevice:
                    device.active = False
                except Exception:
                    delivery.next_attempt_at = now() + timedelta(
                        minutes=min(60, 2 ** min(delivery.attempts, 6))
                    )
                    stats["failed"] += 1
                    complete = False
                    logger.warning("Push delivery failed; queued for retry")
            if complete:
                event.delivered_at = now()
            else:
                stats["pending"] += 1
        db.commit()
        return stats
    finally:
        _dispatch_lock.release()


def dispatch_once():
    try:
        with SessionLocal() as db:
            return dispatch(db)
    except Exception:
        logger.warning("Could not process reminders; they remain queued")
        return {"failed": 1}


async def push_loop():
    while True:
        await asyncio.to_thread(dispatch_once)
        await asyncio.sleep(60)


@router.post("/push/devices")
def register_device(
    body: DeviceRegistration, session=Depends(require_session), db: Session = Depends(get_db)
):
    item = db.scalar(select(PushDevice).where(PushDevice.token == body.token))
    if item:
        item.session_hash = session.token_hash
        item.active = True
    else:
        item = PushDevice(token=body.token, session_hash=session.token_hash)
        db.add(item)
    db.commit()
    return {"id": item.id, "registered": True}


@router.delete("/push/devices/{device_id}")
def unregister_device(
    device_id: str, session=Depends(require_session), db: Session = Depends(get_db)
):
    db.execute(
        delete(PushDevice).where(
            PushDevice.id == device_id, PushDevice.session_hash == session.token_hash
        )
    )
    db.commit()
    return {"ok": True}


@router.post("/internal/reminders")
def run_reminders(
    x_reminder_token: str | None = Header(default=None), db: Session = Depends(get_db)
):
    secret = settings().reminder_api_token
    if not secret or not x_reminder_token or not secrets.compare_digest(secret, x_reminder_token):
        raise HTTPException(401, "A valid reminder token is required")
    result = dispatch(db)
    if not result["configured"]:
        raise HTTPException(503, "Firebase is not configured; reminders remain queued")
    if result["failed"]:
        raise HTTPException(502, "Some notifications could not be delivered; they remain queued")
    return result
