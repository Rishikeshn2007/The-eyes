import os
import numpy as np
from PIL import Image
from insightface.app import FaceAnalysis
import cv2
import sqlite3
from sentence_transformers import SentenceTransformer


class Face_search:
    def extreact_face(self, image_path):
        accepted_formats = ["jpg", "png", "jpeg", "webp"]
        if not os.path.isfile(image_path):
            return {
                "processed": False,
                "error": "Invalid image path"
            }
        
        ext = image_path.split('.')[-1].lower()
        if ext not in accepted_formats:
            return {
                "processed": False,
                "error": "Invalid image format"
            }
            
        app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=0, det_size=(640, 640))
        img = cv2.imread(image_path)
        faces = app.get(img)
        
        if not faces:
            return {
                "processed": True,
                "error": "No faces were found"
            }
        
        base_filename = os.path.basename(image_path) 
        filename_without_ext = os.path.splitext(base_filename)[0] 
        
        # 1. Save original image copy safely using the clean filename
        original_output_dir = "../processed/images"
        os.makedirs(original_output_dir, exist_ok=True)
        cv2.imwrite(f"{original_output_dir}/{base_filename}", img)
        
        # 2. Save cropped faces with identifiable names
        faces_output_dir = "../processed/faces"
        os.makedirs(faces_output_dir, exist_ok=True)
        face_data = []
        for idx, face in enumerate(faces):
            bbox = face.bbox.astype(int)
            x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
            
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(img.shape[1], x2), min(img.shape[0], y2)
            
            cropped_face = img[y1:y2, x1:x2]
            
            file_name = f"{faces_output_dir}/{filename_without_ext}_face_{idx + 1}.png"
            raw_emb = face.embedding if hasattr(face, "embedding") and face.embedding is not None else face.normed_embedding
            norm_emb = face.normed_embedding if hasattr(face, "normed_embedding") and face.normed_embedding is not None else (raw_emb / np.linalg.norm(raw_emb))
            face_data.append((file_name, raw_emb, norm_emb))
            cv2.imwrite(file_name, cropped_face)
            
        self.save_to_db(f"{original_output_dir}/{base_filename}", face_data)
        return {
            "processed": True,
            "message": f"Successfully extracted {len(faces)} faces."
        }

    # Spelling alias for convenience
    extract_face = extreact_face

    def save_to_db(self, photo_path, face_data, db_path="../processed/faces.db"):
        """
        Stores original embeddings and pre-computes L2-normalized vectors in
        the 'normalized' column.
        face_data can be a list of (face_path, raw_emb) or (face_path, raw_emb, norm_emb).
        """
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        cur.execute("""CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_path TEXT,
            embedding BLOB,
            normalized BLOB)""")

        cur.execute("""CREATE TABLE IF NOT EXISTS faces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo_id INTEGER,
            face_path TEXT,
            embedding BLOB,
            normalized BLOB,
            FOREIGN KEY (photo_id) REFERENCES photos(id))""")

        # Generate group photo embedding from CLIP model
        clip = SentenceTransformer("clip-ViT-B-32")
        photo_embedding = clip.encode(Image.open(photo_path).convert("RGB"))
        photo_embedding = np.array(photo_embedding, dtype=np.float32)
        p_norm = np.linalg.norm(photo_embedding)
        norm_photo_embedding = (photo_embedding / p_norm).astype(np.float32) if p_norm > 0 else photo_embedding

        cur.execute(
            "INSERT INTO photos (photo_path, embedding, normalized) VALUES (?, ?, ?)",
            (photo_path, photo_embedding.tobytes(), norm_photo_embedding.tobytes())
        )
        photo_id = cur.lastrowid

        for item in face_data:
            if len(item) == 3:
                face_path, raw_emb, norm_emb = item
            else:
                face_path, raw_emb = item
                r_arr = np.array(raw_emb, dtype=np.float32)
                rn = np.linalg.norm(r_arr)
                norm_emb = (r_arr / rn).astype(np.float32) if rn > 0 else r_arr

            raw_arr = np.array(raw_emb, dtype=np.float32)
            norm_arr = np.array(norm_emb, dtype=np.float32)

            cur.execute(
                "INSERT INTO faces (photo_id, face_path, embedding, normalized) VALUES (?, ?, ?, ?)",
                (photo_id, face_path, raw_arr.tobytes(), norm_arr.tobytes())
            )

        conn.commit()
        conn.close()

    def search_face(self, face_image_path, db_path="../processed/faces.db", threshold=0.4):
        """
        Performs high-speed facial search using pre-normalized vectors and numpy dot product.
        Since vectors are unit-normalized, dot product equals cosine similarity.
        """
        if not os.path.isfile(face_image_path):
            return {"found": False, "error": "Invalid image path"}

        # 1. Get embedding of query face and ensure it is normalized
        app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=0, det_size=(640, 640))
        img = cv2.imread(face_image_path)
        img = cv2.copyMakeBorder(img, 50, 50, 50, 50, cv2.BORDER_CONSTANT, value=(0, 0, 0))
        faces = app.get(img)
        if not faces:
            return {"found": False, "error": "No face found in query image"}

        query_emb = np.array(faces[0].normed_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(query_emb)
        if q_norm > 0:
            query_emb = query_emb / q_norm

        # 2. Fetch pre-normalized embeddings from database (fallback to embedding if needed)
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("""SELECT photos.photo_path, COALESCE(faces.normalized, faces.embedding)
                       FROM faces JOIN photos ON faces.photo_id = photos.id""")
        rows = cur.fetchall()
        conn.close()

        if not rows:
            return {"found": False, "error": "No matching face found"}

        # 3. Vectorized dot product using numpy for maximum performance
        photo_paths = [r[0] for r in rows]
        emb_matrix = np.frombuffer(b"".join(r[1] for r in rows), dtype=np.float32).reshape(len(rows), -1)
        scores = np.dot(emb_matrix, query_emb)

        matches = {}  # photo_path -> highest score in that photo
        for photo_path, score in zip(photo_paths, scores):
            score_val = float(score)
            if score_val >= threshold:
                matches[photo_path] = max(score_val, matches.get(photo_path, 0.0))

        if not matches:
            return {"found": False, "error": "No matching face found"}

        results = sorted(matches.items(), key=lambda x: x[1], reverse=True)
        return {
            "found": True,
            "photos": [{"photo_path": p, "score": s} for p, s in results]
        }
