import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import { api } from '../../utils/api';
import { ArrowLeft, ShieldCheck, ShieldAlert, Compass } from 'lucide-react-native';

export default function RouteScreen() {
  const router = useRouter();
  const { activeJourney, currentLat, currentLng, currentSpeed } = useStore();

  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [unsafeZones, setUnsafeZones] = useState<any[]>([]);
  const [safetyEvaluation, setSafetyEvaluation] = useState<any>({
    score: 95,
    status: 'green',
    reason: 'Evaluating route conditions...',
  });
  const [loading, setLoading] = useState(true);

  // Center on Bengaluru central by default
  const defaultCenter = { lat: 12.9716, lng: 77.5946 };
  
  const getMapCenter = () => {
    if (activeJourney && currentLat && currentLng) {
      return { latitude: currentLat, longitude: currentLng };
    }
    if (activeJourney && activeJourney.pickup_lat && activeJourney.pickup_lng) {
      return { latitude: activeJourney.pickup_lat, longitude: activeJourney.pickup_lng };
    }
    return { latitude: defaultCenter.lat, longitude: defaultCenter.lng };
  };

  const mapCenter = getMapCenter();

  // Load safe/unsafe zones and score
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        const sz = await api.getSafeZones();
        setSafeZones(sz);
        const uz = await api.getUnsafeZones();
        setUnsafeZones(uz);
      } catch (err) {
        console.log('Failed to fetch map data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, []);

  // Safety Score evaluation
  useEffect(() => {
    if (activeJourney && activeJourney.expected_route) {
      const evaluateRoute = async () => {
        try {
          const res = await api.evaluateRouteSafety(activeJourney.expected_route);
          setSafetyEvaluation(res);
        } catch (err) {
          console.log('Safety evaluator failed:', err);
        }
      };
      evaluateRoute();
    }
  }, [activeJourney]);

  const polylineCoords = activeJourney?.expected_route
    ? activeJourney.expected_route.map((pt: [number, number]) => ({
        latitude: pt[0],
        longitude: pt[1],
      }))
    : [];

  const getThemeColor = () => {
    if (safetyEvaluation.status === 'green') return '#10b881';
    if (safetyEvaluation.status === 'amber') return '#f59e0b';
    return '#ef4444';
  };

  const getThemeBg = () => {
    if (safetyEvaluation.status === 'green') return 'rgba(16, 185, 129, 0.08)';
    if (safetyEvaluation.status === 'amber') return 'rgba(245, 158, 11, 0.08)';
    return 'rgba(239, 68, 68, 0.08)';
  };

  const getThemeBorder = () => {
    if (safetyEvaluation.status === 'green') return 'rgba(16, 185, 129, 0.2)';
    if (safetyEvaluation.status === 'amber') return 'rgba(245, 158, 11, 0.2)';
    return 'rgba(239, 68, 68, 0.2)';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Row */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={16} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={styles.title}>Route Map Router</Text>
      </View>

      {/* Safety Score Banner */}
      {activeJourney && (
        <View
          style={[
            styles.scoreBanner,
            {
              backgroundColor: getThemeBg(),
              borderColor: getThemeBorder(),
            },
          ]}
        >
          <View
            style={[
              styles.iconBox,
              { backgroundColor: `${getThemeColor()}1a` },
            ]}
          >
            {safetyEvaluation.status === 'green' ? (
              <ShieldCheck size={20} color="#10b881" />
            ) : (
              <ShieldAlert size={20} color={getThemeColor()} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>ROUTE SAFETY SCORE:</Text>
              <Text style={[styles.scoreVal, { color: getThemeColor() }]}>
                {safetyEvaluation.score}/100
              </Text>
            </View>
            <Text style={styles.scoreReason}>{safetyEvaluation.reason}</Text>
          </View>
        </View>
      )}

      {/* Map Element */}
      <View style={styles.mapContainer}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          customMapStyle={darkMapStyle}
          initialRegion={{
            ...mapCenter,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {/* Expected Route Polyline */}
          {activeJourney && polylineCoords.length > 0 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor={getThemeColor()}
              strokeWidth={4}
            />
          )}

          {/* Traveler Location */}
          {activeJourney && currentLat && currentLng && (
            <Marker
              coordinate={{ latitude: currentLat, longitude: currentLng }}
              title="You are here"
              description={`Speed: ${(currentSpeed * 3.6).toFixed(1)} km/h`}
            >
              <View style={styles.travelerDotContainer}>
                <View style={styles.pulseDot} />
                <View style={styles.centerDot} />
              </View>
            </Marker>
          )}

          {/* Safe Zones */}
          {safeZones.map((sz, index) => (
            <Marker
              key={`sz-${index}`}
              coordinate={{ latitude: sz.latitude, longitude: sz.longitude }}
              title={sz.name}
              description={`${sz.type.toUpperCase()} Station - ${sz.description}`}
              pinColor={sz.type === 'police' ? 'green' : 'blue'}
            />
          ))}

          {/* Unsafe Zones */}
          {unsafeZones.map((uz, index) => (
            <React.Fragment key={`uz-${index}`}>
              <Circle
                center={{ latitude: uz.latitude, longitude: uz.longitude }}
                radius={uz.radius || 200}
                strokeColor="#ef4444"
                fillColor="rgba(239, 68, 68, 0.15)"
                strokeWidth={1}
              />
              <Marker
                coordinate={{ latitude: uz.latitude, longitude: uz.longitude }}
                title="Unsafe Area"
                description={uz.description}
                pinColor="red"
              />
            </React.Fragment>
          ))}

          {/* Pickup and Destination */}
          {activeJourney && (
            <>
              <Marker
                coordinate={{
                  latitude: activeJourney.pickup_lat,
                  longitude: activeJourney.pickup_lng,
                }}
                title="Pickup Point"
                description={activeJourney.pickup_address}
                pinColor="indigo"
              />
              <Marker
                coordinate={{
                  latitude: activeJourney.dest_lat,
                  longitude: activeJourney.dest_lng,
                }}
                title="Destination"
                description={activeJourney.dest_address}
                pinColor="violet"
              />
            </>
          )}
        </MapView>

        {/* Floating Explore Info */}
        {!activeJourney && (
          <View style={styles.explorePanel}>
            <View style={styles.exploreLeft}>
              <Compass size={18} color="#f43f5e" />
              <View>
                <Text style={styles.exploreTitle}>Safety Explorer Corridor</Text>
                <Text style={styles.exploreDesc}>
                  Centred on Bangalore. Reviewing community safety vectors.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push('/journey/setup')}
            >
              <Text style={styles.exploreBtnText}>Start Journey</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// Minimal dark map styling schema for react-native-maps
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca53a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3c17a' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f12',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1e1e24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scoreBanner: {
    marginHorizontal: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  scoreVal: {
    fontSize: 12,
    fontWeight: 'black',
  },
  scoreReason: {
    fontSize: 11,
    color: '#d1d5db',
    marginTop: 2,
    lineHeight: 15,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2d2d34',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  travelerDotContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.3)',
  },
  centerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f43f5e',
    borderColor: '#ffffff',
    borderWidth: 1.5,
  },
  explorePanel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(30, 30, 36, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  exploreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  exploreTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  exploreDesc: {
    color: '#9ca3af',
    fontSize: 9,
    marginTop: 2,
  },
  exploreBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e11d48',
    borderRadius: 8,
  },
  exploreBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
