from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator

Money = Annotated[Decimal, Field(ge=0, le=9999999999, decimal_places=2)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Login(Input):
    password: str = Field(max_length=1000)
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)


class Password(Login):
    @field_validator("password")
    @classmethod
    def valid_password(cls, value):
        if not 8 <= len(value) or len(value.encode()) > 72:
            raise ValueError("Use at least 8 characters and at most 72 bytes for the password")
        return value


class ChangePassword(Password):
    current_password: str


class StepCreate(Input):
    position: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=500)
    detail: str | None = Field(default=None, max_length=10000)


class GigFields(Input):
    business_name: str = Field(min_length=1, max_length=200)
    business_type: str = Field(default="", max_length=200)
    city_area: str = Field(default="", max_length=200)
    contact_name: str | None = Field(default=None, max_length=200)
    contact_whatsapp: str | None = Field(default=None, pattern=r"^\+?[0-9 ()-]{7,25}$")
    contact_email: str | None = Field(default=None, max_length=320)
    source: str = Field(default="", max_length=500)
    problem_noticed: str = Field(min_length=1, max_length=10000)
    why_it_fits: str = Field(min_length=1, max_length=10000)
    demo_link: HttpUrl | None = None
    price_min: Money | None = None
    price_max: Money | None = None
    outreach_whatsapp: str = Field(default="", max_length=15000)
    outreach_email: str | None = Field(default=None, max_length=15000)
    call_script: str | None = Field(default=None, max_length=15000)

    @model_validator(mode="after")
    def price_order(self):
        if (
            self.price_min is not None
            and self.price_max is not None
            and self.price_min > self.price_max
        ):
            raise ValueError("Minimum price must not exceed maximum price")
        return self


class GigCreate(GigFields):
    steps: list[StepCreate] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def ordered_steps(self):
        if len({s.position for s in self.steps}) != len(self.steps):
            raise ValueError("Give each checklist step a different position")
        return self


Status = Literal[
    "New", "Approved", "Sent", "Replied", "Call booked", "Won", "Paid advance", "Delivered", "Lost"
]


class GigPatch(Input):
    business_name: str | None = Field(default=None, min_length=1, max_length=200)
    business_type: str | None = None
    city_area: str | None = None
    contact_name: str | None = None
    contact_whatsapp: str | None = None
    contact_email: str | None = None
    source: str | None = None
    problem_noticed: str | None = Field(default=None, min_length=1)
    why_it_fits: str | None = Field(default=None, min_length=1)
    demo_link: HttpUrl | None = None
    price_min: Money | None = None
    price_max: Money | None = None
    outreach_whatsapp: str | None = None
    outreach_email: str | None = None
    call_script: str | None = None
    status: Status | None = None
    skipped: bool | None = None
    quoted_price: Money | None = None
    advance_amount: Money | None = None
    advance_paid_at: date | None = None
    balance_paid_at: date | None = None
    notes: str | None = Field(default=None, max_length=30000)
    notes_original: str | None = Field(default=None, max_length=30000)


class StepPatch(Input):
    done: bool


class FollowupAction(Input):
    action: Literal["sent", "replied", "lost"]


class PortfolioCreate(Input):
    title: str = Field(min_length=1, max_length=200)
    niche: str = Field(default="", max_length=200)
    link: HttpUrl
    kind: Literal["real_client", "demo"]
    gig_id: str | None = None


class PortfolioPatch(Input):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    niche: str | None = Field(default=None, max_length=200)
    link: HttpUrl | None = None
    kind: Literal["real_client", "demo"] | None = None
    gig_id: str | None = None


class RetainerCreate(Input):
    business_name: str = Field(min_length=1, max_length=200)
    gig_id: str | None = None
    monthly_amount: Money = Field(gt=0)
    next_due_date: date
    active: bool = True


class RetainerPatch(Input):
    business_name: str | None = Field(default=None, min_length=1, max_length=200)
    gig_id: str | None = None
    monthly_amount: Money | None = Field(default=None, gt=0)
    next_due_date: date | None = None
    active: bool | None = None


class MaintenancePaymentCreate(Input):
    id: str = Field(pattern=r"^[0-9a-fA-F-]{36}$")
    amount: Money = Field(gt=0)
    paid_at: date


class DeviceRegistration(Input):
    token: str = Field(min_length=20, max_length=4096)
