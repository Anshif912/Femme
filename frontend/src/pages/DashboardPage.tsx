import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { useLocation } from '../context/LocationContext';

interface JourneyCardProps {
  journey: any;
  onComplete: () => void;
}

const JourneyCard: React.FC<JourneyCardProps> = ({ journey, onComplete }) => (
  <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100/80 transition-all hover:shadow-md duration-300 space-y-2 text-[#0F172A] flex flex-col justify-between min-h-[220px]">
    <div>
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-3">Active Journey</h2>
      <p className="text-sm"><strong className="text-gray-500">Cab:</strong> {journey.cab_number}</p>
      <p className="text-sm"><strong className="text-gray-500">Provider:</strong> {journey.provider}</p>
      <p className="text-sm"><strong className="text-gray-500">Status:</strong> <span className="px-2.5 py-0.5 bg-brand-500/10 text-brand-500 rounded-full text-xs font-bold">{journey.status}</span></p>
      <p className="text-sm"><strong className="text-gray-500">Pickup:</strong> {journey.pickup_address}</p>
      <p className="text-sm"><strong className="text-gray-500">Destination:</strong> {journey.dest_address}</p>
    </div>
    <button
      onClick={onComplete}
      className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white text-xs font-bold self-start transition-all shadow-sm"
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
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100/80 transition-all hover:shadow-md duration-300 flex flex-col justify-between min-h-[180px]">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-3">Active Journey</h2>
              <p className="text-gray-400 text-sm font-medium">No Active Journey</p>
            </div>
            <button 
              onClick={() => navigate('/journey-setup')}
              className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 rounded-xl text-white text-xs font-bold self-start transition-all"
            >
              Start New Journey
            </button>
          </div>
        )}

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100/80 transition-all hover:shadow-md duration-300">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-3">Trusted Contacts</h2>
          <p className="text-4xl font-black text-[#0F172A] mt-2">
            {contactsCount !== null ? contactsCount : '0'}
          </p>
          <button 
            onClick={() => navigate('/contacts')}
            className="mt-4 text-xs font-bold text-brand-600 hover:underline block"
          >
            Manage Contacts &rarr;
          </button>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100/80 transition-all hover:shadow-md duration-300">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-3">Evidence Capsules</h2>
          <p className="text-4xl font-black text-[#0F172A] mt-2">
            {!activeJourney ? '0' : (evidenceCount !== null ? evidenceCount : 'Loading...')}
          </p>
          {!activeJourney ? (
            <span className="text-[10px] text-gray-400 mt-4 block">No active journey tracking</span>
          ) : (
            <button 
              onClick={() => navigate('/evidence')}
              className="mt-4 text-xs font-bold text-brand-600 hover:underline block"
            >
              View Evidence Vault &rarr;
            </button>
          )}
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100/80 transition-all hover:shadow-md duration-300">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-3">Location Status</h2>
          <div className="text-sm mt-3">
            {location ? (
              <div className="space-y-1.5">
                <span className="text-emerald-600 font-bold flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Active
                </span>
                <p className="text-xs text-gray-500">Lat: {location.latitude.toFixed(5)}</p>
                <p className="text-xs text-gray-500">Lng: {location.longitude.toFixed(5)}</p>
              </div>
            ) : permissionDenied ? (
              <span className="text-red-500 font-bold text-xs">Permission Denied</span>
            ) : (
              <span className="text-amber-500 font-bold text-xs animate-pulse">Acquiring location...</span>
            )}
          </div>
        </div>

        <div className="p-6 bg-red-50 rounded-2xl shadow-sm border border-red-100/80 transition-all hover:shadow-md duration-300 flex flex-col justify-between min-h-[150px]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-3">SOS Emergency</h2>
            <p className="text-red-700 text-xs font-medium leading-relaxed">Trigger immediate panic protocol. This notifies all priority guardians and seals evidence capsules.</p>
          </div>
          <button 
            onClick={() => navigate('/sos')}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white text-xs font-bold self-start transition-all shadow-sm"
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
