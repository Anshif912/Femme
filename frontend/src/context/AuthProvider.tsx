import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from '../utils/jwtDecode';
import { useStore } from '../store/useStore';
import api from '../utils/api';

interface UserProfile {
  name: string;
  phone: string;
  created_at: string;
  settings: any;
  profile: any;
}

interface AuthContextProps {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (phone: string, otp: string, name?: string) => Promise<void>;
  logout: () => void;

}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  console.log('AuthProvider mounted');
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ----- Inactivity handling -----
  const idleTimeoutMs = 30 * 60 * 1000; // 30 minutes
  const warningTimeoutMs = 5 * 60 * 1000; // 5‑minute warning before logout
  let idleTimer: any = null;
  let warningTimer: any = null;

  const clearTimers = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (warningTimer) clearTimeout(warningTimer);
  };

  const scheduleIdleTimers = () => {
    clearTimers();
    // Show warning after (idleTimeout - warning) then logout after warning period
    idleTimer = setTimeout(() => {
      // TODO: trigger UI warning modal via a global event/store flag
      warningTimer = setTimeout(() => {
        logout();
      }, warningTimeoutMs);
    }, idleTimeoutMs - warningTimeoutMs);
  };

  const resetIdleTimer = () => {
    scheduleIdleTimers();
  };

  // ----- Token & state helpers -----
  const storeToken = (access: string) => {
    localStorage.setItem('access_token', access);
    // Pull user profile to sync Zustand store
    api.getMe()
      .then((profile: any) => {
        useStore.getState().setAuth(profile, access);
        setUser(profile);
        setIsAuthenticated(true);
      })
      .catch(() => logout());
  };

  const clearAllClientState = () => {
    // Storage
    localStorage.removeItem('access_token');
    sessionStorage.clear();
    // Zustand store – reset everything relevant to the session
    useStore.getState().logout(); // clears token, user, auth flag
    useStore.getState().resetTelemetryState(); // clears SOS & telemetry caches
    useStore.getState().setActiveJourney(null);
    // Reset local React state
    setUser(null);
    setIsAuthenticated(false);
  };

  // ----- Public API -----
  const login = async (phone: string, otp: string, name?: string) => {
    // Backend endpoint should return { access_token }
    const resp = await api.verifyOtp(phone, otp, name);
    if (resp && resp.access_token) {
      storeToken(resp.access_token);
      navigate('/dashboard');
    } else {
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    clearAllClientState();
    navigate('/auth');
  };



  // ----- Initialisation -----
  useEffect(() => {
    const access = localStorage.getItem('access_token');
    if (access) {
      try {
        const decoded: any = jwtDecode(access);
        const now = Date.now() / 1000;
        if (decoded.exp && decoded.exp > now + 60) {
          // token is still valid
          api.getMe()
            .then((profile: any) => {
              useStore.getState().setAuth(profile, access);
              setUser(profile);
              setIsAuthenticated(true);
            })
            .catch(() => logout());
        } else {
          // token expired – force logout
          logout();
        }
      } catch {
        logout();
      }
    } else {
      // no token – ensure we are on a public page
      clearAllClientState();
      const hash = window.location.hash;
      if (hash && hash !== '#/' && hash !== '#/auth') {
        navigate('/auth');
      }
    }

    // Set up inactivity listeners
    const events = ['mousemove', 'keydown', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer));
    scheduleIdleTimers();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
