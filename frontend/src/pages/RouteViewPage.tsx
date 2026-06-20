import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, ShieldAlert, Heart, Compass, ShieldCheck } from 'lucide-react';
import { useLocation } from '../context/LocationContext';
import LocationPermissionModal from '../components/LocationPermissionModal';

// Setup custom SVG icons to avoid Leaflet bundler image loading errors
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
  traveler: L.divIcon({
    className: 'traveler-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full bg-rose-500/30 animate-ping"></div>
        <div class="w-5 h-5 rounded-full bg-rose-500 border-2 border-white shadow-md"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  }),
  police: createCustomIcon('#10B981', '👮'), // green
  hospital: createCustomIcon('#3B82F6', '🏥'), // blue
  unsafe: createCustomIcon('#EF4444', '⚠️'), // red
  pin: createCustomIcon('#8B5CF6', '📍')
};

// Component to dynamically pan and center map on updates
const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center[0] && center[1]) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

export const RouteViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { journeyId } = useParams<{ journeyId?: string }>();
  const isPublicTrack = !!journeyId;
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  const { activeJourney, currentLat, currentLng, currentSpeed } = useStore();

  const { location, permissionDenied } = useLocation();
  const [localJourney, setLocalJourney] = useState<any | null>(null);
  const [localCoords, setLocalCoords] = useState<{ lat: number; lng: number; speed: number } | null>(null);

  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [unsafeZones, setUnsafeZones] = useState<any[]>([]);
  const [safetyEvaluation, setSafetyEvaluation] = useState<any>({
    score: 95,
    status: 'green',
    reason: 'Evaluating route conditions...'
  });
  const [safetyRoutes, setSafetyRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('safest');
  const journeyToUse = isPublicTrack ? localJourney : activeJourney;
  const latToUse = isPublicTrack ? localCoords?.lat : currentLat;
  const lngToUse = isPublicTrack ? localCoords?.lng : currentLng;
  const speedToUse = isPublicTrack ? (localCoords?.speed ?? 0) : currentSpeed;

  // Determine map center: prefer user location, then journey coords, then fallback.
  const fallbackCenter: [number, number] = [12.9716, 77.5946];
  const mapCenter: [number, number] = location
    ? [location.latitude, location.longitude]
    : journeyToUse && latToUse && lngToUse
    ? [latToUse, lngToUse]
    : journeyToUse
    ? [journeyToUse.pickup_lat, journeyToUse.pickup_lng]
    : fallbackCenter;

  // Public Journey Tracking details (polling & WebSockets) + Auto-acknowledge SOS
  useEffect(() => {
    if (!journeyId) return;

    // 1. Auto-acknowledge SOS alert on load
    const acknowledge = async () => {
      try {
        await api.acknowledgeSos(journeyId);
        console.log("SOS alert acknowledged successfully");
      } catch (err) {
        console.error("Auto-acknowledgement failed:", err);
      }
    };
    acknowledge();

    // 2. Poll journey status / telemetry
    const fetchJourneyTrack = async () => {
      try {
        const journeyData = await api.getPublicJourneyTrack(journeyId);
        setLocalJourney(journeyData);
        setLocalCoords({
          lat: journeyData.current_lat || journeyData.pickup_lat,
          lng: journeyData.current_lng || journeyData.pickup_lng,
          speed: 0
        });
      } catch (err) {
        console.error("Failed to fetch public journey track:", err);
      }
    };

    fetchJourneyTrack();
    const pollInterval = setInterval(fetchJourneyTrack, 3000);

    // 3. Optional live WebSocket location listener
    let ws: WebSocket | null = null;
    try {
      const wsUrl = api.getWebSocketUrl(journeyId);
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.latitude && data.longitude) {
            setLocalCoords({
              lat: data.latitude,
              lng: data.longitude,
              speed: data.speed || 0
            });
            setLocalJourney((prev: any) => prev ? {
              ...prev,
              current_lat: data.latitude,
              current_lng: data.longitude
            } : null);
          }
        } catch (e) {
          console.error("WS message parse fail:", e);
        }
      };
    } catch (wsErr) {
      console.error("WebSocket connection failed:", wsErr);
    }

    return () => {
      clearInterval(pollInterval);
      if (ws) ws.close();
    };
  }, [journeyId]);

  // Fetch Safe/Unsafe Zones
  useEffect(() => {
    if (isPublicTrack && !isAuthenticated) {
      // Don't fetch safe/unsafe zones for unauthenticated users
      return;
    }
    const fetchZones = async () => {
      try {
        const sz = await api.getSafeZones();
        setSafeZones(sz);
        const uz = await api.getUnsafeZones();
        setUnsafeZones(uz);
      } catch (err) {
        console.error("Failed to load map safety zones:", err);
      }
    };
    fetchZones();
    }, [isAuthenticated, isPublicTrack]);

    // Fetch AI Safety Routes
    useEffect(() => {
      if (journeyToUse && journeyToUse.pickup_lat && journeyToUse.dest_lat) {
        const origin = { lat: journeyToUse.pickup_lat, lng: journeyToUse.pickup_lng };
        const destination = { lat: journeyToUse.dest_lat, lng: journeyToUse.dest_lng };
        api.fetchSafetyRoutes(origin, destination)
          .then(setSafetyRoutes)
          .catch(err => console.error('Failed to fetch safety routes:', err));
      }
    }, [journeyToUse]);

  // Compute safety scorer score based on path coordinates
  useEffect(() => {
    if (isPublicTrack && !isAuthenticated) {
      setSafetyEvaluation({
        score: 100,
        status: 'green',
        reason: 'Live guardian tracking stream active.'
      });
      return;
    }
    if (journeyToUse && journeyToUse.expected_route) {
      const evaluate = async () => {
        try {
          const res = await api.evaluateRouteSafety(journeyToUse.expected_route);
          setSafetyEvaluation(res);
        } catch (err) {
          console.error("Route scorer fail:", err);
        }
      };
      evaluate();
    }
  }, [journeyToUse, isAuthenticated, isPublicTrack]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      
      {/* Route Scorer Banner */}
      {journeyToUse && (
        <div className={`p-4 border rounded-2xl flex items-start sm:items-center gap-3.5 shadow-md ${
          safetyEvaluation.status === 'green' ? 'bg-emerald-950/20 border-emerald-500/25 glow-green' :
          safetyEvaluation.status === 'amber' ? 'bg-amber-950/20 border-amber-500/25 glow-amber' :
          'bg-rose-950/20 border-rose-500/25 glow-rose'
        }`}>
          <div className={`p-2.5 rounded-xl ${
            safetyEvaluation.status === 'green' ? 'bg-emerald-500/10 text-emerald-400' :
            safetyEvaluation.status === 'amber' ? 'bg-amber-500/10 text-amber-400' :
            'bg-rose-500/10 text-rose-400'
          }`}>
            {safetyEvaluation.status === 'green' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Route Safety Score:</span>
              <span className={`text-sm font-black ${
                safetyEvaluation.status === 'green' ? 'text-emerald-400' :
                safetyEvaluation.status === 'amber' ? 'text-amber-400' :
                'text-rose-400'
              }`}>{safetyEvaluation.score}/100</span>
            </div>
            <p className="text-xs text-gray-300 mt-1 leading-normal">{safetyEvaluation.reason}</p>
          </div>
        </div>
      )}

      {/* AI Safety Route Intelligence Panel */}
<div className="absolute top-4 left-4 right-4 bg-dark-900/90 backdrop-blur-md border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 z-[1000]">
  {safetyRoutes.map((route) => {
    const riskLevel = route.score >= 71 ? 'Low' : route.score >= 41 ? 'Medium' : 'High';
    const bgColor = riskLevel === 'Low' ? 'bg-emerald-900/30 border-emerald-500' :
                   riskLevel === 'Medium' ? 'bg-amber-900/30 border-amber-500' :
                   'bg-rose-900/30 border-rose-500';
    return (
      <div key={route.type} className={`flex-1 p-3 rounded-lg border ${bgColor} cursor-pointer`} onClick={() => setSelectedRoute(route.type)}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold uppercase">{route.type.charAt(0).toUpperCase() + route.type.slice(1)} Route</h3>
          <span className="text-xs font-bold">{route.score}/100</span>
        </div>
        <p className="text-xs text-gray-300">Distance: {(route.distance/1000).toFixed(1)} km</p>
        <p className="text-xs text-gray-300">Duration: {(route.duration/60).toFixed(0)} min</p>
        <p className="text-xs text-gray-300">Risk: {riskLevel}</p>
        <ul className="mt-2 list-disc list-inside text-xs text-gray-400">
          {route.reasons?.map((r:string,i:number)=> <li key={i}>{r}</li>)}
        </ul>
      </div>
    );
  })}
</div>

{/* Map Content Box */}
      <div className="flex-1 min-h-[450px] relative rounded-2xl overflow-hidden border border-gray-800 shadow-xl bg-dark-900">
        
        <MapContainer 
          center={mapCenter} 
          zoom={14} 
          scrollWheelZoom={true} 
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render Expected Route Polyline */}
          {journeyToUse && journeyToUse.expected_route && journeyToUse.expected_route.length > 0 && (
            <Polyline
              positions={journeyToUse.expected_route}
              color={safetyEvaluation.status === 'green' ? '#10B981' : safetyEvaluation.status === 'amber' ? '#F59E0B' : '#EF4444'}
              weight={5}
              opacity={0.8}
            />
          )}

          {/* Render Traveler location dot */}
          {journeyToUse && latToUse && lngToUse && (
            <Marker position={[latToUse, lngToUse]} icon={icons.traveler}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-gray-900">{isPublicTrack ? "Traveler location" : "You are here"}</p>
                  <p className="text-gray-500 font-mono">{(speedToUse * 3.6).toFixed(1)} km/h</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Render Safe Zones (Police Stations, Hospitals etc) */}
          {safeZones.map((sz, index) => (
            <Marker 
              key={`sz-${index}`} 
              position={[sz.latitude, sz.longitude]}
              icon={sz.type === 'police' ? icons.police : icons.hospital}
            >
              <Popup>
                <div className="text-xs text-gray-900">
                  <p className="font-bold">{sz.name}</p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">{sz.type} Station</p>
                  <p className="mt-1 text-gray-600 font-light">{sz.description}</p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render Unsafe Zones circles and markers */}
          {unsafeZones.map((uz, index) => (
            <React.Fragment key={`uz-${index}`}>
              <Circle
                center={[uz.latitude, uz.longitude]}
                radius={uz.radius || 200}
                pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.15, weight: 1 }}
              />
              <Marker 
                position={[uz.latitude, uz.longitude]}
                icon={icons.unsafe}
              >
                <Popup>
                  <div className="text-xs text-gray-900">
                    <p className="font-bold text-red-600">Risky / Unsafe Area</p>
                    <p className="mt-1 font-light text-gray-700">{uz.description}</p>
                    {uz.cab_plate && <p className="mt-1 text-[10px] font-mono text-gray-500">Cab reported: {uz.cab_plate}</p>}
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

          {/* Render pickup and destination pins */}
          {journeyToUse && (
            <>
              <Marker position={[journeyToUse.pickup_lat, journeyToUse.pickup_lng]} icon={icons.pin}>
                <Popup>
                  <div className="text-xs text-gray-900">
                    <p className="font-bold">Pickup Source</p>
                    <p className="text-gray-500">{journeyToUse.pickup_address}</p>
                  </div>
                </Popup>
              </Marker>
              <Marker position={[journeyToUse.dest_lat, journeyToUse.dest_lng]} icon={icons.pin}>
                <Popup>
                  <div className="text-xs text-gray-900">
                    <p className="font-bold">Destination</p>
                    <p className="text-gray-500">{journeyToUse.dest_address}</p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {/* Adjust Center */}
          <MapController center={mapCenter} />
        </MapContainer>

        {/* Permission Modal */}
        {permissionDenied && (
          <LocationPermissionModal
            onRetry={() => {
              // Force reload to re-request permission
              window.location.reload();
            }}
          />
        )}

        {/* Floating Controls Overlay */}
        {!journeyToUse && (
          <div className="absolute bottom-4 left-4 right-4 bg-dark-900/90 backdrop-blur-md border border-gray-800 p-4 rounded-xl z-[1000] flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-brand-500 animate-spin-slow" />
              <div>
                <p className="text-xs font-bold text-white">Safety Corridor Explorer</p>
                <p className="text-[10px] text-gray-400">Centred on your current location.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/journey-setup')}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-xs transition duration-150 shrink-0"
            >
              Start Journey Monitoring
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default RouteViewPage;
