import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

export async function detectFaces(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/detect-faces', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function searchFaces(tempFaceId, threshold = 0.5, limit = 50) {
  const response = await api.post('/api/search', {
    temp_face_id: tempFaceId,
    threshold,
    limit,
  });
  return response.data;
}

export async function downloadZip(photoIds) {
  const response = await api.post('/api/download-zip',
    { photo_ids: photoIds },
    { responseType: 'blob' }
  );

  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'yep-photos.zip');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function getStats() {
  const response = await api.get('/api/stats');
  return response.data;
}

export async function getPresetFaces(presetName) {
  const response = await api.get(`/api/presets/${presetName}`);
  return response.data;
}

export function getPhotoUrl(photoId) {
  return `${API_BASE}/api/photos/${photoId}`;
}

export function getThumbnailUrl(photoId, size = 300) {
  return `${API_BASE}/api/photos/${photoId}/thumbnail?size=${size}`;
}

export async function getCurrentUser() {
  const response = await api.get('/api/me');
  return response.data;
}

export async function getAuthStatus() {
  const response = await api.get('/api/auth-status');
  return response.data;
}

export default api;
