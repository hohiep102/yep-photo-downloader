#!/usr/bin/env python3
"""Index faces from photos using InsightFace buffalo_l model."""
import sys
from pathlib import Path
from typing import Optional, List, Dict, Tuple

# Add backend to path for database module
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import argparse
import cv2
import numpy as np
from tqdm import tqdm
from insightface.app import FaceAnalysis

from database import get_connection, init_db, is_photo_indexed, insert_photo, insert_faces_batch, DB_PATH

# Supported image extensions
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}

# Face detection thresholds
MIN_FACE_SIZE = 50  # pixels
MIN_DETECTION_SCORE = 0.7


def init_face_analyzer() -> FaceAnalysis:
    """Initialize InsightFace analyzer with buffalo_l model."""
    print("Loading InsightFace buffalo_l model...")
    # Try CoreML first (Apple Silicon), fallback to CPU
    providers = ['CoreMLExecutionProvider', 'CPUExecutionProvider']
    app = FaceAnalysis(name='buffalo_l', providers=providers)
    app.prepare(ctx_id=0, det_size=(640, 640))
    print("✓ Model loaded")
    return app


def get_image_files(photos_dir: Path) -> List[Path]:
    """Get all image files from directory."""
    files = []
    for ext in IMAGE_EXTENSIONS:
        files.extend(photos_dir.glob(f"*{ext}"))
        files.extend(photos_dir.glob(f"*{ext.upper()}"))
    return sorted(files)


def process_image(analyzer: FaceAnalysis, image_path: Path) -> Tuple[Optional[np.ndarray], List[Dict]]:
    """Process single image, return (image, faces_data) or (None, []) on error."""
    try:
        img = cv2.imread(str(image_path))
        if img is None:
            return None, []

        faces = analyzer.get(img)
        if not faces:
            return img, []

        face_records = []
        for face in faces:
            # Skip low confidence or small faces
            if face.det_score < MIN_DETECTION_SCORE:
                continue

            bbox = face.bbox.astype(int)
            width = bbox[2] - bbox[0]
            height = bbox[3] - bbox[1]

            if width < MIN_FACE_SIZE or height < MIN_FACE_SIZE:
                continue

            face_records.append({
                'bbox_x': int(bbox[0]),
                'bbox_y': int(bbox[1]),
                'bbox_w': int(width),
                'bbox_h': int(height),
                'embedding': face.embedding,
                'detection_score': float(face.det_score)
            })

        return img, face_records
    except Exception as e:
        print(f"\n  Warning: Error processing {image_path.name}: {e}")
        return None, []


def index_photos(photos_dir: Path, db_path: Path):
    """Index all photos in directory."""
    # Initialize database
    init_db(db_path)

    # Get image files
    image_files = get_image_files(photos_dir)
    if not image_files:
        print(f"No images found in {photos_dir}")
        return

    print(f"Found {len(image_files)} images")

    # Initialize face analyzer
    analyzer = init_face_analyzer()

    # Process images
    total_faces = 0
    skipped = 0
    errors = 0

    with get_connection(db_path) as conn:
        for image_path in tqdm(image_files, desc="Indexing faces"):
            # Skip already indexed
            if is_photo_indexed(conn, image_path.name):
                skipped += 1
                continue

            img, face_records = process_image(analyzer, image_path)

            if img is None:
                errors += 1
                continue

            # Insert photo record (even if no faces found)
            height, width = img.shape[:2]
            photo_id = insert_photo(conn, image_path.name, str(image_path), width, height)

            # Insert face records
            if face_records:
                for face in face_records:
                    face['photo_id'] = photo_id
                insert_faces_batch(conn, face_records)
                total_faces += len(face_records)

        conn.commit()

    print(f"\n✓ Indexing complete:")
    print(f"  - Photos processed: {len(image_files) - skipped}")
    print(f"  - Photos skipped (already indexed): {skipped}")
    print(f"  - Faces indexed: {total_faces}")
    print(f"  - Errors: {errors}")


def main():
    parser = argparse.ArgumentParser(description="Index faces from photos using InsightFace")
    parser.add_argument("-i", "--input", default="data/photos", help="Photos directory (default: data/photos)")
    parser.add_argument("-d", "--database", default=None, help="Database path (default: data/database.db)")
    args = parser.parse_args()

    # Resolve paths relative to project root
    project_root = Path(__file__).parent.parent
    photos_dir = project_root / args.input
    db_path = Path(args.database) if args.database else DB_PATH

    if not photos_dir.exists():
        print(f"Error: Photos directory not found: {photos_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Photos directory: {photos_dir}")
    print(f"Database: {db_path}")

    index_photos(photos_dir, db_path)


if __name__ == "__main__":
    main()
