from datetime import UTC, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import Gig, GigStep, now
from .schemas import FollowupAction, GigFields, GigPatch, Status, StepPatch
from .security import require_session

router = APIRouter(prefix="/api", dependencies=[Depends(require_session)])
STATUSES = [
    "New",
    "Approved",
    "Sent",
    "Replied",
    "Call booked",
    "Won",
    "Paid advance",
    "Delivered",
    "Lost",
]
CALL_SCRIPT = "Ask scope first: What should the website do for the business? How many pages? Are logo, photos and text ready? What is the timeline? Give a price range on the call, then send an exact written quote once the scope is known. Do not mention build speed, prompts, or previous client prices. Confirm 50% advance before building."


def today_date():
    return now().astimezone(ZoneInfo(settings().app_timezone)).date()


def get_gig(db, gig_id):
    gig = db.get(Gig, gig_id)
    if not gig:
        raise HTTPException(404, "Gig not found")
    return gig


def serialize(gig):
    data = {col.key: getattr(gig, col.key) for col in inspect(Gig).columns}
    data["steps"] = [
        {col.key: getattr(s, col.key) for col in inspect(GigStep).columns} for s in gig.steps
    ]
    data["call_script"] = gig.call_script or CALL_SCRIPT
    data["completed_steps"] = sum(s.done for s in gig.steps)
    data["total_steps"] = len(gig.steps)
    data["outreach_allowed"] = bool(
        gig.approved_at and not gig.skipped_at and gig.status not in ("New", "Lost")
    )
    data["total_received"] = (gig.advance_amount or Decimal(0)) * bool(gig.advance_paid_at) + (
        gig.balance_amount or Decimal(0)
    ) * bool(gig.balance_paid_at)
    return jsonable_encoder(
        data,
        custom_encoder={
            datetime: lambda dt: dt.replace(tzinfo=dt.tzinfo or UTC).astimezone(UTC).isoformat()
        },
    )


def pending_followups(gig, on_date):
    if gig.status != "Sent" or gig.skipped_at:
        return []
    return [
        {
            "gig_id": gig.id,
            "business_name": gig.business_name,
            "number": n,
            "due_date": due.isoformat(),
        }
        for n in (1, 2)
        if (due := getattr(gig, f"followup_{n}_due"))
        and due <= on_date
        and not getattr(gig, f"followup_{n}_done_at")
    ]


@router.get("/gigs")
def list_gigs(
    status: Status | None = None,
    q: str = Query(default="", max_length=200),
    db: Session = Depends(get_db),
):
    stmt = select(Gig).order_by(Gig.created_at.desc(), Gig.id)
    if status:
        stmt = stmt.where(Gig.status == status)
    if q.strip():
        stmt = stmt.where(Gig.business_name.icontains(q.strip(), autoescape=True))
    return [serialize(g) for g in db.scalars(stmt)]


@router.get("/gigs/{gig_id}")
def detail(gig_id: str, db: Session = Depends(get_db)):
    return serialize(get_gig(db, gig_id))


def apply_patch(gig, patch):
    fields = patch.model_dump(exclude_unset=True)
    original_notes = fields.pop("notes_original", None)
    if "notes" in fields and original_notes is not None and gig.notes != original_notes:
        raise HTTPException(
            409, "Notes changed on another device — refresh to review them before saving"
        )
    status = fields.pop("status", gig.status)
    skipped = fields.pop("skipped", None)
    if status is None or ("notes" in fields and fields["notes"] is None):
        raise HTTPException(422, "Status and notes cannot be empty")
    merged = {key: fields.get(key, getattr(gig, key)) for key in GigFields.model_fields}
    try:
        valid = GigFields.model_validate(merged)
    except ValidationError:
        raise HTTPException(
            422, "Please check the business details, contact and price range"
        ) from None
    for key in fields.keys() & GigFields.model_fields.keys():
        value = getattr(valid, key)
        fields[key] = str(value) if key == "demo_link" and value else value
    if status == "Approved" and not merged["outreach_whatsapp"].strip():
        raise HTTPException(422, "Add a WhatsApp outreach message before approving")
    if status not in ("New", "Approved", "Lost") and not gig.approved_at:
        raise HTTPException(422, "Approve this gig before starting outreach")
    if status == "Won":
        if (
            "quoted_price" not in fields
            or fields["quoted_price"] is None
            or fields["quoted_price"] <= 0
        ):
            raise HTTPException(422, "Enter the quoted price and confirm the advance to mark Won")
        if "advance_amount" not in fields:
            fields["advance_amount"] = (fields["quoted_price"] / 2).quantize(Decimal("0.01"))
    quote = fields.get("quoted_price", gig.quoted_price)
    advance = fields.get("advance_amount", gig.advance_amount)
    advance_date = fields.get("advance_paid_at", gig.advance_paid_at)
    balance_date = fields.get("balance_paid_at", gig.balance_paid_at)
    if status == "Won" and (advance is None or advance <= 0):
        raise HTTPException(422, "Enter a positive advance amount before marking Won")
    if advance is not None and (quote is None or advance > quote):
        raise HTTPException(422, "Advance must not exceed the quoted price")
    if status == "Paid advance" or advance_date:
        if not quote or not advance or not advance_date:
            raise HTTPException(422, "Enter the advance amount and paid date")
    if balance_date and (not quote or advance is None or quote - advance <= 0):
        raise HTTPException(422, "Enter a quote and a pending balance before recording payment")
    if (advance_date and advance_date > today_date()) or (
        balance_date and balance_date > today_date()
    ):
        raise HTTPException(422, "A paid date cannot be in the future")
    if skipped is True and status != "New":
        raise HTTPException(422, "Only a new gig can be skipped")
    for key, value in fields.items():
        setattr(gig, key, value)
    gig.balance_amount = quote - (advance or Decimal(0)) if quote is not None else None
    gig.status = status
    if skipped is not None:
        gig.skipped_at = now() if skipped else None
    if status == "Approved":
        gig.approved_at = gig.approved_at or now()
        gig.skipped_at = None
    if status == "New":
        gig.approved_at = None
    if status == "Sent":
        gig.sent_at = gig.sent_at or now()
        sent_date = (
            gig.sent_at.replace(tzinfo=gig.sent_at.tzinfo or ZoneInfo("UTC"))
            .astimezone(ZoneInfo(settings().app_timezone))
            .date()
        )
        gig.followup_1_due = sent_date + timedelta(days=3)
        gig.followup_2_due = sent_date + timedelta(days=7)
    if status == "Lost":
        gig.followup_1_due = gig.followup_2_due = None
    gig.updated_at = now()


@router.patch("/gigs/{gig_id}")
def update(gig_id: str, body: GigPatch, db: Session = Depends(get_db)):
    gig = get_gig(db, gig_id)
    apply_patch(gig, body)
    db.commit()
    return serialize(gig)


@router.patch("/gigs/{gig_id}/steps/{step_id}")
def step(gig_id: str, step_id: str, body: StepPatch, db: Session = Depends(get_db)):
    gig = get_gig(db, gig_id)
    item = next((s for s in gig.steps if s.id == step_id), None)
    if not item:
        raise HTTPException(404, "Checklist step not found")
    item.done = body.done
    item.done_at = now() if body.done else None
    gig.updated_at = now()
    db.commit()
    return serialize(gig)


@router.patch("/gigs/{gig_id}/followups/{number}")
def followup(gig_id: str, number: int, body: FollowupAction, db: Session = Depends(get_db)):
    gig = get_gig(db, gig_id)
    if number not in (1, 2):
        raise HTTPException(404, "Follow-up not found")
    if not any(f["number"] == number for f in pending_followups(gig, today_date())):
        raise HTTPException(409, "This follow-up is no longer due — refresh Today")
    if body.action == "sent":
        setattr(gig, f"followup_{number}_done_at", today_date())
    else:
        apply_patch(gig, GigPatch(status="Replied" if body.action == "replied" else "Lost"))
    db.commit()
    return serialize(gig)


@router.get("/today")
def today(db: Session = Depends(get_db)):
    gigs = db.scalars(select(Gig).order_by(Gig.created_at, Gig.id)).all()
    due = sorted(
        [f for g in gigs for f in pending_followups(g, today_date())],
        key=lambda f: (f["due_date"], f["gig_id"], f["number"]),
    )
    waiting = [g for g in gigs if g.status == "New" and not g.skipped_at]
    active = [
        g
        for g in gigs
        if g.status not in ("New", "Lost", "Delivered")
        and not g.skipped_at
        and any(not s.done for s in g.steps)
    ]
    urgent = [next(g for g in gigs if g.id == f["gig_id"]) for f in due]
    current = (
        urgent or sorted(active, key=lambda g: -STATUSES.index(g.status)) or waiting or [None]
    )[0]
    next_step = next((s for s in current.steps if not s.done), None) if current else None
    return {
        "date": today_date().isoformat(),
        "current_gig": serialize(current) if current else None,
        "next_step": {
            "id": next_step.id,
            "title": next_step.title,
            "detail": next_step.detail,
            "position": next_step.position,
        }
        if next_step
        else None,
        "followups": due,
        "new_gigs": [serialize(g) for g in waiting],
    }
