"""Regression: the mutation_audits migration must be idempotent on a fresh
create_all DB (which already has the table) and must create it on a legacy
DB migrated before the table existed (alembic_version at a1d2e3f4b5c6)."""
import os

import pytest
from sqlalchemy import create_engine, inspect

from app.database import Base
import app.models  # noqa: F401 - populate Base.metadata

PREV = "a1d2e3f4b5c6"  # revision before d4e5f6a7b8c9


def _alembic_cfg(db_url):
    from alembic.config import Config
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    cfg = Config(os.path.join(backend_dir, "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", db_url)
    cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
    return cfg


def test_mutation_audits_migration_idempotent():
    from alembic import command

    db_url = os.environ["DATABASE_URL"]
    engine = create_engine(db_url)
    cfg = _alembic_cfg(db_url)

    # 1. Fresh create_all DB already has mutation_audits -> migration early-returns
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    assert inspect(engine).has_table("mutation_audits")
    command.upgrade(cfg, "head")
    assert inspect(engine).has_table("mutation_audits")  # still there, no crash

    # 2. Legacy DB: migrated to PREV before MutationAudit existed -> migration creates it
    Base.metadata.drop_all(engine)
    mutation_table = Base.metadata.tables["mutation_audits"]
    Base.metadata.create_all(engine, tables=[t for t in Base.metadata.sorted_tables if t is not mutation_table])
    assert not inspect(engine).has_table("mutation_audits")
    command.stamp(cfg, PREV)  # simulate a DB at the previous head
    command.upgrade(cfg, "head")
    assert inspect(engine).has_table("mutation_audits")
    engine.dispose()
