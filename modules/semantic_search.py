import os
import sqlite3
import numpy as np
from transformers import AutoModel


class Semantic_search:
    def __init__(self, db_path="../processed/faces.db"):
        self.db_path = db_path
        # model loads once here (~2 GB download on first run)
        self.model = AutoModel.from_pretrained("jinaai/jina-clip-v2", trust_remote_code=True)

    def img_to_embedding(self, img_path):
        """Generates unit-normalized image embedding vector."""
        emb = self.model.encode_image([img_path])[0]
        emb = np.array(emb, dtype=np.float32)
        norm = np.linalg.norm(emb)
        return (emb / norm).astype(np.float32) if norm > 0 else emb

    def save_to_db(self, img_path):
        """
        Stores original embedding and pre-computes L2-normalized vector in
        the 'normalized' column.
        """
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        cur.execute("""CREATE TABLE IF NOT EXISTS semantic (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_path TEXT,
            embedding BLOB,
            normalized BLOB)""")

        raw_emb = np.array(self.model.encode_image([img_path])[0], dtype=np.float32)
        norm = np.linalg.norm(raw_emb)
        norm_emb = (raw_emb / norm).astype(np.float32) if norm > 0 else raw_emb

        cur.execute(
            "INSERT INTO semantic (photo_path, embedding, normalized) VALUES (?, ?, ?)",
            (img_path, raw_emb.tobytes(), norm_emb.tobytes())
        )

        conn.commit()
        conn.close()

    def semantic_search(self, search_string, top_k=5):
        """
        High-speed semantic search using pre-normalized vectors and numpy dot product.
        Since both query and stored vectors are unit-normalized, np.dot equals cosine similarity.
        """
        # 1. Text query embedding normalized to unit vector
        q = self.model.encode_text([search_string], task="retrieval.query")[0]
        q = np.array(q, dtype=np.float32)
        q_norm = np.linalg.norm(q)
        if q_norm > 0:
            q = q / q_norm

        # 2. Fetch pre-normalized vectors from database
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("SELECT photo_path, COALESCE(normalized, embedding) FROM semantic")
        rows = cur.fetchall()
        conn.close()

        if not rows:
            return []

        # 3. Vectorized matrix dot product via numpy
        photo_paths = [r[0] for r in rows]
        emb_matrix = np.frombuffer(b"".join(r[1] for r in rows), dtype=np.float32).reshape(len(rows), -1)
        scores = np.dot(emb_matrix, q)

        results = [(p, float(s)) for p, s in zip(photo_paths, scores)]
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]
