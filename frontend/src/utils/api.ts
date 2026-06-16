import { useStore } from '../store/useStore';

const getApiBase = () => {
  const customUrl = localStorage.getItem('femme_api_url');
  if (customUrl) {
    const cleanUrl = customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
    return `${cleanUrl}/api/v1`;
  }
  if (import.meta.env.VITE_API_URL) {
    const cleanUrl = import.meta.env.VITE_API_URL.endsWith('/') ? import.meta.env.VITE_API_URL.slice(0, -1) : import.meta.env.VITE_API_URL;
    return `${cleanUrl}/api/v1`;
  }
  // Detect if running inside a mobile WebView context (Capacitor)
  const isWebView = window.location.hostname === 'localhost' || window.location.protocol.startsWith('capacitor:');
  if (isWebView) {
    return 'http://10.0.2.2:8000/api/v1'; // Default Android emulator loopback
  }
  return `http://${window.location.hostname}:8000/api/v1`;
};


async function request(path: string, options: RequestInit = {}) {
  const token = useStore.getState().token;
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers
  });

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
    return response.blob();
  }

  return response.json();
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
    
  downloadFirPdf: async (journeyId: string, filename: string) => {
    const blob = await request(`/evidence/fir/${journeyId}`);
    const url = window.URL.createObjectURL(blob as any);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  
  cleanupEvidence: () => 
    request('/evidence/cleanup', { method: 'POST' }),

  // Reports & Map Zones
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

  // Simulator Websocket URL
  getWebSocketUrl: (journeyId: string) => {
    const apiBase = getApiBase();
    const wsProto = apiBase.startsWith('https') ? 'wss' : 'ws';
    const host = apiBase.replace(/^https?:\/\//, '').split('/api/v1')[0];
    return `${wsProto}://${host}/api/v1/ws/track/${journeyId}`;
  },

  // Notification simulator trigger
  triggerNotificationSim: (text: string) => 
    request('/simulation/trigger-notification', { method: 'POST', body: JSON.stringify({ text }) })
};
export default api;
