import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import PhotoUpload from './components/PhotoUpload';
import FaceSelector from './components/FaceSelector';
import PhotoGallery from './components/PhotoGallery';
import LoginPage from './components/LoginPage';
import { getPresetFaces, getCurrentUser, getAuthStatus } from './api/client';
import './App.css';

const STEPS = {
  UPLOAD: 'upload',
  SELECT: 'select',
  RESULTS: 'results',
  LOADING: 'loading',
};

function App() {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [faces, setFaces] = useState([]);
  const [selectedFace, setSelectedFace] = useState(null);
  const [matches, setMatches] = useState([]);
  const [presetName, setPresetName] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(true);

  // Check auth and preset routes on load
  useEffect(() => {
    const path = window.location.pathname;

    // Skip auth check for login page
    if (path === '/login') {
      setAuthChecked(true);
      return;
    }

    // First check if auth is enabled
    getAuthStatus()
      .then((status) => {
        setAuthEnabled(status.auth_enabled);

        if (!status.auth_enabled) {
          // Auth disabled - allow anonymous access
          setUser({ name: 'Guest', email: 'anonymous' });
          setAuthChecked(true);
          if (path === '/finos') {
            setPresetName('finos');
            loadPresetFaces('finos');
          }
          return;
        }

        // Auth enabled - check if user is logged in
        return getCurrentUser();
      })
      .then((userData) => {
        if (userData && userData.email !== 'anonymous') {
          setUser(userData);
          setAuthChecked(true);
          if (window.location.pathname === '/finos') {
            setPresetName('finos');
            loadPresetFaces('finos');
          }
        }
      })
      .catch(() => {
        setAuthChecked(true);
        // Not logged in - will show login page if auth enabled
      });
  }, []);

  const loadPresetFaces = async (preset) => {
    setStep(STEPS.LOADING);
    try {
      const result = await getPresetFaces(preset);
      if (result.faces && result.faces.length > 0) {
        setFaces(result.faces);
        setStep(STEPS.SELECT);
        toast.success(`Đã tải ${result.faces.length} khuôn mặt từ ảnh team`);
      } else {
        toast.error('Không tìm thấy khuôn mặt');
        setStep(STEPS.UPLOAD);
      }
    } catch (error) {
      console.error('Preset load error:', error);
      toast.error('Lỗi tải preset');
      setStep(STEPS.UPLOAD);
    }
  };

  const handleFacesDetected = (detectedFaces) => {
    setFaces(detectedFaces);
    if (detectedFaces.length === 1) {
      setSelectedFace(detectedFaces[0]);
      setStep(STEPS.RESULTS);
    } else {
      setStep(STEPS.SELECT);
    }
  };

  const handleFaceSelected = (face) => {
    setSelectedFace(face);
    setStep(STEPS.RESULTS);
  };

  const handleMatchesFound = (foundMatches) => {
    setMatches(foundMatches);
  };

  const handleReset = () => {
    // If on preset route, go back to face selection instead of upload
    if (presetName && faces.length > 0) {
      setStep(STEPS.SELECT);
      setSelectedFace(null);
      setMatches([]);
    } else {
      setStep(STEPS.UPLOAD);
      setFaces([]);
      setSelectedFace(null);
      setMatches([]);
    }
  };

  const handleBack = () => {
    if (step === STEPS.RESULTS) {
      if (faces.length > 1) {
        setStep(STEPS.SELECT);
        setSelectedFace(null);
        setMatches([]);
      } else {
        handleReset();
      }
    } else if (step === STEPS.SELECT) {
      if (presetName) {
        // On preset route, reload the preset
        loadPresetFaces(presetName);
      } else {
        handleReset();
      }
    }
  };

  const getTitle = () => {
    if (presetName === 'finos') {
      return (
        <>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Photo</span>
          {' '}Finder
        </>
      );
    }
    return (
      <>
        Galaxy Holdings <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">YEP 2026</span>
      </>
    );
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-900 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-pink-500 animate-spin"></div>
      </div>
    );
  }

  // Show login page if auth enabled and not authenticated
  if (authEnabled && !user && window.location.pathname !== '/login') {
    // Redirect to login with return URL
    const returnUrl = window.location.pathname;
    if (returnUrl !== '/') {
      window.location.href = `/login?redirect=${encodeURIComponent(returnUrl)}`;
      return null;
    }
    return <LoginPage />;
  }

  // Login page route (only relevant when auth enabled)
  if (window.location.pathname === '/login') {
    if (!authEnabled) {
      window.location.href = '/';
      return null;
    }
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-900 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-500/10 rounded-full blur-3xl"></div>
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
          },
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-md bg-white/5">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <button onClick={handleGoHome} className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                presetName === 'finos'
                  ? 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/30'
                  : 'bg-gradient-to-br from-pink-500 to-violet-600 shadow-pink-500/30'
              }`}>
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {getTitle()}
                </h1>
                <p className="text-white/60 text-sm">
                  {presetName === 'finos'
                    ? 'Chọn khuôn mặt của bạn để tìm ảnh'
                    : 'Tìm ảnh của bạn bằng AI nhận diện khuôn mặt'}
              </p>
              </div>
            </button>
            <div className="flex-1"></div>
            {user && authEnabled && (
              <div className="flex items-center gap-3">
                <span className="text-white/70 text-sm hidden sm:block">{user.name || user.email}</span>
                <a
                  href="/auth/logout"
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-colors"
                >
                  Đăng xuất
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {step === STEPS.LOADING && (
          <div className="text-center py-20">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-violet-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            </div>
            <p className="text-white text-lg font-medium">Đang tải khuôn mặt từ ảnh team...</p>
            <p className="text-white/50 text-sm mt-2">AI đang nhận diện khuôn mặt</p>
          </div>
        )}

        {step === STEPS.UPLOAD && (
          <PhotoUpload onFacesDetected={handleFacesDetected} />
        )}

        {step === STEPS.SELECT && (
          <FaceSelector
            faces={faces}
            onSelect={handleFaceSelected}
            onBack={handleBack}
            isPreset={!!presetName}
          />
        )}

        {step === STEPS.RESULTS && selectedFace && (
          <PhotoGallery
            face={selectedFace}
            matches={matches}
            onMatchesFound={handleMatchesFound}
            onBack={handleBack}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-white/40 text-sm">
        {presetName === 'finos'
          ? 'Photo Finder • Find your photos with AI'
          : 'Galaxy Holdings Year End Party 2026'}
      </footer>
    </div>
  );
}

export default App;
