import os
import shutil
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional, List, Union

from fastapi import FastAPI, File, UploadFile, Form, Query, HTTPException, status, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import (
    HOST,
    PORT,
    DB_PATH,
    DEFAULT_THRESHOLD,
    DEFAULT_TOP_K,
    ALLOWED_EXTENSIONS,
)
from backend.schemas import (
    HealthResponse,
    FaceSearchResponse,
    SemanticSearchRequest,
    SemanticSearchResponse,
    HybridSearchResponse,
    SearchMatch,
)
from backend.services import get_search_service, check_database_health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-warm search service and Jina CLIP model on startup
    print(f"[*] Initializing The-Eyes backend service with database: {DB_PATH}")
    service = get_search_service()
    app.state.search_service = service
    print("[*] Search service initialized successfully.")
    yield
    print("[*] Shutting down The-Eyes backend service.")


app = FastAPI(
    title="The-Eyes Backend API",
    description="FastAPI service for facial recognition, semantic text-to-image search, and hybrid retrieval.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for external integrations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _validate_image_file(file: UploadFile) -> str:
    """Validates uploaded image file extension and returns normalized suffix."""
    filename = file.filename or ""
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image format '{suffix}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )
    return suffix


def _save_upload_to_temp(file: UploadFile, suffix: str) -> str:
    """Saves uploaded file content into a secure temporary file."""
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        return tmp.name


@app.get("/", tags=["Info"])
def root():
    return {
        "service": "The-Eyes Backend API",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "health": ["/health", "/health-status"],
            "face_search": "/face-search",
            "semantic_search": "/semantic-search",
            "hybrid_search": "/hybrid-search",
            "docs": "/docs",
        },
    }


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health check indicating server status, errors, and database connection",
)
@app.get(
    "/health-status",
    response_model=HealthResponse,
    tags=["System"],
    summary="Alias for /health",
)
def health_status(response: Response):
    is_connected, error_msg, counts = check_database_health()
    errors: List[str] = []

    if not is_connected:
        errors.append(error_msg or "Database unreachable")

    # Check search service instance
    search_service_ready = hasattr(app.state, "search_service") and app.state.search_service is not None
    if not search_service_ready:
        errors.append("Search service model not initialized")

    is_healthy = len(errors) == 0
    http_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    response.status_code = http_code

    return HealthResponse(
        status=is_healthy,
        running=True,
        status_code=http_code,
        errors=errors if errors else None,
        database={
            "connected": is_connected,
            "path": DB_PATH,
            "table_counts": counts,
        },
        message="Server is running smoothly" if is_healthy else "Server degraded with errors",
    )


@app.post(
    "/face-search",
    response_model=FaceSearchResponse,
    tags=["Search"],
    summary="Search for matching photos using an uploaded reference face",
)
async def face_search_endpoint(
    file: UploadFile = File(..., description="Query face photo (JPG, PNG, WEBP)"),
    threshold: float = Form(DEFAULT_THRESHOLD, ge=0.0, le=1.0, description="Cosine similarity threshold"),
):
    suffix = _validate_image_file(file)
    temp_path = _save_upload_to_temp(file, suffix)

    try:
        service = app.state.search_service or get_search_service()
        raw_result = service.run_face_search(image_path=temp_path, threshold=threshold)

        if not raw_result.get("found", False):
            return FaceSearchResponse(
                status=True,
                found=False,
                count=0,
                photos=[],
                results=[],
                error=raw_result.get("error", "No matching face found"),
            )

        matches_data = raw_result.get("photos", [])
        photo_paths = [m["photo_path"] for m in matches_data]
        results = [SearchMatch(photo_path=m["photo_path"], score=float(m["score"])) for m in matches_data]

        return FaceSearchResponse(
            status=True,
            found=True,
            count=len(photo_paths),
            photos=photo_paths,
            results=results,
            error=None,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Face search failed: {str(exc)}",
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post(
    "/semantic-search",
    response_model=SemanticSearchResponse,
    tags=["Search"],
    summary="Search for photos using natural language text queries",
)
async def semantic_search_endpoint(
    request: Request,
    text: Optional[str] = Form(None, description="Search text via Form"),
    top_k: Optional[int] = Form(None, ge=1, le=100, description="Top K results via Form"),
):
    # Support both JSON payload and Form-data seamlessly
    query_text = text
    limit = top_k or DEFAULT_TOP_K

    # Check if request has JSON body
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            query_text = body.get("text") or body.get("query") or body.get("search_string")
            if "top_k" in body:
                limit = int(body["top_k"])
        except Exception:
            pass

    if not query_text or not query_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing 'text' search string in request body",
        )

    try:
        service = app.state.search_service or get_search_service()
        raw_results = service.run_semantic_search(search_string=query_text.strip(), top_k=limit)

        photo_paths = [p for p, _ in raw_results]
        results = [SearchMatch(photo_path=p, score=float(s)) for p, s in raw_results]

        return SemanticSearchResponse(
            status=True,
            query=query_text.strip(),
            count=len(photo_paths),
            photos=photo_paths,
            results=results,
            error=None,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic search failed: {str(exc)}",
        )


@app.get(
    "/semantic-search",
    response_model=SemanticSearchResponse,
    tags=["Search"],
    summary="Search for photos using natural language text queries (GET method)",
)
def semantic_search_get_endpoint(
    text: str = Query(..., min_length=1, description="Natural language search text"),
    top_k: int = Query(DEFAULT_TOP_K, ge=1, le=100, description="Maximum results to return"),
):
    try:
        service = app.state.search_service or get_search_service()
        raw_results = service.run_semantic_search(search_string=text.strip(), top_k=top_k)

        photo_paths = [p for p, _ in raw_results]
        results = [SearchMatch(photo_path=p, score=float(s)) for p, s in raw_results]

        return SemanticSearchResponse(
            status=True,
            query=text.strip(),
            count=len(photo_paths),
            photos=photo_paths,
            results=results,
            error=None,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic search failed: {str(exc)}",
        )


@app.post(
    "/hybrid-search",
    response_model=HybridSearchResponse,
    tags=["Search"],
    summary="Search for a specific person with natural language context (Face + Semantic query)",
)
async def hybrid_search_endpoint(
    file: UploadFile = File(..., description="Query face photo (JPG, PNG, WEBP)"),
    text: str = Form(..., min_length=1, description="Natural language context/description"),
    threshold: float = Form(DEFAULT_THRESHOLD, ge=0.0, le=1.0, description="Face similarity threshold"),
    top_k: int = Form(DEFAULT_TOP_K, ge=1, le=100, description="Top K results to return"),
):
    suffix = _validate_image_file(file)
    temp_path = _save_upload_to_temp(file, suffix)

    try:
        service = app.state.search_service or get_search_service()
        raw_result = service.run_hybrid_search(
            reference_image=temp_path,
            text=text.strip(),
            threshold=threshold,
            top_k=top_k,
        )

        # Check if face search returned not found
        if isinstance(raw_result, dict) and not raw_result.get("found", False):
            return HybridSearchResponse(
                status=False,
                found=False,
                query=text.strip(),
                count=0,
                photos=[],
                results=[],
                error=raw_result.get("error", "No matching face found in database"),
            )

        # raw_result is list of (photo_path, score)
        photo_paths = [p for p, _ in raw_result]
        results = [SearchMatch(photo_path=p, score=float(s)) for p, s in raw_result]

        return HybridSearchResponse(
            status=True,
            found=True,
            query=text.strip(),
            count=len(photo_paths),
            photos=photo_paths,
            results=results,
            error=None,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hybrid search failed: {str(exc)}",
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
