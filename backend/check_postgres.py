"""Run migrations and the API suite against a throwaway local PostgreSQL cluster."""

import os
import subprocess
import sys
import tempfile
from pathlib import Path


def main():
    pg_bin = Path(os.environ.get("PG_BIN", "/usr/lib/postgresql/18/bin"))
    if not (pg_bin / "initdb").is_file():
        raise SystemExit("Install PostgreSQL locally or set PG_BIN to its bin directory")
    with tempfile.TemporaryDirectory(prefix="gigs-postgres-test-") as temp:
        root = Path(temp)
        data = root / "data"
        port = "55433"
        subprocess.run(
            [
                str(pg_bin / "initdb"),
                "-D",
                str(data),
                "--auth=trust",
                "--username=gigs_test",
                "--no-locale",
                "--encoding=UTF8",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        subprocess.run(
            [
                str(pg_bin / "pg_ctl"),
                "-D",
                str(data),
                "-l",
                str(root / "server.log"),
                "-o",
                f"-F -h 127.0.0.1 -p {port} -k {root}",
                "start",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        try:
            subprocess.run(
                [
                    str(pg_bin / "createdb"),
                    "-h",
                    "127.0.0.1",
                    "-p",
                    port,
                    "-U",
                    "gigs_test",
                    "gigs_test",
                ],
                check=True,
            )
            url = f"postgresql+psycopg://gigs_test@127.0.0.1:{port}/gigs_test"
            env = {**os.environ, "DATABASE_URL": url, "TEST_DATABASE_URL": url}
            alembic = str(Path(sys.executable).parent / "alembic")
            for args in [
                ["upgrade", "head"],
                ["check"],
                ["downgrade", "base"],
                ["upgrade", "head"],
                ["downgrade", "base"],
            ]:
                subprocess.run([alembic, *args], env=env, check=True)
            subprocess.run([sys.executable, "-m", "pytest", "-q"], env=env, check=True)
        finally:
            subprocess.run(
                [str(pg_bin / "pg_ctl"), "-D", str(data), "stop", "-m", "fast"],
                check=True,
                stdout=subprocess.DEVNULL,
            )


if __name__ == "__main__":
    main()
