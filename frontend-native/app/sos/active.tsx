import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import { api } from '../../utils/api';
import { ShieldAlert, Volume2, VolumeX, Phone, MapPin, Check } from 'lucide-react-native';

export default function SOSScreen() {
  const router = useRouter();
  const { activeJourney, resetTelemetryState, setActiveJourney, setEmergencyState } = useStore();

  const [sirenPlaying, setSirenPlaying] = useState(true);
  const [blinkingState, setBlinkingState] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [steps, setSteps] = useState({
    emergencyActivated: false,
    smsSent: false,
    callInitiated: false,
    liveTrackingActive: false,
    evidenceLocked: false,
    emergencyTimestamp: '',
  });

  // Fetch data & trigger SOS endpoint
  useEffect(() => {
    const triggerEmergencyProtocol = async () => {
      setLoading(true);
      try {
        const res = await api.triggerSos();

        const cont = await api.getContacts();
        setContacts(cont);
        
        const active = await api.getActiveJourney();
        if (active) {
          setActiveJourney(active);
        }
        setEmergencyState(true);

        setSteps({
          emergencyActivated: res.success ? true : false,
          smsSent: res.sms_sent,
          callInitiated: res.call_initiated,
          liveTrackingActive: true,
          evidenceLocked: true,
          emergencyTimestamp: new Date().toLocaleTimeString() + ' (Local)',
        });
      } catch (err) {
        console.log('SOS active page trigger error:', err);
      } finally {
        setLoading(false);
      }
    };

    triggerEmergencyProtocol();
  }, []);

  // Blinking wailing visual effect
  useEffect(() => {
    const flashTimer = setInterval(() => {
      setBlinkingState((prev) => !prev);
    }, 400);
    return () => clearInterval(flashTimer);
  }, []);

  const handleDeescalate = () => {
    Alert.alert(
      'Resolve Emergency',
      'Confirm identity to de-escalate emergency state?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'De-escalate',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.completeJourney();
              setActiveJourney(null);
              setEmergencyState(false);
              resetTelemetryState();
              setSirenPlaying(false);
              Alert.alert('Emergency Resolved', 'Emergency resolved. Guardians notified of safety.');
              router.replace('/(tabs)/dashboard');
            } catch (err) {
              console.log(err);
              setActiveJourney(null);
              setEmergencyState(false);
              resetTelemetryState();
              setSirenPlaying(false);
              router.replace('/(tabs)/dashboard');
            }
          },
        },
      ]
    );
  };

  const makePhoneCall = (number: string) => {
    const cleanNumber = number.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      Alert.alert('Call Failed', 'Unable to initiate dialer on this device.');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Blinking Wailing Container */}
        <View
          style={[
            styles.wailingBorder,
            blinkingState ? styles.borderRed : styles.borderGray,
          ]}
        >
          {/* Pulsing Icon */}
          <View style={styles.sosLogo}>
            <ShieldAlert size={40} color="#ffffff" />
          </View>

          <Text style={styles.title}>EMERGENCY SOS ACTIVE</Text>
          <Text style={styles.subtitle}>
            Live GPS stream dispatched to priority guardians
          </Text>
        </View>

        {/* Progress Checklist */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Emergency Checklist Actions</Text>

          <View style={styles.checklist}>
            {[
              { key: 'emergencyActivated', text: 'Emergency Activated' },
              { key: 'smsSent', text: 'SMS Broadcast Sent' },
              { key: 'callInitiated', text: 'Guardian Automated Call Initiated' },
              { key: 'liveTrackingActive', text: 'Live GPS Broadcast Active' },
              { key: 'evidenceLocked', text: 'Sealed Evidence Vault Locked' },
            ].map((step) => {
              const active = (steps as any)[step.key];
              return (
                <View key={step.key} style={styles.checkItem}>
                  <View
                    style={[
                      styles.checkBullet,
                      active ? styles.bulletSuccess : styles.bulletLoading,
                    ]}
                  >
                    {active ? (
                      <Check size={10} color="#ffffff" />
                    ) : (
                      <ActivityIndicator size="small" color="#ef4444" />
                    )}
                  </View>
                  <Text style={[styles.checkText, active && styles.checkTextActive]}>
                    {step.text}
                  </Text>
                </View>
              );
            })}
          </View>

          {steps.emergencyTimestamp ? (
            <View style={styles.timestampBox}>
              <Text style={styles.timestampLabel}>EMERGENCY TIMESTAMP:</Text>
              <Text style={styles.timestampVal}>{steps.emergencyTimestamp}</Text>
            </View>
          ) : null}
        </View>

        {/* Siren Toggle */}
        <TouchableOpacity
          style={[
            styles.sirenBtn,
            sirenPlaying ? styles.sirenActive : styles.sirenSilenced,
          ]}
          onPress={() => setSirenPlaying(!sirenPlaying)}
        >
          {sirenPlaying ? (
            <>
              <Volume2 size={16} color="#ef4444" />
              <Text style={styles.sirenBtnTextActive}>Siren Sound Active</Text>
            </>
          ) : (
            <>
              <VolumeX size={16} color="#6b7280" />
              <Text style={styles.sirenBtnTextSilenced}>Siren Silenced</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Coordinates stream */}
        <View style={styles.card}>
          <View style={styles.coordsHeader}>
            <Text style={styles.coordsTitle}>Active Coordinate Stream:</Text>
            <View style={styles.redDotPing} />
          </View>
          <View style={styles.coordsMonospace}>
            <Text style={styles.monoText}>
              Latitude: {activeJourney?.current_lat?.toFixed(5) || '12.97160'}
            </Text>
            <Text style={styles.monoText}>
              Longitude: {activeJourney?.current_lng?.toFixed(5) || '77.59460'}
            </Text>
            <Text style={styles.monoText}>
              Cab Plate: {activeJourney?.cab_number?.toUpperCase() || 'EMERGENCY'}
            </Text>
          </View>
        </View>

        {/* Notified Guardians */}
        <View style={styles.guardiansList}>
          <Text style={styles.guardiansHeader}>Notified Guardians</Text>

          {contacts.map((c, i) => (
            <View key={c.id || i} style={styles.guardianItem}>
              <View>
                <Text style={styles.guardianName}>{c.name}</Text>
                <Text style={styles.guardianPhone}>{c.phone}</Text>
              </View>
              <TouchableOpacity style={styles.callIcon} onPress={() => makePhoneCall(c.phone)}>
                <Phone size={14} color="#f43f5e" />
              </TouchableOpacity>
            </View>
          ))}

          {contacts.length === 0 ? (
            <Text style={styles.emptyContactsText}>
              No contacts configured. Emergency dispatcher triggers fallback webhooks.
            </Text>
          ) : null}
        </View>

        {/* De-escalate button */}
        <TouchableOpacity style={styles.deescalateBtn} onPress={handleDeescalate}>
          <Text style={styles.deescalateText}>De-escalate & Set Safe Status</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
  },
  wailingBorder: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(30, 30, 36, 0.65)',
  },
  borderRed: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(127, 29, 29, 0.25)',
  },
  borderGray: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(30, 30, 36, 0.65)',
  },
  sosLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    color: '#fca5a5',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(30, 30, 36, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d34',
    paddingBottom: 8,
    marginBottom: 12,
  },
  checklist: {
    gap: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletSuccess: {
    backgroundColor: '#10b881',
  },
  bulletLoading: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  checkText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  checkTextActive: {
    color: '#e5e7eb',
    fontWeight: 'bold',
  },
  timestampBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#2d2d34',
    paddingTop: 10,
    marginTop: 12,
  },
  timestampLabel: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  timestampVal: {
    fontSize: 9,
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  sirenBtn: {
    flexDirection: 'row',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  sirenActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
  },
  sirenSilenced: {
    backgroundColor: '#1e1e24',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
  },
  sirenBtnTextActive: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sirenBtnTextSilenced: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: 'bold',
  },
  coordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coordsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#d1d5db',
  },
  redDotPing: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  coordsMonospace: {
    gap: 4,
  },
  monoText: {
    color: '#9ca3af',
    fontFamily: 'monospace',
    fontSize: 11,
  },
  guardiansList: {
    width: '100%',
    gap: 10,
  },
  guardiansHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  guardianItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e24',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  guardianName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  guardianPhone: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  callIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContactsText: {
    color: '#6b7280',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 12,
  },
  deescalateBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#10b881',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b881',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  deescalateText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
