# Code Standards & Conventions

**Project:** YEP Photo Finder
**Updated:** February 1, 2026
**Apply To:** All new code (backend Python, frontend JavaScript/React)

## Naming Conventions

### Python (Backend)

| Item | Convention | Example |
|------|-----------|---------|
| Files | snake_case | `face_matcher.py`, `config.py` |
| Classes | PascalCase | `FaceMatcher`, `FaceAnalysis` |
| Functions | snake_case | `detect_faces()`, `search_photos()` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_THRESHOLD`, `DB_PATH` |
| Private methods | _leading_underscore | `_load_embeddings()` |
| Type hints | Required for public APIs | `def search(id: str) -> list[dict]:` |

### JavaScript/React (Frontend)

| Item | Convention | Example |
|------|-----------|---------|
| Files | PascalCase (components) | `PhotoGallery.jsx`, `FaceSelector.jsx` |
| Files | camelCase (utilities) | `apiClient.js`, `utils.js` |
| Functions | camelCase | `handleFacesDetected()`, `loadPresetFaces()` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_THRESHOLD`, `STEPS.UPLOAD` |
| React components | PascalCase | `<PhotoGallery />`, `<FaceSelector />` |
| Props object | camelCase keys | `{photoIds, selectedFace, onSelect}` |
| State variables | camelCase | `const [selectedFace, setSelectedFace] = useState(null)` |

## Code Organization

### Python Backend Structure

```python
"""Module docstring describing purpose."""
# Standard library imports
import os
from pathlib import Path
from contextlib import contextmanager

# Third-party imports
import numpy as np
from fastapi import FastAPI, HTTPException

# Local imports
from config import DEFAULT_THRESHOLD
from database import get_connection

# Constants
DEFAULT_LIMIT = 50

# Main logic
def search_faces(...):
    """Function docstring with parameter and return types."""
    pass
```

### React Component Structure

```jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { searchFaces } from '../api/client';
import './PhotoGallery.css';

function PhotoGallery({ matches, onSelect }) {
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  useEffect(() => {
    // Side effects
  }, [matches]);

  const handleSelect = (photoId) => {
    // Handler logic
  };

  return (
    <div className="gallery">
      {/* JSX */}
    </div>
  );
}

export default PhotoGallery;
```

## Python Standards

### Type Hints (Required for public APIs)

```python
# ✓ Good
def search(temp_face_id: str, threshold: float = 0.5) -> list[dict]:
    """Search for matching faces.

    Args:
        temp_face_id: UUID of uploaded face embedding
        threshold: Similarity threshold (0.0-1.0)

    Returns:
        List of dicts with keys: face_id, photo_id, similarity
    """
    pass

# ✗ Avoid
def search(temp_face_id, threshold=0.5):
    pass
```

### Docstrings (Google Style)

```python
def detect_faces(image_path: Path) -> tuple[Optional[np.ndarray], list[dict]]:
    """Process image and extract face embeddings.

    Args:
        image_path: Path to image file

    Returns:
        Tuple of (image_array, face_records) where face_records contain
        bbox, embedding, and detection_score. Returns (None, []) on error.

    Raises:
        ValueError: If image file cannot be read
        FileNotFoundError: If image_path doesn't exist
    """
    pass
```

### Error Handling

```python
# ✓ Good: Specific exceptions, informative messages
def get_photo(photo_id: int) -> dict:
    with get_connection(DB_PATH) as conn:
        photo = get_photo_by_id(conn, photo_id)

    if not photo:
        raise HTTPException(404, f"Photo {photo_id} not found")

    return photo

# ✗ Avoid: Generic exceptions, unclear messages
def get_photo(photo_id):
    try:
        conn = sqlite3.connect(DB_PATH)
        # ... long logic
    except Exception:
        raise Exception("Database error")
```

### Module Size (Max 200 LOC)

Current state:
- ✓ `config.py` (36 LOC) - Small, single responsibility
- ✓ `models.py` (55 LOC) - Single responsibility
- ✓ `auth.py` (97 LOC) - Single responsibility
- ✓ `database.py` (127 LOC) - Good size, focused
- ⚠ `face_matcher.py` (119 LOC) - At limit, could extract utils
- ⚠ `main.py` (456 LOC) - Too large, should split routes into router modules

**Future refactor for main.py:**
```
main.py (100 LOC) → Core FastAPI setup, lifespan
routes/auth.py (50 LOC) → Auth endpoints
routes/api.py (200 LOC) → Search, detect, download
routes/presets.py (50 LOC) → Team preset endpoints
routes/static.py (50 LOC) → File serving
```

### Context Managers (For Resource Management)

```python
# ✓ Good: Ensures cleanup
@contextmanager
def get_connection(db_path):
    """Context manager for database connections."""
    conn = sqlite3.connect(str(db_path))
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

# Usage
with get_connection(DB_PATH) as conn:
    data = get_all_embeddings(conn)
```

### Comments (When Why, Not What)

```python
# ✓ Good: Explains rationale
# Normalize embeddings for faster cosine similarity (L2 norm)
# This avoids recomputing during search
norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
self.embeddings = self.embeddings / (norms + 1e-10)

# ✗ Bad: Describes obvious code
# Add 1 to x
x = x + 1
```

## JavaScript/React Standards

### Component Naming

```jsx
// ✓ Good: Descriptive, clear purpose
export function PhotoGalleryGrid({ matches, onSelect }) { }
export function FaceDetectionStatus({ isLoading, faceCount }) { }

// ✗ Avoid: Too generic
export function Gallery({ items }) { }
export function Status({ status }) { }
```

### Prop Destructuring

```jsx
// ✓ Good: Clear dependencies, self-documenting
function PhotoGallery({ matches, selectedIds, onSelect, onDownload }) {
  // matches, selectedIds, onSelect, onDownload available directly
}

// ✗ Avoid: Unclear which props are used
function PhotoGallery(props) {
  return <div>{props.matches.map(...)}</div>;
}
```

### Hook Usage

```jsx
// ✓ Good: Clear separation of concerns
function PhotoUpload({ onDetected }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only run when file changes
  }, [file]);

  const handleUpload = async () => {
    setLoading(true);
    try {
      const result = await detectFaces(file);
      onDetected(result.faces);
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return <input onChange={(e) => setFile(e.target.files[0])} />;
}

// ✗ Avoid: Side effects without dependency arrays
useEffect(() => {
  fetchData(); // Infinite loop!
});
```

### API Client Pattern

```jsx
// ✓ Good: Centralized, type-safe (JSDoc), error handling
export const searchFaces = async (tempFaceId, threshold = 0.5) => {
  /**
   * @param {string} tempFaceId - Temp face embedding ID
   * @param {number} threshold - Similarity threshold
   * @returns {Promise<{matches: Array, total: number}>}
   */
  const response = await api.post('/api/search', {
    temp_face_id: tempFaceId,
    threshold
  });
  return response.data;
};

// Usage
try {
  const { matches } = await searchFaces(faceId);
  setMatches(matches);
} catch (error) {
  toast.error(error.message || 'Search failed');
}
```

### Async/Await Over Promises

```jsx
// ✓ Good: Readable, sequential logic
async function handleUpload(file) {
  try {
    setLoading(true);
    const data = await detectFaces(file);
    setFaces(data.faces);
    setStep('select');
  } catch (error) {
    toast.error('Upload failed');
  } finally {
    setLoading(false);
  }
}

// ✗ Avoid: Nested promises (pyramid of doom)
function handleUpload(file) {
  detectFaces(file)
    .then((data) => {
      setFaces(data.faces);
      return searchFaces(data.faces[0].temp_id);
    })
    .then((results) => {
      setMatches(results.matches);
    })
    .catch((error) => toast.error('Error'));
}
```

### Conditional Rendering

```jsx
// ✓ Good: Clear, readable
function App() {
  if (!authChecked) return <LoadingSpinner />;
  if (authEnabled && !user) return <LoginPage />;
  return <MainApp />;
}

// ✓ Also good: Inline for simple checks
return (
  <div>
    {isLoading && <Spinner />}
    {matches.length > 0 && (
      <Gallery matches={matches} onSelect={handleSelect} />
    )}
  </div>
);

// ✗ Avoid: Ternaries that return JSX
return authChecked ? (authEnabled && !user ? <LoginPage /> : <MainApp />) : <LoadingSpinner />;
```

## File Size Limits

| File Type | Max LOC | Current | Status |
|-----------|---------|---------|--------|
| Python module | 200 | main.py: 456 | Refactor needed |
| React component | 150 | PhotoGallery: 304 | Refactor needed |
| Utility file | 100 | - | OK |
| Configuration | 50 | config.py: 36 | OK |
| Test file | 300 | - | OK |

**Refactoring trigger:** If file exceeds limit and touches 3+ concepts, split into focused modules.

## Testing Standards

### Python Unit Tests

```python
# test_face_matcher.py
import pytest
from face_matcher import FaceMatcher

class TestFaceMatcher:
    """Test face search and matching functionality."""

    @pytest.fixture
    def matcher(self, tmp_path):
        """Create FaceMatcher with test database."""
        db_path = tmp_path / "test.db"
        return FaceMatcher(db_path)

    def test_search_returns_empty_when_no_embeddings(self, matcher):
        """Search should return empty list when database empty."""
        results = matcher.search("nonexistent", threshold=0.5)
        assert results == []

    def test_search_respects_threshold(self, matcher):
        """Only matches above threshold should be returned."""
        # Arrange: store test embedding
        embedding = np.random.rand(512)
        temp_id = matcher.store_temp_face(embedding)

        # Act: search with high threshold
        results = matcher.search(temp_id, threshold=0.99)

        # Assert: should be empty
        assert len(results) == 0
```

### React Component Tests

```jsx
// PhotoGallery.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoGallery from './PhotoGallery';

describe('PhotoGallery', () => {
  const mockMatches = [
    { photo_id: 1, similarity: 0.95, filename: 'photo1.jpg' },
    { photo_id: 2, similarity: 0.88, filename: 'photo2.jpg' }
  ];

  it('renders all matched photos', () => {
    render(<PhotoGallery matches={mockMatches} onSelect={() => {}} />);
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('calls onSelect when photo clicked', () => {
    const onSelect = jest.fn();
    render(<PhotoGallery matches={mockMatches} onSelect={onSelect} />);

    fireEvent.click(screen.getByAltText('photo1.jpg'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
```

## Documentation Standards

### README for Each Module

```python
# face_matcher.py
"""
Face Matching Service

This module provides in-memory face embedding search using cosine similarity.
It loads embeddings from SQLite on startup and keeps them in NumPy arrays for
fast searches.

Key Classes:
  - FaceMatcher: Main search engine

Performance:
  - Search: O(N) per query against N embeddings
  - Memory: ~2MB per 1000 embeddings (512-dim float32)

Example:
  matcher = FaceMatcher(db_path)
  temp_id = matcher.store_temp_face(embedding)
  matches = matcher.search(temp_id, threshold=0.5, limit=50)
"""
```

### Inline Documentation

```python
# When code is non-obvious, explain intent:
# Deduplicate by photo_id, keeping best match per photo
# This prevents showing multiple faces from same photo
seen_photos = {}
for face_id, photo_id, similarity in sorted_results:
    if photo_id not in seen_photos:
        seen_photos[photo_id] = True
        results.append(...)
```

## Performance Guidelines

### Python

- Use NumPy for array operations (not loops)
- Profile before optimizing: `cProfile`, `py-spy`
- Avoid loading entire images into memory: use streaming
- Cache expensive operations (embeddings, model weights)

### React

- Memoize callbacks: `useCallback` for event handlers
- Lazy load components: `React.lazy` + `Suspense`
- Virtualize long lists: `react-window` for 1000+ items
- Minimize re-renders: check `React.memo` usage

## Security Checklist

- [ ] Validate all user inputs (file type, size, format)
- [ ] Use parameterized queries (not string interpolation)
- [ ] Sanitize file paths (no path traversal)
- [ ] Set CORS headers appropriately (not wildcard in prod)
- [ ] Use HttpOnly cookies for sessions
- [ ] Validate OAuth tokens before accessing resources
- [ ] Log security events (auth failures, invalid inputs)
- [ ] No hardcoded secrets (use environment variables)
- [ ] No sensitive data in error messages
- [ ] Validate image dimensions before processing

## Version Control Practices

### Commit Messages

```bash
# ✓ Good: Conventional format
git commit -m "feat: add similarity threshold slider in photo gallery"
git commit -m "fix: correct cosine similarity normalization"
git commit -m "docs: update face detection performance benchmarks"
git commit -m "refactor: extract route handlers from main.py"

# ✗ Avoid
git commit -m "update files"
git commit -m "bug fix"
git commit -m "WIP: testing something"
```

### Branch Naming

```bash
# ✓ Good
git checkout -b feat/image-preprocessing
git checkout -b fix/face-detection-accuracy
git checkout -b docs/api-endpoints

# ✗ Avoid
git checkout -b my-branch
git checkout -b test
git checkout -b branch1
```

## Code Review Checklist

Before submitting PR, verify:

- [ ] Code follows naming conventions (snake_case/camelCase)
- [ ] Functions have docstrings (Python) or JSDoc (JS)
- [ ] Type hints present for public APIs
- [ ] No console.log / print statements left
- [ ] No commented-out code
- [ ] Files under 200 LOC (or justified)
- [ ] Tests written and passing
- [ ] No hardcoded values (use constants/config)
- [ ] Error handling present for failure cases
- [ ] Performance impact assessed

## Tools & Linting

### Python

```bash
# Format
black backend/*.py --line-length 100

# Lint
flake8 backend/ --max-line-length 100 --ignore E203,W503

# Type check
mypy backend/ --strict

# Test
pytest tests/ -v --cov=backend
```

### JavaScript/React

```bash
# Format
npx prettier frontend/src --write

# Lint
npx eslint frontend/src --fix

# Test
npm test -- --coverage --watchAll=false
```

## Environment-Based Configuration

```python
# ✓ Good: All config from environment
DB_PATH = Path(os.getenv("DB_PATH", "./data/database.db"))
DEFAULT_THRESHOLD = float(os.getenv("DEFAULT_THRESHOLD", "0.5"))
AUTH_ENABLED = bool(os.getenv("MS_CLIENT_ID"))

# ✗ Avoid: Hardcoded values
DB_PATH = Path("/var/data/database.db")
DEFAULT_THRESHOLD = 0.5
AUTH_ENABLED = True
```

---

**Document Version:** 1.0
**Last Updated:** Feb 1, 2026
