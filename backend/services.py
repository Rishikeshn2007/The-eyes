import os
import sys
import sqlite3
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path

from backend.config import PROJECT_ROOT, MODULES_DIR, DB_PATH

# Ensure modules directory is importable without modifying modules code
if str(MODULES_DIR) not in sys.path:
    sys.path.insert(0, str(MODULES_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Import search classes from modules
from face_search import Face_search
from semantic_search import Semantic_search
from hybrid_search import Hybrid_search


class SearchService(Hybrid_search):
    """
    Unified service inheriting Hybrid_search (which composes Face_search and Semantic_search).
    Reuses the pretrained Jina CLIP model across semantic and hybrid search requests.
    """

    def __init__(self, db_path: str = DB_PATH):
        super().__init__(db_path=db_path)
        self.db_path = db_path

    def run_face_search(self, image_path: str, threshold: float = 0.4) -> Dict[str, Any]:
        """Executes facial similarity search via Face_search."""
        return self.search_face(face_image_path=image_path, db_path=self.db_path, threshold=threshold)

    def run_semantic_search(self, search_string: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """Executes semantic text-to-image search via Semantic_search."""
        return self.semantic_search(search_string=search_string, top_k=top_k)

    def run_hybrid_search(
        self,
        reference_image: str,
        text: str,
        threshold: float = 0.4,
        top_k: int = 5,
    ) -> Any:
        """
        Executes hybrid search combining facial identity filtering with semantic query ranking,
        supporting configurable similarity threshold and top_k.
        """
        face_result = self.search_face(face_image_path=reference_image, db_path=self.db_path, threshold=threshold)
        if not face_result.get("found"):
            return face_result

        paths = {p["photo_path"] for p in face_result.get("photos", [])}
        all_results = self.semantic_search(search_string=text, top_k=100000)
        results = [(p, s) for p, s in all_results if p in paths]
        return results[:top_k]


# Singleton instance container
_service_instance: Optional[SearchService] = None


def get_search_service(db_path: str = DB_PATH) -> SearchService:
    """Returns or lazily creates the singleton SearchService instance."""
    global _service_instance
    if _service_instance is None:
        _service_instance = SearchService(db_path=db_path)
    return _service_instance


def check_database_health(db_path: str = DB_PATH) -> Tuple[bool, Optional[str], Dict[str, int]]:
    """
    Validates database connectivity and table row counts.
    Returns (is_connected, error_message, counts_dict).
    """
    if not os.path.exists(db_path):
        return False, f"Database file does not exist at {db_path}", {}

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cur.fetchall()}

        counts = {}
        for tbl in ["photos", "faces", "semantic"]:
            if tbl in tables:
                cur.execute(f"SELECT COUNT(*) FROM {tbl}")
                counts[tbl] = cur.fetchone()[0]
            else:
                counts[tbl] = 0

        conn.close()
        return True, None, counts
    except Exception as e:
        return False, str(e), {}
