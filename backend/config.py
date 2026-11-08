import os
from pathlib import Path
from dotenv import load_dotenv

# Directory paths
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
MODULES_DIR = PROJECT_ROOT / "modules"

# Load .env file from backend directory if present
load_dotenv(BACKEND_DIR / ".env")

# Server settings
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Database path resolution
raw_db_path = os.getenv("DB_PATH", "../processed/faces.db")
db_path_candidate_backend = (BACKEND_DIR / raw_db_path).resolve()
db_path_candidate_root = (PROJECT_ROOT / raw_db_path).resolve()

if db_path_candidate_backend.exists():
    DB_PATH = str(db_path_candidate_backend)
elif db_path_candidate_root.exists():
    DB_PATH = str(db_path_candidate_root)
else:
    # Default fallback to project root / processed / faces.db
    fallback_path = (PROJECT_ROOT / "processed" / "faces.db").resolve()
    DB_PATH = str(fallback_path)

# Default search parameters
DEFAULT_THRESHOLD = float(os.getenv("DEFAULT_THRESHOLD", "0.4"))
DEFAULT_TOP_K = int(os.getenv("DEFAULT_TOP_K", "5"))

# Allowed image file extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
