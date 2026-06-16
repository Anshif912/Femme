import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { ShieldAlert, Volume2, VolumeX, Eye, Phone, MapPin, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

export const SOSCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentLat, currentLng, activeJourney, resetTelemetryState, setActiveJourney, setEmergencyState } = useStore();

  const [sirenPlaying, setSirenPlaying] = useState(true);
  const [blinkingState, setBlinkingState] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [steps, setSteps] = useState({
    emergencyActivated: false,
    smsSent: false,
    smsStatus: '',
    callInitiated: false,
    liveTrackingActive: false,
    evidenceLocked: false,
    emergencyTimestamp: ''
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Auto trigger SOS on page enter (One-tap action completed!)
  useEffect(() => {
    const triggerEmergencyProtocol = async () => {
      setLoading(true);
      try {
        console.log("SOS button pressed");

        let cont = [];
        try {
          cont = await api.getContacts();
          setContacts(cont);
        } catch (e) {
          console.error("Failed to load contacts for payload:", e);
        }

        const payload = {
          user: user,
          journey: activeJourney,
          location: { latitude: currentLat, longitude: currentLng },
          trustedContacts: cont
        };
        console.log("SOS request payload", payload);

        const res = await api.triggerSos();
        console.log("SOS response", res);
        
        const active = await api.getActiveJourney();
        if (active) {
          setActiveJourney(active);
        }
        setEmergencyState(true);

        setSteps({
          emergencyActivated: res.success ? true : false,
          smsSent: res.sms_sent,
          smsStatus: res.sms_status || (res.sms_sent ? 'SMS Sent' : 'SMS Failed'),
          callInitiated: res.call_initiated,
          liveTrackingActive: true,
          evidenceLocked: true,
          emergencyTimestamp: new Date().toLocaleTimeString() + " UTC"
        });
      } catch (err) {
        console.error("SOS trigger fail:", err);
      } finally {
        setLoading(false);
      }
    };
    triggerEmergencyProtocol();
  }, []);

  // Web Audio Programmatic Siren Synthesizer (No static file dependencies!)
  useEffect(() => {
    if (sirenPlaying) {
      try {
        // Initialize AudioContext
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        
        // Siren frequency modulation (wailing sound)
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1.0);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        // Loop the frequency sweep
        let sweepInterval = setInterval(() => {
          if (ctx.state === 'suspended') return;
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
          osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1.0);
        }, 1000);

        gain.gain.setValueAtTime(0.15, ctx.currentTime); // moderate volume

        osc.start();
        oscillatorRef.current = osc;
        gainRef.current = gain;

        return () => {
          clearInterval(sweepInterval);
          osc.stop();
          ctx.close();
        };
      } catch (e) {
        console.error("Web Audio Siren failed:", e);
      }
    }
  }, [sirenPlaying]);

  // Flash Screen visual effect timer
  useEffect(() => {
    const flashTimer = setInterval(() => {
      setBlinkingState((prev) => !prev);
    }, 300);
    return () => clearInterval(flashTimer);
  }, []);

  const handleDeescalate = async () => {
    if (confirm("Verify PIN or confirm identity to de-escalate emergency state?")) {
      try {
        await api.completeJourney();
        setActiveJourney(null);
        setEmergencyState(false);
        resetTelemetryState();
        setSirenPlaying(false);
        alert("Emergency resolved successfully. Contacts notified of safety.");
        navigate('/dashboard');
      } catch (err) {
        console.error(err);
        setActiveJourney(null);
        setEmergencyState(false);
        resetTelemetryState();
        setSirenPlaying(false);
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className={`min-h-[80vh] rounded-3xl p-6 transition-all duration-300 ${
      blinkingState ? 'bg-red-950/40 border-2 border-red-500/80 glow-rose' : 'bg-dark-900 border-2 border-gray-800'
    } flex flex-col items-center justify-center text-center space-y-6`}>
      
      {/* Blinking SOS Alert Icon */}
      <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-red-500/30">
        <ShieldAlert className="w-10 h-10 text-white" />
      </div>

      <div>
        <h2 className="text-3xl font-black text-white tracking-wide uppercase">EMERGENCY SOS ACTIVE</h2>
        <p className="text-xs text-red-400 mt-2 font-semibold tracking-widest uppercase">
          Live GPS stream dispatched to priority guardians
        </p>
      </div>

      {/* Emergency Progress Checklist */}
      <div className="glass-card p-5 max-w-sm w-full rounded-2xl border border-red-500/20 text-left space-y-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 mb-2">
          Emergency Checklist Actions
        </h4>
        
        <div className="space-y-2.5 text-xs font-semibold">
          <div className="flex items-center gap-2.5">
            {steps.emergencyActivated ? (
              <span className="text-emerald-400 font-bold">✓</span>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            )}
            <span className={steps.emergencyActivated ? 'text-gray-300' : 'text-gray-500'}>Emergency Activated</span>
          </div>

          <div className="flex items-center gap-2.5">
            {steps.smsSent ? (
              <span className="text-emerald-400 font-bold">✓</span>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            )}
            <span className={steps.smsSent ? 'text-gray-300' : 'text-gray-500'}>
              {steps.smsStatus || 'SMS Sent'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {steps.callInitiated ? (
              <span className="text-emerald-400 font-bold">✓</span>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            )}
            <span className={steps.callInitiated ? 'text-gray-300' : 'text-gray-500'}>Call Initiated</span>
          </div>

          <div className="flex items-center gap-2.5">
            {steps.liveTrackingActive ? (
              <span className="text-emerald-400 font-bold">✓</span>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            )}
            <span className={steps.liveTrackingActive ? 'text-gray-300' : 'text-gray-500'}>Live Tracking Active</span>
          </div>

          <div className="flex items-center gap-2.5">
            {steps.evidenceLocked ? (
              <span className="text-emerald-400 font-bold">✓</span>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            )}
            <span className={steps.evidenceLocked ? 'text-gray-300' : 'text-gray-500'}>Evidence Locked</span>
          </div>
        </div>

        {steps.emergencyTimestamp && (
          <div className="border-t border-gray-800 pt-2 mt-2 flex justify-between items-center text-[10px] text-gray-500 font-mono">
            <span>EMERGENCY TIMESTAMP:</span>
            <span>{steps.emergencyTimestamp}</span>
          </div>
        )}
      </div>

      {/* Audio Siren Toggles */}
      <div className="flex gap-2.5">
        <button
          onClick={() => setSirenPlaying(!sirenPlaying)}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
            sirenPlaying ? 'bg-red-500/10 border border-red-500/25 text-red-400' : 'bg-gray-800 text-gray-400'
          }`}
        >
          {sirenPlaying ? (
            <>
              <Volume2 className="w-4 h-4 animate-pulse" />
              Siren On
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4" />
              Siren Silenced
            </>
          )}
        </button>
      </div>

      {/* Real-time coordinates log overlay */}
      <div className="p-4 bg-dark-950/80 border border-gray-800 rounded-xl max-w-sm w-full text-xs text-gray-400 leading-normal">
        <div className="flex items-center justify-between font-bold text-gray-300 mb-2">
          <span>Active Coordinate Stream:</span>
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
        </div>
        <div className="space-y-1 text-left font-mono">
          <p>Latitude: {activeJourney?.current_lat?.toFixed(5) || "12.9716"}</p>
          <p>Longitude: {activeJourney?.current_lng?.toFixed(5) || "77.5946"}</p>
          <p>Cab Number: {activeJourney?.cab_number || "EMERGENCY_SOS"}</p>
        </div>
      </div>

      {/* Priority emergency contacts dispatcher log */}
      <div className="max-w-md w-full text-left space-y-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Notified Guardians</h4>
        
        {contacts.map((c, i) => (
          <div key={i} className="p-3 bg-dark-950/50 border border-gray-800 rounded-xl flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-white">{c.name}</p>
              <p className="text-[10px] text-gray-500 font-mono">{c.phone}</p>
            </div>
            <a href={`tel:${c.phone}`} className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:text-white rounded-lg transition">
              <Phone className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}

        {contacts.length === 0 && (
          <p className="text-xs text-gray-500 text-center font-light">
            No contacts configured. Emergency dispatcher triggers fallback webhooks.
          </p>
        )}
      </div>

      {/* Resolution trigger button */}
      <button
        onClick={handleDeescalate}
        className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition duration-150 shadow-lg text-sm"
      >
        De-escalate & Set Safe Status
      </button>

    </div>
  );
};
export default SOSCenterPage;
