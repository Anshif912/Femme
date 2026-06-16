import { useStore } from '../store/useStore';
import * as SecureStore from 'expo-secure-store';

export const getApiBase = async () => {
  try {
    const customUrl = await SecureStore.getItemAsync('femme_api_url');
    if (customUrl) {
      const cleanUrl = customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
      return `${cleanUrl}/api/v1`;
    }
  } catch {}
  
  // Default Android emulator loopback
  return 'http://192.168.137.1:8000/api/v1';
};

async function request(path: string, options: RequestInit = {}) {
  const token = useStore.getState().token;
  const apiBase = await getApiBase();
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = 'API Request Failed';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || JSON.stringify(errorJson);
      } catch (_) {}
      throw new Error(errorDetail);
    }

    // Handle blob responses (e.g. PDF report download)
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('application/pdf')) {
      // In React Native, fetch returns a blob that we can extract
      return response.blob();
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. Ensure the backend server is running and reachable.');
    }
    throw err;
  }
}

export const api = {
  // Auth
  requestOtp: (phone: string) => 
    request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
    
  verifyOtp: (phone: string, code: string, name?: string) => 
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code, name }) }),
    
  getMe: () => 
    request('/auth/me'),
    
  updateProfile: (profile: any) => 
    request('/auth/profile', { method: 'PUT', body: JSON.stringify(profile) }),
    
  updateSettings: (settings: any) => 
    request('/auth/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  // Journeys
  startJourney: (journey: {
    cab_number: string;
    provider: string;
    pickup_address: string;
    pickup_lat?: number;
    pickup_lng?: number;
    dest_address: string;
    dest_lat?: number;
    dest_lng?: number;
  }) => request('/journeys/start', { method: 'POST', body: JSON.stringify(journey) }),
  
  getActiveJourney: () => 
    request('/journeys/active'),
    
  updateTelemetry: (telemetry: {
    latitude: number;
    longitude: number;
    speed: number;
    timestamp: string;
    motion_anomaly: boolean;
    audio_anomaly: boolean;
    raw_audio_features?: any;
    speed_history?: number[];
  }) => request('/journeys/active/telemetry', { method: 'POST', body: JSON.stringify(telemetry) }),
  
  completeJourney: () => 
    request('/journeys/active/complete', { method: 'POST' }),
    
  cancelJourney: () => 
    request('/journeys/active/cancel', { method: 'POST' }),
    
  triggerSos: () => 
    request('/sos/trigger', { method: 'POST' }),
    
  getHistory: () => 
    request('/journeys/history'),
    
  evaluateRouteSafety: (coords: [number, number][]) => 
    request('/journeys/score', { method: 'POST', body: JSON.stringify(coords) }),

  // Contacts
  getContacts: () => 
    request('/contacts'),
    
  addContact: (contact: { name: string; phone: string; priority: number }) => 
    request('/contacts', { method: 'POST', body: JSON.stringify(contact) }),
    
  updateContact: (contactId: string, contact: { name: string; phone: string; priority: number }) => 
    request(`/contacts/${contactId}`, { method: 'PUT', body: JSON.stringify(contact) }),
    
  deleteContact: (contactId: string) => 
    request(`/contacts/${contactId}`, { method: 'DELETE' }),

  // Evidence
  getCapsules: (journeyId: string) => 
    request(`/evidence/capsules/${journeyId}`),
    
  downloadFirPdf: async (journeyId: string) => {
    // Returns blob
    return request(`/evidence/fir/${journeyId}`);
  },
  
  cleanupEvidence: () => 
    request('/evidence/cleanup', { method: 'POST' }),

  // Safe zones & Reports
  getSafeZones: () => 
    request('/reports/safe-zones'),
    
  addSafeZone: (zone: { name: string; type: string; latitude: number; longitude: number; description: string }) => 
    request('/reports/safe-zones', { method: 'POST', body: JSON.stringify(zone) }),
    
  getUnsafeZones: () => 
    request('/reports/unsafe-zones'),
    
  addUnsafeZone: (zone: { description: string; latitude: number; longitude: number; radius?: number; cab_plate?: string }) => 
    request('/reports/unsafe-zones', { method: 'POST', body: JSON.stringify(zone) }),
    
  getCabsReports: () => 
    request('/reports/cabs'),

  getCabReportsByPlate: (plate: string) => 
    request(`/reports/cabs/${plate}`),
    
  addCabReport: (report: {
    cab_number: string;
    provider: string;
    rating: number;
    review: string;
    tags: string[];
    latitude?: number;
    longitude?: number;
  }) => request('/reports/cabs', { method: 'POST', body: JSON.stringify(report) }),

  // Simulator Websocket URL helper
  getWebSocketUrl: async (journeyId: string) => {
    const apiBase = await getApiBase();
    const wsProto = apiBase.startsWith('https') ? 'wss' : 'ws';
    const host = apiBase.replace(/^https?:\/\//, '').split('/api/v1')[0];
    return `${wsProto}://${host}/api/v1/ws/track/${journeyId}`;
  },

  // Notification simulator trigger
  triggerNotificationSim: (text: string) => 
    request('/simulation/trigger-notification', { method: 'POST', body: JSON.stringify({ text }) })
};

export default api;
