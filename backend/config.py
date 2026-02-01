"""Configuration settings for the backend."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
PHOTOS_DIR = DATA_DIR / "photos"
DB_PATH = DATA_DIR / "database.db"

# Face matching defaults
DEFAULT_THRESHOLD = 0.5
DEFAULT_LIMIT = 50

# Server settings
HOST = "0.0.0.0"
PORT = 8000

# Temp face TTL (seconds)
TEMP_FACE_TTL = 1800  # 30 minutes

# Max upload size (bytes)
MAX_UPLOAD_SIZE = 15 * 1024 * 1024  # 15MB

# Microsoft OAuth Config (load from environment)
MS_CLIENT_ID = os.getenv("MS_CLIENT_ID", "")
MS_TENANT_ID = os.getenv("MS_TENANT_ID", "")
MS_CLIENT_SECRET = os.getenv("MS_CLIENT_SECRET", "")
ALLOWED_DOMAIN = os.getenv("ALLOWED_DOMAIN", "finos.asia")

# Auth is enabled only if all MS credentials are set
AUTH_ENABLED = bool(MS_CLIENT_ID and MS_TENANT_ID and MS_CLIENT_SECRET)
