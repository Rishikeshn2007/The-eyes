# The-Eyes

A lightweight, local multimodal photo indexing and search engine supporting **facial recognition**, **semantic text-to-image search**, and **hybrid retrieval** using InsightFace, Jina CLIP, and SQLite.

---

## Overview

**The-Eyes** indexes image collections into a local SQLite database using high-dimensional vector embeddings. It provides three search modalities:

1. **Facial Search**: Matches reference faces against indexed images.
2. **Semantic Search**: Discovers images using natural language queries (e.g., *"person giving a speech"*).
3. **Hybrid Search**: Combines identity matching with semantic context (e.g., finds a specific person *"smiling outdoors"*).

---

## Features

- **Automated Face Detection & Extraction**: Detects, crops, and normalizes faces using InsightFace (`buffalo_l`).
- **Multimodal Semantic Search**: Natural-language text-to-image retrieval powered by Jina CLIP v2 (`jinaai/jina-clip-v2`).
- **Hybrid Retrieval**: Filters candidate photos by facial identity, then ranks matching scenes using semantic query relevance.
- **Embedded Vector Storage**: Stores metadata and raw embedding vectors directly in SQLite, eliminating the need for external vector database infrastructure.
- **Batch Image Indexer**: Index an entire folder of images or upload multiple files at once — extracts faces, generates CLIP & Jina CLIP v2 embeddings, and upserts all records into the database in one operation.

---

## Tech Stack

- **Runtime**: Python 3.10+
- **Vision Models**: [InsightFace](https://github.com/deepinsight/insightface) (`buffalo_l`), [Jina CLIP v2](https://huggingface.co/jinaai/jina-clip-v2)
- **Deep Learning Frameworks**: PyTorch, Hugging Face `transformers`, ONNX Runtime
- **Image Processing**: OpenCV, Pillow
- **Storage & Vector Math**: SQLite3, NumPy

---

## Project Structure

```text
The-eyes/
├── backend/                 # FastAPI backend server
│   ├── main.py              # API routes and application lifespan
│   ├── services.py          # Unified model and search service
│   ├── schemas.py           # Request and response schemas
│   ├── config.py            # Environment and path settings
│   └── .env                 # Backend environment configuration
├── frontend/                # React.js application (Nmap dark blue theme)
│   ├── src/                 # Views, components, context, and styles
│   ├── index.html           # Root HTML entry with custom SVG favicon
│   ├── package.json         # React & Vite dependencies
│   └── vite.config.js       # Vite dev server with backend proxy
├── modules/
│   ├── face_search.py       # Face detection, extraction, and facial similarity search
│   ├── semantic_search.py   # Text-to-image semantic search via Jina CLIP
│   └── hybrid_search.py     # Combined facial identity and semantic query search
├── processed/               # Generated assets and database
│   ├── faces/               # Cropped facial cutouts
│   ├── images/              # Archived source images
│   └── faces.db             # SQLite database storing photos, faces, and embeddings
├── test-images/             # Sample query and gallery images
└── README.md
```

---

## Getting Started

### 1. Installation

Install required dependencies:

```bash
pip install torch torchvision transformers insightface onnxruntime opencv-python pillow sentence-transformers numpy
```

### 2. Running the Backend Server

Start the FastAPI application:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive documentation: `http://localhost:8000/docs`

### 3. Running the React Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The UI will be accessible at: `http://localhost:5173`

---

## Usage

### 1. Facial Indexing & Search

Index images to extract faces and embeddings, then query using a reference face:

```python
from modules.face_search import Face_search

fs = Face_search()

# Index a photo (extracts and saves faces, writes embeddings to database)
fs.extreact_face("path/to/group_photo.jpg")

# Search for a face across indexed photos
results = fs.search_face("path/to/target_face.jpg", threshold=0.4)
print(results)
```

### 2. Semantic Search (Text-to-Image)

Index images for semantic retrieval and search using natural language prompts:

```python
from modules.semantic_search import Semantic_search

ss = Semantic_search()

# Index an image into the semantic table
ss.save_to_db("path/to/photo.jpg")

# Search using natural language
matches = ss.semantic_search("person taking a selfie", top_k=5)
# Returns: [(photo_path, score), ...]
print(matches)
```

### 3. Hybrid Search (Face + Context)

Find photos of a specific individual matching a descriptive context:

```python
from modules.hybrid_search import Hybrid_search

hs = Hybrid_search()

# Find photos of the person in 'target_face.png' doing a specific activity
results = hs.hybrid_search(
    reference_image="path/to/target_face.png",
    text="standing in front of a stage",
    top_k=5
)
print(results)
```

---

## Database Schema (`faces.db`)

The SQLite database contains three tables:

- **`photos`**: Stores original photo paths and CLIP image embeddings.
- **`faces`**: Stores individual face crop paths, normalized face embeddings, and foreign keys referencing `photos`.
- **`semantic`**: Stores photo paths and normalized Jina CLIP embeddings for text query matching.

---

