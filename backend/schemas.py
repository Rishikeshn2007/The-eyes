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
