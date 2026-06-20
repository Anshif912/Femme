import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { 
  Shield, 
  Trash2, 
  CheckCircle2, 
  AlertOctagon, 
  Volume2, 
  Zap, 
  TrendingUp, 
  Play, 
  Pause,
  HelpCircle,
  FileCode2,
  Fingerprint
} from 'lucide-react';

export const ActiveJourneyPage: React.FC = () => {
  const navigate = useNavigate();
  
  const { 
    activeJourney,
    currentSpeed,
    routeDeviation,
    motionAnomaly,
    audioAnomaly,
    capsuleSnapshots,
    setAnomalyPopup,
    setAnomalyFlags,
    updateLiveLocation,
    addCapsuleSnapshot,
    setActiveJourney,
    resetTelemetryState,
    setEmergencyState
  } = useStore();

  const [dbLevel, setDbLevel] = useState(48);
  const [vibrationVal, setVibrationVal] = useState(0.12);
  const [simRunning, setSimRunning] = useState(true);
  const [selectedSimType, setSelectedSimType] = useState<'normal' | 'deviation' | 'stop' | 'scream'>('normal');

  const timerRef = useRef<any | null>(null);
  const sensorTimerRef = useRef<any | null>(null);
  const stepIndexRef = useRef(0);

  // Redirect if no active journey
  useEffect(() => {
    if (!activeJourney) {
      navigate('/dashboard');
    }
  }, [activeJourney]);

  // Simulate sensors (Vibration & Decibels)
  useEffect(() => {
    sensorTimerRef.current = setInterval(() => {
      if (!simRunning) return;
      
      // Default normal sensors
      let noiseBase = 45 + Math.random() * 12;
      let vibBase = 0.08 + Math.random() * 0.1;

      if (selectedSimType === 'scream') {
        noiseBase = 88 + Math.random() * 10; // Scream decibels
      }
      if (selectedSimType === 'stop') {
        vibBase = 0.01; // Perfectly still vehicle
      }

      setDbLevel(Math.round(noiseBase));
      setVibrationVal(Number(vibBase.toFixed(2)));
    }, 800);

    return () => {
      if (sensorTimerRef.current) clearInterval(sensorTimerRef.current);
    };
  }, [simRunning, selectedSimType]);

  // Background Telemetry Worker (Every 10 seconds for snappy simulation / testing, instead of full 30s)
  useEffect(() => {
    if (!activeJourney || !simRunning) return;

    const runTelemetryStep = async () => {
      // Calculate coordinates based on route path steps
      const path = activeJourney.expected_route || [];
      if (path.length === 0) return;

      let lat = activeJourney.current_lat;
      let lng = activeJourney.current_lng;
      let speed = 8.5; // ~30 km/h default

      let simulateDeviationFlag = false;
      let simulateStopFlag = false;
      let simulateAudioFlag = false;

      if (selectedSimType === 'normal') {
        // Move forward along the expected path
        const nextIndex = Math.min(stepIndexRef.current + 1, path.length - 1);
        stepIndexRef.current = nextIndex;
        lat = path[nextIndex][0];
        lng = path[nextIndex][1];
        speed = 8.0 + Math.random() * 4;
      } 
      else if (selectedSimType === 'deviation') {
        // Take a wrong turn (deviate from path coordinates)
        simulateDeviationFlag = true;
        lat = activeJourney.current_lat + 0.0035; // move away
        lng = activeJourney.current_lng + 0.0035;
        speed = 12.0;
      } 
      else if (selectedSimType === 'stop') {
        // Stop vehicle in isolated location
        simulateStopFlag = true;
        speed = 0.0;
      } 
      else if (selectedSimType === 'scream') {
        // Scream / Audio distress
        simulateAudioFlag = true;
        const nextIndex = Math.min(stepIndexRef.current + 1, path.length - 1);
        stepIndexRef.current = nextIndex;
        lat = path[nextIndex][0];
        lng = path[nextIndex][1];
      }

      updateLiveLocation(lat, lng, speed);

      // Call Backend Active Telemetry update
      try {
        const payload = {
          latitude: lat,
          longitude: lng,
          speed: speed,
          timestamp: new Date().toISOString(),
          motion_anomaly: simulateStopFlag,
          audio_anomaly: simulateAudioFlag,
          raw_audio_features: { max_decibels: dbLevel, vibration_g: vibrationVal },
          speed_history: [speed]
        };

        const res = await api.updateTelemetry(payload);

        // Update Anomaly store state
        setAnomalyFlags({
          routeDeviation: res.route_deviation,
          deviationMeters: res.deviation_meters,
          motionAnomaly: res.motion_anomaly,
          audioAnomaly: res.audio_anomaly
        });

        // Add capsule snapshot
        addCapsuleSnapshot({
          timestamp: payload.timestamp,
          latitude: lat,
          longitude: lng,
          speed: speed,
          route_deviation: res.route_deviation,
          motion_anomaly: res.motion_anomaly,
          audio_anomaly: res.audio_anomaly,
          integrity_hash: res.capsule_hash
        });

        // Trigger "Are You Okay" if anomalies exist
        if (res.trigger_check) {
          setAnomalyPopup(true);
        }
      } catch (err) {
        console.error("Telemetry report failed:", err);
      }
    };

    // Run first step immediately, then interval
    runTelemetryStep();
    timerRef.current = setInterval(runTelemetryStep, 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeJourney, simRunning, selectedSimType, dbLevel, vibrationVal]);

  const handleCancel = async () => {
    if (confirm("Cancel monitoring?")) {
      try {
        await api.cancelJourney();
        setActiveJourney(null);
        resetTelemetryState();
        navigate('/dashboard');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleComplete = async () => {
    if (confirm("Have you reached successfully? This will stop shield monitoring.")) {
      try {
        await api.completeJourney();
        setActiveJourney(null);
        resetTelemetryState();
        navigate('/dashboard');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSOS = async () => {
    setEmergencyState(true);
    try {
      await api.triggerSos();
      navigate('/sos');
    } catch (err) {
      navigate('/sos');
    }
  };

  if (!activeJourney) return null;

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white">Active Journey</h2>
          <p className="text-xs text-gray-400">Invisible shield passively collecting device telemetry.</p>
        </div>
        
        <button
          onClick={() => navigate('/route-view')}
          className="px-4 py-2 bg-dark-900 hover:bg-dark-800 border border-gray-800 rounded-xl text-xs font-bold text-gray-300 transition"
        >
          View Map Router
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Real-time Telemetry Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Sensor Diagnostics */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Speedometer */}
            <div className="flex flex-col items-center justify-center p-4 bg-dark-950/40 rounded-xl text-center border border-gray-800/40">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Vessel Speed</span>
              <div className="w-24 h-24 border-4 border-brand-500/10 border-t-brand-500 rounded-full flex items-center justify-center mb-3">
                <span className="text-xl font-black text-white">{(currentSpeed * 3.6).toFixed(1)}</span>
              </div>
              <span className="text-[11px] text-gray-400 font-semibold">KM/H</span>
            </div>

            {/* Noise Monitor */}
            <div className="flex flex-col items-center justify-center p-4 bg-dark-950/40 rounded-xl text-center border border-gray-800/40">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ambient Decibels</span>
              <div className={`w-24 h-24 border-4 rounded-full flex items-center justify-center mb-3 ${dbLevel > 80 ? 'border-red-500 animate-pulse' : 'border-emerald-500/40 border-t-emerald-500'}`}>
                <span className="text-xl font-black text-white">{dbLevel}</span>
              </div>
              <span className="text-[11px] text-gray-400 font-semibold">{dbLevel > 80 ? '⚠️ LOUD/SCREAM' : 'QUIET'}</span>
            </div>

            {/* Accel Vibrations */}
            <div className="flex flex-col items-center justify-center p-4 bg-dark-950/40 rounded-xl text-center border border-gray-800/40">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Device Vibration</span>
              <div className="w-24 h-24 border-4 border-indigo-500/40 border-t-indigo-500 rounded-full flex items-center justify-center mb-3">
                <span className="text-xl font-black text-white">{vibrationVal}</span>
              </div>
              <span className="text-[11px] text-gray-400 font-semibold">G-FORCE</span>
            </div>

          </div>

          {/* Chronological Evidence Capsules Log */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
            <div>
              <span className="text-xs font-bold text-brand-400 tracking-widest uppercase">SHA-256 Capsule Logs</span>
              <h3 className="text-lg font-bold text-white">Tamper-Proof Journey Capsules</h3>
              <p className="text-xs text-gray-400">Cryptographically sealed coordinate captures compiled every 30s.</p>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {capsuleSnapshots.slice().reverse().map((capsule, index) => (
                <div key={index} className="p-3 bg-dark-950/40 border border-gray-800/60 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-brand-500 shrink-0" />
                    <div>
                      <p className="font-bold text-gray-300">Capsule #{capsuleSnapshots.length - index}</p>
                      <p className="text-[10px] text-gray-500">{new Date(capsule.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {capsule.route_deviation && <span className="px-1.5 py-0.5 bg-red-950/40 text-red-400 rounded text-[9px] font-bold border border-red-500/10">ROUTE DEVIATION</span>}
                    {capsule.motion_anomaly && <span className="px-1.5 py-0.5 bg-yellow-950/40 text-yellow-400 rounded text-[9px] font-bold border border-yellow-500/10">UNUSUAL STOP</span>}
                    {capsule.audio_anomaly && <span className="px-1.5 py-0.5 bg-orange-950/40 text-orange-400 rounded text-[9px] font-bold border border-orange-500/10">VOICE DISTRESS</span>}
                    <span className="px-1.5 py-0.5 bg-emerald-950/20 text-emerald-400 rounded text-[9px] font-mono border border-emerald-500/10">SHA: {capsule.integrity_hash.slice(0, 12)}...</span>
                  </div>
                </div>
              ))}
              
              {capsuleSnapshots.length === 0 && (
                <div className="py-8 text-center text-xs text-gray-500">
                  Waiting for first capsule compilation...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Simulation Panel & Controls */}
        <div className="space-y-6">
          
          {/* Active Simulators */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 bg-gradient-to-b from-dark-900 to-brand-950/5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Simulation Controller</h3>
              <button
                onClick={() => setSimRunning(!simRunning)}
                className={`p-1.5 rounded-lg border transition ${simRunning ? 'bg-brand-500/15 border-brand-500/20 text-brand-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
              >
                {simRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
            
            <p className="text-xs text-gray-400 leading-normal">
              Select a simulated travel scenario below. Our background runner will inject telemetry anomalies to verify platform alert behaviors:
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setSelectedSimType('normal')}
                className={`p-3 border rounded-xl text-xs text-left font-semibold transition ${selectedSimType === 'normal' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-dark-950/40 border-gray-800 text-gray-400 hover:border-gray-700'}`}
              >
                🟢 Standard Journey Progress
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedSimType('deviation')}
                className={`p-3 border rounded-xl text-xs text-left font-semibold transition ${selectedSimType === 'deviation' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-dark-950/40 border-gray-800 text-gray-400 hover:border-gray-700'}`}
              >
                🔴 Simulate Wrong Turn / Off-Route
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedSimType('stop')}
                className={`p-3 border rounded-xl text-xs text-left font-semibold transition ${selectedSimType === 'stop' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-dark-950/40 border-gray-800 text-gray-400 hover:border-gray-700'}`}
              >
                🟡 Simulate Unexpected / Isolated Stop
              </button>

              <button
                type="button"
                onClick={() => setSelectedSimType('scream')}
                className={`p-3 border rounded-xl text-xs text-left font-semibold transition ${selectedSimType === 'scream' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'bg-dark-950/40 border-gray-800 text-gray-400 hover:border-gray-700'}`}
              >
                🟠 Simulate Vocal Screaming / Distress
              </button>
            </div>
          </div>

          {/* Quick SOS Trigger Button */}
          <button
            onClick={handleSOS}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition duration-150 shadow-lg"
          >
            Trigger Instant SOS Emergency
          </button>

          {/* Reached Safely / Stop Shield Action */}
          <button
            onClick={handleComplete}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition duration-150 shadow-md flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Stop Shield (Reached Safely)
          </button>

          {/* Monitor Cleanup Action */}
          <button
            onClick={handleCancel}
            className="w-full py-3 bg-dark-950 hover:bg-dark-900 border border-gray-800 text-xs font-bold text-gray-400 hover:text-white rounded-xl transition duration-150 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4 text-gray-500" />
            Decommission Tracking
          </button>

        </div>
      </div>
    </div>
  );
};
export default ActiveJourneyPage;
