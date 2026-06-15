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

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cabNumber || !provider || !pickupAddress || !destAddress || 
        pickupLat === '' || pickupLng === '' || destLat === '' || destLng === '') {
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
        pickup_lat: Number(pickupLat),
        pickup_lng: Number(pickupLng),
        dest_address: destAddress,
        dest_lat: Number(destLat),
        dest_lng: Number(destLng)
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
          className="p-2 bg-dark-900 border border-gray-800 rounded-xl hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-black text-white">Manual Journey Setup</h2>
          <p className="text-xs text-gray-400">Establish expected path constraints and start invisible shield.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl flex gap-2 items-start">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Preset Route Selectors */}
      <div className="glass-card p-5 rounded-2xl border border-gray-800 space-y-3">
        <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest flex items-center gap-1.5">
          <Compass className="w-4 h-4" />
          Quick Simulation presets
        </h4>
        <p className="text-xs text-gray-400 leading-normal">
          Click any preset route below to pre-populate exact coordinate geometry matching the routing simulators:
        </p>
        <div className="grid grid-cols-1 gap-2">
          {SIM_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(idx)}
              className="p-3 bg-dark-950/60 hover:bg-dark-900 border border-gray-800 hover:border-brand-500/30 text-xs text-gray-300 font-semibold rounded-xl text-left transition duration-150 flex justify-between items-center"
            >
              <span>{preset.name}</span>
              <MapPin className="w-3.5 h-3.5 text-brand-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleStart} className="glass-card p-6 rounded-2xl border border-gray-800 space-y-5">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Cab Plate Number</label>
            <input
              type="text"
              placeholder="KA-03-MM-1122"
              value={cabNumber}
              onChange={(e) => setCabNumber(e.target.value)}
              className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-3 px-4 text-white text-sm outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Service Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-3 px-4 text-white text-sm outline-none transition"
            >
              <option value="uber">Uber</option>
              <option value="ola">Ola</option>
              <option value="rapido">Rapido</option>
              <option value="other">Other Cab Service</option>
            </select>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4 space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Coordinates & Addresses</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pickup Address</label>
              <input
                type="text"
                placeholder="E.g., Koramangala 4th Block"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-4 text-white text-xs outline-none transition"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pickup Lat</label>
                <input
                  type="number"
                  step="any"
                  placeholder="12.9352"
                  value={pickupLat}
                  onChange={(e) => setPickupLat(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-2 text-white text-xs outline-none text-center transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Pickup Lng</label>
                <input
                  type="number"
                  step="any"
                  placeholder="77.6245"
                  value={pickupLng}
                  onChange={(e) => setPickupLng(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-2 text-white text-xs outline-none text-center transition"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Destination Address</label>
              <input
                type="text"
                placeholder="E.g., Indiranagar Double Road"
                value={destAddress}
                onChange={(e) => setDestAddress(e.target.value)}
                className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-4 text-white text-xs outline-none transition"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Dest Lat</label>
                <input
                  type="number"
                  step="any"
                  placeholder="12.9719"
                  value={destLat}
                  onChange={(e) => setDestLat(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-2 text-white text-xs outline-none text-center transition"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Dest Lng</label>
                <input
                  type="number"
                  step="any"
                  placeholder="77.6412"
                  value={destLng}
                  onChange={(e) => setDestLng(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-2 text-white text-xs outline-none text-center transition"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl transition duration-200 shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? 'Fetching Safe Route Geometry...' : 'Initiate Active Journey Shield'}
          <Play className="w-3.5 h-3.5 fill-white" />
        </button>
      </form>
    </div>
  );
};
export default JourneySetupPage;
