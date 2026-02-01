"""Pydantic models for API request/response."""
from pydantic import BaseModel
from typing import Optional


class BBox(BaseModel):
    x: int
    y: int
    w: int
    h: int


class DetectedFace(BaseModel):
    temp_id: str
    thumbnail: str  # base64 data URL
    bbox: BBox
    score: float


class ImageSize(BaseModel):
    width: int
    height: int


class DetectFacesResponse(BaseModel):
    faces: list[DetectedFace]
    image_size: ImageSize


class SearchRequest(BaseModel):
    temp_face_id: str
    threshold: float = 0.5
    limit: int = 50


class PhotoMatch(BaseModel):
    photo_id: int
    similarity: float
    thumbnail_url: str
    filename: str


class SearchResponse(BaseModel):
    matches: list[PhotoMatch]
    total: int


class DownloadRequest(BaseModel):
    photo_ids: list[int]


class StatsResponse(BaseModel):
    total_photos: int
    total_faces: int
    last_indexed: Optional[str]
