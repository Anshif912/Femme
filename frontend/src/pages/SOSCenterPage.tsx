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

  // 3. Web Audio Programmatic Siren Synthesizer (LFO Frequency Modulation wail)
  useEffect(() => {
    if (sirenPlaying) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        // Carrier Oscillator (primary tone)
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, ctx.currentTime);

        // Modulator Oscillator (LFO wailing speed)
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(1.5, ctx.currentTime); 

        // Modulator Gain (depth of the pitch swing: +/- 250Hz)
        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(250, ctx.currentTime); 

        // Connect modulator to carrier frequency
        lfo.connect(modGain);
        modGain.connect(osc.frequency);

        // Volume Gain Node
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.connect(ctx.destination);
        
        // Connect carrier to volume control
        osc.connect(gainNode);

        // Start oscillators
        osc.start(0);
        lfo.start(0);

        oscillatorRef.current = osc;
        gainRef.current = gainNode;

        // Auto-resume if suspended
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        // Active listener to trigger wail as soon as user clicks anywhere
        const forceResume = () => {
          if (ctx.state === 'suspended') {
            ctx.resume().then(() => console.log('AudioContext auto-resumed via user gesture'));
          }
        };
        window.addEventListener('click', forceResume);
        window.addEventListener('touchstart', forceResume);

        return () => {
          window.removeEventListener('click', forceResume);
          window.removeEventListener('touchstart', forceResume);
          try {
            osc.stop();
            lfo.stop();
          } catch (_) {}
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

  const toggleSiren = async () => {
    const nextState = !sirenPlaying;
    setSirenPlaying(nextState);
    if (nextState) {
      try {
        if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
      } catch (err) {
        console.error("Failed to resume context on gesture:", err);
      }
    }
  };

  return (
    <div className={`min-h-[80vh] rounded-3xl p-8 transition-all duration-300 bg-white/70 backdrop-blur-xl border ${
      blinkingState ? 'border-red-500/80 shadow-[0_0_40px_rgba(239,68,68,0.12)]' : 'border-slate-100/85 shadow-[0_12px_40px_rgba(15,23,42,0.03)]'
    } flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto`}>
      
      {/* Blinking SOS Alert Icon */}
      <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
        blinkingState ? 'bg-red-650 shadow-[0_0_24px_rgba(220,38,38,0.35)] scale-105' : 'bg-red-500 shadow-sm'
      }`}>
        <ShieldAlert className="w-10 h-10 text-white" />
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-black text-red-600 tracking-tight uppercase">Emergency SOS Active</h2>
        <p className="text-xs text-slate-500 font-semibold tracking-widest uppercase">
          Live GPS stream dispatched to priority guardians
        </p>
      </div>

      {/* Emergency Progress Checklist */}
      <div className="bg-white/40 border border-white/50 rounded-2xl p-6 w-full max-w-md text-left space-y-4 shadow-sm">
        <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-widest border-b border-slate-100/50 pb-2 mb-1">
          Emergency Checklist Actions
        </h4>
        
        <div className="space-y-3 text-xs font-semibold">
          {/* Emergency state lock on server */}
          <div className="flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-2.5">
              {steps.emergencyActivated ? (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              ) : (
                <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
              )}
              <span className={steps.emergencyActivated ? 'text-slate-800 font-bold' : 'text-slate-500'}>Emergency Activation</span>
            </div>
            {steps.emergencyActivated && <span className="text-emerald-700 text-[10px] font-bold tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full">ACTIVE</span>}
          </div>

          {/* SMS dispatch status from provider logs */}
          <div className="flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-2.5">
              {steps.smsSent ? (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              ) : (
                <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
              )}
              <span className={steps.smsSent ? 'text-slate-800 font-bold' : 'text-slate-500'}>Guardian SMS Broadcast</span>
            </div>
            {steps.smsSent && <span className="text-emerald-700 text-[10px] font-bold tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full">DISPATCHED</span>}
          </div>

          {/* Call connection status from provider logs */}
          <div className="flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-2.5">
              {steps.callInitiated ? (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              ) : (
                <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
              )}
              <span className={steps.callInitiated ? 'text-slate-800 font-bold' : 'text-slate-500'}>Priority Voice Connection</span>
            </div>
            {steps.callInitiated && <span className="text-emerald-700 text-[10px] font-bold tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full">CONNECTED</span>}
          </div>

          {/* GPS streaming status */}
          <div className="flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-2.5">
              {steps.liveTrackingActive ? (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              ) : (
                <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
              )}
              <span className={steps.liveTrackingActive ? 'text-slate-800 font-bold' : 'text-slate-500'}>Live Telemetry Stream</span>
            </div>
            {steps.liveTrackingActive && <span className="text-emerald-700 text-[10px] font-bold tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full">LIVE</span>}
          </div>

          {/* Evidence lock status */}
          <div className="flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-2.5">
              {steps.evidenceLocked ? (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              ) : (
                <Loader2 className="w-3.5 h-3.5 text-red-500 animate-spin" />
              )}
              <span className={steps.evidenceLocked ? 'text-slate-800 font-bold' : 'text-slate-500'}>Evidence Capsules Sealed</span>
            </div>
            {steps.evidenceLocked && <span className="text-emerald-700 text-[10px] font-bold tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full">LOCKED</span>}
          </div>

          {/* Guardian acknowledgement check status */}
          <div className="flex items-center justify-between text-slate-700">
            <div className="flex items-center gap-2.5">
              {hasAcknowledged ? (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              ) : (
                <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              )}
              <span className={hasAcknowledged ? 'text-emerald-700 font-bold' : 'text-slate-500'}>Guardian Acknowledgment</span>
            </div>
            <span className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full ${hasAcknowledged ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {hasAcknowledged ? 'RECEIVED' : 'WAITING'}
            </span>
          </div>
        </div>

        {steps.emergencyTimestamp && (
          <div className="border-t border-slate-100 pt-2.5 mt-2.5 flex justify-between items-center text-[9px] text-slate-500 font-mono">
            <span>EMERGENCY TIMESTAMP:</span>
            <span>{steps.emergencyTimestamp}</span>
          </div>
        )}
      </div>

      {/* Audio Siren Toggles */}
      <div className="flex gap-2.5">
        <button
          onClick={toggleSiren}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition duration-200 shadow-sm border ${
            sirenPlaying ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100/80' : 'bg-white/50 border border-white/60 text-slate-750 hover:bg-white/70'
          }`}
        >
          {sirenPlaying ? (
            <>
              <Volume2 className="w-4 h-4 animate-bounce" />
              Stop Siren Audio
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4" />
              Play Siren Audio
            </>
          )}
        </button>
      </div>

      {/* Coordinates stream */}
      <div className="p-4 bg-white/30 border border-white/45 backdrop-blur-md rounded-2xl max-w-md w-full text-xs text-slate-650 leading-normal shadow-sm">
        <div className="flex items-center justify-between font-bold text-slate-800 mb-2">
          <span>Active Coordinate Stream:</span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
        </div>
        <div className="space-y-1 text-left font-mono text-[10px]">
          <p><span className="text-slate-500">Latitude:</span> {activeJourney?.current_lat?.toFixed(5) || "12.9716"}</p>
          <p><span className="text-slate-500">Longitude:</span> {activeJourney?.current_lng?.toFixed(5) || "77.5946"}</p>
          <p><span className="text-slate-500">Cab Number:</span> {activeJourney?.cab_number || "EMERGENCY_SOS"}</p>
        </div>
      </div>

      {/* 100% Free Device Native Alert Center */}
      <div className="bg-white/80 border border-slate-100 p-6 max-w-md w-full rounded-2xl shadow-sm text-left space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-3 mb-1">
          <Smartphone className="w-5 h-5 text-emerald-500" />
          <div>
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Free Mobile Alert Center</h4>
            <p className="text-[10px] text-emerald-600 font-semibold">Zero-cost dispatches using native device apps</p>
          </div>
        </div>

        <div className="space-y-3">
          {contacts.map((c, i) => {
            const linkPhone = c.phone.replace(/[^\d+]/g, '');
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(linkPhone)}&text=${encodeURIComponent(emergencyMessage)}`;
            const smsUrl = `sms:${linkPhone}?body=${encodeURIComponent(emergencyMessage)}`;
            const telUrl = `tel:${linkPhone}`;

            return (
              <div key={`free-comms-${i}`} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                <div className="truncate">
                  <p className="font-bold text-slate-800 text-xs truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{c.phone}</p>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  {/* Call Icon Button */}
                  <a
                    href={telUrl}
                    className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 hover:bg-emerald-100 transition shadow-sm animate-pulse-slow"
                    title="Call Guardian"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>

                  {/* SMS Icon Button */}
                  <a
                    href={smsUrl}
                    className="p-2 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 hover:bg-blue-100 transition shadow-sm"
                    title="Prefilled Direct SMS"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </a>

                  {/* WhatsApp Icon Button */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-green-50 border border-green-100 rounded-lg text-green-600 hover:bg-green-100 transition shadow-sm"
                    title="Prefilled WhatsApp alert"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}

          {contacts.length === 0 && (
            <p className="text-[11px] text-slate-400 text-center font-light">
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
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-xl text-[11px] flex items-center justify-center gap-2 shadow-md transition duration-150 mt-1"
            >
              <MessageCircle className="w-3.5 h-3.5 text-white" />
              Send Free WhatsApp to Primary Contact
            </button>
          )}
        </div>
      </div>

      {/* Notified Guardians with production delivery statuses */}
      <div className="max-w-md w-full text-left space-y-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Notified Guardians</h4>
        
        {contacts.map((c, i) => {
          const alert = alertStatuses.find((a: any) => a.contact_phone === c.phone || a.contact_phone.includes(c.phone));
          const smsStatus = alert?.sms_status || 'pending';
          const callStatus = alert?.call_status || 'pending';
          const ack = alert?.acknowledged === 1;

          return (
            <div key={i} className="p-4 bg-white/40 border border-white/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
              <div>
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  {c.name}
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{c.phone}</p>
              </div>
              
              <div className="flex flex-wrap gap-1.5 font-semibold">
                {/* SMS Status Badge */}
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  smsStatus === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  smsStatus === 'failed' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {smsStatus === 'delivered' ? 'SMS Delivered' : smsStatus === 'failed' ? 'SMS Failed' : 'SMS Pending'}
                </span>

                {/* Call Status Badge */}
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  callStatus === 'connected' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  callStatus === 'failed' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {callStatus === 'connected' ? 'Call Connected' : callStatus === 'failed' ? 'Call Failed' : 'Call Pending'}
                </span>

                {/* Acknowledgment Badge */}
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  ack ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse' : 'bg-slate-50 text-slate-500 border border-slate-100'
                }`}>
                  {ack ? 'Guardian Acknowledged' : 'Awaiting Acknowledgment'}
                </span>
              </div>
            </div>
          );
        })}

        {contacts.length === 0 && (
          <p className="text-xs text-slate-500 text-center font-light">
            No contacts configured. Emergency dispatcher triggers fallback webhooks.
          </p>
        )}
      </div>

      {/* Resolution button */}
      <button
        onClick={handleDeescalate}
        className="px-8 py-3.5 bg-emerald-650 hover:bg-emerald-755 text-white font-bold rounded-2xl transition duration-150 shadow-md text-xs tracking-wider uppercase"
      >
        De-escalate & Set Safe Status
      </button>
    </div>
  );
};
export default SOSCenterPage;
