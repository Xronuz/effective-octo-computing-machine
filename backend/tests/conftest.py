"""
XAVFSIZ XONADON — Test konfiguratsiyasi va shared fixtures.
"""
import os
import sys
import pytest

# Ensure app is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment variables BEFORE any app imports
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test_db")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-testing-purposes-only-minimum-64-characters!!!")
os.environ.setdefault("BCRYPT_COST", "4")  # fast hashing for tests
os.environ.setdefault("UPLOAD_DIR", "tests/test_uploads")
os.environ.setdefault("MAX_FOTO_SIZE_MB", "5")


@pytest.fixture(autouse=True)
def reset_module_cache():
    """Reset module cache between tests to avoid state leakage."""
    to_remove = [k for k in list(sys.modules.keys()) if k.startswith("app.")]
    for k in to_remove:
        del sys.modules[k]
    yield
    to_remove = [k for k in list(sys.modules.keys()) if k.startswith("app.")]
    for k in to_remove:
        del sys.modules[k]
