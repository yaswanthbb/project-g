import calendar
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy import inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .db import get_db
from .gigs import get_gig, today_date
from .models import Gig, MaintenancePayment, MaintenanceRetainer, PortfolioItem
from .schemas import (
    MaintenancePaymentCreate,
    PortfolioCreate,
    PortfolioPatch,
    RetainerCreate,
    RetainerPatch,
)
from .security import require_session

router = APIRouter(prefix="/api", dependencies=[Depends(require_session)])


def record(item):
    return jsonable_encoder({c.key: getattr(item, c.key) for c in inspect(type(item)).columns})


def linked_gig(db, gig_id):
    if gig_id:
        get_gig(db, gig_id)


@router.get("/portfolio")
def portfolio(gig_id: str | None = None, db: Session = Depends(get_db)):
    stmt = select(PortfolioItem).order_by(PortfolioItem.created_at.desc())
    if gig_id:
        stmt = stmt.where(PortfolioItem.gig_id == gig_id)
    return [record(p) for p in db.scalars(stmt)]


@router.post("/portfolio", status_code=201)
def add_portfolio(body: PortfolioCreate, db: Session = Depends(get_db)):
    linked_gig(db, body.gig_id)
    item = PortfolioItem(**body.model_dump(mode="json"))
    db.add(item)
    db.commit()
    return record(item)


@router.patch("/portfolio/{item_id}")
def edit_portfolio(item_id: str, body: PortfolioPatch, db: Session = Depends(get_db)):
    item = db.get(PortfolioItem, item_id)
    if not item:
        raise HTTPException(404, "Portfolio item not found")
    fields = body.model_dump(exclude_unset=True, mode="json")
    if any(v is None and k != "gig_id" for k, v in fields.items()):
        raise HTTPException(422, "Title, niche, link and label cannot be empty")
    linked_gig(db, fields.get("gig_id"))
    for key, value in fields.items():
        setattr(item, key, value)
    db.commit()
    return record(item)


@router.get("/retainers")
def retainers(db: Session = Depends(get_db)):
    return [
        record(r)
        for r in db.scalars(
            select(MaintenanceRetainer).order_by(
                MaintenanceRetainer.active.desc(), MaintenanceRetainer.next_due_date
            )
        )
    ]


@router.post("/retainers", status_code=201)
def add_retainer(body: RetainerCreate, db: Session = Depends(get_db)):
    linked_gig(db, body.gig_id)
    item = MaintenanceRetainer(**body.model_dump())
    db.add(item)
    db.commit()
    return record(item)


@router.patch("/retainers/{retainer_id}")
def edit_retainer(retainer_id: str, body: RetainerPatch, db: Session = Depends(get_db)):
    item = db.get(MaintenanceRetainer, retainer_id)
    if not item:
        raise HTTPException(404, "Retainer not found")
    fields = body.model_dump(exclude_unset=True)
    if any(v is None and k != "gig_id" for k, v in fields.items()):
        raise HTTPException(422, "Enter a business name, amount and next due date")
    linked_gig(db, fields.get("gig_id"))
    for key, value in fields.items():
        setattr(item, key, value)
    db.commit()
    return record(item)


def next_month(value):
    year, month = (value.year + 1, 1) if value.month == 12 else (value.year, value.month + 1)
    return date(year, month, min(value.day, calendar.monthrange(year, month)[1]))


@router.post("/retainers/{retainer_id}/payments", status_code=201)
def record_maintenance(
    retainer_id: str, body: MaintenancePaymentCreate, db: Session = Depends(get_db)
):
    retainer = db.scalar(
        select(MaintenanceRetainer).where(MaintenanceRetainer.id == retainer_id).with_for_update()
    )
    if not retainer:
        raise HTTPException(404, "Retainer not found")
    existing = db.get(MaintenancePayment, body.id)
    if existing:
        if (
            existing.retainer_id != retainer_id
            or existing.amount != body.amount
            or existing.paid_at != body.paid_at
        ):
            raise HTTPException(
                409, "This payment reference already has different details — refresh to check"
            )
        return record(existing)
    if body.paid_at > today_date():
        raise HTTPException(422, "A paid date cannot be in the future")
    payment = MaintenancePayment(retainer_id=retainer_id, **body.model_dump())
    db.add(payment)
    retainer.next_due_date = next_month(retainer.next_due_date)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Payment may already be recorded — refresh to check") from None
    return record(payment)


@router.get("/retainers/{retainer_id}/payments")
def maintenance_payments(retainer_id: str, db: Session = Depends(get_db)):
    return [
        record(p)
        for p in db.scalars(
            select(MaintenancePayment)
            .where(MaintenancePayment.retainer_id == retainer_id)
            .order_by(MaintenancePayment.paid_at.desc())
        )
    ]


@router.get("/earnings")
def earnings(
    month: str | None = Query(default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$"),
    db: Session = Depends(get_db),
):
    month = month or today_date().strftime("%Y-%m")
    try:
        start = date.fromisoformat(month + "-01")
        end = next_month(start)
    except ValueError:
        raise HTTPException(422, "Choose a valid month") from None
    gigs = db.scalars(select(Gig)).all()
    advances = balances = pending = Decimal(0)
    breakdown = []
    outstanding = []
    for gig in gigs:
        for kind, amount, paid_at in [
            ("advance", gig.advance_amount, gig.advance_paid_at),
            ("balance", gig.balance_amount, gig.balance_paid_at),
        ]:
            if paid_at and start <= paid_at < end:
                value = amount or Decimal(0)
                if kind == "advance":
                    advances += value
                else:
                    balances += value
                breakdown.append(
                    {
                        "id": f"{gig.id}:{kind}",
                        "business_name": gig.business_name,
                        "kind": kind,
                        "amount": value,
                        "paid_at": paid_at,
                    }
                )
        if gig.status != "Lost" and gig.quoted_price:
            received = (gig.advance_amount or Decimal(0)) * bool(gig.advance_paid_at) + (
                gig.balance_amount or Decimal(0)
            ) * bool(gig.balance_paid_at)
            amount = max(Decimal(0), gig.quoted_price - received)
            if amount:
                pending += amount
                outstanding.append(
                    {"id": gig.id, "business_name": gig.business_name, "amount": amount}
                )
    maintenance = Decimal(0)
    for p in db.scalars(
        select(MaintenancePayment).where(
            MaintenancePayment.paid_at >= start, MaintenancePayment.paid_at < end
        )
    ):
        maintenance += p.amount
        r = db.get(MaintenanceRetainer, p.retainer_id)
        breakdown.append(
            {
                "id": p.id,
                "business_name": r.business_name,
                "kind": "maintenance",
                "amount": p.amount,
                "paid_at": p.paid_at,
            }
        )
    due = db.scalars(
        select(MaintenanceRetainer).where(
            MaintenanceRetainer.active.is_(True), MaintenanceRetainer.next_due_date <= today_date()
        )
    ).all()
    maintenance_due = sum((r.monthly_amount for r in due), Decimal(0))
    total = advances + balances + maintenance
    return jsonable_encoder(
        {
            "month": month,
            "advances": advances,
            "balances": balances,
            "maintenance": maintenance,
            "received": total,
            "pending_websites": pending,
            "maintenance_due": maintenance_due,
            "pending": pending + maintenance_due,
            "goal_min": 10000,
            "goal_max": 15000,
            "remaining_to_goal": max(Decimal(0), Decimal(10000) - total),
            "payments": sorted(breakdown, key=lambda x: (x["paid_at"], x["id"]), reverse=True),
            "outstanding_gigs": outstanding,
        }
    )
