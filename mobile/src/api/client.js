import axios from 'axios';
import storage from '../storage/asyncStorage';

// Base API URL for development & production fallback
const API_BASE_URL = 'http://10.0.2.2:5000/api'; // Android Emulator default host

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get or generate persistent deviceId
export const getOrCreateDeviceId = async () => {
  let deviceId = await storage.getItem('finlit_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    await storage.setItem('finlit_device_id', deviceId);
  }
  return deviceId;
};

// Inject x-device-id, x-member-id, and x-room-id headers into every API request
api.interceptors.request.use(
  async (config) => {
    const deviceId = await getOrCreateDeviceId();
    const memberId = await storage.getItem('finlit_member_id');
    const roomId = await storage.getItem('finlit_room_id');

    config.headers['x-device-id'] = deviceId;
    if (memberId) config.headers['x-member-id'] = memberId;
    if (roomId) config.headers['x-room-id'] = roomId;

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
