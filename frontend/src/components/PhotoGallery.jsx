import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { searchFaces, downloadZip, getThumbnailUrl, getPhotoUrl } from '../api/client';

export default function PhotoGallery({ face, matches, onMatchesFound, onBack, onReset }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  useEffect(() => {
    if (matches.length === 0) {
      searchForMatches();
    } else {
      setIsLoading(false);
    }
  }, [face.temp_id]);

  const searchForMatches = async () => {
    setIsLoading(true);
    try {
      const result = await searchFaces(face.temp_id, 0.4, 100);
      onMatchesFound(result.matches);
      if (result.matches.length === 0) {
        toast('Không tìm thấy ảnh nào phù hợp', { icon: '😔' });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Lỗi khi tìm kiếm ảnh');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (photoId) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(matches.map(m => m.photo_id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const handleDownload = async (photoIds) => {
    if (photoIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ảnh');
      return;
    }

    setIsDownloading(true);
    try {
      await downloadZip(photoIds);
      toast.success(`Đang tải ${photoIds.length} ảnh`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Lỗi khi tải ảnh');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAll = () => handleDownload(matches.map(m => m.photo_id));
  const downloadSelected = () => handleDownload([...selectedIds]);

  if (isLoading) {
    return (
      <div className="text-center py-20">
        {/* Animated search indicator */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full border-4 border-pink-500/30 animate-ping"></div>
          <div className="absolute inset-2 rounded-full border-4 border-violet-500/40 animate-ping" style={{ animationDelay: '0.2s' }}></div>
          <div className="absolute inset-4 rounded-full border-4 border-pink-500/50 animate-ping" style={{ animationDelay: '0.4s' }}></div>
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        <p className="text-white text-lg font-medium">Đang tìm kiếm ảnh của bạn...</p>
        <p className="text-white/50 text-sm mt-2">AI đang so sánh khuôn mặt với hàng nghìn ảnh</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header card with selected face */}
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-6 mb-8">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Face thumbnail */}
          <div className="relative">
            <img
              src={face.thumbnail}
              alt="Your face"
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-pink-500/50"
            />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center ring-4 ring-violet-900">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Results info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">
              Tìm thấy <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">{matches.length}</span> ảnh!
            </h2>
            <p className="text-white/60 text-sm mt-1">
              Chọn ảnh bạn muốn tải về hoặc tải tất cả
            </p>
          </div>

          {/* Download buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={downloadAll}
              disabled={isDownloading || matches.length === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-white font-medium hover:from-pink-600 hover:to-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Tải tất cả ({matches.length})
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={downloadSelected}
                disabled={isDownloading}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/20 disabled:opacity-50 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tải đã chọn ({selectedIds.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Selection controls */}
      {matches.length > 0 && (
        <div className="flex gap-4 mb-6 text-sm">
          <button onClick={selectAll} className="text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Chọn tất cả
          </button>
          <button onClick={selectNone} className="text-white/50 hover:text-white/70 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Photo grid */}
      {matches.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {matches.map((match) => (
            <div
              key={match.photo_id}
              className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]
                ${selectedIds.has(match.photo_id)
                  ? 'ring-4 ring-pink-500 shadow-lg shadow-pink-500/30'
                  : 'ring-2 ring-white/10 hover:ring-white/30'}`}
            >
              {/* Clickable image to open lightbox */}
              <img
                src={getThumbnailUrl(match.photo_id)}
                alt={match.filename}
                className="w-full aspect-square object-cover cursor-zoom-in"
                loading="lazy"
                onClick={() => setLightboxPhoto(match)}
              />

              {/* Gradient overlay - pointer-events-none to allow clicks through */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              {/* Similarity badge */}
              <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1 pointer-events-none">
                <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {Math.round(match.similarity * 100)}%
              </div>

              {/* Selection checkbox - clickable */}
              <button
                className={`absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200
                ${selectedIds.has(match.photo_id)
                  ? 'bg-pink-500 text-white shadow-lg'
                  : 'bg-black/30 backdrop-blur-sm border-2 border-white/30 hover:border-white/60'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(match.photo_id);
                }}
              >
                {selectedIds.has(match.photo_id) && (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* View hint on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="px-3 py-2 rounded-xl bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                  Click ảnh để xem lớn
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-12 h-12 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white text-lg font-medium">Không tìm thấy ảnh nào phù hợp</p>
          <p className="text-white/50 text-sm mt-2">Thử với ảnh khác có khuôn mặt rõ hơn</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-10 flex gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
        >
          <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Tìm lại với ảnh khác
        </button>
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => setLightboxPhoto(null)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Image */}
          <img
            src={getPhotoUrl(lightboxPhoto.photo_id)}
            alt={lightboxPhoto.filename}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Info bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl bg-black/50 backdrop-blur-sm text-white text-sm flex items-center gap-4">
            <span>{lightboxPhoto.filename}</span>
            <span className="w-px h-4 bg-white/20"></span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {Math.round(lightboxPhoto.similarity * 100)}% match
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
