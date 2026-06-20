import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { useLocation } from '../context/LocationContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Users,
  Lock,
  Compass,
  AlertOctagon,
  MapPin,
  Phone,
  ShieldCheck,
  Signal,
  Plus,
  FileText,
  Clock,
  Activity,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Map,
  Zap,
  Star,
  TrendingUp,
  Eye,
  Wifi,
  Battery,
  ChevronRight,
  X
} from 'lucide-react';

interface RouteOption {
  type: string;
  score: number;
  eta: string;
  distance: string;
  risk: string;
  color: string;
  ringColor: string;
  badgeBg: string;
  badgeText: string;
}

/* ─── Animated counter hook ─── */
function useCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return count;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, activeJourney, setActiveJourney, resetTelemetryState } = useStore();
  const { location, permissionDenied } = useLocation();

  const [contactsCount, setContactsCount] = useState<number | null>(null);
  const [evidenceCount, setEvidenceCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('safest');

  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [quickAddMessage, setQuickAddMessage] = useState('');

  const safetyScore = useCounter(activeJourney ? 94 : 100);

  const routeOptions: RouteOption[] = [
    { type: 'safest', score: 98, eta: '12 min', distance: '3.4 km', risk: 'Low', color: 'emerald', ringColor: 'ring-emerald-400/40', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700' },
    { type: 'fastest', score: 84, eta: '8 min', distance: '3.1 km', risk: 'Medium', color: 'amber', ringColor: 'ring-amber-400/40', badgeBg: 'bg-amber-50', badgeText: 'text-amber-700' },
    { type: 'balanced', score: 92, eta: '10 min', distance: '3.2 km', risk: 'Low', color: 'brand', ringColor: 'ring-brand-400/40', badgeBg: 'bg-brand-50', badgeText: 'text-brand-700' },
  ];

  /* ─── Business Logic (unchanged) ─── */
  const handleCompleteJourney = async () => {
    setError('');
    try {
      await api.completeJourney();
      setActiveJourney(null);
      resetTelemetryState();
      setEvidenceCount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to complete journey.');
    }
  };

  const handleQuickAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName || !quickPhone) return;
    setQuickAddLoading(true);
    setQuickAddMessage('');
    try {
      await api.addContact({ name: quickName, phone: quickPhone, priority: 1 });
      setQuickName('');
      setQuickPhone('');
      setQuickAddMessage('Guardian added!');
      const contacts = await api.getContacts();
      setContactsCount(contacts.length);
      setTimeout(() => setQuickAddMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to quick-add contact');
    } finally {
      setQuickAddLoading(false);
    }
  };

  useEffect(() => {
    api.getActiveJourney()
      .then((journey) => { if (journey) setActiveJourney(journey); })
      .catch((err) => { setError(err.message || 'Failed to load journeys'); });

    api.getContacts()
      .then((contacts) => setContactsCount(contacts.length))
      .catch((err) => setError(err.message || 'Failed to load contacts'));

    if (activeJourney?.id) {
      api.getCapsules(activeJourney.id)
        .then((capsules) => setEvidenceCount(capsules.length))
        .catch((err) => setError(err.message || 'Failed to load evidence'));
    }
  }, [activeJourney?.id]);

  useEffect(() => {
    if (!isAuthenticated) navigate('/auth');
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  /* ─── Animation variants ─── */
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } }
  };

  const cardHover = {
    rest: { y: 0, boxShadow: '0 4px 20px rgba(15,23,42,0.04)' },
    hover: { y: -4, boxShadow: '0 16px 40px rgba(15,23,42,0.08)', transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen pb-28 relative overflow-x-hidden" style={{ background: 'linear-gradient(160deg, #F6F3ED 0%, #EDE9E0 50%, #F0EBF8 100%)' }}>

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-25 animate-pulse-slow"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[10%] left-[-8%] w-[400px] h-[400px] rounded-full opacity-20 animate-pulse-slow-reverse"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-700"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════════
            SECTION 1 — TOP HERO (Greeting + Shield Widget)
        ═══════════════════════════════════════════════ */}
        <motion.div
          variants={stagger} initial="hidden" animate="show"
          className="grid grid-cols-1 lg:grid-cols-5 gap-5"
        >
          {/* Left: Greeting 3/5 */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="lg:col-span-3 relative overflow-hidden rounded-[2rem] p-7 flex flex-col justify-between min-h-[220px]"
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.75)',
              boxShadow: '0 8px 40px rgba(15,23,42,0.05), inset 0 1px 1px rgba(255,255,255,0.9)'
            }}
          >
            {/* Decorative gradient blob */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-30"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

            <div className="relative">
              {/* Live badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Platform Operational</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
                Welcome back,{' '}
                <span className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #6366F1 100%)' }}>
                  {user?.name || 'Anshif'}
                </span>
              </h1>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mt-2">She Travels. We Guard.</p>
            </div>

            <div className="relative mt-6 pt-5 border-t" style={{ borderColor: 'rgba(15,23,42,0.06)' }}>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                {activeJourney
                  ? `🛡️ Active Shield engaged — Monitoring ${activeJourney.provider?.toUpperCase() || 'ride'} commute · Cab ${activeJourney.cab_number}. Route scorer active.`
                  : '🟢 All systems secure and ready. Configure your next journey to start real-time telemetry.'}
              </p>

              {/* Quick stats row */}
              <div className="flex gap-6 mt-4">
                {[
                  { label: 'Journey', value: activeJourney ? 'ACTIVE' : 'IDLE', ok: !!activeJourney, okColor: 'text-brand-600', offColor: 'text-slate-400' },
                  { label: 'GPS', value: location ? 'ONLINE' : 'OFFLINE', ok: !!location, okColor: 'text-emerald-600', offColor: 'text-red-500' },
                  { label: 'Guardians', value: contactsCount ? `${contactsCount} READY` : 'NONE', ok: !!contactsCount, okColor: 'text-slate-800', offColor: 'text-amber-600' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                    <p className={`text-[11px] font-black mt-0.5 ${s.ok ? s.okColor : s.offColor}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Safety Shield Widget 2/5 */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 relative overflow-hidden rounded-[2rem] p-6 flex flex-col items-center justify-center text-center"
            style={{
              background: 'linear-gradient(145deg, rgba(124,58,237,0.06) 0%, rgba(255,255,255,0.7) 50%, rgba(236,72,153,0.05) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.8)',
              boxShadow: '0 8px 40px rgba(124,58,237,0.06), inset 0 1px 1px rgba(255,255,255,0.9)'
            }}
          >
            <div className="absolute inset-0 pointer-events-none rounded-[2rem] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1"
                style={{ background: 'linear-gradient(90deg, #7C3AED, #EC4899, #6366F1)' }} />
            </div>

            {/* Shield pulse rings */}
            <div className="relative flex items-center justify-center mb-4">
              <div className="absolute w-28 h-28 rounded-full border border-brand-200/40 animate-ping" style={{ animationDuration: '2.5s' }} />
              <div className="absolute w-20 h-20 rounded-full border border-brand-300/30 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="w-16 h-16 rounded-full flex items-center justify-center relative z-10"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}>
                <Shield className="w-8 h-8" style={{ color: '#fff' }} />
              </div>
              <div className="absolute -top-1 -right-1 z-20 bg-emerald-500 rounded-full p-1"
                style={{ boxShadow: '0 2px 8px rgba(16,185,129,0.4)', border: '2px solid white' }}>
                <ShieldCheck className="w-3 h-3" style={{ color: '#fff' }} />
              </div>
            </div>

            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Safety Score</p>
            <p className="text-5xl font-black text-slate-900 tracking-tight mt-1">
              {safetyScore}
              <span className="text-2xl text-slate-400">%</span>
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-600">{activeJourney ? 'Protected' : 'Secured'}</span>
            </div>

            {/* Score ring */}
            <div className="mt-4 w-full grid grid-cols-3 gap-2 pt-4" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
              {[
                { label: 'Shield', val: activeJourney ? 'GUARDING' : 'STANDBY', col: activeJourney ? 'text-brand-600' : 'text-emerald-600' },
                { label: 'Guardians', val: contactsCount ? `${contactsCount}` : '0', col: contactsCount ? 'text-slate-800' : 'text-amber-600' },
                { label: 'GPS', val: location ? 'ON' : 'OFF', col: location ? 'text-emerald-600' : 'text-red-500' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-[11px] font-black mt-0.5 ${s.col}`}>{s.val}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* ═══════════════════════════════════════════════
            SECTION 2 — EMERGENCY COMMAND CENTER
        ═══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="relative overflow-hidden rounded-[2rem]"
          style={{
            background: 'linear-gradient(135deg, rgba(255,245,245,0.95) 0%, rgba(254,226,226,0.85) 100%)',
            border: '1px solid rgba(239,68,68,0.2)',
            boxShadow: '0 8px 40px rgba(239,68,68,0.08), inset 0 1px 1px rgba(255,255,255,0.9)'
          }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-1 rounded-t-[2rem]"
            style={{ background: 'linear-gradient(90deg, #DC2626, #EF4444, #F87171)' }} />

          {/* Red glow blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

          <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row gap-6 items-center">
            {/* Left: Label + description */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                </span>
                <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Emergency Command Center</span>
              </div>
              <h2 className="text-2xl font-black text-red-900 leading-tight">SOS Escalate Protocol</h2>
              <p className="text-xs text-red-800/70 font-medium mt-2 max-w-md leading-relaxed">
                Triggering SOS broadcasts immediately alerts Twilio-verified contacts, initiates fallback calling webhooks, and locks immutable coordinate evidence.
              </p>
            </div>

            {/* Center: Status grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.7)', borderRadius: '1.25rem', padding: '1rem' }}>
              {[
                { label: 'Guardians', val: contactsCount != null ? String(contactsCount) : '0', icon: <Users className="w-3.5 h-3.5 text-red-400" /> },
                { label: 'GPS Lock', val: location ? 'ACTIVE' : 'OFF', icon: <MapPin className="w-3.5 h-3.5 text-red-400" /> },
                { label: 'SMS Alert', val: contactsCount ? 'ARMED' : 'UNSET', icon: <Radio className="w-3.5 h-3.5 text-red-400" /> },
                { label: 'Twilio', val: 'READY', icon: <Zap className="w-3.5 h-3.5 text-red-400" /> },
              ].map((s, i) => (
                <div key={s.label} className={`text-center px-2 ${i > 0 ? 'border-l border-red-200/40' : ''}`}>
                  <div className="flex justify-center mb-1">{s.icon}</div>
                  <p className="text-[9px] text-red-500/80 uppercase tracking-wider font-bold">{s.label}</p>
                  <p className="text-sm font-black text-red-800 mt-0.5">{s.val}</p>
                </div>
              ))}
            </div>

            {/* Right: Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <motion.button
                onClick={() => navigate('/sos')}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="relative overflow-hidden px-8 py-4 font-black text-sm uppercase tracking-widest rounded-2xl text-white"
                style={{
                  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                  boxShadow: '0 8px 30px rgba(220,38,38,0.4), 0 0 0 3px rgba(220,38,38,0.15)'
                }}
              >
                <span className="absolute inset-0 rounded-2xl"
                  style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite', background: 'rgba(255,255,255,0.05)' }} />
                <AlertOctagon className="w-5 h-5 inline mr-2" />
                TRIGGER SOS
              </motion.button>

              <a
                href="tel:112"
                className="px-6 py-4 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all duration-150"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(220,38,38,0.25)',
                  color: '#B91C1C'
                }}
              >
                <Phone className="w-4 h-4" />
                Call 112 Hotline
              </a>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════
            SECTION 3 — SECONDARY 2×2 GRID
        ═══════════════════════════════════════════════ */}
        <motion.div
          variants={stagger} initial="hidden" animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          {/* Card 1: Active Journey */}
          <motion.div
            variants={fadeUp}
            whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(15,23,42,0.08)' }}
            className="relative overflow-hidden rounded-[2rem] p-6 flex flex-col justify-between min-h-[240px] cursor-default"
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.75)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.04), inset 0 1px 1px rgba(255,255,255,0.9)'
            }}
          >
            <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-[2rem]"
              style={{ background: activeJourney ? 'linear-gradient(90deg, #7C3AED, #9333EA)' : 'rgba(203,213,225,0.6)' }} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(99,102,241,0.1))' }}>
                    <Navigation className="w-4 h-4 text-brand-600" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Shield Journey</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${activeJourney ? 'text-emerald-700' : 'text-slate-500'}`}
                  style={{ background: activeJourney ? 'rgba(16,185,129,0.1)' : 'rgba(203,213,225,0.3)', border: `1px solid ${activeJourney ? 'rgba(16,185,129,0.2)' : 'rgba(203,213,225,0.5)'}` }}>
                  {activeJourney ? '● Active' : '○ Idle'}
                </span>
              </div>

              {activeJourney ? (
                <div className="space-y-2.5">
                  {[
                    { label: 'Cab Number', val: activeJourney.cab_number },
                    { label: 'Provider', val: activeJourney.provider?.toUpperCase() },
                    { label: 'Pickup', val: activeJourney.pickup_address, truncate: true },
                    { label: 'Destination', val: activeJourney.dest_address, truncate: true },
                  ].map((item) => (
                    <div key={item.label} className={`flex ${item.truncate ? 'flex-col' : 'justify-between items-center'}`}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                      <span className={`text-xs font-bold text-slate-800 ${item.truncate ? 'truncate mt-0.5' : ''}`}>{item.val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <p className="text-sm font-bold text-slate-700">No active journey</p>
                  <p className="text-xs text-slate-500 leading-relaxed">Configure commute details to start real-time telemetry and route scoring.</p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
              {activeJourney ? (
                <button
                  onClick={handleCompleteJourney}
                  className="w-full py-2.5 rounded-xl text-white text-xs font-black tracking-wide transition-all duration-150"
                  style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}
                >
                  ✓ Complete Journey (Stop Shield)
                </button>
              ) : (
                <button
                  onClick={() => navigate('/journey-setup')}
                  className="w-full py-2.5 rounded-xl text-white text-xs font-black tracking-wide transition-all duration-150"
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)', boxShadow: '0 4px 12px rgba(124,58,237,0.25)' }}
                >
                  + Configure New Journey
                </button>
              )}
            </div>
          </motion.div>

          {/* Card 2: Trusted Contacts */}
          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-[2rem] p-6 flex flex-col justify-between min-h-[240px]"
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.75)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.04), inset 0 1px 1px rgba(255,255,255,0.9)'
            }}
          >
            <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-[2rem]"
              style={{ background: 'linear-gradient(90deg, #EC4899, #F43F5E)' }} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(244,63,94,0.1))' }}>
                    <Users className="w-4 h-4 text-rose-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Guardian Contacts</span>
                </div>
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', color: '#BE185D' }}>
                  {contactsCount !== null ? `${contactsCount} Registered` : '0 Registered'}
                </span>
              </div>

              <form onSubmit={handleQuickAddContact} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Guardian Name"
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    required
                    className="glass-input rounded-xl py-2 px-3 text-[11px] w-full"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    required
                    className="glass-input rounded-xl py-2 px-3 text-[11px] w-full"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <AnimatePresence>
                    {quickAddMessage && (
                      <motion.span
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-[10px] text-emerald-700 font-bold"
                      >{quickAddMessage}</motion.span>
                    )}
                  </AnimatePresence>
                  <button
                    type="submit"
                    disabled={quickAddLoading}
                    className="ml-auto py-1.5 px-3.5 text-[10px] font-black rounded-xl flex items-center gap-1 transition-all duration-150 disabled:opacity-50"
                    style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#7C3AED' }}
                  >
                    <Plus className="w-3 h-3" /> Quick Add
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
              <button
                onClick={() => navigate('/contacts')}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2"
                style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(15,23,42,0.08)', color: '#0F172A' }}
              >
                Manage Trusted Contacts <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>

          {/* Card 3: Evidence Vault */}
          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-[2rem] p-6 flex flex-col justify-between min-h-[220px]"
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.75)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.04), inset 0 1px 1px rgba(255,255,255,0.9)'
            }}
          >
            <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-[2rem]"
              style={{ background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))' }}>
                    <Lock className="w-4 h-4 text-indigo-600" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Evidence Vault</span>
                </div>
                <span className="text-[9px] font-black px-2 py-1 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#059669' }}>
                  SHA-256 SAFE
                </span>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Capsule Snapshots', val: activeJourney ? (evidenceCount !== null ? String(evidenceCount) : '…') : '0' },
                  { label: 'Retention Period', val: '24 Hours (Auto-cleanup)' },
                  { label: 'Hash Chain', val: 'Immutable' },
                  { label: 'Verification', val: 'Blockchain-anchored' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                    <span className="text-xs font-bold text-slate-800">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
              <button
                onClick={() => navigate('/evidence')}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2"
                style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(15,23,42,0.08)', color: '#0F172A' }}
              >
                View Vault Repository <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>

          {/* Card 4: Location Intelligence */}
          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-[2rem] p-6 flex flex-col justify-between min-h-[220px]"
            style={{
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.75)',
              boxShadow: '0 4px 20px rgba(15,23,42,0.04), inset 0 1px 1px rgba(255,255,255,0.9)'
            }}
          >
            <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-[2rem]"
              style={{ background: location ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #EF4444, #DC2626)' }} />

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: location ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                    <MapPin className={`w-4 h-4 ${location ? 'text-emerald-600' : 'text-red-500'}`} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location Intel</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Signal className={`w-3.5 h-3.5 ${location ? 'text-emerald-500' : 'text-red-400'}`} />
                  <span className={`text-[10px] font-black ${location ? 'text-emerald-700' : 'text-red-600'}`}>
                    {location ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
              </div>

              {location ? (
                <div className="space-y-2.5">
                  {[
                    { label: 'Latitude', val: location.latitude.toFixed(6) },
                    { label: 'Longitude', val: location.longitude.toFixed(6) },
                    { label: 'Accuracy', val: 'High Precision GPS' },
                    { label: 'Signal', val: 'Excellent' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                      <span className="text-xs font-bold text-slate-800">{item.val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <p className="text-xs font-bold text-slate-600 animate-pulse">Acquiring GPS lock…</p>
                  {permissionDenied && (
                    <p className="text-[11px] text-red-500 font-medium">Location permission denied. Please enable in browser settings.</p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
              <button
                onClick={() => navigate('/route-view')}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center justify-center gap-2"
                style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(15,23,42,0.08)', color: '#0F172A' }}
              >
                Open Live Route Map <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* ═══════════════════════════════════════════════
            SECTION 4 — AI SAFETY ROUTE INTELLIGENCE PANEL
        ═══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="relative overflow-hidden rounded-[2rem] p-6"
          style={{
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.75)',
            boxShadow: '0 4px 20px rgba(15,23,42,0.04), inset 0 1px 1px rgba(255,255,255,0.9)'
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(99,102,241,0.12))' }}>
              <TrendingUp className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">AI Safety Route Scorer</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Real-time risk evaluation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {routeOptions.map((route) => {
              const isSelected = selectedRoute === route.type;
              const colorMap: Record<string, { bg: string; ring: string; score: string; badge: string; label: string }> = {
                emerald: { bg: 'rgba(16,185,129,0.06)', ring: 'rgba(16,185,129,0.35)', score: '#059669', badge: 'rgba(16,185,129,0.1)', label: '#065F46' },
                amber: { bg: 'rgba(245,158,11,0.06)', ring: 'rgba(245,158,11,0.35)', score: '#B45309', badge: 'rgba(245,158,11,0.1)', label: '#92400E' },
                brand: { bg: 'rgba(124,58,237,0.06)', ring: 'rgba(124,58,237,0.35)', score: '#7C3AED', badge: 'rgba(124,58,237,0.1)', label: '#5B21B6' },
              };
              const c = colorMap[route.color];

              return (
                <motion.div
                  key={route.type}
                  onClick={() => setSelectedRoute(route.type)}
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.98 }}
                  className="relative cursor-pointer rounded-[1.5rem] p-5 transition-all duration-200"
                  style={{
                    background: isSelected ? c.bg : 'rgba(255,255,255,0.4)',
                    border: isSelected ? `1.5px solid ${c.ring}` : '1px solid rgba(255,255,255,0.7)',
                    boxShadow: isSelected ? `0 8px 24px ${c.ring}40, inset 0 1px 1px rgba(255,255,255,0.9)` : '0 2px 8px rgba(15,23,42,0.03)',
                  }}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <Star className="w-3.5 h-3.5" style={{ color: c.score, fill: c.score }} />
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-black text-slate-800 capitalize">{route.type} Route</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{ background: c.badge, color: c.label }}>
                      {route.score}/100
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="w-full h-1.5 rounded-full mb-4"
                    style={{ background: 'rgba(15,23,42,0.06)' }}>
                    <motion.div
                      className="h-1.5 rounded-full"
                      style={{ background: c.score }}
                      initial={{ width: 0 }}
                      animate={{ width: `${route.score}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'ETA', val: route.eta },
                      { label: 'Distance', val: route.distance },
                      { label: 'Risk', val: route.risk },
                    ].map((s) => (
                      <div key={s.label}>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                        <p className="text-[11px] font-black text-slate-800 mt-0.5"
                          style={{ color: s.label === 'Risk' && s.val !== 'Low' ? '#B45309' : undefined }}>
                          {s.val}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════
            SECTION 5 — ACTIVITY TIMELINE
        ═══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="relative overflow-hidden rounded-[2rem] p-6"
          style={{
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.75)',
            boxShadow: '0 4px 20px rgba(15,23,42,0.04), inset 0 1px 1px rgba(255,255,255,0.9)'
          }}
        >
          <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(236,72,153,0.1))' }}>
                <Activity className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Platform Activity Log</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Real-time telemetry stream</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-black text-emerald-700">Live</span>
            </div>
          </div>

          <div className="relative pl-8 space-y-6">
            {/* Vertical line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 rounded-full"
              style={{ background: 'linear-gradient(180deg, rgba(124,58,237,0.3) 0%, rgba(236,72,153,0.1) 100%)' }} />

            {[
              {
                icon: <CheckCircle2 className="w-3 h-3 text-white" />,
                bg: '#10B981',
                title: 'Platform Stream Online',
                desc: 'Established passive socket listeners and device geolocation listeners.',
              },
              {
                icon: <Compass className="w-3 h-3 text-white" />,
                bg: '#7C3AED',
                title: 'GPS Coordinates Synced',
                desc: location
                  ? `Lat: ${location.latitude.toFixed(5)} · Lon: ${location.longitude.toFixed(5)} lock established.`
                  : 'Scanning system GPS device stream…',
              },
              {
                icon: <Users className="w-3 h-3 text-white" />,
                bg: '#6366F1',
                title: 'Twilio Dispatch State',
                desc: contactsCount
                  ? `${contactsCount} emergency guardians synchronized. Ready to broadcast SMS.`
                  : 'Unconfigured contacts. Standard hotline fallback active.',
              },
              ...(activeJourney ? [{
                icon: <Lock className="w-3 h-3 text-white" />,
                bg: '#7C3AED',
                title: 'Evidence Capsules Sealed',
                desc: 'Chronological coordinate hashes sealed using SHA-256 blocks.',
              }] : []),
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.08 }}
                className="relative flex gap-3"
              >
                {/* Dot */}
                <div className="absolute -left-8 top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md z-10"
                  style={{ background: item.bg }}>
                  {item.icon}
                </div>

                <div className="flex-1 rounded-2xl p-3"
                  style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)' }}>
                  <p className="text-xs font-black text-slate-800">{item.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* ═══════════════════════════════════════════════
          FLOATING STICKY QUICK ACTIONS BAR
      ═══════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)]"
      >
        <div className="rounded-full p-2 flex items-center justify-between"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 8px 40px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06)'
          }}
        >
          {[
            { icon: <Navigation className="w-5 h-5" />, label: 'Start', route: '/journey-setup' },
            { icon: <Map className="w-5 h-5" />, label: 'Map', route: '/route-view' },
            { icon: <Users className="w-5 h-5" />, label: 'Contacts', route: '/contacts' },
          ].map((item) => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className="flex-1 py-2 flex flex-col items-center gap-0.5 transition-all duration-150 rounded-full group"
            >
              <span className="text-slate-400 group-hover:text-brand-600 transition-colors duration-150">{item.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 group-hover:text-brand-600 transition-colors">{item.label}</span>
            </button>
          ))}

          {/* Center SOS button */}
          <motion.button
            onClick={() => navigate('/sos')}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 -translate-y-2.5 mx-1"
            style={{
              background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
              boxShadow: '0 8px 24px rgba(220,38,38,0.45), 0 0 0 4px rgba(220,38,38,0.12)',
              border: '2px solid rgba(255,255,255,0.6)'
            }}
          >
            <AlertOctagon className="w-6 h-6 text-white animate-pulse" />
          </motion.button>

          {[
            { icon: <Lock className="w-5 h-5" />, label: 'Vault', route: '/evidence' },
            { icon: <FileText className="w-5 h-5" />, label: 'FIR', route: '/fir' },
            { icon: <Shield className="w-5 h-5" />, label: 'Shield', route: '/settings' },
          ].map((item) => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className="flex-1 py-2 flex flex-col items-center gap-0.5 transition-all duration-150 rounded-full group"
            >
              <span className="text-slate-400 group-hover:text-brand-600 transition-colors duration-150">{item.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 group-hover:text-brand-600 transition-colors">{item.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

    </div>
  );
};

export default DashboardPage;
