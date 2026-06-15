import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserSettings {
  route_deviation_threshold: number;
  unusual_stop_threshold: number;
  audio_distress_threshold: number;
  no_response_timeout: number;
  auto_delete_hours: number;
  shake_sensitivity: number;
  siren_enabled: boolean;
}

export interface UserProfile {
  medical_info: string;
  emergency_card: string;
  blood_group: string;
  primary_cab_preference: string;
}

export interface User {
  phone: string;
  name: string;
  created_at: string;
  settings: UserSettings;
  profile: UserProfile;
}

export interface Journey {
  id: string;
  user_phone: string;
  cab_number: string;
  provider: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dest_address: string;
  dest_lat: number;
  dest_lng: number;
  start_time: string;
  end_time: string | null;
  status: 'active' | 'completed' | 'emergency' | 'cancelled';
  expected_route: [number, number][];
  current_lat: number;
  current_lng: number;
}

interface AppState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  activeJourney: Journey | null;
  
  // Real-time passive telemetry metrics
  currentLat: number | null;
  currentLng: number | null;
  currentSpeed: number; // m/s
  speedHistory: number[];
  motionAnomaly: boolean;
  audioAnomaly: boolean;
  routeDeviation: boolean;
  deviationMeters: number;
  capsuleSnapshots: any[];
  
  // Anomaly popup & escalations
  isMonitoring: boolean;
  isEmergency: boolean;
  anomalyPopupActive: boolean;
  countdownSeconds: number;
  
  // Actions
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUserFields: (fields: Partial<User>) => void;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  
  setActiveJourney: (journey: Journey | null) => void;
  updateLiveLocation: (lat: number, lng: number, speed: number) => void;
  setAnomalyFlags: (flags: { routeDeviation: boolean; deviationMeters: number; motionAnomaly: boolean; audioAnomaly: boolean }) => void;
  addCapsuleSnapshot: (capsule: any) => void;
  setMonitoring: (isMonitored: boolean) => void;
  setEmergencyState: (emergency: boolean) => void;
  setAnomalyPopup: (active: boolean) => void;
  setCountdown: (sec: number) => void;
  resetTelemetryState: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      activeJourney: null,
      
      currentLat: null,
      currentLng: null,
      currentSpeed: 0,
      speedHistory: [],
      motionAnomaly: false,
      audioAnomaly: false,
      routeDeviation: false,
      deviationMeters: 0,
      capsuleSnapshots: [],
      
      isMonitoring: false,
      isEmergency: false,
      anomalyPopupActive: false,
      countdownSeconds: 60,

      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({
        token: null,
        user: null,
        isAuthenticated: false,
        activeJourney: null,
        isMonitoring: false,
        isEmergency: false,
        currentLat: null,
        currentLng: null,
        currentSpeed: 0,
        speedHistory: [],
        capsuleSnapshots: [],
        anomalyPopupActive: false
      }),
      updateUserFields: (fields) => set((state) => ({
        user: state.user ? { ...state.user, ...fields } : null
      })),
      updateUserSettings: (settings) => set((state) => ({
        user: state.user ? { ...state.user, settings: { ...state.user.settings, ...settings } } : null
      })),
      updateUserProfile: (profile) => set((state) => ({
        user: state.user ? { ...state.user, profile: { ...state.user.profile, ...profile } } : null
      })),
      
      setActiveJourney: (journey) => set({ 
        activeJourney: journey,
        isMonitoring: journey ? true : false,
        isEmergency: journey?.status === 'emergency' ? true : false
      }),
      updateLiveLocation: (lat, lng, speed) => set((state) => {
        const nextHist = [...state.speedHistory, speed].slice(-20); // Keep last 20 speed ticks
        return {
          currentLat: lat,
          currentLng: lng,
          currentSpeed: speed,
          speedHistory: nextHist
        };
      }),
      setAnomalyFlags: (flags) => set({
        routeDeviation: flags.routeDeviation,
        deviationMeters: flags.deviationMeters,
        motionAnomaly: flags.motionAnomaly,
        audioAnomaly: flags.audioAnomaly
      }),
      addCapsuleSnapshot: (capsule) => set((state) => ({
        capsuleSnapshots: [...state.capsuleSnapshots, capsule].slice(-100) // keep last 100 snapshots
      })),
      setMonitoring: (isMonitored) => set({ isMonitoring: isMonitored }),
      setEmergencyState: (emergency) => set((state) => {
        if (state.activeJourney) {
          return {
            isEmergency: emergency,
            activeJourney: { ...state.activeJourney, status: emergency ? 'emergency' : 'active' }
          };
        }
        return { isEmergency: emergency };
      }),
      setAnomalyPopup: (active) => set({ anomalyPopupActive: active }),
      setCountdown: (sec) => set({ countdownSeconds: sec }),
      resetTelemetryState: () => set({
        currentLat: null,
        currentLng: null,
        currentSpeed: 0,
        speedHistory: [],
        motionAnomaly: false,
        audioAnomaly: false,
        routeDeviation: false,
        deviationMeters: 0,
        capsuleSnapshots: [],
        anomalyPopupActive: false,
        countdownSeconds: 60
      })
    }),
    {
      name: 'femme-safeguard-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        activeJourney: state.activeJourney
      })
    }
  )
);
