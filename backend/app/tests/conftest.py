import os
import tempfile
from pathlib import Path

_tmp_db_dir = tempfile.mkdtemp(prefix="psyinsight-test-db-")
os.environ["DATABASE_PATH"] = str(Path(_tmp_db_dir) / "test.db")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import reset_database  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    reset_database()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def signed_up_client(client):
    client.post(
        "/api/auth/signup",
        json={
            "name": "Ana Souza",
            "email": "ana@example.com",
            "crp": "06/12345",
            "password": "senha-forte-123",
        },
    )
    return client
