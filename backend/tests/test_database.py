"""Database bootstrapping and integrity regression tests."""

import sqlite3

import pytest
from sqlalchemy import inspect


def test_fresh_sqlite_schema_has_all_enum_checks(db_session):
    checks = [
        check
        for table_name in inspect(db_session.bind).get_table_names()
        for check in inspect(db_session.bind).get_check_constraints(table_name)
    ]
    # Base domain enums plus the four SuperAdmin governance enums.
    assert len(checks) == 21


def test_fresh_sqlite_schema_rejects_invalid_enum(db_session):
    connection = db_session.connection().connection.driver_connection
    with pytest.raises(sqlite3.IntegrityError, match="CHECK constraint failed"):
        connection.execute(
            'INSERT INTO "user" '
            '(full_name, email, phone, password_hash, role, is_verified, status) '
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("Bad Role", "bad-role@example.com", "+920000000099", "hash", "owner", 0, "active"),
        )
