"""SQLite database module for photos and faces storage."""
import sqlite3
import numpy as np
from pathlib import Path
from contextlib import contextmanager
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "data" / "database.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    path TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER NOT NULL,
    bbox_x INTEGER NOT NULL,
    bbox_y INTEGER NOT NULL,
    bbox_w INTEGER NOT NULL,
    bbox_h INTEGER NOT NULL,
    embedding BLOB NOT NULL,
    detection_score FLOAT,
    FOREIGN KEY (photo_id) REFERENCES photos(id)
);

CREATE INDEX IF NOT EXISTS idx_faces_photo_id ON faces(photo_id);
"""


@contextmanager
def get_connection(db_path: Optional[Path] = None):
    """Context manager for database connections."""
    path = db_path or DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(db_path: Optional[Path] = None):
    """Initialize database schema."""
    with get_connection(db_path) as conn:
        conn.executescript(SCHEMA)


def is_photo_indexed(conn: sqlite3.Connection, filename: str) -> bool:
    """Check if photo already indexed."""
    cursor = conn.execute("SELECT 1 FROM photos WHERE filename = ?", (filename,))
    return cursor.fetchone() is not None


def insert_photo(conn: sqlite3.Connection, filename: str, path: str, width: int, height: int) -> int:
    """Insert photo record, return photo_id."""
    cursor = conn.execute(
        "INSERT INTO photos (filename, path, width, height) VALUES (?, ?, ?, ?)",
        (filename, path, width, height)
    )
    return cursor.lastrowid


def insert_faces_batch(conn: sqlite3.Connection, faces: list[dict]):
    """Batch insert face records with embeddings."""
    for face in faces:
        embedding_blob = face['embedding'].astype(np.float32).tobytes()
        conn.execute(
            """INSERT INTO faces (photo_id, bbox_x, bbox_y, bbox_w, bbox_h, embedding, detection_score)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (face['photo_id'], face['bbox_x'], face['bbox_y'], face['bbox_w'], face['bbox_h'],
             embedding_blob, face['detection_score'])
        )


def get_all_embeddings(conn: sqlite3.Connection) -> list[tuple[int, int, np.ndarray]]:
    """Load all face embeddings. Returns [(face_id, photo_id, embedding), ...]"""
    cursor = conn.execute("SELECT id, photo_id, embedding FROM faces")
    results = []
    for row in cursor:
        embedding = np.frombuffer(row['embedding'], dtype=np.float32)
        results.append((row['id'], row['photo_id'], embedding))
    return results


def get_photo_by_id(conn: sqlite3.Connection, photo_id: int) -> Optional[dict]:
    """Get photo record by ID."""
    cursor = conn.execute("SELECT * FROM photos WHERE id = ?", (photo_id,))
    row = cursor.fetchone()
    return dict(row) if row else None


def get_face_by_id(conn: sqlite3.Connection, face_id: int) -> Optional[dict]:
    """Get face record by ID."""
    cursor = conn.execute("SELECT * FROM faces WHERE id = ?", (face_id,))
    row = cursor.fetchone()
    if row:
        result = dict(row)
        result['embedding'] = np.frombuffer(result['embedding'], dtype=np.float32)
        return result
    return None


def get_faces_by_photo_id(conn: sqlite3.Connection, photo_id: int) -> list[dict]:
    """Get all faces for a photo."""
    cursor = conn.execute("SELECT * FROM faces WHERE photo_id = ?", (photo_id,))
    results = []
    for row in cursor:
        face = dict(row)
        face['embedding'] = np.frombuffer(face['embedding'], dtype=np.float32)
        results.append(face)
    return results


def get_stats(conn: sqlite3.Connection) -> dict:
    """Get database statistics."""
    photos = conn.execute("SELECT COUNT(*) as count FROM photos").fetchone()['count']
    faces = conn.execute("SELECT COUNT(*) as count FROM faces").fetchone()['count']
    last_indexed = conn.execute("SELECT MAX(indexed_at) as ts FROM photos").fetchone()['ts']
    return {'total_photos': photos, 'total_faces': faces, 'indexed_at': last_indexed}
