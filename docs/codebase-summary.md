# Codebase Summary - YEP Photo Finder

**Last Updated:** February 1, 2026
**Total LOC:** 2,262 | **Files:** 40 | **Security:** No suspicious content detected

## Quick Overview

YEP Photo Finder is a face recognition web application built with FastAPI (backend), React (frontend), and InsightFace (ML model). Users upload a selfie, select their detected face, then search and download matching photos from a pre-indexed photo library.

## Architecture Layers

```
Frontend (React 19 + Vite)
         ↓
API Client (Axios)
         ↓
FastAPI Backend (8 routes groups)
         ↓
Face Matcher (In-memory embeddings)
         ↓
SQLite Database (2 tables)
```

## Directory Structure

### `/backend` (890 LOC)
**Purpose:** FastAPI REST API with face detection and search

| File | LOC | Responsibility |
|------|-----|-----------------|
| `main.py` | 456 | FastAPI routes, face detection, photo serving, preset endpoints |
| `face_matcher.py` | 119 | Cosine similarity search, temp face storage |
| `database.py` | 127 | SQLite schema, CRUD operations for photos/faces |
| `auth.py` | 97 | Microsoft OAuth flow, JWT token management |
| `models.py` | 55 | Pydantic models for API requests/responses |
| `config.py` | 36 | Environment-based configuration |

### `/frontend/src` (1,038 LOC)
**Purpose:** React SPA for upload, face selection, search results

| File | LOC | Responsibility |
|------|-----|-----------------|
| `App.jsx` | 296 | Main component, routing, auth check, state management |
| `components/PhotoGallery.jsx` | 304 | Display search results, download selection |
| `components/PhotoUpload.jsx` | 163 | Image upload, validation, face detection API |
| `components/FaceSelector.jsx` | 117 | Display detected faces, selection UI |
| `components/LoginPage.jsx` | 81 | Microsoft OAuth login interface |
| `api/client.js` | 74 | Axios HTTP client with API endpoints |

### `/scripts` (327 LOC)
**Purpose:** One-time data preprocessing scripts

| File | LOC | Responsibility |
|------|-----|-----------------|
| `index_faces.py` | 161 | Scan photos, detect faces, compute embeddings, store in DB |
| `download_photos.py` | 166 | Download photos from Google Drive via gdown |

## Core Components

### Face Detection & Search Flow

1. **User Upload** → FE sends image to `/api/detect-faces`
2. **Detection** → InsightFace buffalo_l model extracts face embeddings
3. **Temp Storage** → Embedding stored in-memory with UUID (30-min TTL)
4. **Search** → User selects face, frontend calls `/api/search` with temp_id
5. **Similarity** → FaceMatcher computes cosine similarity against DB embeddings
6. **Results** → Returns top-N matching photos sorted by score

### Database Schema

```sql
photos (id, filename, path, width, height, indexed_at)
faces (id, photo_id, bbox_x, bbox_y, bbox_w, bbox_h, embedding, detection_score)
  ↑ embedding: 512-dim float32 stored as BLOB
  ↑ detection_score: face confidence from InsightFace
```

### In-Memory Optimization

- **FaceMatcher** loads all embeddings into NumPy array at startup
- **Cosine similarity** via normalized dot product (O(N) per search)
- **Deduplication** returns best match per photo
- **Threading lock** prevents race conditions on temp face storage

## Authentication

**Two Modes:**
- **OAuth Disabled** (default): Anyone can access
- **OAuth Enabled** (with env vars): Microsoft Azure AD login required

| Component | Responsibility |
|-----------|-----------------|
| `auth.py` | MSAL app, OAuth URL generation, token exchange, domain validation |
| JWT tokens | 24-hour session, stored in HttpOnly cookie |
| `require_auth()` | FastAPI dependency for protected routes |

## Configuration

**Environment Variables** (in `backend/.env`):
- `MS_CLIENT_ID`, `MS_TENANT_ID`, `MS_CLIENT_SECRET` → OAuth credentials
- `ALLOWED_DOMAIN` → Email domain restriction (default: "finos.asia")
- `DEFAULT_THRESHOLD` → Face match similarity threshold (default: 0.5)
- `DEFAULT_LIMIT` → Max results per search (default: 50)
- `TEMP_FACE_TTL` → Temp embedding lifetime in seconds (default: 1800)

## API Endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/health` | - | Health check |
| GET | `/auth/login` | - | Redirect to MS login |
| GET | `/auth/callback` | - | OAuth callback handler |
| GET | `/auth/logout` | - | Clear session |
| GET | `/api/auth-status` | - | Check if OAuth enabled |
| GET | `/api/me` | opt | Get current user info |
| POST | `/api/detect-faces` | opt | Upload image, get faces |
| POST | `/api/search` | opt | Search matching photos |
| GET | `/api/photos/{id}` | opt | Serve original photo |
| GET | `/api/photos/{id}/thumbnail` | opt | Serve 300px thumbnail |
| POST | `/api/download-zip` | opt | Generate ZIP of photos |
| POST | `/api/reload-embeddings` | opt | Reload DB embeddings |
| GET | `/api/presets/finos` | opt | Pre-detected team faces |
| GET | `/api/stats` | opt | DB statistics |

## Frontend State Management

**App.jsx** uses React hooks for state:

| State | Type | Purpose |
|-------|------|---------|
| `step` | String | Navigation: UPLOAD → SELECT → RESULTS |
| `faces` | Array | Detected faces with thumbnails |
| `selectedFace` | Object | User's chosen face for search |
| `matches` | Array | Search results with similarity scores |
| `presetName` | String | Optional preset route (e.g., "finos") |
| `user` | Object | Auth user info or Guest |
| `authEnabled` | Boolean | Whether OAuth is configured |

## Key Technologies

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | FastAPI | Latest |
| Frontend | React | 19 |
| Build | Vite | Latest |
| Styling | TailwindCSS | Latest |
| ML Model | InsightFace buffalo_l | Latest |
| Database | SQLite | Built-in |
| Auth | MSAL | Python |
| Image Processing | OpenCV, Pillow | Latest |

## File Size Notes

- **frontend/dist/assets/** → Generated during build, ~500KB
- **data/database.db** → Grows with photos (~50MB for 5K photos)
- **data/photos/** → Not in git (externally managed)

## Development Commands

```bash
# Scripts setup & indexing
python3 -m venv scripts/.venv
source scripts/.venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/index_faces.py

# Backend
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
python backend/main.py  # Runs on :8000

# Frontend
cd frontend
npm install
npm run dev  # Runs on :5173

# Production build
npm run build  # Output to dist/
```

## Performance Characteristics

| Operation | Time (5K photos) | Scaling |
|-----------|------------------|---------|
| Face indexing | ~30 min | Linear with photo count |
| Search | <100ms | Constant (O(N) embeddings) |
| Thumbnail gen | <50ms | Linear with size |
| ZIP creation | <500ms | Linear with file count |

## Security Considerations

- **OAuth**: Validates email domain before session creation
- **CORS**: Allows all origins (dev-friendly, use reverse proxy in production)
- **Cookies**: HttpOnly, Secure flags set for JWT
- **File serving**: Validates photo_id existence before serving
- **ZIP limits**: Max 200 photos per download
- **Input**: Image validation via OpenCV
- **Embeddings**: Binary BLOB stored as-is (no encryption)

## Known Limitations

1. **In-memory embeddings** → Restart required after re-indexing
2. **Single-process** → No distributed search
3. **No image deduplication** → Same photo in multiple files counted separately
4. **No face tracking** → Detects each upload independently
5. **CORS permissive** → Not production-ready without auth
6. **Temp faces TTL** → 30-min timeout could expire during long sessions
7. **Preset endpoint** → Hardcoded to "finos" team photo only

## Dependencies Summary

**Backend**: fastapi, uvicorn, insightface, numpy, pillow, opencv-python, msal, python-jose, python-dotenv

**Frontend**: react, react-dom, react-hot-toast, axios, tailwindcss

**Scripts**: insightface, opencv-python, numpy, pillow, tqdm, gdown

Total external packages: ~50 (via pip/npm)

## Next Steps for Enhancement

- Implement pagination for large result sets
- Add image deduplication (hash-based)
- Support multiple preset teams
- Add search filters (date, size, tags)
- Implement server-side session store (Redis)
- Add distributed face indexing
- Support incremental DB updates
