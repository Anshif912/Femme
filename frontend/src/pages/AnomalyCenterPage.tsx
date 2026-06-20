import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { ShieldAlert, CheckCircle2, Clock, MapPin, Eye, AlertTriangle } from 'lucide-react';

export const AnomalyCenterPage: React.FC = () => {
  const { activeJourney, capsuleSnapshots } = useStore();
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    // Collect all anomalies from the current active session's capsules
    const filtered = capsuleSnapshots.filter(
      (c) => c.route_deviation || c.motion_anomaly || c.audio_anomaly
    );
    setAnomalies(filtered);
  }, [capsuleSnapshots]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800">Anomaly Center</h2>
        <p className="text-xs text-slate-500 font-medium">Chronological history of route wrong-turns, stops, or audio warnings detected during monitoring.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Anomaly Log list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Active Commute Diagnostics</h3>

            <div className="space-y-3">
              {anomalies.slice().reverse().map((anomaly, idx) => (
                <div key={idx} className="p-4 bg-red-50 border border-red-500/20 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2.5 items-start">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {anomaly.route_deviation && "Route Deviation Warning"}
                          {anomaly.motion_anomaly && (anomaly.route_deviation ? " & " : "") + "Isolated Stopped Vehicle"}
                          {anomaly.audio_anomaly && ((anomaly.route_deviation || anomaly.motion_anomaly) ? " & " : "") + "Acoustic Distress Trigger"}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Capsule Hash: {anomaly.integrity_hash.slice(0, 16)}...</p>
                      </div>
                    </div>
                    
                    <span className="px-2 py-0.5 bg-brand-500/10 text-brand-700 border border-brand-500/20 rounded text-[10px] font-bold">
                      RESOLVED SAFE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 border-t border-slate-100 pt-3 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Timestamp: {new Date(anomaly.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>GPS: {anomaly.latitude.toFixed(5)}, {anomaly.longitude.toFixed(5)}</span>
                    </div>
                  </div>
                </div>
              ))}

              {anomalies.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-slate-800">All Metrics Secure</p>
                  <p className="font-medium">Zero deviations, anomalous stops, or vocal distress patterns encountered.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Diagnosis logic overview card */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Diagnostic Settings</h4>
            
            <div className="space-y-4 text-xs text-slate-600 font-semibold">
              <div className="p-3 bg-white/40 rounded-xl border border-white/50">
                <p className="font-bold text-slate-800 mb-1">Route Deviation Boundary</p>
                <p className="text-[10px] leading-relaxed text-slate-600">
                  Triggers verification check if the GPS distance between active vehicle coordinate and OSRM route nodes exceeds <strong className="text-brand-600">150 meters</strong>.
                </p>
              </div>

              <div className="p-3 bg-white/40 rounded-xl border border-white/50">
                <p className="font-bold text-slate-800 mb-1">Unusual Stop Timeout</p>
                <p className="text-[10px] leading-relaxed text-slate-600">
                  Triggers verification check if device speed remains at <strong className="text-brand-600">0.0 km/h</strong> inside isolated/danger map coordinates for longer than <strong className="text-brand-600">120 seconds</strong>.
                </p>
              </div>

              <div className="p-3 bg-white/40 rounded-xl border border-white/50">
                <p className="font-bold text-slate-800 mb-1">On-Device Vocal Scream Engine</p>
                <p className="text-[10px] leading-relaxed text-slate-600">
                  Privacy-first pattern checks monitoring frequency fluctuations typical of screaming. Threshold level: <strong className="text-brand-600">80dB equivalent</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default AnomalyCenterPage;
