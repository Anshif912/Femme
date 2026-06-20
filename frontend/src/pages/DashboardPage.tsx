import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { useLocation } from '../context/LocationContext';
import { Shield, Users, Lock, Compass, AlertOctagon, ArrowRight } from 'lucide-react';

interface JourneyCardProps {
  journey: any;
  onComplete: () => void;
}

const JourneyCard: React.FC<JourneyCardProps> = ({ journey, onComplete }) => (
  <div className="p-6 glass-card transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(124,58,237,0.04)] duration-300 space-y-4 text-[#0F172A] flex flex-col justify-between min-h-[240px]">
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Active Journey</span>
        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Shield className="w-4 h-4" />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm"><strong className="text-gray-500 font-medium">Cab:</strong> {journey.cab_number}</p>
        <p className="text-sm"><strong className="text-gray-500 font-medium">Provider:</strong> {journey.provider}</p>
        <p className="text-sm flex items-center gap-1.5">
          <strong className="text-gray-500 font-medium">Status:</strong> 
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-bold tracking-wide uppercase">{journey.status}</span>
        </p>
        <p className="text-sm truncate"><strong className="text-gray-500 font-medium">Pickup:</strong> {journey.pickup_address}</p>
        <p className="text-sm truncate"><strong className="text-gray-500 font-medium">Destination:</strong> {journey.dest_address}</p>
      </div>
    </div>
    <button
      onClick={onComplete}
      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
    >
      Complete Journey (Stop Shield)
    </button>
  </div>
);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, activeJourney, setActiveJourney } = useStore();
  const { location, permissionDenied } = useLocation();

  const [journeys, setJourneys] = useState<any[]>([]);
  const [contactsCount, setContactsCount] = useState<number | null>(null);
  const [evidenceCount, setEvidenceCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompleteJourney = async () => {
    setError('');
    try {
      await api.completeJourney();
      setActiveJourney(null);
      setJourneys([]);
      setEvidenceCount(0);
      console.log('Journey completed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to complete journey.');
      console.error(err);
    }
  };

  useEffect(() => {
    console.log('Dashboard mounted');
    // Fetch journeys list
    api.getActiveJourney()
      .then((journey) => {
        setJourneys(journey ? [journey] : []);
        console.log('Journeys loaded');
      })
      .catch((err) => {
        setError(err.message || 'Failed to load journeys');
        console.error(err);
      });

    // Fetch contacts
    api.getContacts()
      .then((contacts) => {
        setContactsCount(contacts.length);
        console.log('Contacts loaded');
      })
      .catch((err) => {
        setError(err.message || 'Failed to load contacts');
        console.error(err);
      });

    // Fetch evidence capsules for active journey (if any)
    if (activeJourney?.id) {
      api.getCapsules(activeJourney.id)
        .then((capsules) => {
          setEvidenceCount(capsules.length);
          console.log('Evidence loaded');
        })
        .catch((err) => {
          setError(err.message || 'Failed to load evidence');
          console.error(err);
        });
    }
  }, [activeJourney]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F6F3ED] text-[#0F172A] p-8 space-y-8">
      <h1 className="text-4xl font-extrabold text-[#0F172A] tracking-tight mb-6 font-sans">Dashboard</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl shadow-sm text-sm">
          <p className="font-semibold">System Alert: {error}</p>
        </div>
      )}
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {activeJourney ? (
          <JourneyCard journey={activeJourney} onComplete={handleCompleteJourney} />
        ) : (
          <div className="p-6 glass-card transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(124,58,237,0.04)] duration-300 flex flex-col justify-between min-h-[190px]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Active Journey</span>
                <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <p className="text-slate-400 text-sm font-medium">No Active Journey</p>
            </div>
            <button 
              onClick={() => navigate('/journey-setup')}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 rounded-xl text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              Start New Journey
            </button>
          </div>
        )}

        <div className="p-6 glass-card transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(124,58,237,0.04)] duration-300 flex flex-col justify-between min-h-[190px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Trusted Contacts</span>
              <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-4xl font-black text-[#0F172A] mt-2">
              {contactsCount !== null ? contactsCount : '0'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/contacts')}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-[#0F172A] text-xs font-bold transition-all border border-slate-200/65 flex items-center justify-center gap-1"
          >
            Manage Contacts <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-6 glass-card transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(124,58,237,0.04)] duration-300 flex flex-col justify-between min-h-[190px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Evidence Capsules</span>
              <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-4xl font-black text-[#0F172A] mt-2">
              {!activeJourney ? '0' : (evidenceCount !== null ? evidenceCount : 'Loading...')}
            </p>
          </div>
          {!activeJourney ? (
            <div className="w-full py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center text-[10px] text-gray-400 font-medium">
              No active journey tracking
            </div>
          ) : (
            <button 
              onClick={() => navigate('/evidence')}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl text-[#0F172A] text-xs font-bold transition-all border border-slate-200/65 flex items-center justify-center gap-1"
            >
              View Evidence Vault <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="p-6 glass-card transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgb(124,58,237,0.04)] duration-300 flex flex-col justify-between min-h-[190px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Location Status</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
            </div>
            <div className="text-sm mt-2">
              {location ? (
                <div className="space-y-1">
                  <span className="text-emerald-600 font-bold flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    Active
                  </span>
                  <p className="text-xs text-gray-500 font-medium">Lat: {location.latitude.toFixed(5)}</p>
                  <p className="text-xs text-gray-500 font-medium">Lng: {location.longitude.toFixed(5)}</p>
                </div>
              ) : permissionDenied ? (
                <span className="text-red-500 font-bold text-xs">Permission Denied</span>
              ) : (
                <span className="text-amber-500 font-bold text-xs animate-pulse">Acquiring location...</span>
              )}
            </div>
          </div>
          <div className="w-full py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
            Device GPS Stream
          </div>
        </div>

        <div className="p-6 bg-red-50/75 backdrop-blur-md rounded-2xl border border-red-100/60 shadow-[0_8px_30px_rgba(220,38,38,0.015)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(220,38,38,0.04)] duration-300 flex flex-col justify-between min-h-[190px]">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-red-600">SOS Emergency</span>
              <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center animate-pulse">
                <AlertOctagon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-red-700/80 text-[11px] font-medium leading-relaxed mt-1">Trigger immediate panic protocol. This notifies all priority guardians and seals evidence capsules.</p>
          </div>
          <button 
            onClick={() => navigate('/sos')}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1"
          >
            TRIGGER SOS
          </button>
        </div>
      </div>
      
      <button
        onClick={() => navigate('/')}
        className="mt-8 px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl text-gray-700 text-sm font-semibold transition shadow-sm"
      >
        Back to Home
      </button>
    </div>
  );
};

export default DashboardPage;
