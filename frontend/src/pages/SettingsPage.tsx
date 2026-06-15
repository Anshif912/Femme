import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { Settings, Shield, Sliders, BellRing, CheckCircle2, ShieldAlert, Globe } from 'lucide-react';

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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white">Shield Settings</h2>
        <p className="text-xs text-gray-400">Calibrate passive tracking triggers, notification intervals, and de-escalation check timeouts.</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex gap-2 items-start">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl flex gap-2 items-start">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Sliders Column */}
        <div className="md:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-brand-500" />
            Calibration Parameters
          </h3>

          <div className="space-y-4">
            
            {/* Route deviation */}
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                <span>Route Deviation Boundary</span>
                <span className="text-brand-400">{routeDeviation} meters</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="25"
                value={routeDeviation}
                onChange={(e) => setRouteDeviation(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Unusual stop */}
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                <span>Unusual Stop Trigger Time</span>
                <span className="text-brand-400">{unusualStop} seconds</span>
              </div>
              <input
                type="range"
                min="30"
                max="300"
                step="10"
                value={unusualStop}
                onChange={(e) => setUnusualStop(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Scream DB */}
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                <span>Audio Distress Sensitivity</span>
                <span className="text-brand-400">{audioDistress} dB</span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                step="5"
                value={audioDistress}
                onChange={(e) => setAudioDistress(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Countdown */}
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                <span>"Are You Okay?" Response Timeout</span>
                <span className="text-brand-400">{countdown} seconds</span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="5"
                value={countdown}
                onChange={(e) => setCountdown(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
            
          </div>

          {/* API Server Configuration */}
          <div className="border-t border-gray-800 pt-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-500" />
              API Server Configuration
            </h3>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Backend Server IP / Domain</label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="E.g., http://192.168.1.100:8000 (Leave blank for local fallback)"
                className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-3 px-4 text-white text-xs outline-none transition"
              />
              <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                Provide the host server endpoint. Under Android emulator, it falls back to <code className="text-brand-400">http://10.0.2.2:8000</code>. On real devices, specify your local host WiFi IP or cloud URL.
              </p>
            </div>
          </div>
        </div>

        {/* Checkbox triggers column */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-6 h-fit">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-brand-500" />
            Shield Switches
          </h3>

          <div className="space-y-4">
            
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sirenEnabled}
                onChange={(e) => setSirenEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 focus:ring-opacity-25 bg-gray-900 border-gray-800 mt-0.5 accent-brand-500"
              />
              <div className="text-xs">
                <p className="font-bold text-white">Play Audio Siren</p>
                <p className="text-[10px] text-gray-500 leading-normal mt-0.5">Emit high decibel wailing tones programmatically when SOS is active.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDelete}
                onChange={(e) => setAutoDelete(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 focus:ring-opacity-25 bg-gray-900 border-gray-800 mt-0.5 accent-brand-500"
              />
              <div className="text-xs">
                <p className="font-bold text-white">Auto-Delete safely</p>
                <p className="text-[10px] text-gray-500 leading-normal mt-0.5">Delete journey evidence records after 24 hours if arrived safely.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shakeSensitivity > 0}
                onChange={(e) => setShakeSensitivity(e.target.checked ? 12 : 0)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 focus:ring-opacity-25 bg-gray-900 border-gray-800 mt-0.5 accent-brand-500"
              />
              <div className="text-xs">
                <p className="font-bold text-white">Shake-to-trigger SOS</p>
                <p className="text-[10px] text-gray-500 leading-normal mt-0.5">Enable device accelerometer shake listeners to trigger immediate SOS dispatch.</p>
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
