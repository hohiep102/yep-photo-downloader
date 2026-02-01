export default function FaceSelector({ faces, onSelect, onBack, isPreset = false }) {
  // Click face → go directly to search results
  const handleFaceClick = (face) => {
    onSelect(face);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Glass card */}
      <div className="relative backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-8 overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-pink-500/20 to-transparent rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="relative z-10 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">
              Chọn khuôn mặt của bạn
            </h2>
          </div>
          <p className="text-white/60">
            Phát hiện <span className="text-pink-400 font-semibold">{faces.length}</span> khuôn mặt trong ảnh. Chọn khuôn mặt của bạn để tìm kiếm.
          </p>
        </div>

        {/* Face grid - larger thumbnails with padding for less "creepy" look */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {faces.map((face) => (
            <button
              key={face.temp_id}
              onClick={() => handleFaceClick(face)}
              className="group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ring-2 ring-white/20 hover:ring-pink-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/30 bg-white/5"
            >
              {/* Add padding around face for less zoomed-in look */}
              <div className="p-3">
                <img
                  src={face.thumbnail}
                  alt="Detected face"
                  className="w-full aspect-square object-cover rounded-xl"
                />
              </div>

              {/* Confidence score */}
              <div className="absolute bottom-1 left-1 right-1">
                <div className="flex items-center justify-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1">
                  <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-white text-xs font-medium">{Math.round(face.score * 100)}%</span>
                </div>
              </div>

              {/* Hover overlay with search icon */}
              <div className="absolute inset-0 bg-pink-500/0 group-hover:bg-pink-500/20 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="w-10 h-10 rounded-full bg-pink-500/80 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Back button only - no confirm needed */}
        <div className="relative z-10 mt-8 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-200 group"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại
          </button>

          <p className="text-white/40 text-sm">
            Bấm vào khuôn mặt để tìm ảnh
          </p>
        </div>
      </div>
    </div>
  );
}
