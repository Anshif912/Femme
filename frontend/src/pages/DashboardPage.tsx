import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { 
  Shield, 
  Play, 
  AlertOctagon, 
  Map, 
  BellRing, 
  UserCheck, 
  ChevronRight, 
  Zap, 
  Navigation,
  MessageSquare,
  Volume2,
  Activity,
  Trash2
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  
  const { 
    user, 
    activeJourney, 
    isMonitoring, 
    isEmergency,
    currentSpeed,
    routeDeviation,
    motionAnomaly,
    audioAnomaly,
    setActiveJourney,
    resetTelemetryState,
    setEmergencyState
  } = useStore();

  const [notificationText, setNotificationText] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simSuccess, setSimSuccess] = useState('');
  const [simError, setSimError] = useState('');
  const [historyCount, setHistoryCount] = useState(0);
  const [contactsCount, setContactsCount] = useState(0);

  // Load stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const hist = await api.getHistory();
        setHistoryCount(hist.length);
        const cont = await api.getContacts();
        setContactsCount(cont.length);
        
        // Refresh active journey state if not in store
        const active = await api.getActiveJourney();
        if (active) {
          setActiveJourney(active);
        } else {
          setActiveJourney(null);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard statistics:", err);
      }
    };
    fetchStats();
  }, []);

  const handleSimulateNotification = async (payloadText: string) => {
    setSimLoading(true);
    setSimSuccess('');
    setSimError('');
    try {
      const res = await api.triggerNotificationSim(payloadText);
      setSimSuccess(res.message);
      // Update store active journey
      if (res.journey) {
        setActiveJourney(res.journey);
      }
      setTimeout(() => {
        navigate('/route-view');
      }, 1500);
    } catch (err: any) {
      setSimError(err.message || 'Simulation failed to parse text');
    } finally {
      setSimLoading(false);
    }
  };

  const handleQuickSOS = async () => {
    if (confirm("Are you sure you want to trigger SOS? This will immediately notify emergency contacts!")) {
      setEmergencyState(true);
      try {
        await api.triggerSos();
        navigate('/sos');
      } catch (err) {
        navigate('/sos');
      }
    }
  };

  const handleCancelActive = async () => {
    if (confirm("Cancel current journey monitoring? Evidence capsules will not be locked unless SOS occurred.")) {
      try {
        await api.cancelJourney();
        setActiveJourney(null);
        resetTelemetryState();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCompleteActive = async () => {
    try {
      await api.completeJourney();
      setActiveJourney(null);
      resetTelemetryState();
      alert("Journey marked completed. Safe arrival notifications sent!");
    } catch (err) {
      console.error(err);
    }
  };

  // Mock template notification options for quick trigger
  const templates = [
    {
      title: "Uber Intercept",
      text: "Your Uber ride is arriving: KA-03-MM-1122, Driver: Ramesh. Pickup: Koramangala. Destination: Indiranagar."
    },
    {
      title: "Ola Intercept",
      text: "Ola booking CRN 1238910 is confirmed. Driver Kumar in white Dzire KA-05-XY-9988. Pickup: HSR Layout. Destination: Bellandur."
    },
    {
      title: "Rapido Intercept",
      text: "Rapido Captain Rajesh (KA-02-AB-3456) is arriving at HSR Layout for your ride to Majestic."
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Welcome / Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Welcome, {user?.name || 'Traveler'}</h2>
          <p className="text-sm text-gray-400">Your passive safety companion is active and standing by.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {activeJourney ? (
            <div className="px-3.5 py-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold rounded-lg flex items-center gap-2 animate-pulse-slow">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
              ACTIVE MONITORING
            </div>
          ) : (
            <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              SHIELD SECURED
            </div>
          )}
        </div>
      </div>

      {/* Main Alert Banner */}
      {isEmergency && (
        <div 
          onClick={() => navigate('/sos')}
          className="p-4 bg-red-950/30 border border-red-500/40 rounded-2xl flex items-center justify-between cursor-pointer animate-pulse-glow glow-rose"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
              <AlertOctagon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-wider">Emergency Mode Active!</p>
              <p className="text-xs text-red-300">Broadcasting live GPS coordinate. SOS controls open.</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-red-400" />
        </div>
      )}

      {/* Core Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left / Center column: Action & Telemetry widgets */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Journey Status Telemetry Widget */}
          {activeJourney ? (
            <div className="glass-card p-6 rounded-2xl border border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-xs font-bold text-brand-400 tracking-widest uppercase">Telemetry Stream</span>
                  <h3 className="text-lg font-bold text-white">Passive AI Monitoring</h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Activity className="w-4 h-4 text-brand-500 animate-pulse" />
                  Updating every 30s
                </div>
              </div>

              {/* Grid of indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-dark-950/50 rounded-xl border border-gray-800/80 text-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Speed</span>
                  <p className="text-lg font-black text-white mt-1">{(currentSpeed * 3.6).toFixed(1)} <span className="text-xs font-light text-gray-400">km/h</span></p>
                </div>
                <div className={`p-4 rounded-xl border text-center ${routeDeviation ? 'bg-red-500/5 border-red-500/20' : 'bg-dark-950/50 border-gray-800/80'}`}>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Route Deviation</span>
                  <p className={`text-sm font-bold mt-1.5 ${routeDeviation ? 'text-red-400' : 'text-emerald-400'}`}>
                    {routeDeviation ? 'OFF ROUTE' : 'ON ROUTE'}
                  </p>
                </div>
                <div className={`p-4 rounded-xl border text-center ${motionAnomaly ? 'bg-red-500/5 border-red-500/20' : 'bg-dark-950/50 border-gray-800/80'}`}>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unusual Stops</span>
                  <p className={`text-sm font-bold mt-1.5 ${motionAnomaly ? 'text-red-400' : 'text-emerald-400'}`}>
                    {motionAnomaly ? 'ANOMALOUS' : 'NORMAL'}
                  </p>
                </div>
                <div className={`p-4 rounded-xl border text-center ${audioAnomaly ? 'bg-red-500/5 border-red-500/20' : 'bg-dark-950/50 border-gray-800/80'}`}>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Voice Distress</span>
                  <p className={`text-sm font-bold mt-1.5 ${audioAnomaly ? 'text-red-400' : 'text-emerald-400'}`}>
                    {audioAnomaly ? 'ALERT TRIGGER' : 'QUIET'}
                  </p>
                </div>
              </div>

              {/* Cab Metadata */}
              <div className="p-4 bg-dark-950/30 border border-gray-800/60 rounded-xl mb-6">
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-gray-400">Provider / Cab Number:</span>
                  <span className="font-bold text-white uppercase">{activeJourney.provider} - {activeJourney.cab_number}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Destination:</span>
                  <span className="font-semibold text-gray-300 truncate max-w-[200px]">{activeJourney.dest_address}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleCancelActive}
                  className="py-3 bg-gray-900 hover:bg-gray-800 text-gray-300 font-semibold rounded-xl transition duration-150 flex items-center justify-center gap-2 border border-gray-800"
                >
                  <Trash2 className="w-4.5 h-4.5 text-gray-400" />
                  Cancel Monitor
                </button>
                <button
                  onClick={handleCompleteActive}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition duration-150"
                >
                  Arrived Safely
                </button>
              </div>
            </div>
          ) : (
            /* Journey Setup Promo Card */
            <div className="glass-card p-6 rounded-2xl border border-gray-800 bg-gradient-to-br from-dark-900 to-brand-950/20 relative overflow-hidden">
              <div className="absolute right-[-10px] bottom-[-10px] opacity-10 pointer-events-none">
                <Shield className="w-48 h-48 text-brand-500" />
              </div>
              
              <span className="text-xs font-bold text-brand-400 tracking-widest uppercase mb-1.5 block">Passive Shield Protection</span>
              <h3 className="text-xl font-bold text-white mb-2">Start Journey Monitoring</h3>
              <p className="text-sm text-gray-400 mb-6 max-w-md leading-relaxed">
                Manually register your ride or copy-paste cab booking details to activate our background monitoring suite.
              </p>
              
              <button
                onClick={() => navigate('/journey-setup')}
                className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition duration-200 shadow-md shadow-brand-500/10 flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                Configure Journey
              </button>
            </div>
          )}

          {/* Intercept Notification Simulator Widget */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800">
            <div>
              <span className="text-xs font-bold text-brand-400 tracking-widest uppercase">Simulation Center</span>
              <h3 className="text-lg font-bold text-white mb-1">Android Notification Listener Simulator</h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Simulate intercepting incoming SMS/Notification notifications from Ola, Uber, or Rapido apps.
              </p>
            </div>

            {simSuccess && (
              <div className="p-3 bg-emerald-950/25 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl mb-4 leading-normal">
                {simSuccess}
              </div>
            )}
            
            {simError && (
              <div className="p-3 bg-red-950/25 border border-red-500/30 text-red-400 text-xs rounded-xl mb-4 leading-normal">
                {simError}
              </div>
            )}

            {/* Quick Template buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setNotificationText(tpl.text);
                    handleSimulateNotification(tpl.text);
                  }}
                  className="p-2.5 bg-dark-950/60 hover:bg-dark-900 border border-gray-800 hover:border-brand-500/30 text-[11px] text-gray-300 font-semibold rounded-lg text-left transition duration-150 flex flex-col justify-between"
                >
                  <span className="text-brand-400 font-bold mb-1 flex items-center gap-1.5">
                    <Navigation className="w-3 h-3 text-brand-500" />
                    {tpl.title}
                  </span>
                  <span className="text-gray-500 line-clamp-1">{tpl.text}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <textarea
                rows={2}
                placeholder="Or paste custom notification text here..."
                value={notificationText}
                onChange={(e) => setNotificationText(e.target.value)}
                className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl p-3 text-xs outline-none text-white transition duration-200"
              />
              
              <button
                onClick={() => handleSimulateNotification(notificationText)}
                disabled={simLoading || !notificationText.trim()}
                className="w-full py-2.5 bg-dark-900 hover:bg-dark-800 disabled:bg-gray-800/40 disabled:text-gray-600 text-gray-300 font-bold border border-gray-800 rounded-xl transition duration-150 text-xs flex items-center justify-center gap-2"
              >
                {simLoading ? 'Simulating Intercept...' : 'Simulate Custom Intercept'}
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Quick Actions & Stats */}
        <div className="space-y-6">
          
          {/* Quick SOS Trigger Button */}
          <button
            onClick={handleQuickSOS}
            className="w-full py-6 bg-gradient-to-r from-red-700 to-red-500 hover:from-red-800 hover:to-red-600 text-white font-black text-xl rounded-2xl shadow-xl shadow-red-950/20 hover:scale-[1.01] transition duration-200 flex flex-col items-center justify-center gap-2 group animate-pulse-glow glow-rose"
          >
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition duration-200">
              <Zap className="w-6 h-6 text-white fill-white animate-bounce" />
            </div>
            ONE-TAP EMERGENCY SOS
          </button>

          {/* Quick stats panel */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Safety Log Overview</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-dark-950/50 border border-gray-800/60 rounded-xl">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Commutes</span>
                <span className="text-2xl font-black text-white">{historyCount}</span>
              </div>
              <div className="p-4 bg-dark-950/50 border border-gray-800/60 rounded-xl">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Guardians</span>
                <span className="text-2xl font-black text-white">{contactsCount}</span>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4 mt-4 space-y-2.5">
              <button
                onClick={() => navigate('/safe-zones')}
                className="w-full py-2 bg-dark-950 hover:bg-dark-900 border border-gray-800/60 text-xs font-bold rounded-lg text-gray-400 hover:text-white transition duration-150 flex items-center justify-center gap-2"
              >
                <Map className="w-3.5 h-3.5" />
                Find Nearby Safe Stops
              </button>
              <button
                onClick={() => navigate('/contacts')}
                className="w-full py-2 bg-dark-950 hover:bg-dark-900 border border-gray-800/60 text-xs font-bold rounded-lg text-gray-400 hover:text-white transition duration-150 flex items-center justify-center gap-2"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Manage Trusted Contacts
              </button>
            </div>
          </div>

          {/* Core System Features list */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800 text-xs text-gray-400 space-y-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Guardians</h4>
            
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-gray-300">Privacy-First Audio Distress</p>
                <p className="text-[10px]">Distress scream logs processed locally on-device. No audio recorded.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-gray-300">Real-time Location Share</p>
                <p className="text-[10px]">WebSocket channels synchronize live coordinates to contacts.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-gray-300">Safe Route Scorer</p>
                <p className="text-[10px]">Time-aware risk assessment model dynamically warning red zones.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;
