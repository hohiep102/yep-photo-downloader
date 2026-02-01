# YEP Photo Finder

Face recognition web app for finding and downloading photos from events. Upload a selfie, select your face, and instantly find all photos featuring you. Download selected photos as a ZIP file.

## Features

- Face detection using InsightFace (buffalo_l model)
- Cosine similarity search for face matching
- Microsoft OAuth authentication (optional)
- Batch photo download as ZIP
- Support for thousands of photos

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Scripts | Python 3.11+, gdown, InsightFace (buffalo_l) |
| Backend | FastAPI, uvicorn, numpy, Pillow, SQLite |
| Frontend | React 19, Vite, TailwindCSS |
| Auth | Microsoft OAuth (MSAL) - optional |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- ngrok account (optional, for public sharing)

### 1. Clone & Setup

```bash
git clone <repo-url>
cd yepDownloader

# Create data directories
mkdir -p data/photos data/presets
```

### 2. Setup Scripts Environment

```bash
python3 -m venv scripts/.venv
source scripts/.venv/bin/activate
pip install -r scripts/requirements.txt
```

### 3. Download Photos

```bash
# From Google Drive folder
python scripts/download_photos.py "YOUR_GDRIVE_FOLDER_URL"

# Or manually copy photos to data/photos/
```

### 4. Index Faces

```bash
python scripts/index_faces.py
# ~30 min for 5K photos on M1 Mac
```

### 5. Setup Backend

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

# Configure environment (optional - for Microsoft OAuth)
cp backend/.env.example backend/.env
# Edit backend/.env with your Microsoft OAuth credentials
```

### 6. Setup Frontend

```bash
cd frontend
npm install
cd ..
```

### 7. Start Application

```bash
chmod +x start.sh stop.sh
./start.sh
```

Application runs at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

### 8. Share via ngrok (Optional)

```bash
ngrok http 5173
```

## Configuration

### Microsoft OAuth (Optional)

To enable Microsoft authentication:

1. Create app in [Azure Portal](https://portal.azure.com) > App Registrations
2. Copy credentials to `backend/.env`:
   ```
   MS_CLIENT_ID=your-client-id
   MS_TENANT_ID=your-tenant-id
   MS_CLIENT_SECRET=your-client-secret
   ALLOWED_DOMAIN=your-company.com
   ```

Without OAuth configured, the app runs in open mode (no login required).

### Face Matching Parameters

Edit `backend/config.py`:
- `DEFAULT_THRESHOLD`: Similarity threshold (0.0-1.0, default: 0.5)
- `DEFAULT_LIMIT`: Max results per search (default: 50)

## Project Structure

```
yepDownloader/
├── scripts/
│   ├── download_photos.py    # Google Drive downloader
│   ├── index_faces.py        # Face embedding indexer
│   └── requirements.txt
├── backend/
│   ├── main.py               # FastAPI server
│   ├── auth.py               # Microsoft OAuth
│   ├── face_matcher.py       # Face search engine
│   ├── database.py           # SQLite operations
│   ├── config.py             # Configuration
│   ├── .env.example          # Environment template
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── PhotoUpload.jsx
│       │   ├── FaceSelector.jsx
│       │   ├── PhotoGallery.jsx
│       │   └── LoginPage.jsx
│       └── api/client.js
├── data/                     # NOT in git
│   ├── photos/               # Source photos
│   ├── presets/              # Team preset photos
│   └── database.db           # Face embeddings DB
├── start.sh
├── stop.sh
└── README.md
```

## Usage

1. Open app URL on phone/computer
2. Upload selfie or photo of yourself
3. Select your face from detected faces
4. Browse matching photos (sorted by similarity)
5. Select photos and download as ZIP

## License

MIT License - Feel free to use and modify for your own events.
