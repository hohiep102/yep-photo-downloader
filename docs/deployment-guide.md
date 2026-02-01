# Deployment Guide

**Project:** YEP Photo Finder
**Updated:** February 1, 2026
**Target Audience:** DevOps engineers, system administrators

## Quick Start (5 Minutes)

For local development or small-scale deployment:

```bash
# 1. Clone repository
git clone <repo-url>
cd yepDownloader

# 2. Create data directories
mkdir -p data/photos data/presets

# 3. Setup backend
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

# 4. Setup frontend
cd frontend
npm install
npm run build
cd ..

# 5. Setup scripts (optional, for indexing)
python3 -m venv scripts/.venv
source scripts/.venv/bin/activate
pip install -r scripts/requirements.txt

# 6. Index photos (first time only, ~6 min per 1000 photos)
python scripts/index_faces.py

# 7. Start backend
python backend/main.py
# Runs on http://localhost:8000

# 8. Open app
# Frontend served from backend (port 8000)
# Open http://localhost:8000 in browser
```

## Detailed Setup

### Prerequisites

**System Requirements:**
- CPU: 2+ cores (4+ for good performance)
- RAM: 4GB minimum (8GB+ recommended for 10K+ photos)
- Storage: SSD preferred (HDD acceptable)
- OS: Linux, macOS, or Windows (with WSL2)

**Software Requirements:**
- Python 3.11+
- Node.js 18+
- pip, npm (package managers)
- Git (for cloning)

**Optional:**
- ngrok (for sharing via public URL)
- Docker (for containerized deployment)
- nginx (for reverse proxy in production)

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/yepDownloader.git
cd yepDownloader

# Verify directory structure
ls -la
# Expected: backend/ frontend/ scripts/ data/ README.md CLAUDE.md
```

### Step 2: Create Directory Structure

```bash
# Create directories for photos and presets
mkdir -p data/photos
mkdir -p data/presets

# Verify
ls -la data/
# Expected: empty directories (photos, presets)
```

### Step 3: Setup Backend

#### 3.1 Create Python Virtual Environment

```bash
# Create venv
python3 -m venv backend/.venv

# Activate venv
# On macOS/Linux:
source backend/.venv/bin/activate

# On Windows (cmd):
backend\.venv\Scripts\activate.bat

# On Windows (PowerShell):
backend\.venv\Scripts\Activate.ps1

# Verify activation
which python  # Should show .venv path
```

#### 3.2 Install Dependencies

```bash
cd backend

# Upgrade pip
pip install --upgrade pip

# Install requirements
pip install -r requirements.txt

# Verify installations
python -c "import fastapi; import insightface; print('✓ All imports OK')"

cd ..
```

#### 3.3 Configure Environment (Optional)

```bash
# Copy example config
cp backend/.env.example backend/.env

# Edit backend/.env if using Microsoft OAuth
# Required fields for OAuth:
#   MS_CLIENT_ID=your-azure-app-id
#   MS_TENANT_ID=your-azure-tenant-id
#   MS_CLIENT_SECRET=your-app-secret
#   ALLOWED_DOMAIN=your-company.com

# Without these, auth is disabled (open access)
```

### Step 4: Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build
# Output: dist/ directory with static files

# Verify build
ls -la dist/
# Expected: index.html, assets/, etc.

cd ..
```

### Step 5: Setup Scripts (Optional)

Only needed if downloading photos from Google Drive or re-indexing.

```bash
python3 -m venv scripts/.venv

# Activate
source scripts/.venv/bin/activate

# Install dependencies
pip install -r scripts/requirements.txt

# Verify
python -c "import insightface; print('✓ InsightFace ready')"
```

### Step 6: Prepare Photos

#### Option A: Copy Photos Manually

```bash
# Copy photos to data/photos/
cp /path/to/your/photos/*.jpg data/photos/
cp /path/to/your/photos/*.png data/photos/

# Verify
ls -la data/photos/ | head -20
# Expected: list of image files
```

#### Option B: Download from Google Drive

```bash
# Activate scripts venv
source scripts/.venv/bin/activate

# Run downloader
python scripts/download_photos.py "https://drive.google.com/drive/folders/YOUR_FOLDER_ID"

# This downloads all photos to data/photos/
```

### Step 7: Index Faces

This extracts face embeddings and stores them in the database.

```bash
# Activate scripts venv (if not already)
source scripts/.venv/bin/activate

# Run indexer
python scripts/index_faces.py

# Expected output:
# Loading InsightFace buffalo_l model...
# ✓ Model loaded
# Processing photos...
# [████████████████████] 1000/1000
# Indexed 1000 photos with 5234 faces

# Verify database created
ls -lh data/database.db
# Expected: file size ~50-100MB for 5K photos

# Deactivate scripts venv
deactivate
```

**Performance Note:** Indexing takes ~30-60 seconds per 1000 photos on M1 Mac. Scale accordingly.

### Step 8: Start Backend

```bash
# Activate backend venv
source backend/.venv/bin/activate

# Start server
python backend/main.py

# Expected output:
# Loading InsightFace buffalo_l model...
# ✓ Face analyzer ready
# Loaded 5234 face embeddings
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete

# Server is now running on http://localhost:8000
```

### Step 9: Access Application

Open browser to:
- **Frontend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs (Swagger UI)
- **Health Check:** http://localhost:8000/health

## Systemd Service (Production Linux)

For automatic startup on system reboot:

### Create Service File

```bash
# Create service file
sudo tee /etc/systemd/system/yep-photo-finder.service > /dev/null <<EOF
[Unit]
Description=YEP Photo Finder Backend
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=yepphotos
WorkingDirectory=/opt/yepphotos
Environment="PATH=/opt/yepphotos/backend/.venv/bin"
ExecStart=/opt/yepphotos/backend/.venv/bin/python /opt/yepphotos/backend/main.py
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

### Deploy Application

```bash
# Create user and directory
sudo useradd -r -s /bin/bash yepphotos
sudo mkdir -p /opt/yepphotos
sudo chown -R yepphotos:yepphotos /opt/yepphotos

# Copy application
sudo cp -r . /opt/yepphotos/

# Set permissions
sudo chown -R yepphotos:yepphotos /opt/yepphotos/data

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable yep-photo-finder
sudo systemctl start yep-photo-finder

# Check status
sudo systemctl status yep-photo-finder
sudo journalctl -u yep-photo-finder -f  # View logs
```

## Docker Deployment

### Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Multi-stage build
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy application
COPY backend/ ./backend
COPY frontend/dist ./frontend/dist
COPY data ./data

# Set environment
ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Run application
CMD ["python", "backend/main.py"]
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  yep-photo-finder:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data/photos:/app/data/photos
      - ./data/database.db:/app/data/database.db
    environment:
      - MS_CLIENT_ID=${MS_CLIENT_ID:-}
      - MS_TENANT_ID=${MS_TENANT_ID:-}
      - MS_CLIENT_SECRET=${MS_CLIENT_SECRET:-}
      - ALLOWED_DOMAIN=${ALLOWED_DOMAIN:-finos.asia}
      - DEFAULT_THRESHOLD=${DEFAULT_THRESHOLD:-0.5}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Build & Run with Docker

```bash
# Build image
docker build -t yep-photo-finder .

# Run container
docker run -d \
  --name yep \
  -p 8000:8000 \
  -v $(pwd)/data/photos:/app/data/photos \
  -v $(pwd)/data/database.db:/app/data/database.db \
  yep-photo-finder

# View logs
docker logs -f yep

# Stop container
docker stop yep
docker rm yep

# Or with docker-compose
docker-compose up -d
docker-compose logs -f
docker-compose down
```

## Nginx Reverse Proxy (Production)

For HTTPS, compression, and SSL termination:

### Nginx Configuration

Create `/etc/nginx/sites-available/yep-photo-finder`:

```nginx
upstream yep_backend {
    server localhost:8000;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yep.example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yep.example.com;

    # SSL certificates (get from Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yep.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yep.example.com/privkey.pem;

    # SSL security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # CORS headers (restrict to specific origin)
    add_header Access-Control-Allow-Origin "https://yep.example.com" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;

    # Handle CORS preflight
    location ~ ^/api/ {
        if ($request_method = 'OPTIONS') {
            return 204;
        }
        proxy_pass http://yep_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy all other requests
    location / {
        proxy_pass http://yep_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Deny direct access to hidden files
    location ~ /\. {
        deny all;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable Nginx Configuration

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/yep-photo-finder /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Get SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yep.example.com

# Auto-renewal (already enabled by default)
sudo systemctl enable certbot.timer
```

## Environment Configuration

### Backend Configuration (backend/.env)

```bash
# Microsoft OAuth (leave empty to disable auth)
MS_CLIENT_ID=your-azure-app-id
MS_TENANT_ID=your-azure-tenant-id
MS_CLIENT_SECRET=your-app-secret
ALLOWED_DOMAIN=finos.asia

# Face matching parameters
DEFAULT_THRESHOLD=0.5    # Similarity threshold (0-1)
DEFAULT_LIMIT=50         # Max results per search

# Server settings
HOST=0.0.0.0
PORT=8000

# Temp face storage
TEMP_FACE_TTL=1800       # 30 minutes in seconds

# Max upload size
MAX_UPLOAD_SIZE=15728640 # 15MB in bytes
```

### Frontend Configuration

Edit `frontend/src/api/client.js` for API base URL:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

For production, set environment variable:

```bash
export REACT_APP_API_URL=https://yep.example.com
npm run build
```

## Database Management

### Backup Database

```bash
# Simple file backup
cp data/database.db data/database.db.backup

# Scheduled backup (cron)
0 2 * * * cp /opt/yepphotos/data/database.db /backups/database-$(date +\%Y\%m\%d).db

# View backups
ls -lah /backups/
```

### Restore Database

```bash
# Stop backend
systemctl stop yep-photo-finder

# Restore backup
cp data/database.db.backup data/database.db

# Start backend
systemctl start yep-photo-finder
```

### Reindex Photos (After Adding New Photos)

```bash
# Activate scripts venv
source scripts/.venv/bin/activate

# Re-run indexer
python scripts/index_faces.py

# Reload embeddings in running backend
curl -X POST http://localhost:8000/api/reload-embeddings

# Deactivate
deactivate
```

## Monitoring & Health Checks

### Health Endpoint

```bash
# Check backend status
curl http://localhost:8000/health
# Expected: {"status": "ok"}

# Check with authentication
curl -H "Cookie: session=your-jwt-token" http://localhost:8000/api/me
# Expected: {"email": "user@example.com", "name": "User Name"}
```

### Database Statistics

```bash
# Get stats
curl http://localhost:8000/api/stats
# Expected: {"total_photos": 1000, "total_faces": 5234, "last_indexed": "2026-02-01T..."}
```

### Log Monitoring

```bash
# Backend logs
tail -f /var/log/syslog | grep yep-photo-finder

# Or with journalctl
journalctl -u yep-photo-finder -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Performance Monitoring

```bash
# Check memory usage
ps aux | grep "python.*main.py"

# Check disk usage
du -sh data/
du -sh data/database.db

# Check CPU usage
top -p $(pgrep -f "python.*main.py")
```

## Troubleshooting

### Issue: "No faces detected" during indexing

**Cause:** Photo quality, lighting, or face size

**Solution:**
```bash
# Check photo quality
file data/photos/*.jpg

# Remove corrupted photos
rm data/photos/corrupted.jpg

# Re-run indexer
python scripts/index_faces.py
```

### Issue: High memory usage

**Cause:** Large database loaded into memory

**Solution:**
```bash
# Check DB size
ls -lh data/database.db

# Limit embeddings loaded (not ideal, but quick fix)
# Edit face_matcher.py to load subset

# Long-term: Implement FAISS index (Phase 8)
```

### Issue: Search times getting slower

**Cause:** Database size growing, O(N) algorithm

**Solution:**
```bash
# Short-term: Restart backend to clear cache
systemctl restart yep-photo-finder

# Long-term: Implement FAISS (Phase 8)
```

### Issue: OAuth login fails

**Cause:** Credentials not set, domain mismatch

**Solution:**
```bash
# Verify .env file
cat backend/.env | grep MS_

# Disable auth for testing
# Comment out MS_* lines in .env

# Verify domain
cat backend/.env | grep ALLOWED_DOMAIN
```

### Issue: Frontend not loading

**Cause:** Frontend files not built, wrong port

**Solution:**
```bash
# Rebuild frontend
cd frontend && npm run build && cd ..

# Verify files exist
ls -la frontend/dist/index.html

# Check port
curl http://localhost:8000/

# Check backend logs
journalctl -u yep-photo-finder -n 50
```

## Performance Tuning

### Database Optimization

```sql
-- Add indexes for faster queries
CREATE INDEX idx_faces_similarity ON faces(photo_id);
CREATE INDEX idx_photos_timestamp ON photos(indexed_at);

-- Vacuum database (reclaim space)
VACUUM;

-- Analyze query plans
EXPLAIN QUERY PLAN SELECT * FROM faces WHERE photo_id = 1;
```

### Python Optimization

```python
# Use PyPy for faster execution (if compatible)
# pypy3 -m pip install -r requirements.txt
# pypy3 backend/main.py

# Profile with py-spy
# pip install py-spy
# py-spy record -o profile.svg -- python backend/main.py
```

### Frontend Optimization

```bash
# Build with optimizations
cd frontend
npm run build -- --minify

# Check bundle size
npm run build && npm run preview
# Compare size before/after optimizations
```

## Scaling to 100K+ Photos

### Phase 1: Optimize current setup
- [x] Use FAISS vector index (replace cosine similarity)
- [x] Implement Redis caching
- [x] Add database connection pooling

### Phase 2: Distribute workload
- [x] Multiple backend instances behind load balancer
- [x] Dedicated indexing worker
- [x] Shared Redis session store

### Phase 3: Cloud infrastructure
- [x] AWS S3 or Google Cloud Storage for photos
- [x] RDS PostgreSQL (instead of SQLite)
- [x] Kubernetes orchestration
- [x] CloudFront CDN

See `docs/project-roadmap.md` Phase 8 for detailed plan.

---

**Document Version:** 1.0
**Last Updated:** Feb 1, 2026
