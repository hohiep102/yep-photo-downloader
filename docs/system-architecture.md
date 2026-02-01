# System Architecture

**Project:** YEP Photo Finder
**Version:** 1.0.0
**Updated:** February 1, 2026

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Device (Browser)                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │            React 19 SPA (Vite + TailwindCSS)            │ │
│ │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│ │  │ PhotoUpload  │  │ FaceSelector │  │ PhotoGallery │   │ │
│ │  └──────────────┘  └──────────────┘  └──────────────┘   │ │
│ │         ↓                 ↓                    ↓          │ │
│ │  ┌────────────────────────────────────────────────────┐  │ │
│ │  │       Axios HTTP Client (api/client.js)           │  │ │
│ │  └────────────────────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────┴──────────────────────────────────────┐
│                   FastAPI Backend (8000)                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                     main.py                              │ │
│ │  ┌──────────────────────────────────────────────────┐   │ │
│ │  │         CORS Middleware & Auth Dependency        │   │ │
│ │  └──────────────────────────────────────────────────┘   │ │
│ │  ┌────────────┐  ┌────────────┐  ┌────────────────┐    │ │
│ │  │Auth Routes │  │ API Routes │  │ Preset Routes  │    │ │
│ │  └────────────┘  └────────────┘  └────────────────┘    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │              Service Layer                                │ │
│ │ ┌──────────────┐  ┌────────────────┐  ┌──────────────┐  │ │
│ │ │ face_matcher │  │ database.py    │  │ auth.py      │  │ │
│ │ │              │  │                │  │              │  │ │
│ │ │ - search()   │  │ - CRUD ops     │  │ - OAuth      │  │ │
│ │ │ - store_temp │  │ - init_db      │  │ - JWT tokens │  │ │
│ │ │ - normalize  │  │ - queries      │  │ - domain chk │  │ │
│ │ └──────────────┘  └────────────────┘  └──────────────┘  │ │
│ └──────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │              ML Model Layer                               │ │
│ │  InsightFace (buffalo_l) - Face detection & embedding    │ │
│ └──────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │              Data Layer                                   │ │
│ │  ┌──────────────────────────────────────────────────┐   │ │
│ │  │           SQLite Database                        │   │ │
│ │  │  ┌─────────────────┐  ┌──────────────────────┐  │   │ │
│ │  │  │ photos table    │  │ faces table          │  │   │ │
│ │  │  │ ┌─────────────┐ │  │ ┌──────────────────┐ │  │   │ │
│ │  │  │ │ id, path    │ │  │ │ id, embedding    │ │  │   │ │
│ │  │  │ │ filename    │ │  │ │ photo_id (FK)    │ │  │   │ │
│ │  │  │ │ dimensions  │ │  │ │ bbox coordinates │ │  │   │ │
│ │  │  │ │ indexed_at  │ │  │ │ detection_score  │ │  │   │ │
│ │  │  │ └─────────────┘ │  │ └──────────────────┘ │  │   │ │
│ │  │  └─────────────────┘  └──────────────────────┘  │   │ │
│ │  └──────────────────────────────────────────────────┘   │ │
│ │                   database.db                            │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                          ↓
         ┌─────────────────────────────────┐
         │   File System (data/photos)      │
         │   Original photo JPEGs           │
         └─────────────────────────────────┘
```

## Component Interactions

### 1. Upload & Face Detection Flow

```
User opens app
     ↓
Click "Upload Photo"
     ↓
Select image file (JPEG, PNG, WebP, BMP)
     ↓
Frontend: POST /api/detect-faces (multipart form-data)
     ↓
Backend main.py:
  1. Read image bytes
  2. Decode with cv2.imdecode()
  3. Call face_analyzer.get(img)
     ↓
InsightFace buffalo_l:
  1. Detects faces in image
  2. Returns bounding boxes + embeddings (512-dim)
  3. Returns detection confidence scores
     ↓
main.py processes each face:
  1. Clamp bbox to image bounds
  2. Skip if bbox < 30×30 pixels
  3. Crop face region
  4. Resize to 150×150
  5. JPEG encode → base64 thumbnail
  6. Store embedding in temp memory (UUID key)
  7. Include detection_score in response
     ↓
Response: {faces: [{temp_id, thumbnail, bbox, score}], image_size}
     ↓
Frontend displays thumbnails with confidence scores
     ↓
User selects 1 face for search
```

### 2. Face Search Flow

```
User selects face & clicks "Search"
     ↓
Frontend: POST /api/search
{
  "temp_face_id": "uuid-here",
  "threshold": 0.5,  // optional, default 0.5
  "limit": 50        // optional, default 50
}
     ↓
Backend main.py:
  1. Call face_matcher.search(temp_face_id, threshold, limit)
     ↓
FaceMatcher.search():
  1. Retrieve embedding from temp_faces dict (UUID lookup)
  2. If not found or expired → return []
  3. Check if embeddings loaded from database
  4. Normalize query embedding (L2 norm)
  5. Compute cosine similarity: dot product with all DB embeddings
     ↓
     Cosine Similarity = (A · B) / (||A|| × ||B||)
     (Already normalized, so: dot product = similarity)
     ↓
  6. Filter by threshold (keep scores >= 0.5)
  7. Sort descending by similarity score
  8. Deduplicate by photo_id (keep best match per photo)
  9. Limit to top N results
     ↓
Result: [{face_id, photo_id, similarity}, ...]
     ↓
main.py enriches results:
  1. For each match, query database: get_photo_by_id()
  2. Build response: {photo_id, similarity, thumbnail_url, filename}
     ↓
Response: {matches: [{photo_id, similarity, thumbnail_url, filename}], total}
     ↓
Frontend displays gallery:
  1. Show matching photos as thumbnails
  2. Display similarity scores (0.95, 0.88, etc.)
  3. Sort by score descending
  4. Show filename on hover/below image
     ↓
User selects photos to download
```

### 3. Download Flow

```
User selects photos (checkboxes) & clicks "Download as ZIP"
     ↓
Frontend: POST /api/download-zip
{
  "photo_ids": [1, 5, 12, 8]
}
     ↓
Backend main.py:
  1. Validate: photo_ids not empty
  2. Validate: <= 200 photos
  3. For each photo_id:
     a. Query database: get_photo_by_id()
     b. Check if file exists on disk
     c. Add to photos list
     ↓
  4. Create ZIP in memory (BytesIO buffer):
     a. For each valid photo:
        - Open file
        - Add to zip with original filename
        - zip.write(path, arcname=filename)
     b. Compress with DEFLATE algorithm
     ↓
  5. Stream ZIP response:
     - Content-Type: application/zip
     - Content-Disposition: attachment; filename=yep-photos.zip
     - Stream buffer contents to client
     ↓
Frontend:
  1. Browser receives ZIP stream
  2. Triggers download dialog
  3. File saved to Downloads folder
```

### 4. Preset Team Flow

```
User navigates to /finos
     ↓
Frontend: Detect /finos route
     ↓
Frontend: GET /api/presets/finos
     ↓
Backend main.py:
  1. Load preset image from: data/presets/finos.jpg
  2. Call face_analyzer.get(img) on preset image
  3. Process all detected faces (same as upload)
  4. Store embeddings in temp memory
  5. Sort by bbox.x (left to right)
  6. Return all detected faces
     ↓
Response: {faces: [{temp_id, thumbnail, bbox, score}, ...], image_size}
     ↓
Frontend: Display all team members' faces
     ↓
User: Click any face → immediately search for that person
```

## Data Flow Diagram

```
UPLOAD PHASE:
  Image File → cv2.imdecode() → InsightFace.get() → embeddings + bboxes
       ↓
       └→ Thumbnails (JPEG base64) to Frontend
       └→ Embeddings stored temporarily (UUID key)

SEARCH PHASE:
  Temp Embedding → Normalize L2 → Cosine Similarity with DB Embeddings
       ↓
       └→ Filter by Threshold → Sort Descending → Deduplicate
       ↓
       └→ Enrich with photo metadata (filename, path)
       ↓
       └→ Results to Frontend

DOWNLOAD PHASE:
  Photo IDs → Query DB → Get file paths → ZIP in memory → Stream to Browser
```

## Technology Stack Details

### Backend: FastAPI
- **Async support:** All routes async for concurrent requests
- **Lifespan management:** Initialize face analyzer + face matcher on startup
- **CORS:** Allow all origins (for development)
- **Response models:** Pydantic validation for all API responses
- **Error handling:** HTTPException for API errors (400, 404, 500)

### ML Model: InsightFace
- **Model:** buffalo_l (lightweight, high accuracy)
- **Detection:** YOLO-style face detector
- **Embedding:** 512-dimensional vector (L2 normalized)
- **Performance:** ~100ms per image (M1 Mac)
- **Providers:** CoreML (Apple Silicon), CPU fallback

### Database: SQLite
- **Schema:** 2 tables (photos, faces) with FK constraint
- **Indexes:** idx_faces_photo_id on photo_id
- **Transactions:** Atomic commits in database.py
- **Blob storage:** Embeddings as binary (512 × float32 = 2KB each)

### Frontend: React 19 + Vite
- **State management:** React hooks (useState, useEffect)
- **Routing:** Client-side via window.location.pathname
- **Styling:** TailwindCSS (no CSS-in-JS overhead)
- **Toast notifications:** react-hot-toast for user feedback
- **HTTP client:** Axios with centralized config (api/client.js)

## Performance Characteristics

### Face Detection
- **Input:** One image, any size
- **Processing:** Resize → detector → embedder
- **Output:** N faces with embeddings
- **Time:** ~3 seconds for 4K image (M1 Mac)
- **Bottleneck:** Large image resize

### Face Search
- **Input:** One 512-dim embedding
- **Processing:** Cosine similarity (dot product × N times)
- **Output:** Top-K matches
- **Time:** <100ms for 5K photos
- **Optimization:** Pre-normalized embeddings, NumPy vectorized ops

### Photo Indexing (One-time)
- **Input:** Directory of photos
- **Processing:** For each photo, detect faces and store
- **Output:** database.db with all embeddings
- **Time:** ~6 min per 1000 photos (M1 Mac, parallel processing)
- **Parallelization:** Could use ThreadPoolExecutor (not in current code)

## Scalability Considerations

### Current Limitations
- **Single process:** Can't horizontally scale without changes
- **In-memory embeddings:** All must fit in RAM
- **No caching:** Recalculates similarity each search
- **No distribution:** All requests processed sequentially

### Scaling Strategies (Future)
1. **Load balancer** → Multiple backend instances
2. **Vector DB** → FAISS for sub-linear search
3. **Cache layer** → Redis for popular searches
4. **Worker queue** → Celery for face indexing
5. **Sharding** → Split embeddings by hash range

## Security Architecture

### Authentication Flow (Optional)
```
1. User clicks "Login"
   ↓
2. Redirect to /auth/login
   ↓
3. Generate state token (CSRF protection)
   ↓
4. Redirect to Microsoft OAuth consent
   ↓
5. User grants permission, redirected to /auth/callback with code
   ↓
6. Backend exchanges code for tokens via MSAL
   ↓
7. Extract user info from id_token_claims
   ↓
8. Validate email domain (e.g., @finos.asia)
   ↓
9. Create JWT (24-hour expiry)
   ↓
10. Set HttpOnly cookie with JWT
    ↓
11. Redirect to requested page
```

### Protected Resources
- All API endpoints can check `require_auth()` dependency
- If AUTH_ENABLED=False, dependency returns guest user
- If AUTH_ENABLED=True, dependency validates session cookie
- Cookie validation via JWT decode

### CORS & HTTPS
- Current: CORS allows all origins (development only)
- Production: Add reverse proxy (nginx) with:
  - HTTPS enforcement
  - CORS headers restricted to origin
  - Rate limiting
  - Request size limits

## Error Handling Strategy

### Frontend
- **Upload errors:** File validation → display toast
- **Network errors:** Catch in try/catch → toast message
- **Validation errors:** Pre-check file size, type → error message
- **State errors:** Render fallback UI (empty gallery, retry button)

### Backend
- **Invalid image:** HTTPException 400 ("Invalid image file")
- **No faces detected:** HTTPException 400 ("No faces detected")
- **Photo not found:** HTTPException 404 ("Photo not found")
- **Database error:** Implicit 500 (FastAPI default)
- **Large upload:** Implicit 413 (size limit reached)

### Logging
- Print to stdout: app startup, face counts, errors
- No structured logging (future: Python logging module)
- No sensitive data logged (no embeddings, no user tokens)

## Deployment Architecture

### Minimal Setup
```
localhost:5173 (Frontend - Vite dev server)
     ↓
localhost:8000 (Backend - FastAPI)
     ↓
data/photos/ (Photos on disk)
     ↓
data/database.db (SQLite)
```

### Production Setup (Recommended)
```
Nginx (reverse proxy, SSL, compression)
     ↓
     ├→ :8000 (FastAPI backend, multiple workers)
     ├→ :8001 (FastAPI backend, multiple workers)
     └→ :8002 (FastAPI backend, multiple workers)
     ↓
shared_storage/ (NFS mount)
     ├→ data/photos/ (all photos)
     └→ data/database.db (shared DB)
     ↓
Redis (optional: session store, cache)
```

### Container Deployment (Docker)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ ./backend
COPY data/ ./data
CMD ["python", "backend/main.py"]
```

## Monitoring & Health Checks

### Health Endpoint
```python
GET /health → {status: "ok"}
```

### Metrics to Monitor
- Request latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Database size (photos, faces count)
- Memory usage (embeddings size)
- Concurrent connections
- Face detection time per image
- Search latency

## Configuration Management

### Environment Variables (backend/.env)
```bash
# OAuth (optional)
MS_CLIENT_ID=xxx
MS_TENANT_ID=xxx
MS_CLIENT_SECRET=xxx
ALLOWED_DOMAIN=finos.asia

# Face matching
DEFAULT_THRESHOLD=0.5
DEFAULT_LIMIT=50

# Server
HOST=0.0.0.0
PORT=8000
```

### Runtime Configuration (config.py)
- Loads from .env via python-dotenv
- Validates required vs optional
- Provides sensible defaults

## Future Architecture Improvements

1. **Split main.py routes** into router modules
2. **Add structured logging** with context tracking
3. **Implement caching** for popular searches
4. **Extract temp face cleanup** to background task
5. **Add database migrations** for schema changes
6. **Implement rate limiting** per user/IP
7. **Add observability** (Prometheus metrics, traces)
8. **Support S3/cloud storage** for photos
9. **Distributed indexing** with worker queue
10. **API versioning** for backward compatibility

---

**Document Version:** 1.0
**Architecture Review Date:** Feb 1, 2026
