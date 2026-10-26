import hashlib
import secrets

import bcrypt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import AuthSession, User

bearer = HTTPBearer(auto_error=False)


def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password, hashed):
    if len(password.encode()) > 72:
        return False
    return bcrypt.checkpw(password.encode(), hashed.encode())


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def require_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    session = db.get(AuthSession, token_hash(credentials.credentials)) if credentials else None
    if not session:
        raise HTTPException(401, "Please log in to continue")
    return session


def issue_session(db, user: User):
    token = secrets.token_urlsafe(48)
    db.add(AuthSession(token_hash=token_hash(token), user_id=user.id))
    db.commit()
    return {"token": token, "token_type": "bearer"}
