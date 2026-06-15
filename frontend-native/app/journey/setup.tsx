import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import { api } from '../../utils/api';
import { ArrowLeft, Compass, MapPin, Play } from 'lucide-react-native';

const SIM_PRESETS = [
  {
    name: 'Koramangala ➔ Indiranagar (Standard Commute)',
    pickup_address: 'Koramangala 4th Block, Bengaluru',
    pickup_lat: 12.9352,
    pickup_lng: 77.6245,
    dest_address: 'Indiranagar Double Road, Bengaluru',
    dest_lat: 12.9719,
    dest_lng: 77.6412,
  },
  {
    name: 'HSR Layout ➔ Bellandur (Tech Park route)',
    pickup_address: 'HSR Layout Sector 3, Bengaluru',
    pickup_lat: 12.9141,
    pickup_lng: 77.6411,
    dest_address: 'Bellandur Ecospace, Bengaluru',
    dest_lat: 12.9304,
    dest_lng: 77.6784,
  },
  {
    name: 'HSR Layout ➔ Majestic (Transit Commute)',
    pickup_address: 'HSR Layout Sector 3, Bengaluru',
    pickup_lat: 12.9141,
    pickup_lng: 77.6411,
    dest_address: 'Majestic Metro Station, Bengaluru',
    dest_lat: 12.9779,
    dest_lng: 77.5707,
  },
];

export default function JourneySetupScreen() {
  const router = useRouter();
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
        dest_lng: preset.dest_lng,
      });

      setActiveJourney(res);
      router.push('/journey/active');
    } catch (err: any) {
      setError(err.message || 'Failed to simulate cab booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setError('');

    if (!cabNumber.trim() || !provider || !pickupAddress.trim() || !destAddress.trim()) {
      setError('Please complete all form fields or select a simulated route preset.');
      return;
    }

    setLoading(true);
    try {
      const formattedCab = cabNumber.replace(/\s+/g, '').toUpperCase();
      const res = await api.startJourney({
        cab_number: formattedCab,
        provider,
        pickup_address: pickupAddress.trim(),
        pickup_lat: pickupLat !== '' ? Number(pickupLat) : undefined,
        pickup_lng: pickupLng !== '' ? Number(pickupLng) : undefined,
        dest_address: destAddress.trim(),
        dest_lat: destLat !== '' ? Number(destLat) : undefined,
        dest_lng: destLng !== '' ? Number(destLng) : undefined,
      });

      setActiveJourney(res);
      router.push('/journey/active');
    } catch (err: any) {
      setError(err.message || 'Failed to start journey tracking. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/dashboard')}>
            <ArrowLeft size={16} color="#9ca3af" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Manual Journey Setup</Text>
            <Text style={styles.subtitle}>
              Establish expected path constraints and start invisible shield.
            </Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorAlert}>
            <Text style={styles.errorAlertText}>{error}</Text>
          </View>
        ) : null}

        {/* Quick Booking Simulation */}
        <TouchableOpacity
          style={styles.simulateBtn}
          onPress={handleSimulateCabBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Compass size={18} color="#ffffff" />
              <Text style={styles.simulateBtnText}>Simulate Cab Booking (Auto-Start)</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Presets */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Compass size={16} color="#f43f5e" />
            <Text style={styles.cardTitle}>Quick Simulation Presets</Text>
          </View>
          <Text style={styles.cardDesc}>
            Click a preset route below to pre-populate coordinate geometry matching simulator path lines:
          </Text>

          <View style={styles.presetsGrid}>
            {SIM_PRESETS.map((preset, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.presetBox}
                onPress={() => handleApplyPreset(idx)}
              >
                <Text style={styles.presetName}>{preset.name}</Text>
                <MapPin size={12} color="#fb7185" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <View style={styles.formRow}>
            <View style={[styles.inputGroup, { flex: 1.2 }]}>
              <Text style={styles.label}>Cab Plate Number</Text>
              <TextInput
                style={styles.input}
                placeholder="KA-03-MM-1122"
                placeholderTextColor="#4b5563"
                value={cabNumber}
                onChangeText={setCabNumber}
                autoCapitalize="characters"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Provider</Text>
              <View style={styles.providerPicker}>
                {['uber', 'ola', 'rapido'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.providerOpt,
                      provider === p && styles.providerOptActive,
                    ]}
                    onPress={() => setProvider(p)}
                  >
                    <Text
                      style={[
                        styles.providerText,
                        provider === p && styles.providerTextActive,
                      ]}
                    >
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.inputGroup, { marginTop: 16 }]}>
            <Text style={styles.label}>Pickup Location Address</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Koramangala 4th Block, Bengaluru"
              placeholderTextColor="#4b5563"
              value={pickupAddress}
              onChangeText={setPickupAddress}
            />
          </View>

          <View style={[styles.inputGroup, { marginTop: 16 }]}>
            <Text style={styles.label}>Destination Address</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Indiranagar Double Road, Bengaluru"
              placeholderTextColor="#4b5563"
              value={destAddress}
              onChangeText={setDestAddress}
            />
          </View>

          <TouchableOpacity
            style={[styles.startBtn, loading && styles.startBtnDisabled]}
            onPress={handleStart}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.startBtnText}>Initiate Active Journey Shield</Text>
                <Play size={14} color="#ffffff" fill="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f12',
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
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
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorAlertText: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 16,
  },
  simulateBtn: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#e11d48',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  simulateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'rgba(30, 30, 36, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardDesc: {
    fontSize: 11,
    color: '#9ca3af',
    lineHeight: 15,
    marginBottom: 16,
  },
  presetsGrid: {
    gap: 8,
  },
  presetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 12,
    padding: 12,
  },
  presetName: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: '500',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 12,
  },
  providerPicker: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 12,
    height: 48,
    backgroundColor: '#0f0f12',
    overflow: 'hidden',
  },
  providerOpt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerOptActive: {
    backgroundColor: '#be123c',
  },
  providerText: {
    color: '#6b7280',
    fontSize: 9,
    fontWeight: 'bold',
  },
  providerTextActive: {
    color: '#ffffff',
  },
  startBtn: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#e11d48',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 20,
  },
  startBtnDisabled: {
    backgroundColor: '#1e1e24',
    shadowOpacity: 0,
    elevation: 0,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
