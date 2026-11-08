# The-Eyes Backend API

FastAPI backend server for **The-Eyes** photo indexing and retrieval engine.

## Prerequisites

Dependencies can be installed using pip:

```bash
pip install -r backend/requirements.txt
```

## Running the Server

From the project root:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Or from the `backend/` directory:

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation (Swagger UI) is available at:
`http://localhost:8000/docs`

---

## API Endpoints

### 1. Health Status
Check server runtime state, database connectivity, and error reports.

- **Endpoints**: `GET /health` or `GET /health-status`
- **Response**:
```json
{
  "status": true,
  "running": true,
  "status_code": 200,
  "errors": null,
  "database": {
    "connected": true,
    "path": "C:/.../processed/faces.db",
    "table_counts": {
      "photos": 3,
      "faces": 125,
      "semantic": 3
    }
  },
  "message": "Server is running smoothly"
}
```

### 2. Facial Search
Upload a reference face photo to find matching indexed photos.

- **Endpoint**: `POST /face-search`
- **Content-Type**: `multipart/form-data`
- **Form Parameters**:
  - `file`: Image file (`.jpg`, `.jpeg`, `.png`, `.webp`)
  - `threshold`: Cosine similarity threshold (default: `0.4`)
- **Example cURL**:
```bash
curl -X POST "http://localhost:8000/face-search" \
  -F "file=@test-images/chinmay.png" \
  -F "threshold=0.4"
```
- **Response**:
```json
{
  "status": true,
  "found": true,
  "count": 3,
  "photos": [
    "../processed/images/group-3.jpeg",
    "../processed/images/group-1.jpeg"
  ],
  "results": [
    {"photo_path": "../processed/images/group-3.jpeg", "score": 0.957},
    {"photo_path": "../processed/images/group-1.jpeg", "score": 0.625}
  ],
  "error": null
}
```

### 3. Semantic Search
Search photos using natural language text prompts via Jina CLIP v2.

- **Endpoints**: `POST /semantic-search` (JSON or Form) or `GET /semantic-search`
- **Example POST (JSON)**:
```bash
curl -X POST "http://localhost:8000/semantic-search" \
  -H "Content-Type: application/json" \
  -d '{"text": "people in group", "top_k": 5}'
```
- **Example GET**:
```bash
curl "http://localhost:8000/semantic-search?text=people%20in%20group&top_k=5"
```
- **Response**:
```json
{
  "status": true,
  "query": "people in group",
  "count": 2,
  "photos": [
    "../processed/images/group-2.jpeg",
    "../processed/images/group-3.jpeg"
  ],
  "results": [
    {"photo_path": "../processed/images/group-2.jpeg", "score": 0.207},
    {"photo_path": "../processed/images/group-3.jpeg", "score": 0.207}
  ],
  "error": null
}
```

### 4. Hybrid Search
Combines facial identity matching with descriptive contextual text.

- **Endpoint**: `POST /hybrid-search`
- **Content-Type**: `multipart/form-data`
- **Form Parameters**:
  - `file`: Query face photo (`.jpg`, `.png`, etc.)
  - `text`: Natural language scene description
  - `threshold`: Face similarity threshold (default: `0.4`)
  - `top_k`: Number of top results to return (default: `5`)
- **Example cURL**:
```bash
curl -X POST "http://localhost:8000/hybrid-search" \
  -F "file=@test-images/chinmay.png" \
  -F "text=standing in front of a stage" \
  -F "threshold=0.4" \
  -F "top_k=5"
```
- **Response**:
```json
{
  "status": true,
  "found": true,
  "query": "standing in front of a stage",
  "count": 2,
  "photos": [
    "../processed/images/group-1.jpeg",
    "../processed/images/group-2.jpeg"
  ],
  "results": [
    {"photo_path": "../processed/images/group-1.jpeg", "score": 0.198},
    {"photo_path": "../processed/images/group-2.jpeg", "score": 0.196}
  ],
  "error": null
}
```

### 5. Batch Index — Folder Path
Scan a local folder and index all images (`.jpg`, `.jpeg`, `.png`, `.webp`) in one shot.

- **Endpoint**: `POST /batch-index-folder`
- **Content-Type**: `application/json`
- **Body**:
  - `folder_path`: Absolute or relative path to the source image folder
- **Example cURL**:
```bash
curl -X POST "http://localhost:8000/batch-index-folder" \
  -H "Content-Type: application/json" \
  -d '{"folder_path": "test-images"}'
```
- **Response**:
```json
{
  "status": true,
  "folder_path": "test-images",
  "found": 5,
  "processed": 5,
  "failed": 0,
  "total_faces": 127,
  "items": [
    {"filename": "chinmay.png", "path": "test-images/chinmay.png", "status": "success", "faces_found": 1, "error": null},
    {"filename": "group-1.jpeg", "path": "test-images/group-1.jpeg", "status": "success", "faces_found": 46, "error": null}
  ],
  "error": null
}
```

### 6. Batch Index — File Upload
Upload multiple image files directly for immediate indexing.

- **Endpoint**: `POST /batch-upload`
- **Content-Type**: `multipart/form-data`
- **Form Parameters**:
  - `files`: One or more image files
- **Example cURL**:
```bash
curl -X POST "http://localhost:8000/batch-upload" \
  -F "files=@test-images/chinmay.png" \
  -F "files=@test-images/group-1.jpeg"
```
- **Response**: Same structure as `/batch-index-folder`.

### 7. Photo Gallery
Retrieve all indexed photos from the database.

- **Endpoint**: `GET /photos`
- **Response**:
```json
{
  "status": true,
  "count": 5,
  "photos": [
    {"id": 1, "photo_path": "../processed/images/group-1.jpeg", "embedding": null}
  ],
  "error": null
}
```
