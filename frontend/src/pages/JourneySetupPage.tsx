import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { Play, ArrowLeft, Info, Compass, MapPin } from 'lucide-react';

// Preset coordinates mapping for simulation ease
const SIM_PRESETS = [
  {
    name: "Koramangala ➔ Indiranagar (Standard Commute)",
    pickup_address: "Koramangala 4th Block, Bengaluru",
    pickup_lat: 12.9352,
    pickup_lng: 77.6245,
    dest_address: "Indiranagar Double Road, Bengaluru",
    dest_lat: 12.9719,
    dest_lng: 77.6412
  },
  {
    name: "HSR Layout ➔ Bellandur (Tech Park route)",
    pickup_address: "HSR Layout Sector 3, Bengaluru",
    pickup_lat: 12.9141,
    pickup_lng: 77.6411,
    dest_address: "Bellandur Ecospace, Bengaluru",
    dest_lat: 12.9304,
    dest_lng: 77.6784
  },
  {
    name: "HSR Layout ➔ Majestic (Transit Commute)",
    pickup_address: "HSR Layout Sector 3, Bengaluru",
    pickup_lat: 12.9141,
    pickup_lng: 77.6411,
    dest_address: "Majestic Metro Station, Bengaluru",
    dest_lat: 12.9779,
    dest_lng: 77.5707
  }
];

export const JourneySetupPage: React.FC = () => {
  const navigate = useNavigate();
  const setActiveJourney = useStore((state) => state.setActiveJourney);

  const [cabNumber, setCabNumber] = useState('');
  const [provider, setProvider] = useState('uber');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState<number | ''>('');
  const [pickupLng, setPickupLng] = useState<number | ''>('');
  const [destAddress, setDestAddress] = useState('');
  const [destLat, setDestLat] = useState<number | ''>('');
  const [destLng, setDestLng] = useState<number | ''>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApplyPreset = (presetIdx: number) => {
    const preset = SIM_PRESETS[presetIdx];
    setPickupAddress(preset.pickup_address);
    setPickupLat(preset.pickup_lat);
    setPickupLng(preset.pickup_lng);
    setDestAddress(preset.dest_address);
    setDestLat(preset.dest_lat);
    setDestLng(preset.dest_lng);
  };

  const handleSimulateCabBooking = async () => {
    setError('');
    setLoading(true);
    
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const mockCab = `KA03MM${randomDigits}`;
    
    const providers = ['uber', 'ola', 'rapido'];
    const mockProvider = providers[Math.floor(Math.random() * providers.length)];
    
    const preset = SIM_PRESETS[Math.floor(Math.random() * SIM_PRESETS.length)];
    
    setCabNumber(mockCab);
    setProvider(mockProvider);
    setPickupAddress(preset.pickup_address);
    setPickupLat(preset.pickup_lat);
    setPickupLng(preset.pickup_lng);
    setDestAddress(preset.dest_address);
    setDestLat(preset.dest_lat);
    setDestLng(preset.dest_lng);

    try {
      const res = await api.startJourney({
        cab_number: mockCab,
        provider: mockProvider,
        pickup_address: preset.pickup_address,
        pickup_lat: preset.pickup_lat,
        pickup_lng: preset.pickup_lng,
        dest_address: preset.dest_address,
        dest_lat: preset.dest_lat,
        dest_lng: preset.dest_lng
      });
      
      setActiveJourney(res);
      navigate('/route-view');
    } catch (err: any) {
      setError(err.message || 'Failed to simulate cab booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cabNumber || !provider || !pickupAddress || !destAddress) {
      setError('Please complete all form fields or select a simulated route preset.');
      return;
    }

    setLoading(true);
    try {
      const formattedCab = cabNumber.replace(/\s+/g, '').toUpperCase();
      const res = await api.startJourney({
        cab_number: formattedCab,
        provider,
        pickup_address: pickupAddress,
        pickup_lat: pickupLat !== '' ? Number(pickupLat) : undefined,
        pickup_lng: pickupLng !== '' ? Number(pickupLng) : undefined,
        dest_address: destAddress,
        dest_lat: destLat !== '' ? Number(destLat) : undefined,
        dest_lng: destLng !== '' ? Number(destLng) : undefined
      });
      
      setActiveJourney(res);
      navigate('/route-view');
    } catch (err: any) {
      setError(err.message || 'Failed to start journey tracking. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Back Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-black text-slate-800">Manual Journey Setup</h2>
          <p className="text-xs text-slate-500 font-medium">Establish expected path constraints and start active shield monitoring.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex gap-2 items-start shadow-sm">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleSimulateCabBooking}
        disabled={loading}
        className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-400 hover:from-brand-700 hover:to-brand-500 text-white font-extrabold rounded-2xl shadow-md transition flex items-center justify-center gap-2 group text-sm"
      >
        <Compass className="w-5 h-5 text-white animate-pulse" />
        Simulate Cab Booking (Auto-Start Guardian Mode)
      </button>

      {/* Preset Route Selectors */}
      <div className="glass-card p-5 space-y-3">
        <h4 className="text-xs font-bold text-brand-650 uppercase tracking-widest flex items-center gap-1.5">
          <Compass className="w-4 h-4" />
          Quick Simulation presets
        </h4>
        <p className="text-xs text-slate-500 font-medium leading-normal">
          Click any preset route below to pre-populate exact coordinate geometry matching the routing simulators:
        </p>
        <div className="grid grid-cols-1 gap-2">
          {SIM_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(idx)}
              className="p-3 glass-item hover:border-brand-500/20 text-xs text-slate-700 font-semibold rounded-xl text-left transition duration-150 flex justify-between items-center shadow-sm"
            >
              <span>{preset.name}</span>
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleStart} className="glass-card p-6 space-y-5">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cab Plate Number</label>
            <input
              type="text"
              placeholder="KA-03-MM-1122"
              value={cabNumber}
              onChange={(e) => setCabNumber(e.target.value)}
              className="w-full glass-input rounded-xl py-3 px-4 text-slate-800 text-sm outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Service Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full glass-input rounded-xl py-3 px-4 text-slate-800 text-sm outline-none transition"
            >
              <option value="uber">Uber</option>
              <option value="ola">Ola</option>
              <option value="rapido">Rapido</option>
              <option value="other">Other Cab Service</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Commute Details</h4>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pickup Location Address</label>
            <input
              type="text"
              placeholder="E.g., Koramangala 4th Block, Bengaluru"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              className="w-full glass-input rounded-xl py-3 px-4 text-slate-800 text-xs outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Destination Address</label>
            <input
              type="text"
              placeholder="E.g., Indiranagar Double Road, Bengaluru"
              value={destAddress}
              onChange={(e) => setDestAddress(e.target.value)}
              className="w-full glass-input rounded-xl py-3 px-4 text-slate-800 text-xs outline-none transition"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-brand-650 hover:bg-brand-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-2"
        >
          {loading ? 'Fetching Safe Route Geometry...' : 'Initiate Active Journey Shield'}
          <Play className="w-3.5 h-3.5 fill-white text-white" />
        </button>
      </form>
    </div>
  );
};
export default JourneySetupPage;
