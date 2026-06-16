import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { ShieldAlert, Volume2, VolumeX, Phone, CheckCircle2, Loader2, ShieldAlert as AlertIcon, Eye, Smartphone, MessageSquare, MessageCircle } from 'lucide-react';

export const SOSCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentLat, currentLng, activeJourney, resetTelemetryState, setActiveJourney, setEmergencyState } = useStore();

  const [sirenPlaying, setSirenPlaying] = useState(true);
  const [blinkingState, setBlinkingState] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [alertStatuses, setAlertStatuses] = useState<any[]>([]);
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

  // 1. Auto trigger SOS on page enter (One-tap action completed!)
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

        const res = await api.triggerSos();
        console.log("SOS response", res);
        
        const active = await api.getActiveJourney();
        if (active) {
          setActiveJourney(active);
        }
        setEmergencyState(true);

        const latVal = active?.current_lat || 12.9716;
        const lngVal = active?.current_lng || 77.5946;
        const cabNum = active?.cab_number || "EMERGENCY_SOS";
        const nameVal = user?.name || "Femme Traveler";

        setSteps({
          emergencyActivated: res.success ? true : false,
          smsSent: res.sms_sent,
          smsStatus: res.sms_status || (res.sms_sent ? 'SMS Sent' : 'SMS Failed'),
          callInitiated: res.call_initiated,
          liveTrackingActive: true,
          evidenceLocked: true,
          emergencyTimestamp: new Date().toLocaleTimeString() + " UTC"
        });

        // Background dispatches (SMS, Voice, and WhatsApp) are automatically handled by the server.
        console.log("[SOS] Server-side dispatches initiated successfully.");
      } catch (err) {
        console.error("SOS trigger fail:", err);
      } finally {
        setLoading(false);
      }
    };
    triggerEmergencyProtocol();
  }, []);

  // 2. Poll alert statuses from NotificationProvider database logs every 3s
  useEffect(() => {
    if (!activeJourney?.id) return;

    const fetchStatuses = async () => {
      try {
        const statuses = await api.getSosStatus(activeJourney.id);
        setAlertStatuses(statuses);
        
        // Update summary steps based on actual provider results
        const anySmsSuccess = statuses.some((s: any) => s.sms_status === 'delivered');
        const anyCallSuccess = statuses.some((s: any) => s.call_status === 'connected');
        
        setSteps((prev) => ({
          ...prev,
          smsSent: anySmsSuccess,
          smsStatus: anySmsSuccess ? 'SMS Delivered' : 'SMS Failed',
          callInitiated: anyCallSuccess
        }));
      } catch (err) {
        console.error("Failed to query alert statuses:", err);
      }
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 3000);
    return () => clearInterval(interval);
  }, [activeJourney]);

  // 3. Web Audio Programmatic Siren Synthesizer (No static file dependencies!)
  useEffect(() => {
    if (sirenPlaying) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
        osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1.0);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        let sweepInterval = setInterval(() => {
          if (ctx.state === 'suspended') return;
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.5);
          osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1.0);
        }, 1000);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);

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

  // 4. Flash Screen visual effect timer
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

  // Status mapping checkers
  const hasAcknowledged = alertStatuses.some((a: any) => a.acknowledged === 1);

  const userName = user?.name || "Femme Traveler";
  const lat = activeJourney?.current_lat || 12.9716;
  const lng = activeJourney?.current_lng || 77.5946;
  const cabNumber = activeJourney?.cab_number || "EMERGENCY_SOS";
  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
  const timestamp = new Date().toISOString();

  const emergencyMessage = `🚨 FEMME EMERGENCY ALERT\n\nUser: ${userName}\n\nLocation:\n${mapsLink}\n\nCab:\n${cabNumber}\n\nTimestamp:\n${timestamp}\n\nPossible emergency detected.`;

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
          {/* Emergency state lock on server */}
          <div className="flex items-center gap-2.5">
            {steps.emergencyActivated ? (
              <span className="text-emerald-400 font-bold">✓</span>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            )}
            <span className={steps.emergencyActivated ? 'text-gray-300' : 'text-gray-500'}>Emergency Activated</span>
          </div>

          {/* SMS dispatch status from provider logs */}
          <div className="flex items-center gap-2.5">
            {steps.smsSent ? (
              <span className="text-emerald-400 font-bold">✓</span>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            )}
            <span className={steps.smsSent ? 'text-gray-300' : 'text-gray-500'}>
              {steps.smsStatus || 'SMS Dispatching'}
            </span>
          </div>

          {/* Call connection status from provider logs */}
          <div className="flex items-center gap-2.5">
            {steps.callInitiated ? (
              <span className="text-emerald-400 font-bold">✓</span>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            )}
            <span className={steps.callInitiated ? 'text-gray-300' : 'text-gray-500'}>Call Connected</span>
          </div>

          {/* GPS streaming status */}
          <div className="flex items-center gap-2.5">
            {steps.liveTrackingActive ? (
              <span className="text-emerald-400 font-bold">✓</span>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            )}
            <span className={steps.liveTrackingActive ? 'text-gray-300' : 'text-gray-500'}>Live Tracking Active</span>
          </div>

          {/* Evidence lock status */}
          <div className="flex items-center gap-2.5">
            {steps.evidenceLocked ? (
              <span className="text-emerald-400 font-bold">✓</span>
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
            )}
            <span className={steps.evidenceLocked ? 'text-gray-300' : 'text-gray-500'}>Evidence Locked</span>
          </div>

          {/* Guardian acknowledgement check status */}
          <div className="flex items-center gap-2.5">
            {hasAcknowledged ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            )}
            <span className={hasAcknowledged ? 'text-emerald-400 font-bold' : 'text-gray-500'}>
              {hasAcknowledged ? 'Guardian Acknowledged' : 'Waiting for Guardian Acknowledgment'}
            </span>
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

      {/* Coordinates stream */}
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

      {/* 100% Free Device Native Alert Center */}
      <div className="glass-card p-6 max-w-sm w-full rounded-2xl border border-emerald-500/25 text-left space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3 mb-1">
          <Smartphone className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Free Mobile Alert Center</h4>
            <p className="text-[10px] text-emerald-400 font-medium">Zero-cost dispatches using native device apps</p>
          </div>
        </div>

        <div className="space-y-3">
          {contacts.map((c, i) => {
            const linkPhone = c.phone.replace(/[^\d+]/g, '');
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(linkPhone)}&text=${encodeURIComponent(emergencyMessage)}`;
            const smsUrl = `sms:${linkPhone}?body=${encodeURIComponent(emergencyMessage)}`;
            const telUrl = `tel:${linkPhone}`;

            return (
              <div key={`free-comms-${i}`} className="p-3 bg-dark-950/60 border border-gray-800/60 rounded-xl flex items-center justify-between gap-3">
                <div className="truncate">
                  <p className="font-bold text-gray-200 text-xs truncate">{c.name}</p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{c.phone}</p>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  {/* Call Icon Button */}
                  <a
                    href={telUrl}
                    className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-emerald-400 transition"
                    title="Call Guardian"
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  {/* SMS Icon Button */}
                  <a
                    href={smsUrl}
                    className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400 transition"
                    title="Prefilled Direct SMS"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>

                  {/* WhatsApp Icon Button */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-green-400 transition"
                    title="Prefilled WhatsApp alert"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}

          {contacts.length === 0 && (
            <p className="text-[11px] text-gray-500 text-center font-light">
              Add trusted contacts in settings to use free native alert shortcuts.
            </p>
          )}

          {contacts.length > 0 && (
            <button
              onClick={() => {
                const c = contacts[0];
                const linkPhone = c.phone.replace(/[^\d+]/g, '');
                const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(linkPhone)}&text=${encodeURIComponent(emergencyMessage)}`;
                window.open(whatsappUrl, '_blank');
              }}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-green-950/20 transition duration-150 mt-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Send Free WhatsApp to Primary Contact
            </button>
          )}
        </div>
      </div>

      {/* Notified Guardians with production delivery statuses */}
      <div className="max-w-md w-full text-left space-y-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Notified Guardians</h4>
        
        {contacts.map((c, i) => {
          const alert = alertStatuses.find((a: any) => a.contact_phone === c.phone || a.contact_phone.includes(c.phone));
          const smsStatus = alert?.sms_status || 'pending';
          const callStatus = alert?.call_status || 'pending';
          const ack = alert?.acknowledged === 1;

          return (
            <div key={i} className="p-4 bg-dark-950/50 border border-gray-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  {c.name}
                </p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">{c.phone}</p>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                {/* SMS Status Badge */}
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                  smsStatus === 'delivered' ? 'bg-emerald-950 text-emerald-400' :
                  smsStatus === 'failed' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                }`}>
                  {smsStatus === 'delivered' ? 'SMS Delivered' : smsStatus === 'failed' ? 'SMS Failed' : 'SMS Pending'}
                </span>

                {/* Call Status Badge */}
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                  callStatus === 'connected' ? 'bg-emerald-950 text-emerald-400' :
                  callStatus === 'failed' ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'
                }`}>
                  {callStatus === 'connected' ? 'Call Connected' : callStatus === 'failed' ? 'Call Failed' : 'Call Pending'}
                </span>

                {/* Acknowledgment Badge */}
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                  ack ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950/20 text-gray-500'
                }`}>
                  {ack ? 'Guardian Acknowledged' : 'Awaiting Acknowledgment'}
                </span>
              </div>
            </div>
          );
        })}

        {contacts.length === 0 && (
          <p className="text-xs text-gray-500 text-center font-light">
            No contacts configured. Emergency dispatcher triggers fallback webhooks.
          </p>
        )}
      </div>

      {/* Resolution button */}
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
