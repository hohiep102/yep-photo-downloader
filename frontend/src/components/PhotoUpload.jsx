import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { detectFaces } from '../api/client';

export default function PhotoUpload({ onFacesDetected }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh (JPG, PNG, WebP)');
      return;
    }

    // Validate size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      toast.error('File quá lớn. Tối đa 15MB.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Detect faces
    setIsLoading(true);
    try {
      const result = await detectFaces(file);
      if (result.faces && result.faces.length > 0) {
        toast.success(`Phát hiện ${result.faces.length} khuôn mặt`);
        onFacesDetected(result.faces);
      } else {
        toast.error('Không tìm thấy khuôn mặt trong ảnh');
        setPreview(null);
      }
    } catch (error) {
      console.error('Detection error:', error);
      const msg = error.response?.data?.detail || 'Lỗi khi xử lý ảnh';
      toast.error(msg);
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  }, [onFacesDetected]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e) => {
    const file = e.target.files[0];
    handleFile(file);
  }, [handleFile]);

  return (
    <div className="max-w-xl mx-auto">
      {/* Glass card */}
      <div
        className={`relative backdrop-blur-xl rounded-3xl p-8 text-center cursor-pointer transition-all duration-300
          ${isDragging
            ? 'bg-white/20 border-2 border-pink-400 shadow-lg shadow-pink-500/20 scale-[1.02]'
            : 'bg-white/10 border-2 border-white/20 hover:bg-white/15 hover:border-white/30'}
          ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input').click()}
      >
        {/* Decorative gradient orb */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-pink-500/30 to-violet-500/30 rounded-full blur-3xl pointer-events-none"></div>

        <input
          id="file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="py-12">
            {/* Animated spinner */}
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-violet-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            </div>
            <p className="mt-6 text-white/80 font-medium">Đang phân tích ảnh...</p>
            <p className="mt-2 text-white/50 text-sm">AI đang nhận diện khuôn mặt</p>
          </div>
        ) : preview ? (
          <div className="py-4">
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 mx-auto rounded-2xl shadow-2xl shadow-black/30"
              />
              <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20"></div>
            </div>
            <p className="text-white/60 mt-4 text-sm">Click để chọn ảnh khác</p>
          </div>
        ) : (
          <div className="py-12">
            {/* Upload icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <h3 className="text-xl font-semibold text-white mb-2">
              Kéo thả ảnh của bạn vào đây
            </h3>
            <p className="text-white/60 mb-6">hoặc click để chọn file</p>

            {/* Supported formats badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/50 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              JPG, PNG, WebP • Tối đa 15MB
            </div>
          </div>
        )}
      </div>

      {/* Tips section */}
      <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <p className="text-white/80 font-medium text-sm">Mẹo để có kết quả tốt nhất</p>
            <p className="text-white/50 text-sm mt-1">Chọn ảnh selfie có khuôn mặt rõ ràng, ánh sáng tốt và không bị che khuất</p>
          </div>
        </div>
      </div>
    </div>
  );
}
