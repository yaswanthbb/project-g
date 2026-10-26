"""Create private first-setup secrets locally without printing their values."""

import os
import secrets
from pathlib import Path


def main():
    path = Path(__file__).parent / ".env"
    contents = "\n".join(
        [
            "DATABASE_URL=sqlite:///./gigs.db",
            f"INITIAL_PASSWORD={secrets.token_urlsafe(18)}",
            f"MUSE_API_TOKEN={secrets.token_urlsafe(32)}",
            f"REMINDER_API_TOKEN={secrets.token_urlsafe(32)}",
            "FRONTEND_ORIGINS=http://localhost:5173",
            "FIREBASE_SERVICE_ACCOUNT_PATH=",
            "APP_TIMEZONE=Asia/Kolkata",
            "",
        ]
    )
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        raise SystemExit("backend/.env already exists; it was left unchanged") from None
    with os.fdopen(fd, "w") as file:
        file.write(contents)
    print(
        "Created private backend/.env. Read INITIAL_PASSWORD there, then change it in Settings after login. No gigs were seeded."
    )


if __name__ == "__main__":
    main()
