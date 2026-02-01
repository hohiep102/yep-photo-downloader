import { useState } from 'react';

export default function FaceSelector({ faces, onSelect, onBack, isPreset = false }) {
  const [selectedFace, setSelectedFace] = useState(null);

  const handleSelect = (face) => {
    setSelectedFace(face);
  };

  const handleConfirm = () => {
    if (selectedFace) {
      onSelect(selectedFace);
    }
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

        {/* Face grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {faces.map((face) => (
            <button
              key={face.temp_id}
              onClick={() => handleSelect(face)}
              className={`group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer
                ${selectedFace?.temp_id === face.temp_id
                  ? 'ring-4 ring-pink-500 scale-[1.02] shadow-lg shadow-pink-500/30'
                  : 'ring-2 ring-white/20 hover:ring-white/40 hover:scale-[1.02]'}`}
            >
              <img
                src={face.thumbnail}
                alt="Detected face"
                className="w-full aspect-square object-cover"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

              {/* Confidence score */}
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <div className="flex items-center justify-center gap-1 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1">
                  <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-white text-xs font-medium">{Math.round(face.score * 100)}%</span>
                </div>
              </div>

              {/* Selected indicator */}
              {selectedFace?.temp_id === face.temp_id && (
                <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200 pointer-events-none"></div>
            </button>
          ))}
        </div>

        {/* Action buttons */}
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

          <button
            onClick={handleConfirm}
            disabled={!selectedFace}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200
              ${selectedFace
                ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.02]'
                : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
          >
            Tìm ảnh của tôi
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
