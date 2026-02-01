"""FastAPI backend for YEP Photo Finder."""
import base64
import zipfile
from io import BytesIO
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from insightface.app import FaceAnalysis

from fastapi import Request, Response, Cookie
from fastapi.responses import RedirectResponse
from config import DB_PATH, DEFAULT_THRESHOLD, DEFAULT_LIMIT, TEMP_FACE_TTL
from auth import (
    get_auth_url, exchange_code, validate_domain,
    create_session_token, verify_session_token, get_state_redirect, ALLOWED_DOMAIN
)
from models import (
    DetectFacesResponse, DetectedFace, BBox, ImageSize,
    SearchRequest, SearchResponse, PhotoMatch,
    DownloadRequest, StatsResponse
)
from face_matcher import FaceMatcher
from database import get_connection, get_photo_by_id, get_stats, init_db

# Global instances
face_matcher: FaceMatcher = None
face_analyzer: FaceAnalysis = None


def init_face_analyzer() -> FaceAnalysis:
    """Initialize InsightFace analyzer."""
    print("Loading InsightFace buffalo_l model...")
    app = FaceAnalysis(name='buffalo_l', providers=['CoreMLExecutionProvider', 'CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(640, 640))
    print("✓ Face analyzer ready")
    return app


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    global face_matcher, face_analyzer

    # Initialize database
    init_db(DB_PATH)

    # Load face matcher with embeddings
    face_matcher = FaceMatcher(DB_PATH)

    # Initialize face analyzer
    face_analyzer = init_face_analyzer()

    yield

    # Cleanup
    print("Shutting down...")


app = FastAPI(
    title="YEP Photo Finder",
    description="Face recognition API for finding Year End Party photos",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - allow all for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== ROUTES ====================

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


# ==================== AUTH ROUTES ====================

def get_base_url(request: Request) -> str:
    """Get base URL from request."""
    return str(request.base_url).rstrip("/")


@app.get("/auth/login")
async def auth_login(request: Request, redirect: str = "/"):
    """Redirect to Microsoft login."""
    base_url = get_base_url(request)
    redirect_uri = f"{base_url}/auth/callback"
    auth_url, _ = get_auth_url(redirect_uri, redirect)
    return RedirectResponse(auth_url)


@app.get("/auth/callback")
async def auth_callback(request: Request, code: str = None, state: str = None, error: str = None):
    """Handle OAuth callback."""
    if error:
        return RedirectResponse(f"/login?error={error}")

    if not code:
        return RedirectResponse("/login?error=no_code")

    base_url = get_base_url(request)
    redirect_uri = f"{base_url}/auth/callback"

    user_info = exchange_code(code, redirect_uri)
    if not user_info:
        return RedirectResponse("/login?error=auth_failed")

    if not validate_domain(user_info["email"]):
        return RedirectResponse(f"/login?error=domain_not_allowed&domain={ALLOWED_DOMAIN}")

    # Create session token
    token = create_session_token(user_info)
    final_redirect = get_state_redirect(state) if state else "/"

    response = RedirectResponse(final_redirect)
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=86400,  # 24 hours
    )
    return response


@app.get("/auth/logout")
async def auth_logout():
    """Clear session and logout."""
    response = RedirectResponse("/login")
    response.delete_cookie("session")
    return response


def require_auth(session: str = Cookie(None)):
    """Dependency to require authentication."""
    if not session:
        raise HTTPException(401, "Not authenticated")
    user = verify_session_token(session)
    if not user:
        raise HTTPException(401, "Invalid session")
    return user


@app.get("/api/me")
async def get_current_user(user: dict = Depends(require_auth)):
    """Get current logged in user."""
    return {"email": user["email"], "name": user["name"]}


@app.get("/api/stats", response_model=StatsResponse)
async def get_statistics():
    """Get database statistics."""
    with get_connection(DB_PATH) as conn:
        stats = get_stats(conn)
    return StatsResponse(
        total_photos=stats['total_photos'],
        total_faces=stats['total_faces'],
        last_indexed=stats['indexed_at']
    )


@app.post("/api/detect-faces", response_model=DetectFacesResponse)
async def detect_faces(file: UploadFile = File(...), user: dict = Depends(require_auth)):
    """Upload image, detect faces, return thumbnails with temp IDs."""
    # Read image
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(400, "Invalid image file")

    height, width = img.shape[:2]

    # Detect faces
    faces = face_analyzer.get(img)

    if not faces:
        raise HTTPException(400, "No faces detected in the image")

    # Process each face
    result_faces = []
    for face in faces:
        bbox = face.bbox.astype(int)

        # Clamp bbox to image bounds
        x1, y1, x2, y2 = max(0, bbox[0]), max(0, bbox[1]), min(width, bbox[2]), min(height, bbox[3])

        # Skip tiny faces
        if (x2 - x1) < 30 or (y2 - y1) < 30:
            continue

        # Crop face and encode as base64
        crop = img[y1:y2, x1:x2]
        crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(crop_rgb)
        pil_img.thumbnail((150, 150))

        buffer = BytesIO()
        pil_img.save(buffer, format="JPEG", quality=85)
        thumbnail_b64 = base64.b64encode(buffer.getvalue()).decode()

        # Store embedding temporarily
        temp_id = face_matcher.store_temp_face(face.embedding)

        result_faces.append(DetectedFace(
            temp_id=temp_id,
            thumbnail=f"data:image/jpeg;base64,{thumbnail_b64}",
            bbox=BBox(x=int(x1), y=int(y1), w=int(x2 - x1), h=int(y2 - y1)),
            score=float(face.det_score)
        ))

    if not result_faces:
        raise HTTPException(400, "No valid faces detected (faces too small)")

    return DetectFacesResponse(
        faces=result_faces,
        image_size=ImageSize(width=width, height=height)
    )


@app.post("/api/search", response_model=SearchResponse)
async def search_faces(request: SearchRequest, user: dict = Depends(require_auth)):
    """Search for matching photos using detected face."""
    matches = face_matcher.search(
        request.temp_face_id,
        request.threshold or DEFAULT_THRESHOLD,
        request.limit or DEFAULT_LIMIT
    )

    if not matches:
        return SearchResponse(matches=[], total=0)

    # Get photo info for matches
    result = []
    with get_connection(DB_PATH) as conn:
        for m in matches:
            photo = get_photo_by_id(conn, m["photo_id"])
            if photo:
                result.append(PhotoMatch(
                    photo_id=m["photo_id"],
                    similarity=round(m["similarity"], 3),
                    thumbnail_url=f"/api/photos/{m['photo_id']}/thumbnail",
                    filename=photo["filename"]
                ))

    return SearchResponse(matches=result, total=len(result))


@app.get("/api/photos/{photo_id}")
async def get_photo(photo_id: int, user: dict = Depends(require_auth)):
    """Serve original photo file."""
    with get_connection(DB_PATH) as conn:
        photo = get_photo_by_id(conn, photo_id)

    if not photo:
        raise HTTPException(404, "Photo not found")

    path = Path(photo["path"])
    if not path.exists():
        raise HTTPException(404, "Photo file not found")

    return FileResponse(
        path,
        media_type="image/jpeg",
        filename=photo["filename"]
    )


@app.get("/api/photos/{photo_id}/thumbnail")
async def get_photo_thumbnail(photo_id: int, size: int = 300, user: dict = Depends(require_auth)):
    """Serve photo thumbnail."""
    with get_connection(DB_PATH) as conn:
        photo = get_photo_by_id(conn, photo_id)

    if not photo:
        raise HTTPException(404, "Photo not found")

    path = Path(photo["path"])
    if not path.exists():
        raise HTTPException(404, "Photo file not found")

    # Generate thumbnail
    img = Image.open(path)
    img.thumbnail((size, size))

    buffer = BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    buffer.seek(0)

    return StreamingResponse(buffer, media_type="image/jpeg")


@app.post("/api/download-zip")
async def download_zip(request: DownloadRequest, user: dict = Depends(require_auth)):
    """Generate ZIP of selected photos."""
    if not request.photo_ids:
        raise HTTPException(400, "No photo IDs provided")

    if len(request.photo_ids) > 200:
        raise HTTPException(400, "Maximum 200 photos per download")

    # Get photo paths
    photos = []
    with get_connection(DB_PATH) as conn:
        for pid in request.photo_ids:
            photo = get_photo_by_id(conn, pid)
            if photo:
                path = Path(photo["path"])
                if path.exists():
                    photos.append({"path": path, "filename": photo["filename"]})

    if not photos:
        raise HTTPException(404, "No valid photos found")

    # Create ZIP in memory
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for photo in photos:
            zf.write(photo["path"], photo["filename"])

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=yep-photos.zip"}
    )


@app.post("/api/reload-embeddings")
async def reload_embeddings():
    """Reload embeddings from database (use after re-indexing)."""
    face_matcher.reload_embeddings()
    return {"status": "ok", "total_faces": len(face_matcher.face_ids)}


# ==================== PRESET ENDPOINTS ====================

PRESETS_DIR = Path(__file__).parent.parent / "data" / "presets"

@app.get("/api/presets/finos", response_model=DetectFacesResponse)
async def get_finos_preset(user: dict = Depends(require_auth)):
    """Get pre-detected faces from FinOS team photo."""
    preset_path = PRESETS_DIR / "finos.jpg"

    if not preset_path.exists():
        raise HTTPException(404, "FinOS preset image not found")

    # Load image
    img = cv2.imread(str(preset_path))
    if img is None:
        raise HTTPException(500, "Failed to load preset image")

    height, width = img.shape[:2]

    # Detect faces
    faces = face_analyzer.get(img)

    if not faces:
        raise HTTPException(500, "No faces detected in preset image")

    # Process each face
    result_faces = []
    for face in faces:
        bbox = face.bbox.astype(int)

        # Clamp bbox to image bounds
        x1, y1, x2, y2 = max(0, bbox[0]), max(0, bbox[1]), min(width, bbox[2]), min(height, bbox[3])

        # Skip tiny faces
        if (x2 - x1) < 30 or (y2 - y1) < 30:
            continue

        # Crop face and encode as base64
        crop = img[y1:y2, x1:x2]
        crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(crop_rgb)
        pil_img.thumbnail((150, 150))

        buffer = BytesIO()
        pil_img.save(buffer, format="JPEG", quality=85)
        thumbnail_b64 = base64.b64encode(buffer.getvalue()).decode()

        # Store embedding temporarily
        temp_id = face_matcher.store_temp_face(face.embedding)

        result_faces.append(DetectedFace(
            temp_id=temp_id,
            thumbnail=f"data:image/jpeg;base64,{thumbnail_b64}",
            bbox=BBox(x=int(x1), y=int(y1), w=int(x2 - x1), h=int(y2 - y1)),
            score=float(face.det_score)
        ))

    # Sort by x position (left to right)
    result_faces.sort(key=lambda f: f.bbox.x)

    return DetectFacesResponse(
        faces=result_faces,
        image_size=ImageSize(width=width, height=height)
    )


# Serve frontend static files
STATIC_DIR = Path(__file__).parent.parent / "frontend" / "dist"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/", response_class=HTMLResponse)
    async def serve_frontend():
        """Serve frontend index.html."""
        return (STATIC_DIR / "index.html").read_text()

    @app.get("/{path:path}")
    async def serve_static(path: str):
        """Serve static files or fallback to index.html for SPA routing."""
        file_path = STATIC_DIR / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return HTMLResponse((STATIC_DIR / "index.html").read_text())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
