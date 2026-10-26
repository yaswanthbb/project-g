from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def uid():
    return str(uuid4())


def now():
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="escnaor")
    password_hash: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuthSession(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Gig(Base):
    __tablename__ = "gigs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    business_name: Mapped[str] = mapped_column(String(200))
    business_type: Mapped[str] = mapped_column(String(200), default="")
    city_area: Mapped[str] = mapped_column(String(200), default="")
    contact_name: Mapped[str | None] = mapped_column(String(200))
    contact_whatsapp: Mapped[str | None] = mapped_column(String(32))
    contact_email: Mapped[str | None] = mapped_column(String(320))
    source: Mapped[str] = mapped_column(String(500), default="")
    problem_noticed: Mapped[str] = mapped_column(Text)
    why_it_fits: Mapped[str] = mapped_column(Text)
    demo_link: Mapped[str | None] = mapped_column(Text)
    price_min: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    price_max: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    outreach_whatsapp: Mapped[str] = mapped_column(Text, default="")
    outreach_email: Mapped[str | None] = mapped_column(Text)
    call_script: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="New", index=True)
    skipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    followup_1_due: Mapped[date | None]
    followup_2_due: Mapped[date | None]
    followup_1_done_at: Mapped[date | None]
    followup_2_done_at: Mapped[date | None]
    quoted_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    advance_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    advance_paid_at: Mapped[date | None]
    balance_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    balance_paid_at: Mapped[date | None]
    notes: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[str] = mapped_column(String(30), default="muse")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    steps: Mapped[list["GigStep"]] = relationship(
        cascade="all, delete-orphan", order_by="GigStep.position", lazy="selectin"
    )


class GigStep(Base):
    __tablename__ = "gig_steps"
    __table_args__ = (UniqueConstraint("gig_id", "position"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    gig_id: Mapped[str] = mapped_column(ForeignKey("gigs.id", ondelete="CASCADE"), index=True)
    position: Mapped[int]
    title: Mapped[str] = mapped_column(String(500))
    detail: Mapped[str | None] = mapped_column(Text)
    done: Mapped[bool] = mapped_column(default=False)
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PushEvent(Base):
    __tablename__ = "push_events"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    gig_id: Mapped[str] = mapped_column(ForeignKey("gigs.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    payload: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PortfolioItem(Base):
    __tablename__ = "portfolio_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    title: Mapped[str] = mapped_column(String(200))
    niche: Mapped[str] = mapped_column(String(200), default="")
    link: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(20))
    gig_id: Mapped[str | None] = mapped_column(ForeignKey("gigs.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class MaintenanceRetainer(Base):
    __tablename__ = "retainers"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    business_name: Mapped[str] = mapped_column(String(200))
    gig_id: Mapped[str | None] = mapped_column(ForeignKey("gigs.id", ondelete="SET NULL"))
    monthly_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    next_due_date: Mapped[date]
    active: Mapped[bool] = mapped_column(default=True)


class MaintenancePayment(Base):
    __tablename__ = "maintenance_payments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    retainer_id: Mapped[str] = mapped_column(ForeignKey("retainers.id"), index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    paid_at: Mapped[date] = mapped_column(index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class PushDevice(Base):
    __tablename__ = "push_devices"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    token: Mapped[str] = mapped_column(Text, unique=True)
    session_hash: Mapped[str] = mapped_column(
        ForeignKey("sessions.token_hash", ondelete="CASCADE"), index=True
    )
    active: Mapped[bool] = mapped_column(default=True)


class PushDelivery(Base):
    __tablename__ = "push_deliveries"
    event_id: Mapped[str] = mapped_column(
        ForeignKey("push_events.id", ondelete="CASCADE"), primary_key=True
    )
    device_id: Mapped[str] = mapped_column(
        ForeignKey("push_devices.id", ondelete="CASCADE"), primary_key=True
    )
    attempts: Mapped[int] = mapped_column(default=0)
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
