import axios from 'axios';
import storage from '../storage/asyncStorage';

// Base API URL for development & production fallback
// Set SPLITSENSE_API_URL at build time for Supabase, e.g.
// https://<project-ref>.supabase.co/functions/v1/api. The fallback keeps local
// Android-emulator development with the existing Express server working.
const API_BASE_URL = process.env.SPLITSENSE_API_URL || 'http://10.0.2.2:5000/api';

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

// Interceptor to handle global 401 Unauthorized responses
// Only clears session on genuine server 401s, NOT on network errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only clear session on actual server 401 responses
    // Network errors (no response) should NOT trigger session clear
    if (error.response && error.response.status === 401) {
      try {
        await storage.removeItem('finlit_member_id');
        await storage.removeItem('finlit_room_id');
        await storage.removeItem('finlit_room');
        await storage.removeItem('finlit_member');
      } catch (e) {
        console.error('Error clearing mobile storage on 401:', e);
      }
    }
    // For network errors (no response), just reject without clearing session
    // This preserves offline state so the user can continue using the app
    return Promise.reject(error);
  }
);

export default api;
