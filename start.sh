#!/bin/bash
# Start YEP Photo Finder

cd "$(dirname "$0")"

echo "🎉 Starting YEP Photo Finder..."

# Check if database exists
if [ ! -f "data/database.db" ]; then
    echo "⚠️  No database found. Please run indexing first:"
    echo "   scripts/.venv/bin/python scripts/index_faces.py"
    exit 1
fi

# Start backend
echo "Starting backend on http://localhost:8000..."
cd backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend dev server (or serve built files)
if [ -d "frontend/dist" ]; then
    echo "Serving built frontend..."
    cd frontend/dist
    python3 -m http.server 5173 &
    FRONTEND_PID=$!
else
    echo "Starting frontend dev server on http://localhost:5173..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
fi

echo ""
echo "✅ App is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop..."

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
