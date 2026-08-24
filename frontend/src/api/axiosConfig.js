import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to ensure a unique device ID exists in localStorage
export const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem('finlit_device_id') || localStorage.getItem('splitsense_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem('finlit_device_id', deviceId);
  }
  return deviceId;
};

// Interceptor to inject room & device headers into every API request
api.interceptors.request.use(
  (config) => {
    const deviceId = getOrCreateDeviceId();
    const memberId = localStorage.getItem('finlit_member_id') || localStorage.getItem('splitsense_member_id');
    const roomId = localStorage.getItem('finlit_room_id') || localStorage.getItem('splitsense_room_id');

    config.headers['x-device-id'] = deviceId;
    if (memberId) config.headers['x-member-id'] = memberId;
    if (roomId) config.headers['x-room-id'] = roomId;

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle global 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: error.response.data }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;