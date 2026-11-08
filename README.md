# The-Eyes

A lightweight, local face indexing and similarity search engine powered by InsightFace, CLIP, and SQLite.

## Overview

**The-Eyes** processes images to detect and extract individual faces, generates high-dimensional embeddings for both facial features and overall image context, and indexes them in a local SQLite database for fast similarity retrieval.

## Features

- **Automated Face Extraction**: Detects, crops, and saves faces using InsightFace (`buffalo_l`).
- **Dual Vector Indexing**:
  - Facial identity embeddings (InsightFace) for face verification and matching.
  - Contextual image embeddings using CLIP (`clip-ViT-B-32`).
- **Embedded Storage**: Stores image metadata and raw embedding vectors in a standalone SQLite database.
- **Cosine Similarity Search**: Queries against indexed faces to locate matching photos ranked by confidence score.

## Tech Stack

- **Python 3.10+**
- **InsightFace** & **ONNX Runtime** (Face detection and recognition)
- **Sentence-Transformers** (CLIP image embeddings)
- **OpenCV** & **Pillow** (Image processing)
- **SQLite3** & **NumPy** (Vector storage and matrix operations)

## Project Structure

```text
The-eyes/
├── modules/
│   └── face_search.py     # Extraction, indexing, and search implementation
├── processed/             # Storage for indexed assets
│   ├── faces/             # Cropped facial images
│   ├── images/            # Archived original images
│   └── faces.db           # SQLite database with vector embeddings
├── test-images/           # Sample test images
└── README.md
```

## Quick Start

### 1. Installation

Ensure required dependencies are installed:

```bash
pip install insightface onnxruntime opencv-python pillow sentence-transformers numpy
```

> **Note**: InsightFace will automatically download the `buffalo_l` model asset on the first run.

### 2. Indexing an Image

Extract faces and store embeddings in the database:

```python
from modules.face_search import Face_search

# Index an image
result = Face_search.extreact_face("path/to/photo.jpg")
print(result)
```

### 3. Searching for a Face

Query the index using a reference face image:

```python
from modules.face_search import Face_search

# Search with a query face (similarity threshold defaults to 0.4)
matches = Face_search.search_face("path/to/query_face.jpg", threshold=0.4)
print(matches)
```

**Example Response:**
```json
{
  "found": true,
  "photos": [
    {
      "photo_path": "../processed/images/group-1.jpg",
      "score": 0.7821
    }
  ]
}
```

## License

MIT
