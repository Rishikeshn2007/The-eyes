from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: bool = Field(..., description="Overall health status: true if running without critical errors, false otherwise")
    running: bool = Field(True, description="Indicates if the server process is currently up and running")
    status_code: int = Field(200, description="HTTP status code")
    errors: Optional[List[str]] = Field(None, description="List of system errors or warnings if any")
    database: Dict[str, Any] = Field(..., description="Database connectivity status and resolved path")
    message: str = Field(..., description="Human-readable server health summary")


class SearchMatch(BaseModel):
    photo_path: str = Field(..., description="Path to the matching indexed photo")
    score: float = Field(..., description="Similarity confidence score")
    filename: Optional[str] = Field(None, description="Basename of the photo")
    url: Optional[str] = Field(None, description="Direct URL path to the image")


class FaceSearchResponse(BaseModel):
    status: bool = Field(..., description="Whether the search request completed successfully")
    found: bool = Field(..., description="Whether one or more matching faces were found")
    count: int = Field(..., description="Total count of matching photos")
    photos: List[str] = Field(default_factory=list, description="Array of matching photo file paths")
    results: List[SearchMatch] = Field(default_factory=list, description="Ranked match details including similarity scores")
    error: Optional[str] = Field(None, description="Error message if face detection or search failed")


class SemanticSearchRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Natural language search query")
    top_k: int = Field(5, ge=1, le=100, description="Maximum number of top results to return")


class SemanticSearchResponse(BaseModel):
    status: bool = Field(..., description="Whether the search request completed successfully")
    query: str = Field(..., description="Input query text evaluated")
    count: int = Field(..., description="Total count of returned photos")
    photos: List[str] = Field(default_factory=list, description="Array of matching photo file paths")
    results: List[SearchMatch] = Field(default_factory=list, description="Ranked match details including similarity scores")
    error: Optional[str] = Field(None, description="Error message if search failed")


class HybridSearchResponse(BaseModel):
    status: bool = Field(..., description="Whether the search request completed successfully")
    found: bool = Field(..., description="Whether the query face was identified in the database")
    query: str = Field(..., description="Natural language text filter applied")
    count: int = Field(..., description="Total count of matching photos returned")
    photos: List[str] = Field(default_factory=list, description="Array of matching photo file paths")
    results: List[SearchMatch] = Field(default_factory=list, description="Ranked match details including similarity scores")
    error: Optional[str] = Field(None, description="Error message if face was not found or search failed")


class BatchFolderRequest(BaseModel):
    folder_path: str = Field(..., min_length=1, description="Path to folder containing source images")


class BatchItemResult(BaseModel):
    success: bool
    filename: str
    photo_path: Optional[str] = None
    url: Optional[str] = None
    faces_detected: int = 0
    error: Optional[str] = None


class BatchFolderResponse(BaseModel):
    status: bool = Field(..., description="Whether the batch operation was executed")
    folder_path: Optional[str] = Field(None, description="Path to scanned folder")
    total_found: int = Field(0, description="Total image files found")
    total_processed: int = Field(0, description="Total images converted and indexed")
    total_faces: int = Field(0, description="Total faces detected and extracted")
    message: Optional[str] = Field(None, description="Summary or informational message")
    error: Optional[str] = Field(None, description="Error message if batch execution failed")
    processed: List[BatchItemResult] = Field(default_factory=list, description="Itemized results for each image")
