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
        emb = self.model.encode_image([img_path])[0]
        emb = np.array(emb, dtype=np.float32)
        return emb / np.linalg.norm(emb)  # normalize so dot product = cosine similarity

    def save_to_db(self, img_path):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()

        cur.execute("""CREATE TABLE IF NOT EXISTS semantic (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_path TEXT,
            embedding BLOB)""")

        emb = self.img_to_embedding(img_path)
        cur.execute("INSERT INTO semantic (photo_path, embedding) VALUES (?, ?)",
                    (img_path, emb.tobytes()))

        conn.commit()
        conn.close()

    def semantic_search(self, search_string, top_k=5):
        # text -> embedding
        q = self.model.encode_text([search_string], task="retrieval.query")[0]
        q = np.array(q, dtype=np.float32)
        q = q / np.linalg.norm(q)

        # compare with all stored photo embeddings
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute("SELECT photo_path, embedding FROM semantic")
        rows = cur.fetchall()
        conn.close()

        results = []
        for photo_path, blob in rows:
            emb = np.frombuffer(blob, dtype=np.float32)
            results.append((photo_path, float(np.dot(q, emb))))

        results.sort(key=lambda x: x[1], reverse=True)
        return results[:top_k]

#s = Semantic_search()
#print(s.search("Person taking selfie"))