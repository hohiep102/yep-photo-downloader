import { useEffect, useState } from 'react';

export default function LoginPage() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    const domain = params.get('domain');

    if (err === 'domain_not_allowed') {
      setError(`Chỉ cho phép đăng nhập với email @${domain || 'finos.asia'}`);
    } else if (err) {
      setError('Đăng nhập thất bại. Vui lòng thử lại.');
    }
  }, []);

  const handleLogin = () => {
    const redirect = window.location.pathname !== '/login' ? window.location.pathname : '/';
    window.location.href = `/auth/login?redirect=${encodeURIComponent(redirect)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-900 flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-8 text-center">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Galaxy Holdings <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">YEP 2026</span>
          </h1>
          <p className="text-white/60 mb-8">
            Đăng nhập để tìm ảnh của bạn
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white text-gray-800 font-medium hover:bg-gray-100 transition-all duration-200 shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Đăng nhập với Microsoft
          </button>

          <div className="mt-6 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <p className="text-cyan-300 text-sm font-medium">
              Chỉ chấp nhận email @finos.asia
            </p>
            <p className="text-white/50 text-xs mt-1">
              Vui lòng đăng nhập bằng tài khoản Microsoft công ty
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
