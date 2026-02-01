# Project Overview & Product Development Requirements (PDR)

**Project:** YEP Photo Finder
**Version:** 1.0.0
**Status:** MVP Complete
**Last Updated:** February 1, 2026

## Executive Summary

YEP Photo Finder is a web application that leverages face recognition AI to help users find and download photos of themselves from large event photo collections. Users upload a selfie, select their detected face, then search a pre-indexed database of thousands of photos to find matches. The app enables efficient photo discovery and batch downloads as ZIP files.

**Target Users:** Event attendees (conferences, year-end parties, team gatherings)
**Use Case:** "Find all photos of me at the event"

## Problem Statement

Event photo collections often contain thousands of photos. Traditional methods (scrolling, manual search) are time-consuming and inefficient. Users need a fast, reliable way to find photos of themselves without manual review.

## Solution Overview

Automated face matching pipeline:
1. Pre-process photos: Extract face embeddings using AI model, store in indexed database
2. User uploads selfie: System detects face, generates embedding
3. Intelligent search: Compare against photo library via cosine similarity
4. Download: Package matching photos as ZIP

**Key Innovation:** InsightFace buffalo_l model achieves high accuracy (85-95%) on diverse faces while remaining computationally efficient for local deployment.

## Functional Requirements

### FR1: Face Detection & Upload
- Accept image uploads (JPEG, PNG, WebP, BMP) up to 15MB
- Detect all human faces in uploaded image (min 30px × 30px)
- Extract face embeddings (512-dimensional vectors)
- Return detected faces with thumbnails (150×150px, base64)
- Display bounding boxes and confidence scores

**Acceptance Criteria:**
- Detect ≥90% of faces in test images
- Process upload within 3 seconds
- Handle images up to 4K resolution
- Gracefully handle no-face scenarios with error message

### FR2: Face Selection Interface
- Display detected faces as interactive thumbnails
- Allow user to select one face for search
- Auto-select if only one face detected
- Show confidence scores and bounding boxes
- Support mobile device interaction

**Acceptance Criteria:**
- Selection intuitive for non-technical users
- Touch-friendly on mobile (≥44px buttons)
- Clear visual indication of selected face
- Keyboard accessible (Tab, Enter)

### FR3: Face Search & Matching
- Query embeddings against indexed database
- Return photos with similarity scores (0.0-1.0)
- Filter results by configurable threshold (default 0.5)
- Limit results (default 50, max 200)
- Sort results by similarity descending
- Deduplicate by photo (return best match)

**Acceptance Criteria:**
- Search completes in <100ms for 5K photos
- Cosine similarity accuracy matches InsightFace baseline
- Results include filename and similarity score
- Threshold adjustable via UI (0.3-0.9 range)

### FR4: Photo Browsing & Download
- Display search results as thumbnail gallery
- Show similarity scores and filenames
- Support multi-select of photos
- Generate ZIP archive of selected photos
- Limit downloads to max 200 photos
- Stream ZIP directly (no temp storage)

**Acceptance Criteria:**
- Thumbnails load within 2 seconds
- ZIP creation <500ms for 200 photos
- Filenames preserved in archive
- Download dialog appears in browser

### FR5: Authentication (Optional)
- Support Microsoft OAuth flow (Azure AD)
- Validate email domain before access
- Create 24-hour session tokens (JWT)
- HttpOnly cookie session storage
- Logout endpoint clears session

**Acceptance Criteria:**
- OAuth disabled by default (allow public access)
- With env vars set, require login before use
- Session persists across page reloads
- Logout clears all access

### FR6: Preset Teams (Optional)
- Support pre-loaded team photos (e.g., /finos route)
- Detect faces in preset image at request time
- Return pre-detected faces for immediate search
- Sort faces left-to-right by bounding box

**Acceptance Criteria:**
- Load team preset within 5 seconds
- Display all detected faces
- Skip tiny/low-confidence faces
- Support extensible preset structure

### FR7: Statistics & Admin
- Return database statistics (photo count, face count, last indexed)
- Expose reload-embeddings endpoint (after re-indexing)
- Health check endpoint for monitoring

**Acceptance Criteria:**
- Stats endpoint returns accurate counts
- Reload endpoint updates in-memory cache
- Health endpoint responds within 1 second

## Non-Functional Requirements

### NFR1: Performance
- Face detection: <3 seconds per image
- Search query: <100ms against 5K photos
- Thumbnail generation: <50ms
- ZIP creation: <500ms for 200 photos
- Frontend: FCP <1.5s, LCP <3s (Lighthouse target)

### NFR2: Scalability
- Support up to 50K photos (≥100 faces per photo)
- Handle 10+ concurrent uploads
- Grow database without restart (reload endpoint)
- Scale horizontally with load balancer (future)

### NFR3: Reliability
- 99.5% uptime SLA for hosted version
- Graceful handling of corrupted images
- Database atomic transactions (photo + faces)
- Automatic cleanup of expired temp embeddings
- Health check for monitoring

### NFR4: Security
- Validate all image inputs (MIME type, size)
- No server-side file path traversal
- CORS headers appropriate for deployment
- OAuth domain validation (if enabled)
- HttpOnly cookies for sessions
- No sensitive data in logs

### NFR5: Usability
- Intuitive UI for non-technical users
- Mobile-first responsive design
- Accessibility (WCAG 2.1 AA target)
- Error messages clear and actionable
- Loading states for long operations

### NFR6: Maintainability
- <200 LOC per file (modular)
- Self-documenting code with comments
- Comprehensive API documentation
- Clear separation of concerns
- Environment-based configuration

## Architecture Decisions

| Decision | Rationale | Alternative |
|----------|-----------|--------------|
| InsightFace buffalo_l | High accuracy, lightweight, fast inference | YOLOv8 Face, MediaPipe (slower) |
| In-memory embeddings | Sub-100ms searches, simple deployment | FAISS, Redis (added complexity) |
| FastAPI | Modern async, auto-docs, simple | Flask, Django (heavier) |
| React 19 + Vite | Fast builds, modern features, productive | Vue, Angular (heavier) |
| SQLite | Zero-config, file-based, sufficient for scale | PostgreSQL (overkill for MVP) |
| Cosine similarity | Proven for embeddings, fast normalized | Euclidean distance (slower) |

## Data Models

### Photo
```python
id: int (PK)
filename: str (UNIQUE)
path: str
width: int
height: int
indexed_at: datetime
```

### Face
```python
id: int (PK)
photo_id: int (FK)
bbox_x, bbox_y, bbox_w, bbox_h: int
embedding: float32[512] (BLOB)
detection_score: float (0-1)
```

## API Contracts (Core)

### POST /api/detect-faces
Request: Image file (multipart)
Response: `{faces: [{temp_id, thumbnail, bbox, score}], image_size}`
Errors: 400 (invalid/no faces), 413 (too large)

### POST /api/search
Request: `{temp_face_id, threshold?, limit?}`
Response: `{matches: [{photo_id, similarity, thumbnail_url, filename}], total}`
Errors: 400 (invalid ID/params), 404 (temp face expired)

### POST /api/download-zip
Request: `{photo_ids: [int]}`
Response: ZIP stream (Content-Disposition: attachment)
Errors: 400 (empty list, >200 photos), 404 (photos not found)

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Search Accuracy | 85%+ match users to photos | User feedback, manual review |
| Search Latency | <100ms (p95) | Server logs, performance monitor |
| User Satisfaction | 4.5+/5 stars | Post-event survey |
| Time to Find Photos | <2 minutes avg | UX telemetry |
| Photo Download Rate | 70%+ conversion | Analytics |
| System Uptime | 99.5% | Uptime monitoring |

## Constraints & Limitations

### Technical
- Single-process backend (no horizontal scaling in MVP)
- No image deduplication (same photo in multiple files counted separately)
- Temp embeddings cleared after 30 minutes
- Preset endpoint hardcoded to "finos" team
- No incremental DB updates (full re-index required)

### Operational
- Requires photo indexing before launch (~30 min for 5K photos)
- No backup strategy (external DB backup needed)
- Manual deployment (no CI/CD in MVP)
- Limited monitoring (no dashboard)

### Legal
- Face recognition requires user consent
- Privacy policy required (mention data handling)
- GDPR compliance for EU users (data deletion)

## Dependencies

**External Services:**
- Microsoft Azure AD (optional, for OAuth)
- Google Drive (optional, for photo downloads via script)

**Open Source Libraries:**
- InsightFace (Apache 2.0)
- FastAPI (MIT)
- React (MIT)
- All others: MIT/Apache 2.0 compatible

## Deployment Considerations

### Minimal Setup
1. Clone repository
2. `pip install -r backend/requirements.txt`
3. `npm install && npm run build` (frontend)
4. `python scripts/index_faces.py` (on photo directory)
5. `python backend/main.py` (start API)
6. Open http://localhost:5173

### Production Setup
1. Containerize (Docker)
2. Add reverse proxy (nginx/Caddy) with SSL
3. Enable OAuth with Azure AD credentials
4. Move photos to fast storage (SSD)
5. Set up monitoring (Prometheus, Sentry)
6. Configure database backup
7. Use process manager (systemd, supervisor)

## Timeline & Phases

| Phase | Status | Duration | Deliverable |
|-------|--------|----------|-------------|
| Phase 1: Core MVP | Complete | 4 weeks | Face detection + search + download |
| Phase 2: Auth | Complete | 2 weeks | OAuth integration |
| Phase 3: UI/UX | Complete | 3 weeks | Mobile-friendly React components |
| Phase 4: Testing | Complete | 2 weeks | Unit + E2E tests |
| Phase 5: Docs | In Progress | 1 week | Technical + user docs |

## Future Enhancements

1. **Advanced Search**
   - Multiple face selection (AND/OR logic)
   - Search by photo date/size/tags
   - Fuzzy search on filenames

2. **Scalability**
   - Distributed face indexing
   - FAISS vector index for sub-100ms searches
   - Redis session store
   - Horizontal scaling with load balancer

3. **Features**
   - Batch upload (multiple photos)
   - Face labeling & groups
   - Smart albums by event/date
   - Export to cloud (Google Photos, OneDrive)

4. **Admin**
   - Dashboard with analytics
   - Photo management UI
   - User activity logs
   - Face embedding quality scores

5. **AI Improvements**
   - Duplicate photo detection (perceptual hashing)
   - Face re-identification across angles
   - Age/emotion classification
   - Automatic face clustering

## Unresolved Questions

None at this time. MVP requirements are well-defined.

---

**Document Version:** 1.0
**Author:** Development Team
**Last Reviewed:** Feb 1, 2026
