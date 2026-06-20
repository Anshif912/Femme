import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, MapPin, CheckCircle2, ShieldAlert, Plus } from 'lucide-react';

const createCustomIcon = (color: string, iconHtml: string) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        ${iconHtml}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

const icons = {
  police: createCustomIcon('#10B981', '👮'),
  hospital: createCustomIcon('#3B82F6', '🏥'),
  metro: createCustomIcon('#F59E0B', '🚇'),
  shop: createCustomIcon('#10B981', '🏪'),
  other: createCustomIcon('#8B5CF6', '🛡️'),
  selectPin: createCustomIcon('#EC4899', '📍')
};

// Map click handler to select latitude & longitude
const MapClickHandler: React.FC<{ onLocationSelected: (lat: number, lng: number) => void }> = ({ onLocationSelected }) => {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

export const SafeZoneMapPage: React.FC = () => {
  const [safeZones, setSafeZones] = useState<any[]>([]);
  
  // New safe zone form
  const [name, setName] = useState('');
  const [type, setType] = useState('police');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchSafeZones = async () => {
    try {
      const data = await api.getSafeZones();
      setSafeZones(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSafeZones();
  }, []);

  const handleLocationSelect = (selectedLat: number, selectedLng: number) => {
    setLat(Number(selectedLat.toFixed(5)));
    setLng(Number(selectedLng.toFixed(5)));
    setMessage('Coordinate coordinates pre-populated from map click.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name || !description || lat === '' || lng === '') {
      setError('Please complete all form fields. Click on the map to pre-populate coordinates.');
      return;
    }

    setLoading(true);
    try {
      await api.addSafeZone({
        name,
        type,
        latitude: Number(lat),
        longitude: Number(lng),
        description
      });
      setName('');
      setDescription('');
      setLat('');
      setLng('');
      setMessage('New community safe zone marker registered successfully!');
      fetchSafeZones();
    } catch (err: any) {
      setError(err.message || 'Failed to register safe zone.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      
      <div>
        <h2 className="text-2xl font-black text-white">Safe Zone Community Map</h2>
        <p className="text-xs text-gray-400">View and contribute verified late-night safe stops (police checkpoints, open clinics, metro terminals).</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex gap-2 items-start">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl flex gap-2 items-start">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
        
        {/* Left column: Add Safe Zone form */}
        <div className="glass-card p-6 space-y-4 h-fit">
          <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-500" />
            Contribute Safe Zone
          </h3>
          <p className="text-xs text-slate-500 leading-normal">
            Fill the details below. 💡 <strong>Tip:</strong> Click anywhere on the map to pre-populate coordinates.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Safe Zone Name</label>
              <input
                type="text"
                placeholder="E.g., Koramangala Police Station"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input rounded-xl py-2 px-4 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full glass-input rounded-xl py-2 px-4 text-xs"
              >
                <option value="police">👮 Police Station / Checkpoint</option>
                <option value="hospital">🏥 Hospital / 24h Clinic</option>
                <option value="metro">🚇 Metro Transit Station</option>
                <option value="shop">🏪 Late Night Store / Shop</option>
                <option value="other">🛡️ Other Safety Point</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Click Map"
                  value={lat}
                  onChange={(e) => setLat(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full glass-input rounded-xl py-2 px-2 text-xs text-center"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Click Map"
                  value={lng}
                  onChange={(e) => setLng(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full glass-input rounded-xl py-2 px-2 text-xs text-center"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Short Description</label>
              <textarea
                rows={2}
                placeholder="E.g., Open 24h, active guards, streetlights present..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-xs"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition duration-150 text-xs shadow-md"
            >
              Add Safe Stop Marker
            </button>
          </form>
        </div>

        {/* Right column: Interactive Map */}
        <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-white/20 shadow-xl bg-white/60 min-h-[450px]">
          <MapContainer 
            center={[12.9716, 77.5946]} 
            zoom={13} 
            scrollWheelZoom={true} 
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Render selected pin coordinate */}
            {lat !== '' && lng !== '' && (
              <Marker position={[Number(lat), Number(lng)]} icon={icons.selectPin}>
                <Popup>Selected Coordinate</Popup>
              </Marker>
            )}

            {/* Render safe zones */}
            {safeZones.map((sz, index) => {
              let categoryIcon = icons.other;
              if (sz.type === 'police') categoryIcon = icons.police;
              else if (sz.type === 'hospital') categoryIcon = icons.hospital;
              else if (sz.type === 'metro') categoryIcon = icons.metro;
              else if (sz.type === 'shop') categoryIcon = icons.shop;

              return (
                <Marker 
                  key={`safe-${index}`} 
                  position={[sz.latitude, sz.longitude]}
                  icon={categoryIcon}
                >
                  <Popup>
                    <div className="text-xs text-gray-900">
                      <p className="font-bold">{sz.name}</p>
                      <p className="text-[9px] text-gray-500 font-semibold uppercase">{sz.type} Point</p>
                      <p className="mt-1 text-gray-600 font-light">{sz.description}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            <MapClickHandler onLocationSelected={handleLocationSelect} />
          </MapContainer>
        </div>

      </div>
    </div>
  );
};
export default SafeZoneMapPage;
