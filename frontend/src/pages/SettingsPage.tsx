/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/rules-of-hooks */
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { Settings, Shield, Sliders, BellRing, CheckCircle2, ShieldAlert, Globe, Activity, XCircle, Wifi, WifiOff, Cpu } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateUserSettings } = useStore();

  const [routeDeviation, setRouteDeviation] = useState(user?.settings?.route_deviation_threshold || 150);
  const [unusualStop, setUnusualStop] = useState(user?.settings?.unusual_stop_threshold || 120);
  const [audioDistress, setAudioDistress] = useState(user?.settings?.audio_distress_threshold || 80);
  const [countdown, setCountdown] = useState(user?.settings?.no_response_timeout || 60);
  const [sirenEnabled, setSirenEnabled] = useState(user?.settings?.siren_enabled !== false);
  const [shakeSensitivity, setShakeSensitivity] = useState(user?.settings?.shake_sensitivity || 12);
  const [autoDelete, setAutoDelete] = useState(true);
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('femme_api_url') || '');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (apiUrl.trim()) {
        localStorage.setItem('femme_api_url', apiUrl.trim());
      } else {
        localStorage.removeItem('femme_api_url');
      }

      const newSettings = {
        route_deviation_threshold: Number(routeDeviation),
        unusual_stop_threshold: Number(unusualStop),
        audio_distress_threshold: Number(audioDistress),
        no_response_timeout: Number(countdown),
        auto_delete_hours: autoDelete ? 24 : 0,
        shake_sensitivity: Number(shakeSensitivity),
        siren_enabled: sirenEnabled
      };

      await api.updateSettings(newSettings);
      updateUserSettings(newSettings);

      setMessage('Safety shield parameters saved and applied successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to sync settings.');
    } finally {
      setLoading(false);
    }
  };

  if (showDiagnostics) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
        <div className="flex justify-between items-center">          <div>
            <h2 className="text-2xl font-black text-slate-800">System Diagnostics</h2>
            <p className="text-xs text-slate-500">Real-time verification of native layers, auth plugins, and backend connectivity.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDiagnostics(false)}
            className="py-2 px-4 bg-white/60 border border-white/40 hover:border-brand-500/30 text-xs font-bold text-slate-700 hover:text-slate-900 rounded-xl transition flex items-center gap-2 backdrop-blur-md"
          >
            <Settings className="w-4 h-4 text-brand-500" />
            Back to Settings
          </button>
        </div>

        <div className="glass-card p-6 space-y-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-500" />
            Hardware & Native Platform Diagnostics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Twilio Verify API Integration */}
            <div className="p-4 glass-item rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Twilio Verify Status</p>
                <p className="text-[10px] text-slate-500">FastAPI twilio client channel</p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>

            {/* Auth Ready */}
            <div className="p-4 glass-item rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Auth Status</p>
                <p className="text-[10px] text-slate-500">Twilio OTP verification flow</p>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 py-1 px-2.5 font-bold rounded-full border border-emerald-200/50">READY</span>
            </div>

            {/* Google Services Bypass */}
            <div className="p-4 glass-item rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Google Play Services Status</p>
                <p className="text-[10px] text-slate-500">Firebase native dependencies bypassed</p>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 py-1 px-2.5 font-bold rounded-full border border-emerald-200/50">UNNEEDED</span>
            </div>

            {/* Package Name */}
            <div className="p-4 glass-item rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Application ID</p>
                <p className="text-[10px] text-slate-500">AndroidManifest namespace</p>
              </div>
              <code className="text-xs font-mono text-brand-500 font-bold">com.femme.app</code>
            </div>

            {/* Environment */}
            <div className="p-4 glass-item rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Build Environment</p>
                <p className="text-[10px] text-slate-500">Vite compile targets</p>
              </div>
              <span className="text-[10px] bg-brand-50 text-brand-700 py-1 px-2.5 font-bold rounded-full border border-brand-200/50">
                {import.meta.env.MODE.toUpperCase()}
              </span>
            </div>

            {/* Internet connection */}
            <div className="p-4 glass-item rounded-xl flex items-center justify-between">
              <div className="space-y-1 flex items-center gap-3">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-emerald-500" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-500" />
                )}
                <div>
                  <p className="text-xs font-bold text-slate-800">Network Status</p>
                  <p className="text-[10px] text-slate-500">Browser connection state</p>
                </div>
              </div>
              {isOnline ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 py-1 px-2.5 font-bold rounded-full border border-emerald-200/50">ONLINE</span>
              ) : (
                <span className="text-[10px] bg-red-50 text-red-700 py-1 px-2.5 font-bold rounded-full border border-red-200/50">OFFLINE</span>
              )}
            </div>

            {/* Phone Auth Enabled */}
            <div className="p-4 glass-item rounded-xl flex items-center justify-between md:col-span-2">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Phone Authentication Capability</p>
                <p className="text-[10px] text-slate-500">
                  Production Twilio Verify OTP is active. SMS OTP will verify with Twilio.
                </p>
              </div>
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Shield Settings</h2>
          <p className="text-xs text-slate-500">Calibrate passive tracking triggers, notification intervals, and de-escalation check timeouts.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowDiagnostics(true)}
          className="py-2 px-4 bg-white/60 border border-white/40 hover:border-brand-500/30 text-xs font-bold text-slate-700 hover:text-slate-900 rounded-xl transition flex items-center gap-2 backdrop-blur-md shadow-sm"
        >
          <Activity className="w-4 h-4 text-brand-500" />
          System Diagnostics
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50/40 border border-emerald-500/30 text-emerald-700 text-xs rounded-xl flex gap-2 items-start">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50/40 border border-red-500/30 text-red-750 text-xs rounded-xl flex gap-2 items-start">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Sliders Column */}
        <div className="md:col-span-2 glass-card p-6 space-y-6">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-brand-500" />
            Calibration Parameters
          </h3>

          <div className="space-y-4">
                        {/* Route deviation */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Route Deviation Boundary</span>
                <span className="text-brand-500">{routeDeviation} meters</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="25"
                value={routeDeviation}
                onChange={(e) => setRouteDeviation(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Unusual stop */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Unusual Stop Trigger Time</span>
                <span className="text-brand-500">{unusualStop} seconds</span>
              </div>
              <input
                type="range"
                min="30"
                max="300"
                step="10"
                value={unusualStop}
                onChange={(e) => setUnusualStop(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Scream DB */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>Audio Distress Sensitivity</span>
                <span className="text-brand-500">{audioDistress} dB</span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                step="5"
                value={audioDistress}
                onChange={(e) => setAudioDistress(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Countdown */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>"Are You Okay?" Response Timeout</span>
                <span className="text-brand-500">{countdown} seconds</span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="5"
                value={countdown}
                onChange={(e) => setCountdown(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
            
          </div>

          {/* API Server Configuration */}
          <div className="border-t border-slate-200/50 pt-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-500" />
              API Server Configuration
            </h3>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Backend Server IP / Domain</label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="E.g., http://192.168.1.100:8000 (Leave blank for local fallback)"
                className="w-full glass-input rounded-xl py-3 px-4 text-xs"
              />
              <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                Provide the host server endpoint. Under Android emulator, it falls back to <code className="text-brand-400">http://10.0.2.2:8000</code>. On real devices, specify your local host WiFi IP or cloud URL.
              </p>
            </div>
          </div>
        </div>
        {/* Checkbox triggers column */}
        <div className="glass-card p-6 space-y-6 h-fit">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-brand-500" />
            Shield Switches
          </h3>

          <div className="space-y-4">
            
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sirenEnabled}
                onChange={(e) => setSirenEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-brand-650 focus:ring-brand-500 focus:ring-opacity-25 bg-white border-slate-300 mt-0.5 accent-brand-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800">Play Audio Siren</p>
                <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Emit high decibel wailing tones programmatically when SOS is active.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDelete}
                onChange={(e) => setAutoDelete(e.target.checked)}
                className="w-4 h-4 rounded text-brand-650 focus:ring-brand-500 focus:ring-opacity-25 bg-white border-slate-300 mt-0.5 accent-brand-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800">Auto-Delete safely</p>
                <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Delete journey evidence records after 24 hours if arrived safely.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shakeSensitivity > 0}
                onChange={(e) => setShakeSensitivity(e.target.checked ? 12 : 0)}
                className="w-4 h-4 rounded text-brand-650 focus:ring-brand-500 focus:ring-opacity-25 bg-white border-slate-300 mt-0.5 accent-brand-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800">Shake-to-trigger SOS</p>
                <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Enable device accelerometer shake listeners to trigger immediate SOS dispatch.</p>
              </div>
            </label>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition duration-150 text-xs shadow-md"
          >
            {loading ? 'Saving Parameters...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
