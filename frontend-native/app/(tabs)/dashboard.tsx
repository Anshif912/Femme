import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import { api } from '../../utils/api';
import {
  Shield,
  Play,
  AlertTriangle,
  Activity,
  Trash2,
  Zap,
  Navigation,
  UserCheck,
  Volume2,
} from 'lucide-react-native';

export default function DashboardScreen() {
  console.log('[DashboardScreen] Rendering dashboard...');
  const router = useRouter();
  const {
    user,
    activeJourney,
    isEmergency,
    currentSpeed,
    routeDeviation,
    motionAnomaly,
    audioAnomaly,
    setActiveJourney,
    resetTelemetryState,
    setEmergencyState,
    setDemoRunning,
    setDemoStep,
  } = useStore();

  const [notificationText, setNotificationText] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simSuccess, setSimSuccess] = useState('');
  const [simError, setSimError] = useState('');
  const [historyCount, setHistoryCount] = useState(0);
  const [contactsCount, setContactsCount] = useState(0);

  // Fetch dashboard counts and active journey state
  const fetchStats = async () => {
    try {
      const hist = await api.getHistory();
      setHistoryCount(hist.length);
      const cont = await api.getContacts();
      setContactsCount(cont.length);

      const active = await api.getActiveJourney();
      if (active) {
        setActiveJourney(active);
      } else {
        setActiveJourney(null);
      }
    } catch (err) {
      console.log('Failed to fetch dashboard stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSimulateNotification = async (payloadText: string) => {
    if (!payloadText.trim()) return;
    setSimLoading(true);
    setSimSuccess('');
    setSimError('');
    try {
      const res = await api.triggerNotificationSim(payloadText);
      setSimSuccess(res.message);
      if (res.journey) {
        setActiveJourney(res.journey);
      }
      setTimeout(() => {
        router.push('/journey/active');
      }, 1500);
    } catch (err: any) {
      setSimError(err.message || 'Simulation failed to parse text');
    } finally {
      setSimLoading(false);
    }
  };

  const handleRunFullScenario = async () => {
    console.log('[Demo] Starting full safety scenario simulation...');
    setSimLoading(true);
    setSimSuccess('');
    setSimError('');
    
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const mockCab = `KA03MM${randomDigits}`;
    const mockProvider = 'uber';
    const pickup_address = 'Koramangala 4th Block, Bengaluru';
    const pickup_lat = 12.9352;
    const pickup_lng = 77.6245;
    const dest_address = 'Indiranagar Double Road, Bengaluru';
    const dest_lat = 12.9719;
    const dest_lng = 77.6412;

    try {
      const res = await api.startJourney({
        cab_number: mockCab,
        provider: mockProvider,
        pickup_address,
        pickup_lat,
        pickup_lng,
        dest_address,
        dest_lat,
        dest_lng,
      });

      setActiveJourney(res);
      setDemoRunning(true);
      setDemoStep(1);
      console.log('[Demo] Journey started. Redirecting to active route monitoring...');
      router.push('/journey/active');
    } catch (err: any) {
      setSimError(err.message || 'Failed to start demo journey.');
      console.log('[Demo] Start error:', err);
    } finally {
      setSimLoading(false);
    }
  };

  const handleQuickSOS = async () => {
    console.log('[SOS] Quick SOS triggered immediately.');
    setEmergencyState(true);
    try {
      await api.triggerSos();
    } catch (err) {
      console.log('[SOS] Trigger error:', err);
    }
    router.push('/sos/active');
  };

  const handleCancelActive = () => {
    Alert.alert(
      'Cancel Journey',
      'Cancel current journey monitoring? Evidence capsules will not be locked unless SOS occurred.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Monitoring',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelJourney();
              setActiveJourney(null);
              resetTelemetryState();
            } catch (err) {
              console.log(err);
            }
          },
        },
      ]
    );
  };

  const handleCompleteActive = async () => {
    try {
      await api.completeJourney();
      setActiveJourney(null);
      resetTelemetryState();
      Alert.alert('Arrived Safely', 'Journey marked completed. Safe arrival notifications sent!');
    } catch (err) {
      console.log(err);
    }
  };

  const templates = [
    {
      title: 'Uber Intercept',
      text: 'Your Uber ride is arriving: KA-03-MM-1122, Driver: Ramesh. Pickup: Koramangala. Destination: Indiranagar.',
    },
    {
      title: 'Ola Intercept',
      text: 'Ola booking CRN 1238910 is confirmed. Driver Kumar in white Dzire KA-05-XY-9988. Pickup: HSR Layout. Destination: Bellandur.',
    },
    {
      title: 'Rapido Intercept',
      text: 'Rapido Captain Rajesh (KA-02-AB-3456) is arriving at HSR Layout for your ride to Majestic.',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome, {user?.name || 'Traveler'}</Text>
            <Text style={styles.subtitleText}>Your passive safety companion is active.</Text>
          </View>

          {activeJourney ? (
            <View style={[styles.statusBadge, styles.statusActive]}>
              <View style={[styles.statusIndicator, styles.indicatorActive]} />
              <Text style={styles.statusTextActive}>ACTIVE</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusSecured]}>
              <View style={[styles.statusIndicator, styles.indicatorSecured]} />
              <Text style={styles.statusTextSecured}>SECURED</Text>
            </View>
          )}
        </View>

        {/* Emergency Mode Banner */}
        {isEmergency && (
          <TouchableOpacity
            style={styles.emergencyBanner}
            onPress={() => router.push('/sos/active')}
          >
            <View style={styles.emergencyLeft}>
              <View style={styles.emergencyIconContainer}>
                <AlertTriangle size={20} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.emergencyTitle}>Emergency Mode Active!</Text>
                <Text style={styles.emergencySubtitle}>Broadcasting live GPS coordinate.</Text>
              </View>
            </View>
            <Play size={16} color="#f87171" style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>
        )}

        {/* Telemetry Stream or Journey Setup */}
        {activeJourney ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardCategory}>Telemetry Stream</Text>
                <Text style={styles.cardTitle}>Passive AI Monitoring</Text>
              </View>
              <View style={styles.cardHeaderRight}>
                <Activity size={14} color="#f43f5e" style={styles.pulseIcon} />
                <Text style={styles.timeText}>Every 30s</Text>
              </View>
            </View>

            {/* Grid of indicators */}
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>Speed</Text>
                <Text style={styles.telemetryValue}>
                  {(currentSpeed * 3.6).toFixed(1)}{' '}
                  <Text style={styles.telemetryUnit}>km/h</Text>
                </Text>
              </View>

              <View
                style={[
                  styles.telemetryItem,
                  routeDeviation && styles.telemetryItemDanger,
                ]}
              >
                <Text style={styles.telemetryLabel}>Route Deviation</Text>
                <Text
                  style={[
                    styles.telemetryStatusText,
                    routeDeviation ? styles.textDanger : styles.textSuccess,
                  ]}
                >
                  {routeDeviation ? 'OFF ROUTE' : 'ON ROUTE'}
                </Text>
              </View>

              <View
                style={[
                  styles.telemetryItem,
                  motionAnomaly && styles.telemetryItemDanger,
                ]}
              >
                <Text style={styles.telemetryLabel}>Unusual Stops</Text>
                <Text
                  style={[
                    styles.telemetryStatusText,
                    motionAnomaly ? styles.textDanger : styles.textSuccess,
                  ]}
                >
                  {motionAnomaly ? 'ANOMALOUS' : 'NORMAL'}
                </Text>
              </View>

              <View
                style={[
                  styles.telemetryItem,
                  audioAnomaly && styles.telemetryItemDanger,
                ]}
              >
                <Text style={styles.telemetryLabel}>Voice Distress</Text>
                <Text
                  style={[
                    styles.telemetryStatusText,
                    audioAnomaly ? styles.textDanger : styles.textSuccess,
                  ]}
                >
                  {audioAnomaly ? 'ALERT' : 'QUIET'}
                </Text>
              </View>
            </View>

            {/* Cab Details */}
            <View style={styles.metadataBox}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Cab details:</Text>
                <Text style={styles.metaValue}>
                  {activeJourney.provider.toUpperCase()} - {activeJourney.cab_number.toUpperCase()}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Destination:</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {activeJourney.dest_address}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelActive}>
                <Trash2 size={16} color="#9ca3af" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.completeButton} onPress={handleCompleteActive}>
                <Text style={styles.completeButtonText}>Arrived Safely</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.card, styles.setupPromoCard]}>
            <View style={styles.promoLogo}>
              <Shield size={64} color="rgba(244, 63, 94, 0.08)" />
            </View>
            <Text style={styles.cardCategory}>Passive Shield Protection</Text>
            <Text style={styles.cardTitle}>Start Journey Monitoring</Text>
            <Text style={styles.promoDesc}>
              Register your ride or parse ride receipts to activate background telemetry and de-escalation logic.
            </Text>
            <View style={styles.promoButtonsRow}>
              <TouchableOpacity
                style={styles.setupButton}
                onPress={() => router.push('/journey/setup')}
              >
                <Play size={14} color="#ffffff" fill="#ffffff" />
                <Text style={styles.setupButtonText}>Configure Journey</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.demoScenarioButton}
                onPress={handleRunFullScenario}
              >
                <Zap size={14} color="#ffffff" fill="#ffffff" />
                <Text style={styles.demoScenarioButtonText}>Run Demo Scenario</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SOS Panel */}
        <TouchableOpacity style={styles.sosButton} onPress={handleQuickSOS}>
          <View style={styles.sosIconContainer}>
            <Zap size={24} color="#ffffff" fill="#ffffff" />
          </View>
          <Text style={styles.sosButtonText}>ONE-TAP EMERGENCY SOS</Text>
        </TouchableOpacity>

        {/* Simulation Widget */}
        <View style={styles.card}>
          <Text style={styles.cardCategory}>Simulation Center</Text>
          <Text style={styles.cardTitle}>Notification Interception</Text>
          <Text style={styles.cardDesc}>
            Simulate intercepting ride dispatch messages from Uber, Ola, or Rapido apps.
          </Text>

          {simSuccess ? (
            <View style={styles.simSuccessAlert}>
              <Text style={styles.simSuccessText}>{simSuccess}</Text>
            </View>
          ) : null}

          {simError ? (
            <View style={styles.simErrorAlert}>
              <Text style={styles.simErrorText}>{simError}</Text>
            </View>
          ) : null}

          {/* Templates */}
          <View style={styles.templatesContainer}>
            {templates.map((tpl, i) => (
              <TouchableOpacity
                key={i}
                style={styles.templateBox}
                onPress={() => {
                  setNotificationText(tpl.text);
                  handleSimulateNotification(tpl.text);
                }}
              >
                <View style={styles.templateHeader}>
                  <Navigation size={12} color="#f43f5e" />
                  <Text style={styles.templateTitle}>{tpl.title}</Text>
                </View>
                <Text style={styles.templatePreview} numberOfLines={1}>
                  {tpl.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customSimForm}>
            <TextInput
              style={styles.simInput}
              placeholder="Paste custom notification text here..."
              placeholderTextColor="#4b5563"
              multiline
              numberOfLines={2}
              value={notificationText}
              onChangeText={setNotificationText}
            />
            <TouchableOpacity
              style={[styles.simButton, (!notificationText.trim() || simLoading) && styles.simButtonDisabled]}
              onPress={() => handleSimulateNotification(notificationText)}
              disabled={!notificationText.trim() || simLoading}
            >
              {simLoading ? (
                <ActivityIndicator size="small" color="#9ca3af" />
              ) : (
                <Text style={styles.simButtonText}>Simulate Custom Intercept</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.card}>
          <Text style={styles.cardCategory}>Safety Log Overview</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Commutes</Text>
              <Text style={styles.statVal}>{historyCount}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Guardians</Text>
              <Text style={styles.statVal}>{contactsCount}</Text>
            </View>
          </View>

          <View style={styles.statsShortcuts}>
            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => router.push('/(tabs)/contacts')}
            >
              <UserCheck size={14} color="#9ca3af" />
              <Text style={styles.shortcutBtnText}>Manage Trusted Contacts</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Guardians Description */}
        <View style={[styles.card, styles.passiveGuardianDetails]}>
          <Text style={styles.cardCategory}>Active Guardians Details</Text>
          <View style={styles.guardianInfoRow}>
            <Volume2 size={16} color="#10b881" style={styles.guardianInfoIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.guardianInfoTitle}>Privacy-First Audio Distress</Text>
              <Text style={styles.guardianInfoDesc}>
                Distress scream logs processed locally on-device. No audio recorded.
              </Text>
            </View>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  subtitleText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderWidth: 1,
  },
  statusSecured: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  indicatorActive: {
    backgroundColor: '#f43f5e',
  },
  indicatorSecured: {
    backgroundColor: '#10b881',
  },
  statusTextActive: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fb7185',
  },
  statusTextSecured: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#34d399',
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 16,
    padding: 16,
  },
  emergencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emergencyIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emergencySubtitle: {
    color: '#fca5a5',
    fontSize: 11,
    marginTop: 1,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fb7185',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseIcon: {
    // animated styling handled on web, static icon for basic native
  },
  timeText: {
    fontSize: 10,
    color: '#9ca3af',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  telemetryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  telemetryItemDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  telemetryLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  telemetryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  telemetryUnit: {
    fontSize: 10,
    fontWeight: '300',
    color: '#9ca3af',
  },
  telemetryStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  textDanger: {
    color: '#ef4444',
  },
  textSuccess: {
    color: '#10b881',
  },
  metadataBox: {
    backgroundColor: 'rgba(15, 15, 18, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  metaValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
    maxWidth: '70%',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    backgroundColor: '#1e1e24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelButtonText: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: 'bold',
  },
  completeButton: {
    flex: 1.5,
    height: 44,
    backgroundColor: '#10b881',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  setupPromoCard: {
    backgroundColor: 'rgba(30, 30, 36, 0.8)',
    alignItems: 'flex-start',
    position: 'relative',
    overflow: 'hidden',
  },
  promoLogo: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  promoDesc: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
    marginBottom: 16,
    marginTop: 4,
  },
  setupButton: {
    flexDirection: 'row',
    height: 44,
    backgroundColor: '#e11d48',
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  setupButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sosButton: {
    height: 64,
    backgroundColor: '#be123c',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  sosIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 16,
  },
  simSuccessAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  simSuccessText: {
    color: '#34d399',
    fontSize: 11,
  },
  simErrorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  simErrorText: {
    color: '#fca5a5',
    fontSize: 11,
  },
  templatesContainer: {
    gap: 8,
    marginBottom: 16,
  },
  templateBox: {
    backgroundColor: 'rgba(15, 15, 18, 0.6)',
    borderColor: '#2d2d34',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  templateTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fb7185',
  },
  templatePreview: {
    fontSize: 10,
    color: '#6b7280',
  },
  customSimForm: {
    gap: 10,
  },
  simInput: {
    backgroundColor: '#0f0f12',
    borderColor: '#2d2d34',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    color: '#ffffff',
    fontSize: 12,
    textAlignVertical: 'top',
  },
  simButton: {
    height: 38,
    backgroundColor: '#1e1e24',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simButtonDisabled: {
    opacity: 0.5,
  },
  simButtonText: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
  },
  statsShortcuts: {
    borderTopWidth: 1,
    borderTopColor: '#2d2d34',
    paddingTop: 12,
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 36,
    backgroundColor: '#0f0f12',
    borderRadius: 8,
  },
  shortcutBtnText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: 'bold',
  },
  passiveGuardianDetails: {
    gap: 10,
  },
  guardianInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guardianInfoIcon: {
    marginTop: 2,
  },
  guardianInfoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d1d5db',
  },
  guardianInfoDesc: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 14,
    marginTop: 2,
  },
  promoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  demoScenarioButton: {
    flexDirection: 'row',
    height: 44,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  demoScenarioButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
