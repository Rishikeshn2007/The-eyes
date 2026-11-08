import os
import numpy as np
from PIL import Image
from insightface.app import FaceAnalysis
import cv2
import sqlite3
from sentence_transformers import SentenceTransformer

class Face_search:
    def extreact_face(self,image_path):
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
        
        # os.path.basename("C:\\Users\\...\\group.jpg") -> "group.jpg"
        base_filename = os.path.basename(image_path) 
        # os.path.splitext("group.jpg")[0] -> "group" (removes extension)
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
            
            # --- IDENTIFIABLE NAMING STRATEGY ---
            # Output example: "../processed/faces/group_face_1.png"
            file_name = f"{faces_output_dir}/{filename_without_ext}_face_{idx + 1}.png"
            face_data.append((file_name, face.normed_embedding))
            cv2.imwrite(file_name, cropped_face)
        Face_search.save_to_db(f"{original_output_dir}/{base_filename}", face_data)
        return {
            "processed": True,
            "message": f"Successfully extracted {len(faces)} faces."
        }

    def save_to_db(self,photo_path, face_data, db_path="../processed/faces.db"):
        # face_data = list of (face_image_path, face_embedding)
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        conn = sqlite3.connect(db_path)
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

        # group photo embedding from CLIP model
        clip = SentenceTransformer("clip-ViT-B-32")
        photo_embedding = clip.encode(Image.open(photo_path).convert("RGB"))

        cur.execute("INSERT INTO photos (photo_path, embedding) VALUES (?, ?)",
                    (photo_path, photo_embedding.astype(np.float32).tobytes()))
        photo_id = cur.lastrowid

        for face_path, emb in face_data:
            cur.execute("INSERT INTO faces (photo_id, face_path, embedding) VALUES (?, ?, ?)",
                        (photo_id, face_path, emb.astype(np.float32).tobytes()))

        conn.commit()
        conn.close()

    def search_face(self,face_image_path, db_path="../processed/faces.db", threshold=0.4):
        if not os.path.isfile(face_image_path):
            return {"found": False, "error": "Invalid image path"}
        # 1. get embedding of the query face
        app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        app.prepare(ctx_id=0, det_size=(640, 640))
        img = cv2.imread(face_image_path)
        # add border so tight face crops are still detected
        img = cv2.copyMakeBorder(img, 50, 50, 50, 50, cv2.BORDER_CONSTANT, value=(0, 0, 0))
        faces = app.get(img)
        if not faces:
            return {"found": False, "error": "No face found in query image"}
        query_emb = faces[0].normed_embedding
        # 2. compare with every stored face
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("""SELECT photos.photo_path, faces.embedding
                       FROM faces JOIN photos ON faces.photo_id = photos.id""")
        rows = cur.fetchall()
        conn.close()
        best_score = -1
        matches = {}  # photo_path -> best score in that photo
        for photo_path, blob in rows:
            stored_emb = np.frombuffer(blob, dtype=np.float32)
            score = float(np.dot(query_emb, stored_emb))
            if score >= threshold:
                # keep the highest score if a photo has several matching faces
                matches[photo_path] = max(score, matches.get(photo_path, 0))

        if not matches:
            return {"found": False, "error": "No matching face found"}

        # sort best match first
        results = sorted(matches.items(), key=lambda x: x[1], reverse=True)
        return {
            "found": True,
            "photos": [{"photo_path": p, "score": s} for p, s in results]
        }
    
#path ="..\\test-images\\group-3.jpeg"
#result=Face_search.extreact_face(path)
#print(result)
#test_path="..\\test-images\\chinmay.png"
#result = Face_search.search_face(test_path)
#print(result)
