"""Alembic environment.

- Online mode (tests/local SQLite): applies migrations to the URL.
- Offline --sql mode: renders Postgres SQL for the Supabase SQL Editor
  without opening any connection. The URL only selects the dialect.
"""

import os
import sys

from alembic import context

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import Base, make_engine  # noqa: E402
import app.models  # noqa: E402,F401  (register all 22 tables)

config = context.config

# Never require real credentials here. For --sql the URL only picks the
# dialect; offline mode never connects.
from app.core.config import get_settings  # noqa: E402
DATABASE_URL = get_settings().DATABASE_URL
# Alembic uses ConfigParser interpolation; percent-encoded credentials such
# as `%40` must be escaped before being placed into sqlalchemy.url.
config.set_main_option("sqlalchemy.url", DATABASE_URL.replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Use the application's engine factory so a fresh SQLite URL gets its
    # parent directory before Alembic attempts to open the database file.
    connectable = make_engine(DATABASE_URL)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        with context.begin_transaction():
            context.run_migrations()
    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
