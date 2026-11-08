import os
import sys
import sqlite3
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from insightface.app import FaceAnalysis
from sentence_transformers import SentenceTransformer

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
        self.face_app = None
        self.clip_model = None

    def _get_face_app(self):
        """Cached lazy loader for InsightFace FaceAnalysis."""
        if self.face_app is None:
            self.face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
            self.face_app.prepare(ctx_id=0, det_size=(640, 640))
        return self.face_app

    def _get_clip_model(self):
        """Cached lazy loader for SentenceTransformer clip-ViT-B-32."""
        if self.clip_model is None:
            self.clip_model = SentenceTransformer("clip-ViT-B-32")
        return self.clip_model

    def index_single_image(self, image_path: str) -> Dict[str, Any]:
        """
        Processes a single image file:
        - Extracts and saves faces with InsightFace embeddings.
        - Generates whole-image CLIP embedding.
        - Generates multimodal Jina CLIP v2 embedding.
        - Stores records and embeddings in SQLite (photos, faces, and semantic tables).
        """
        accepted_formats = {".jpg", ".jpeg", ".png", ".webp"}
        p = Path(image_path)
        if not p.is_file():
            return {"success": False, "filename": p.name, "error": f"File does not exist: {image_path}"}
        if p.suffix.lower() not in accepted_formats:
            return {"success": False, "filename": p.name, "error": f"Unsupported format: {p.suffix}"}

        img = cv2.imread(str(p))
        if img is None:
            return {"success": False, "filename": p.name, "error": "Failed to decode image"}

        base_filename = p.name
        filename_without_ext = p.stem

        # Prepare processed storage directories
        original_output_dir = PROJECT_ROOT / "processed" / "images"
        faces_output_dir = PROJECT_ROOT / "processed" / "faces"
        original_output_dir.mkdir(parents=True, exist_ok=True)
        faces_output_dir.mkdir(parents=True, exist_ok=True)

        dest_img_path = str(original_output_dir / base_filename)
        cv2.imwrite(dest_img_path, img)

        stored_photo_path = f"../processed/images/{base_filename}"

        # 1. Face detection & crop extraction
        face_app = self._get_face_app()
        faces = face_app.get(img)

        face_data = []
        if faces:
            for idx, face in enumerate(faces):
                bbox = face.bbox.astype(int)
                x1, y1 = max(0, bbox[0]), max(0, bbox[1])
                x2, y2 = min(img.shape[1], bbox[2]), min(img.shape[0], bbox[3])
                cropped_face = img[y1:y2, x1:x2]

                face_filename = f"{filename_without_ext}_face_{idx + 1}.png"
                face_file_path = str(faces_output_dir / face_filename)
                cv2.imwrite(face_file_path, cropped_face)

                stored_face_path = f"../processed/faces/{face_filename}"
                face_data.append((stored_face_path, face.normed_embedding))

        # 2. Photos table & Faces table storage
        clip = self._get_clip_model()
        pil_img = Image.open(dest_img_path).convert("RGB")
        photo_embedding = clip.encode(pil_img)

        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        cur.execute("""CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_path TEXT,
            embedding BLOB)""")

        cur.execute("""CREATE TABLE IF NOT EXISTS faces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_id INTEGER,
            face_path TEXT,
            embedding BLOB,
            FOREIGN KEY (photo_id) REFERENCES photos(id))""")

        # Upsert photo in photos table
        cur.execute("SELECT id FROM photos WHERE photo_path = ?", (stored_photo_path,))
        row = cur.fetchone()
        if row:
            photo_id = row[0]
            cur.execute("UPDATE photos SET embedding = ? WHERE id = ?",
                        (photo_embedding.astype(np.float32).tobytes(), photo_id))
            cur.execute("DELETE FROM faces WHERE photo_id = ?", (photo_id,))
        else:
            cur.execute("INSERT INTO photos (photo_path, embedding) VALUES (?, ?)",
                        (stored_photo_path, photo_embedding.astype(np.float32).tobytes()))
            photo_id = cur.lastrowid

        for face_path, emb in face_data:
            cur.execute("INSERT INTO faces (photo_id, face_path, embedding) VALUES (?, ?, ?)",
                        (photo_id, face_path, emb.astype(np.float32).tobytes()))

        # 3. Semantic table storage (Jina CLIP v2)
        cur.execute("""CREATE TABLE IF NOT EXISTS semantic (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_path TEXT,
            embedding BLOB)""")

        semantic_emb = self.img_to_embedding(dest_img_path)
        cur.execute("SELECT id FROM semantic WHERE photo_path = ?", (stored_photo_path,))
        sem_row = cur.fetchone()
        if sem_row:
            cur.execute("UPDATE semantic SET embedding = ? WHERE id = ?",
                        (semantic_emb.tobytes(), sem_row[0]))
        else:
            cur.execute("INSERT INTO semantic (photo_path, embedding) VALUES (?, ?)",
                        (stored_photo_path, semantic_emb.tobytes()))

        conn.commit()
        conn.close()

        return {
            "success": True,
            "filename": base_filename,
            "photo_path": stored_photo_path,
            "url": f"/images/{base_filename}",
            "faces_detected": len(faces) if faces else 0,
        }

    def batch_index_folder(self, folder_path: str) -> Dict[str, Any]:
        """
        Visits a local directory, scans for all image files, converts them to embeddings,
        and saves their paths and vectors to the database.
        """
        p = Path(folder_path)
        if not p.is_absolute():
            candidate = (PROJECT_ROOT / folder_path).resolve()
            if candidate.exists():
                p = candidate
            else:
                p = p.resolve()

        if not p.exists():
            return {
                "status": False,
                "error": f"Directory does not exist: {str(p)}",
                "folder_path": str(p),
                "total_found": 0,
                "total_processed": 0,
                "total_faces": 0,
                "processed": [],
            }

        if not p.is_dir():
            return {
                "status": False,
                "error": f"Path is not a directory: {str(p)}",
                "folder_path": str(p),
                "total_found": 0,
                "total_processed": 0,
                "total_faces": 0,
                "processed": [],
            }

        valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
        image_files = sorted([f for f in p.iterdir() if f.is_file() and f.suffix.lower() in valid_exts])

        if not image_files:
            return {
                "status": True,
                "message": "No supported images found in the specified folder.",
                "folder_path": str(p),
                "total_found": 0,
                "total_processed": 0,
                "total_faces": 0,
                "processed": [],
            }

        processed = []
        total_faces = 0
        success_count = 0

        for img_file in image_files:
            try:
                res = self.index_single_image(str(img_file))
                processed.append(res)
                if res.get("success"):
                    success_count += 1
                    total_faces += res.get("faces_detected", 0)
            except Exception as e:
                processed.append({
                    "success": False,
                    "filename": img_file.name,
                    "error": str(e),
                })

        return {
            "status": True,
            "folder_path": str(p),
            "total_found": len(image_files),
            "total_processed": success_count,
            "total_faces": total_faces,
            "processed": processed,
        }

    def batch_index_folder_stream(self, folder_path: str):
        """
        Visits a local directory, scans for all image files, converts them to embeddings,
        and yields live SSE/stream progress events.
        """
        p = Path(folder_path)
        if not p.is_absolute():
            candidate = (PROJECT_ROOT / folder_path).resolve()
            if candidate.exists():
                p = candidate
            else:
                p = p.resolve()

        if not p.exists():
            yield {
                "type": "error",
                "status": False,
                "error": f"Directory does not exist: {str(p)}",
                "folder_path": str(p),
            }
            return

        if not p.is_dir():
            yield {
                "type": "error",
                "status": False,
                "error": f"Path is not a directory: {str(p)}",
                "folder_path": str(p),
            }
            return

        valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
        image_files = sorted([f for f in p.iterdir() if f.is_file() and f.suffix.lower() in valid_exts])

        if not image_files:
            yield {
                "type": "complete",
                "status": True,
                "message": "No supported images found in the specified folder.",
                "folder_path": str(p),
                "total_found": 0,
                "total_processed": 0,
                "total_faces": 0,
                "processed": [],
            }
            return

        total_files = len(image_files)
        yield {
            "type": "init",
            "folder_path": str(p),
            "total_found": total_files,
        }

        processed = []
        total_faces = 0
        success_count = 0

        for idx, img_file in enumerate(image_files):
            try:
                res = self.index_single_image(str(img_file))
                processed.append(res)
                if res.get("success"):
                    success_count += 1
                    total_faces += res.get("faces_detected", 0)
                yield {
                    "type": "progress",
                    "current": idx + 1,
                    "total": total_files,
                    "filename": img_file.name,
                    "item": res,
                    "total_processed": success_count,
                    "total_faces": total_faces,
                }
            except Exception as e:
                err_res = {
                    "success": False,
                    "filename": img_file.name,
                    "error": str(e),
                }
                processed.append(err_res)
                yield {
                    "type": "progress",
                    "current": idx + 1,
                    "total": total_files,
                    "filename": img_file.name,
                    "item": err_res,
                    "total_processed": success_count,
                    "total_faces": total_faces,
                }

        yield {
            "type": "complete",
            "status": True,
            "folder_path": str(p),
            "total_found": total_files,
            "total_processed": success_count,
            "total_faces": total_faces,
            "processed": processed,
        }

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


def get_all_indexed_photos(db_path: str = DB_PATH) -> List[Dict[str, Any]]:
    """Retrieves all indexed photos along with detected face counts."""
    if not os.path.exists(db_path):
        return []

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("""
            SELECT photos.id, photos.photo_path, COUNT(faces.id) as face_count
            FROM photos
            LEFT JOIN faces ON faces.photo_id = photos.id
            GROUP BY photos.id, photos.photo_path
            ORDER BY photos.id DESC
        """)
        rows = cur.fetchall()
        conn.close()

        results = []
        for pid, path, face_count in rows:
            filename = os.path.basename(path)
            results.append({
                "id": pid,
                "photo_path": path,
                "filename": filename,
                "url": f"/images/{filename}",
                "face_count": face_count,
            })
        return results
    except Exception as e:
        print(f"Error fetching photos from database: {e}")
        return []

