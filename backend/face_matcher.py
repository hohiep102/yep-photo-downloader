"""Face matching service with in-memory embedding cache."""
import numpy as np
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import threading

from database import get_connection, get_all_embeddings


class FaceMatcher:
    """Manages face embeddings and performs similarity search."""

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.embeddings: Optional[np.ndarray] = None  # Shape: (N, 512)
        self.face_ids: list[int] = []
        self.photo_ids: list[int] = []
        self.temp_faces: dict[str, tuple[np.ndarray, datetime]] = {}
        self._lock = threading.Lock()
        self._load_embeddings()

    def _load_embeddings(self):
        """Load all embeddings from database into numpy array."""
        if not self.db_path.exists():
            print(f"Warning: Database not found at {self.db_path}")
            self.embeddings = np.array([]).reshape(0, 512)
            return

        with get_connection(self.db_path) as conn:
            data = get_all_embeddings(conn)

        if not data:
            self.embeddings = np.array([]).reshape(0, 512)
            return

        self.face_ids = [d[0] for d in data]
        self.photo_ids = [d[1] for d in data]
        self.embeddings = np.vstack([d[2] for d in data])

        # Normalize embeddings for faster cosine similarity
        norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
        self.embeddings = self.embeddings / (norms + 1e-10)

        print(f"Loaded {len(self.face_ids)} face embeddings")

    def reload_embeddings(self):
        """Reload embeddings from database (call after indexing)."""
        self._load_embeddings()

    def store_temp_face(self, embedding: np.ndarray) -> str:
        """Store a temporary face embedding and return its ID."""
        temp_id = str(uuid.uuid4())
        with self._lock:
            self.temp_faces[temp_id] = (embedding, datetime.now())
        return temp_id

    def get_temp_embedding(self, temp_id: str) -> Optional[np.ndarray]:
        """Get temporary embedding by ID."""
        with self._lock:
            data = self.temp_faces.get(temp_id)
            return data[0] if data else None

    def cleanup_temp_faces(self, ttl_seconds: int = 1800):
        """Remove expired temporary faces."""
        cutoff = datetime.now() - timedelta(seconds=ttl_seconds)
        with self._lock:
            expired = [k for k, v in self.temp_faces.items() if v[1] < cutoff]
            for k in expired:
                del self.temp_faces[k]
        if expired:
            print(f"Cleaned up {len(expired)} expired temp faces")

    def search(self, temp_face_id: str, threshold: float = 0.5, limit: int = 50) -> list[dict]:
        """Search for matching faces. Returns list of {face_id, photo_id, similarity}."""
        embedding = self.get_temp_embedding(temp_face_id)
        if embedding is None:
            return []

        if self.embeddings is None or len(self.embeddings) == 0:
            return []

        # Normalize query embedding
        query = embedding / (np.linalg.norm(embedding) + 1e-10)

        # Cosine similarity (embeddings already normalized)
        similarities = np.dot(self.embeddings, query)

        # Filter by threshold
        mask = similarities >= threshold
        indices = np.where(mask)[0]

        if len(indices) == 0:
            return []

        # Sort by similarity descending
        sorted_indices = indices[np.argsort(similarities[indices])[::-1]]

        # Deduplicate by photo_id, keep best match per photo
        seen_photos = {}
        results = []
        for idx in sorted_indices:
            photo_id = self.photo_ids[idx]
            if photo_id not in seen_photos:
                seen_photos[photo_id] = True
                results.append({
                    "face_id": self.face_ids[idx],
                    "photo_id": photo_id,
                    "similarity": float(similarities[idx])
                })
                if len(results) >= limit:
                    break

        return results


# Global instance (initialized in main.py)
face_matcher: Optional[FaceMatcher] = None
