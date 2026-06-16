import React, { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import { api } from '../../utils/api';
import { ShieldAlert, Volume2, VolumeX, Phone, MessageSquare, Send, Check } from 'lucide-react-native';
import { commsProvider, IEmergencyPayload, logNative } from '../../utils/CommunicationProvider';

export default function SOSScreen() {
  const router = useRouter();
  const { user, currentLat, currentLng, activeJourney, resetTelemetryState, setActiveJourney, setEmergencyState } = useStore();

  const [sirenPlaying, setSirenPlaying] = useState(true);
  const [blinkingState, setBlinkingState] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const soundRef = useRef<Audio.Sound | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Communication status tracking
  const [commsState, setCommsState] = useState({
    smsMethod: 'Not Dispatched' as 'Not Dispatched' | 'direct' | 'composer' | 'failed',
    callInitiatedIndex: -1, // -1 means none, 0 = primary, 1 = secondary, etc.
    whatsappOpened: false,
    localNotificationFired: false,
    emergencyTimestamp: '',
  });

  const [steps, setSteps] = useState({
    emergencyActivated: false,
    smsSent: false,
    callInitiated: false,
    liveTrackingActive: false,
    evidenceLocked: false,
  });

  // Call sequence escalation tracking
  const [callEscalationStatus, setCallEscalationStatus] = useState<string>('Ready');

  // Trigger local notification, backend locking, SMS composer and initial call on mount
  useEffect(() => {
    const triggerEmergencyProtocol = async () => {
      setLoading(true);
      try {
        logNative('SOS_TRIGGER_HANDLER_STARTED', 'SOS Trigger activated. Initializing emergency protocol.');

        // 1. Get contacts
        let cont: any[] = [];
        try {
          cont = await api.getContacts();
          setContacts(cont);
        } catch (e) {
          logNative('SOS_TRIGGER_HANDLER_ERROR', 'Failed to load contacts for emergency payload', { error: e });
        }

        // 2. Trigger backend locking & coordinate stream setup
        const res = await api.triggerSos();
        logNative('SOS_TRIGGER_HANDLER_SUCCESS', 'Backend emergency lock state achieved', { success: res.success });
        const active = await api.getActiveJourney();
        if (active) {
          setActiveJourney(active);
        }
        setEmergencyState(true);

        const timestampStr = new Date().toLocaleTimeString() + ' (Local)';

        // 3. Compile payload
        const payload: IEmergencyPayload = {
          userName: user?.name || 'FEMME Traveler',
          latitude: currentLat || 12.9716,
          longitude: currentLng || 77.5946,
          cabNumber: activeJourney?.cab_number || 'EMERGENCY_SOS',
          provider: activeJourney?.provider || 'adhoc',
          pickupAddress: activeJourney?.pickup_address || 'SOS Trigger Point',
          destAddress: activeJourney?.dest_address || 'Emergency Safehouse',
          timestamp: new Date().toISOString(),
          status: 'emergency',
        };

        // 4. Trigger Local Notification Alert
        const localNotif = await commsProvider.triggerLocalAlert(payload.userName);

        setSteps({
          emergencyActivated: res.success ? true : false,
          smsSent: false,
          callInitiated: false,
          liveTrackingActive: true,
          evidenceLocked: true,
        });

        setCommsState((prev) => ({
          ...prev,
          localNotificationFired: localNotif,
          emergencyTimestamp: timestampStr,
        }));

        // 5. Auto-Launch SMS Composer for all guardians
        if (cont.length > 0) {
          const phones = cont.map((c) => c.phone);
          const smsRes = await commsProvider.dispatchSmsToGuardians(phones, payload);
          setCommsState((prev) => ({
            ...prev,
            smsMethod: smsRes.method as 'direct' | 'composer' | 'failed',
          }));
          setSteps((prev) => ({
            ...prev,
            smsSent: smsRes.success,
          }));
        }

        // 6. Auto-Initiate Native Dialing for Primary Guardian
        if (cont.length > 0 && cont[0]?.phone) {
          setCallEscalationStatus(`Calling Primary: ${cont[0].name}...`);
          const callRes = await commsProvider.initiateCall(cont[0].phone);
          setCommsState((prev) => ({
            ...prev,
            callInitiatedIndex: 0,
          }));
          setSteps((prev) => ({
            ...prev,
            callInitiated: callRes,
          }));
        }
      } catch (err) {
        console.error('[SOS] active page trigger error:', err);
      } finally {
        setLoading(false);
      }
    };

    triggerEmergencyProtocol();
  }, []);

  // Listen for App State Changes to handle Dialing Escalation when user returns to app
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: any) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[SOS] App has returned to the foreground. Checking call escalation status...');
        // If primary call was initiated and we have a secondary guardian, offer to call them if unanswered
        if (commsState.callInitiatedIndex === 0 && contacts.length > 1) {
          Alert.alert(
            'Primary Guardian Unanswered?',
            `Did ${contacts[0].name} answer the call? If not, dial secondary guardian immediately.`,
            [
              { text: 'Yes, Answered', style: 'cancel' },
              {
                text: `Call Secondary: ${contacts[1].name}`,
                onPress: async () => {
                  setCallEscalationStatus(`Calling Secondary: ${contacts[1].name}...`);
                  const callRes = await commsProvider.initiateCall(contacts[1].phone);
                  setCommsState((prev) => ({
                    ...prev,
                    callInitiatedIndex: 1,
                  }));
                  setSteps((prev) => ({
                    ...prev,
                    callInitiated: callRes,
                  }));
                },
              },
            ]
          );
        } else if (commsState.callInitiatedIndex === 1 && contacts.length > 2) {
          Alert.alert(
            'Secondary Guardian Unanswered?',
            `Did ${contacts[1].name} answer the call? If not, dial tertiary guardian.`,
            [
              { text: 'Yes, Answered', style: 'cancel' },
              {
                text: `Call Tertiary: ${contacts[2].name}`,
                onPress: async () => {
                  setCallEscalationStatus(`Calling Tertiary: ${contacts[2].name}...`);
                  const callRes = await commsProvider.initiateCall(contacts[2].phone);
                  setCommsState((prev) => ({
                    ...prev,
                    callInitiatedIndex: 2,
                  }));
                  setSteps((prev) => ({
                    ...prev,
                    callInitiated: callRes,
                  }));
                },
              },
            ]
          );
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [commsState, contacts]);

  // Visual wailing blink effect
  useEffect(() => {
    const flashTimer = setInterval(() => {
      setBlinkingState((prev) => !prev);
    }, 400);
    return () => clearInterval(flashTimer);
  }, []);

  // Siren audio load
  useEffect(() => {
    const loadSiren = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/siren.mp3'),
          {
            shouldPlay: true,
            isLooping: true,
            volume: 1.0,
          }
        );
        soundRef.current = sound;
      } catch (err) {
        console.error('[SOS] Siren load error:', err);
      }
    };
    loadSiren();
    return () => {
      soundRef.current?.unloadAsync();
    };
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
              if (soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
              }
              await api.completeJourney();
              setActiveJourney(null);
              setEmergencyState(false);
              resetTelemetryState();
              setSirenPlaying(false);
              Alert.alert('Emergency Resolved', 'Emergency resolved. Guardians notified of safety.');
              router.replace('/(tabs)/dashboard');
            } catch (err) {
              console.error(err);
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

  // Explicit dispatch actions for Guardian panel
  const dispatchManualSms = async () => {
    if (contacts.length === 0) {
      Alert.alert('No Contacts', 'Add trusted contacts first to send emergency SMS.');
      return;
    }
    const payload: IEmergencyPayload = {
      userName: user?.name || 'FEMME Traveler',
      latitude: currentLat || 12.9716,
      longitude: currentLng || 77.5946,
      cabNumber: activeJourney?.cab_number || 'EMERGENCY_SOS',
      provider: activeJourney?.provider || 'adhoc',
      pickupAddress: activeJourney?.pickup_address || 'SOS Trigger Point',
      destAddress: activeJourney?.dest_address || 'Emergency Safehouse',
      timestamp: new Date().toISOString(),
      status: 'emergency',
    };
    const phones = contacts.map((c) => c.phone);
    const smsRes = await commsProvider.dispatchSmsToGuardians(phones, payload);
    setCommsState((prev) => ({
      ...prev,
      smsMethod: smsRes.method as 'direct' | 'composer' | 'failed',
    }));
    setSteps((prev) => ({
      ...prev,
      smsSent: smsRes.success,
    }));
  };

  const dispatchManualCall = async (phone: string, name: string, index: number) => {
    setCallEscalationStatus(`Calling: ${name}...`);
    const callRes = await commsProvider.initiateCall(phone);
    setCommsState((prev) => ({
      ...prev,
      callInitiatedIndex: index,
    }));
    setSteps((prev) => ({
      ...prev,
      callInitiated: callRes,
    }));
  };

  const dispatchManualWhatsApp = async () => {
    if (contacts.length === 0) {
      Alert.alert('No Contacts', 'Add trusted contacts first to send WhatsApp alert.');
      return;
    }
    const payload: IEmergencyPayload = {
      userName: user?.name || 'FEMME Traveler',
      latitude: currentLat || 12.9716,
      longitude: currentLng || 77.5946,
      cabNumber: activeJourney?.cab_number || 'EMERGENCY_SOS',
      provider: activeJourney?.provider || 'adhoc',
      pickupAddress: activeJourney?.pickup_address || 'SOS Trigger Point',
      destAddress: activeJourney?.dest_address || 'Emergency Safehouse',
      timestamp: new Date().toISOString(),
      status: 'emergency',
    };
    // Send to primary contact first, or open general WhatsApp share
    const primaryPhone = contacts[0]?.phone || '';
    const wsRes = await commsProvider.dispatchWhatsApp(primaryPhone, payload);
    setCommsState((prev) => ({
      ...prev,
      whatsappOpened: wsRes,
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Blinking alarm container */}
        <View
          style={[
            styles.wailingBorder,
            blinkingState ? styles.borderRed : styles.borderGray,
          ]}
        >
          <View style={styles.sosLogo}>
            <ShieldAlert size={40} color="#ffffff" />
          </View>
          <Text style={styles.title}>EMERGENCY SOS ACTIVE</Text>
          <Text style={styles.subtitle}>
            Native Android Safety Protocol Initiated
          </Text>
        </View>

        {/* Local Checklists */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Emergency Checklist Status</Text>
          
          <View style={styles.checklist}>
            {[
              { key: 'emergencyActivated', text: 'Emergency Triggered on Backend' },
              { key: 'smsSent', text: commsState.smsMethod === 'composer' ? 'SMS Composer Prefilled' : (steps.smsSent ? 'SMS Dispatched' : 'SMS Composer Ready') },
              { key: 'callInitiated', text: commsState.callInitiatedIndex !== -1 ? `Dialing Guardian #${commsState.callInitiatedIndex + 1}` : 'Call Dialing Ready' },
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

          {commsState.emergencyTimestamp ? (
            <View style={styles.timestampBox}>
              <Text style={styles.timestampLabel}>EMERGENCY TIMESTAMP:</Text>
              <Text style={styles.timestampVal}>{commsState.emergencyTimestamp}</Text>
            </View>
          ) : null}
        </View>

        {/* Siren sound control toggle */}
        <TouchableOpacity
          style={[
            styles.sirenBtn,
            sirenPlaying ? styles.sirenActive : styles.sirenSilenced,
          ]}
          onPress={async () => {
            if (!soundRef.current) return;
            if (sirenPlaying) {
              await soundRef.current.pauseAsync();
            } else {
              await soundRef.current.playAsync();
            }
            setSirenPlaying(!sirenPlaying);
          }}
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

        {/* Guardian Escalation & One-Touch Panel */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Guardian Panel & Call Escalation</Text>
          <Text style={styles.panelStatus}>Escalation State: <Text style={styles.escalationVal}>{callEscalationStatus}</Text></Text>

          {contacts.map((c, i) => (
            <View key={c.id || i} style={styles.guardianPanelItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.guardianName}>{c.name}</Text>
                <Text style={styles.guardianPriority}>Guardian #{i + 1} ({c.phone})</Text>
              </View>
              
              <View style={styles.btnRow}>
                <TouchableOpacity 
                  style={[styles.smallActionBtn, commsState.callInitiatedIndex === i && styles.smallActionBtnActive]} 
                  onPress={() => dispatchManualCall(c.phone, c.name, i)}
                >
                  <Phone size={14} color={commsState.callInitiatedIndex === i ? '#ffffff' : '#f43f5e'} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {contacts.length === 0 ? (
            <Text style={styles.emptyContactsText}>
              No priority guardians configured.
            </Text>
          ) : (
            <View style={styles.mainCallBtnContainer}>
              <TouchableOpacity 
                style={styles.largeCallBtn} 
                onPress={() => {
                  const targetIndex = commsState.callInitiatedIndex === -1 ? 0 : (commsState.callInitiatedIndex >= contacts.length - 1 ? 0 : commsState.callInitiatedIndex + 1);
                  const target = contacts[targetIndex];
                  if (target) {
                    dispatchManualCall(target.phone, target.name, targetIndex);
                  }
                }}
              >
                <Phone size={24} color="#ffffff" />
                <Text style={styles.largeCallText}>CALL GUARDIAN NOW</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Communication Triggers */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Manual App Dispatchers</Text>
          <View style={styles.splitRow}>
            <TouchableOpacity style={styles.quickDispatchBtn} onPress={dispatchManualSms}>
              <Send size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.quickDispatchText}>Resend SMS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickDispatchBtn, { backgroundColor: '#25D366' }]} onPress={dispatchManualWhatsApp}>
              <MessageSquare size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.quickDispatchText}>WhatsApp Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Coordinate Display */}
        <View style={styles.card}>
          <View style={styles.coordsHeader}>
            <Text style={styles.coordsTitle}>Active Coordinate Stream:</Text>
            <View style={styles.redDotPing} />
          </View>
          <View style={styles.coordsMonospace}>
            <Text style={styles.monoText}>
              Latitude: {activeJourney?.current_lat?.toFixed(5) || currentLat?.toFixed(5) || '12.97160'}
            </Text>
            <Text style={styles.monoText}>
              Longitude: {activeJourney?.current_lng?.toFixed(5) || currentLng?.toFixed(5) || '77.59460'}
            </Text>
            <Text style={styles.monoText}>
              Cab Plate: {activeJourney?.cab_number?.toUpperCase() || 'EMERGENCY_SOS'}
            </Text>
          </View>
        </View>

        {/* Safe status confirm de-escalate button */}
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
  panelStatus: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 12,
  },
  escalationVal: {
    color: '#f43f5e',
    fontWeight: 'bold',
  },
  guardianPanelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e24',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  guardianPriority: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallActionBtnActive: {
    backgroundColor: '#f43f5e',
    borderColor: '#f43f5e',
  },
  mainCallBtnContainer: {
    marginTop: 12,
    alignItems: 'center',
    width: '100%',
  },
  largeCallBtn: {
    width: '100%',
    height: 54,
    backgroundColor: '#ef4444',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  largeCallText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  splitRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  quickDispatchBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDispatchText: {
    color: '#ffffff',
    fontSize: 12,
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
  guardianName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
