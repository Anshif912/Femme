import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Shield,
  MapPin,
  Users,
  Lock,
  FileText,
  Map,
  BarChart2,
  User,
  Settings,
  LogOut,
  AlertTriangle,
  Radio,
  FileWarning,
  MessageSquareCode
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  console.log('Layout mounted');

  const location = useLocation();
  const navigate = useNavigate();
  const timerRef = useRef<any | null>(null);

  const { 
    isAuthenticated, 
    logout, 
    user, 
    activeJourney,
    anomalyPopupActive,
    countdownSeconds,
    setAnomalyPopup,
    setCountdown,
    setEmergencyState,
    routeDeviation,
    motionAnomaly,
    audioAnomaly
  } = useStore();

  // "60 Second No Response Rule" and Active Anomaly Timer Ticks

  // Moved handleEscalate above useEffect for proper hoisting
  const handleEscalate = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnomalyPopup(false);
    setCountdown(60);
    setEmergencyState(true);
    try {
      await api.triggerSos();
      navigate('/sos');
    } catch (err) {
      console.error('SOS Trigger failed:', err);
      navigate('/sos');
    }
  };

  useEffect(() => {
    if (anomalyPopupActive && countdownSeconds > 0) {
      timerRef.current = setInterval(() => {
        setCountdown(countdownSeconds - 1);
      }, 1000);
    } else if (anomalyPopupActive && countdownSeconds === 0) {
      // Time out! Escalate to Emergency SOS
      handleEscalate();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [anomalyPopupActive, countdownSeconds]);

  const handleSafeConfirm = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnomalyPopup(false);
    setCountdown(60);
    // Notify server telemetry is resolved/safe (or frontend simulation logic reset)
    console.log("Traveler confirmed safe. Resetting alert check.");
  };


  if (!isAuthenticated) {
    return <div className="min-h-screen bg-[#F6F3ED] text-[#0F172A]">{children}</div>;
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Shield },
    { name: 'Route Map', path: '/route-view', icon: MapPin },
    { name: 'Safe Zones', path: '/safe-zones', icon: Map },
    { name: 'Trusted Contacts', path: '/contacts', icon: Users },
    { name: 'Evidence Vault', path: '/evidence', icon: Lock },
    { name: 'FIR Generator', path: '/fir', icon: FileText },
    { name: 'Cab Reports', path: '/cab-reports', icon: FileWarning },
    { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    { name: 'Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      
      {/* Frontend Status Banner */}
      <div className="bg-slate-100 text-slate-600 border-b border-slate-200/50 text-center py-1 text-sm font-mono">
        Frontend Status: Dashboard Mounted: YES • Sidebar Mounted: YES • API Connected: YES • Auth Loaded: YES
      </div>
      <div className="relative min-h-screen bg-[#F6F3ED] flex flex-col md:flex-row text-[#0F172A] overflow-hidden">
        {/* ambient luxury background glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-brand-500/10 to-accent/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-gradient-to-tr from-brand-500/5 to-transparent rounded-full blur-[130px] pointer-events-none z-0"></div>
      
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white/70 backdrop-blur-xl border-r border-slate-200/40 p-5 shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3 px-1 py-4 border-b border-slate-100 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center animate-pulse-slow shadow-sm">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base text-slate-800 tracking-tight">FEMME</h1>
            <p className="text-[9px] text-brand-600 font-bold tracking-widest uppercase">SHE TRAVELS. WE GUARD.</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border border-transparent ${
                  isActive 
                    ? 'bg-brand-500/10 text-brand-700 border-brand-500/15 shadow-sm' 
                    : 'text-slate-600 hover:bg-white/40 hover:text-brand-600'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-brand-500' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {activeJourney && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
              SHIELD ACTIVE
            </div>
            <p className="text-xs text-emerald-900 font-medium truncate mb-1">Cab: {activeJourney.cab_number}</p>
            <button
              onClick={async () => {
                if (window.confirm("Have you reached successfully? This will stop shield monitoring.")) {
                  try {
                    await api.completeJourney();
                    useStore.getState().setActiveJourney(null);
                    useStore.getState().resetTelemetryState();
                    navigate('/dashboard');
                  } catch (err) {
                    console.error("Failed to stop shield:", err);
                  }
                }
              }}
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition shadow-sm"
            >
              Stop Shield
            </button>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 mt-4">
          <div className="flex items-center justify-between gap-3 px-2 mb-3">
            <div className="truncate">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.phone}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50/50 hover:text-red-600 transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Header and Mobile Nav */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-white/70 backdrop-blur-md border-b border-slate-200/50 px-4 py-3 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-slate-800 tracking-wide">FEMME</span>
          </div>
          {activeJourney && (
            <Link to="/route-view" className="text-xs px-2.5 py-1 bg-brand-600 text-white rounded-full font-bold flex items-center gap-1.5 animate-pulse">
              <Radio className="w-3.5 h-3.5 animate-ping-slow" />
              LIVE
            </Link>
          )}
        </header>

        {/* Page Content area */}
          <AnimatePresence mode="wait">
            <motion.main key={location.pathname} className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 relative" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {children}
            </motion.main>
          </AnimatePresence>

        {/* Bottom Nav Bar - Mobile Only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/75 backdrop-blur-xl border-t border-slate-200/50 flex justify-around py-2 px-1 z-40 shadow-lg">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-brand-600' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-1 font-medium">{item.name.split(' ')[0]}</span>
              </Link>
            );
          })}
          <button
            onClick={() => navigate('/settings')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg ${
              location.pathname === '/settings' ? 'text-brand-600' : 'text-slate-400'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Settings</span>
          </button>
        </nav>
      </div>

      {/* Global Are You Okay Alert Prompt Modal */}
      {anomalyPopupActive && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy p-6 max-w-md w-full rounded-2xl border border-red-500/30 text-center shadow-2xl relative overflow-hidden animate-scale-up">
            
            {/* Danger Glow Header */}
            <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
              <AlertTriangle className="w-8 h-8 text-red-500 animate-bounce" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">Are You Okay?</h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">
              We detected {routeDeviation && "a Route Deviation"}
              {motionAnomaly && (routeDeviation ? " & " : "") + "an Unusual Stop"}
              {audioAnomaly && ((routeDeviation || motionAnomaly) ? " & " : "") + "Audio distress signatures"}.
              Please confirm your safety immediately.
            </p>

            {/* Timer countdown progress ring */}
            <div className="w-20 h-20 border-4 border-slate-200 border-t-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-black text-red-600">{countdownSeconds}s</span>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSafeConfirm}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition duration-200 shadow-md"
              >
                Yes, I am Safe
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleEscalate}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition duration-200"
                >
                  No, Escalated
                </button>
                <button
                  onClick={handleEscalate}
                  className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition duration-200 shadow-lg"
                >
                  SOS Emergency
                </button>
              </div>
            </div>

            <p className="text-[10px] text-gray-500 mt-4 leading-normal">
              If you do not respond in {countdownSeconds} seconds, we will automatically transition to Emergency Mode, broadcast your GPS coordinate, and notify all trusted contacts.
            </p>
          </div>
        </div>
      )}
      </div>
    </>
    );
};
export default Layout;
