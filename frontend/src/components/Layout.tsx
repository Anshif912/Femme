import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
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

  const handleEscalate = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnomalyPopup(false);
    setCountdown(60);
    setEmergencyState(true);
    try {
      await api.triggerSos();
      navigate('/sos');
    } catch (err) {
      console.error("SOS Trigger failed:", err);
      navigate('/sos');
    }
  };

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-dark-950 text-gray-100">{children}</div>;
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
    <div className="min-h-screen bg-dark-950 flex flex-col md:flex-row text-gray-200">
      
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-dark-900 border-r border-gray-800 p-4 shrink-0">
        <div className="flex items-center gap-3 px-2 py-4 border-b border-gray-800 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center animate-pulse-slow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white tracking-wide">FEMME</h1>
            <p className="text-xs text-brand-400 font-semibold tracking-widest">SHE TRAVELS. WE GUARD.</p>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' 
                    : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-brand-500' : ''}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {activeJourney && (
          <div className="mt-4 p-3 bg-brand-500/5 border border-brand-500/10 rounded-lg animate-pulse">
            <div className="flex items-center gap-2 text-xs text-brand-400 font-bold mb-1">
              <span className="w-2 h-2 rounded-full bg-brand-500 inline-block animate-ping"></span>
              SHIELD ACTIVE
            </div>
            <p className="text-xs text-gray-400 truncate">Cab: {activeJourney.cab_number}</p>
          </div>
        )}

        <div className="border-t border-gray-800 pt-4 mt-4">
          <div className="flex items-center justify-between gap-3 px-2 mb-3">
            <div className="truncate">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.phone}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-950/20 hover:text-red-400 transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Header and Mobile Nav */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-dark-900 border-b border-gray-800 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-white tracking-wide">FEMME</span>
          </div>
          {activeJourney && (
            <Link to="/route-view" className="text-xs px-2.5 py-1 bg-brand-600 text-white rounded-full font-bold flex items-center gap-1.5 animate-pulse">
              <Radio className="w-3.5 h-3.5 animate-ping-slow" />
              LIVE
            </Link>
          )}
        </header>

        {/* Page Content area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 relative">
          {children}
        </main>

        {/* Bottom Nav Bar - Mobile Only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-900/90 backdrop-blur-md border-t border-gray-800 flex justify-around py-2 px-1 z-40">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-brand-400' : 'text-gray-400'
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
              location.pathname === '/settings' ? 'text-brand-400' : 'text-gray-400'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">Settings</span>
          </button>
        </nav>
      </div>

      {/* Global Are You Okay Alert Prompt Modal */}
      {anomalyPopupActive && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-heavy p-6 max-w-md w-full rounded-2xl border border-red-500/30 text-center shadow-2xl relative overflow-hidden animate-scale-up">
            
            {/* Danger Glow Header */}
            <div className="w-16 h-16 bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
              <AlertTriangle className="w-8 h-8 text-red-500 animate-bounce" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Are You Okay?</h3>
            <p className="text-sm text-gray-300 mb-6">
              We detected {routeDeviation && "a Route Deviation"}
              {motionAnomaly && (routeDeviation ? " & " : "") + "an Unusual Stop"}
              {audioAnomaly && ((routeDeviation || motionAnomaly) ? " & " : "") + "Audio distress signatures"}.
              Please confirm your safety immediately.
            </p>

            {/* Timer countdown progress ring */}
            <div className="w-20 h-20 border-4 border-gray-800 border-t-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-black text-red-400">{countdownSeconds}s</span>
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
                  className="py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg transition duration-200"
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
  );
};
export default Layout;
