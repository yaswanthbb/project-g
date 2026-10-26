import asyncio
import logging
import secrets
from contextlib import asynccontextmanager, suppress

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import delete
from sqlalchemy.orm import Session

from .config import settings
from .db import SessionLocal, get_db
from .finance import router as finance_router
from .gigs import router as gigs_router
from .models import AuthSession, Gig, GigStep, PushEvent, User
from .push import dispatch_once, push_loop
from .push import router as push_router
from .schemas import ChangePassword, GigCreate, Login
from .security import hash_password, issue_session, require_session, verify_password

logger = logging.getLogger(__name__)


def seed_user(db):
    if db.get(User, "escnaor") is None:
        password = settings().initial_password
        if len(password) < 8 or len(password.encode()) > 72:
            raise RuntimeError(
                "Set INITIAL_PASSWORD to at least 8 characters (at most 72 bytes) before first startup"
            )
        db.add(User(id="escnaor", password_hash=hash_password(password)))
        db.commit()


@asynccontextmanager
async def lifespan(app):
    with SessionLocal() as db:
        seed_user(db)
    task = asyncio.create_task(push_loop())
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="Freelance Gigs", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().frontend_origins.split(","),
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Muse-Token"],
)


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    errors = [
        {
            "field": ".".join(str(p) for p in e["loc"][1:]),
            "message": e["msg"].removeprefix("Value error, "),
        }
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"detail": "Please check the highlighted details", "errors": errors},
    )


@app.exception_handler(Exception)
async def server_error(request: Request, exc):
    logger.error("Request failed: %s", type(exc).__name__)
    return JSONResponse(
        status_code=500, content={"detail": "Something went wrong — please try again"}
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/login")
def login(body: Login, db: Session = Depends(get_db)):
    user = db.get(User, "escnaor")
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Wrong password, try again")
    return issue_session(db, user)


@app.post("/api/auth/logout")
def logout(session=Depends(require_session), db: Session = Depends(get_db)):
    db.delete(session)
    db.commit()
    return {"ok": True}


@app.post("/api/auth/change-password")
def change_password(
    body: ChangePassword, session=Depends(require_session), db: Session = Depends(get_db)
):
    user = db.get(User, session.user_id)
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(401, "Wrong password, try again")
    user.password_hash = hash_password(body.password)
    db.execute(delete(AuthSession).where(AuthSession.token_hash != session.token_hash))
    db.commit()
    return {"ok": True}


@app.post("/api/gigs", status_code=201)
def ingest(
    body: GigCreate,
    background_tasks: BackgroundTasks,
    x_muse_token: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    secret = settings().muse_api_token
    if not secret or not x_muse_token or not secrets.compare_digest(secret, x_muse_token):
        raise HTTPException(401, "A valid Muse token is required")
    data = body.model_dump(exclude={"steps"})
    if data.get("demo_link"):
        data["demo_link"] = str(data["demo_link"])
    gig = Gig(**data, steps=[GigStep(**s.model_dump()) for s in body.steps])
    db.add(gig)
    db.flush()
    db.add(
        PushEvent(
            id=f"new:{gig.id}",
            gig_id=gig.id,
            kind="new",
            payload={"title": f"New gig: {gig.business_name}", "body": gig.problem_noticed[:120]},
        )
    )
    db.commit()
    if settings().firebase_service_account_path:
        background_tasks.add_task(dispatch_once)
    return {
        "id": gig.id,
        "business_name": gig.business_name,
        "status": gig.status,
        "steps": [
            {"id": s.id, "position": s.position, "title": s.title, "done": s.done}
            for s in gig.steps
        ],
    }


app.include_router(gigs_router)
app.include_router(finance_router)

app.include_router(push_router)
