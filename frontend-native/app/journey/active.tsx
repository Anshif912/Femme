import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import { api } from '../../utils/api';
import { Shield, Trash2, Zap, Play, Pause, Activity, Fingerprint } from 'lucide-react-native';

export default function ActiveJourneyScreen() {
  const router = useRouter();

  const {
    activeJourney,
    currentSpeed,
    routeDeviation,
    motionAnomaly,
    audioAnomaly,
    capsuleSnapshots,
    setAnomalyPopup,
    setAnomalyFlags,
    updateLiveLocation,
    addCapsuleSnapshot,
    setActiveJourney,
    resetTelemetryState,
    setEmergencyState,
    demoRunning,
    demoStep,
    setDemoRunning,
    setDemoStep,
  } = useStore();

  const [dbLevel, setDbLevel] = useState(48);
  const [vibrationVal, setVibrationVal] = useState(0.12);
  const [simRunning, setSimRunning] = useState(true);
  const [selectedSimType, setSelectedSimType] = useState<'normal' | 'deviation' | 'stop' | 'scream'>('normal');

  const [safetyScore, setSafetyScore] = useState<number>(95);
  const [safetyReason, setSafetyReason] = useState<string>('Evaluating safety factors...');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Journey timer count-up
  useEffect(() => {
    if (!activeJourney) return;
    
    const start = new Date(activeJourney.start_time).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = Math.floor((now - start) / 1000);
      setElapsedSeconds(diff >= 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeJourney]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Evaluate route safety score
  useEffect(() => {
    if (activeJourney && activeJourney.expected_route) {
      const fetchSafety = async () => {
        try {
          const res = await api.evaluateRouteSafety(activeJourney.expected_route);
          setSafetyScore(res.score);
          setSafetyReason(res.reason);
        } catch (e) {
          console.log('Safety check failed:', e);
        }
      };
      fetchSafety();
    }
  }, [activeJourney]);

  const timerRef = useRef<any | null>(null);
  const sensorTimerRef = useRef<any | null>(null);
  const stepIndexRef = useRef(0);

  // Redirect if no active journey
  useEffect(() => {
    if (!activeJourney) {
      router.replace('/(tabs)/dashboard');
    }
  }, [activeJourney]);

  // Simulate sensors (Vibration & Decibels)
  useEffect(() => {
    sensorTimerRef.current = setInterval(() => {
      if (!simRunning) return;

      let noiseBase = 45 + Math.random() * 12;
      let vibBase = 0.08 + Math.random() * 0.1;

      if (selectedSimType === 'scream') {
        noiseBase = 88 + Math.random() * 10;
      }
      if (selectedSimType === 'stop') {
        vibBase = 0.01;
      }

      setDbLevel(Math.round(noiseBase));
      setVibrationVal(Number(vibBase.toFixed(2)));
    }, 800);

    return () => {
      if (sensorTimerRef.current) clearInterval(sensorTimerRef.current);
    };
  }, [simRunning, selectedSimType]);

  // Background Telemetry Worker (snappy 10s intervals for simulations)
  useEffect(() => {
    if (!activeJourney || !simRunning) return;

    const runTelemetryStep = async () => {
      const path = activeJourney.expected_route || [];
      if (path.length === 0) return;

      let lat = activeJourney.current_lat;
      let lng = activeJourney.current_lng;
      let speed = 8.5; // ~30 km/h

      let simulateDeviationFlag = false;
      let simulateStopFlag = false;
      let simulateAudioFlag = false;

      if (selectedSimType === 'normal') {
        const nextIndex = Math.min(stepIndexRef.current + 1, path.length - 1);
        stepIndexRef.current = nextIndex;
        lat = path[nextIndex][0];
        lng = path[nextIndex][1];
        speed = 8.0 + Math.random() * 4;
      } else if (selectedSimType === 'deviation') {
        simulateDeviationFlag = true;
        lat = activeJourney.current_lat + 0.0035;
        lng = activeJourney.current_lng + 0.0035;
        speed = 12.0;
      } else if (selectedSimType === 'stop') {
        simulateStopFlag = true;
        speed = 0.0;
      } else if (selectedSimType === 'scream') {
        simulateAudioFlag = true;
        const nextIndex = Math.min(stepIndexRef.current + 1, path.length - 1);
        stepIndexRef.current = nextIndex;
        lat = path[nextIndex][0];
        lng = path[nextIndex][1];
      }

      updateLiveLocation(lat, lng, speed);

      try {
        const payload = {
          latitude: lat,
          longitude: lng,
          speed: speed,
          timestamp: new Date().toISOString(),
          motion_anomaly: simulateStopFlag,
          audio_anomaly: simulateAudioFlag,
          raw_audio_features: { max_decibels: dbLevel, vibration_g: vibrationVal },
          speed_history: [speed],
        };

        const res = await api.updateTelemetry(payload);

        setAnomalyFlags({
          routeDeviation: res.route_deviation,
          deviationMeters: res.deviation_meters,
          motionAnomaly: res.motion_anomaly,
          audioAnomaly: res.audio_anomaly,
        });

        addCapsuleSnapshot({
          timestamp: payload.timestamp,
          latitude: lat,
          longitude: lng,
          speed: speed,
          route_deviation: res.route_deviation,
          motion_anomaly: res.motion_anomaly,
          audio_anomaly: res.audio_anomaly,
          integrity_hash: res.capsule_hash,
        });

        if (res.trigger_check) {
          setAnomalyPopup(true);
        }
      } catch (err) {
        console.log('Telemetry updates error:', err);
      }
    };

    runTelemetryStep();
    timerRef.current = setInterval(runTelemetryStep, 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeJourney, simRunning, selectedSimType, dbLevel, vibrationVal]);

  // Demo Mode Sequencer
  useEffect(() => {
    if (!demoRunning) return;

    console.log(`[Demo Sequencer] Executing step: ${demoStep}`);

    let timeoutId: any;

    if (demoStep === 1) {
      // Step 1: Standard Commute for 3 seconds
      setSelectedSimType('normal');
      timeoutId = setTimeout(() => {
        setDemoStep(2);
      }, 3000);
    } else if (demoStep === 2) {
      // Step 2: Route Deviation wrong turn for 4 seconds
      setSelectedSimType('deviation');
      timeoutId = setTimeout(() => {
        setDemoStep(3);
      }, 4000);
    } else if (demoStep === 3) {
      // Step 3: Vocal distress scream for 4 seconds
      setSelectedSimType('scream');
      timeoutId = setTimeout(() => {
        setDemoStep(4);
      }, 4000);
    } else if (demoStep === 4) {
      // Step 4: Trigger SOS
      handleSOS();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [demoRunning, demoStep]);

  const handleCancel = () => {
    Alert.alert(
      'Decommission Tracking',
      'Are you sure you want to stop journey monitoring?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decommission',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelJourney();
              setActiveJourney(null);
              resetTelemetryState();
              router.replace('/(tabs)/dashboard');
            } catch (err) {
              console.log(err);
            }
          },
        },
      ]
    );
  };

  const handleSOS = async () => {
    console.log('[SOS] Triggered immediately from Active Journey Screen.');
    setEmergencyState(true);
    setAnomalyPopup(false);
    setDemoRunning(false);
    setDemoStep(0);
    try {
      await api.triggerSos();
    } catch (err) {
      console.log('[SOS] Trigger error:', err);
    }
    router.push('/sos/active');
  };

  if (!activeJourney) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Active Journey</Text>
            <Text style={styles.subtitle}>Invisible shield collecting device telemetry.</Text>
          </View>

          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => router.push('/journey/route')}
          >
            <Text style={styles.mapBtnText}>View Map Router</Text>
          </TouchableOpacity>
        </View>

        {/* Safety & Time Status Card */}
        <View style={styles.card}>
          <View style={styles.statusRowWidget}>
            <View style={styles.statusBoxWidget}>
              <Text style={styles.statusLabelWidget}>ELAPSED TIME</Text>
              <Text style={styles.statusValueWidget}>{formatTimer(elapsedSeconds)}</Text>
            </View>
            
            <View style={styles.statusBoxWidget}>
              <Text style={styles.statusLabelWidget}>ROUTE MONITOR</Text>
              <View style={[styles.statusBadgeWidget, routeDeviation ? styles.badgeRedWidget : styles.badgeGreenWidget]}>
                <Text style={[styles.statusBadgeTextWidget, routeDeviation ? styles.textRedWidget : styles.textGreenWidget]}>
                  {routeDeviation ? 'OFF ROUTE' : 'ON ROUTE'}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusBoxWidget}>
              <Text style={styles.statusLabelWidget}>SAFETY RATING</Text>
              <Text style={[styles.statusValueWidget, { color: safetyScore >= 75 ? '#10b881' : safetyScore >= 50 ? '#f59e0b' : '#ef4444' }]}>
                {safetyScore}/100
              </Text>
            </View>
          </View>
          {safetyReason ? (
            <Text style={styles.safetyReasonText}>{safetyReason}</Text>
          ) : null}
        </View>

        {/* Dashboard grid */}
        <View style={styles.card}>
          <View style={styles.sensorRow}>
            {/* Speedometer */}
            <View style={styles.sensorBox}>
              <Text style={styles.sensorLabel}>Speed</Text>
              <View style={styles.speedIndicator}>
                <Text style={styles.speedVal}>{(currentSpeed * 3.6).toFixed(1)}</Text>
              </View>
              <Text style={styles.sensorSub}>KM/H</Text>
            </View>

            {/* Noise Monitor */}
            <View style={styles.sensorBox}>
              <Text style={styles.sensorLabel}>Ambient Decibels</Text>
              <View
                style={[
                  styles.speedIndicator,
                  dbLevel > 80 ? styles.indicatorDanger : styles.indicatorSuccess,
                ]}
              >
                <Text style={styles.speedVal}>{dbLevel}</Text>
              </View>
              <Text style={styles.sensorSub}>{dbLevel > 80 ? '⚠️ SCREAM' : 'QUIET'}</Text>
            </View>

            {/* Vibration */}
            <View style={styles.sensorBox}>
              <Text style={styles.sensorLabel}>Vibration</Text>
              <View style={styles.speedIndicator}>
                <Text style={styles.speedVal}>{vibrationVal}</Text>
              </View>
              <Text style={styles.sensorSub}>G-FORCE</Text>
            </View>
          </View>
        </View>

        {/* SHA-256 Capsule Logs */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Fingerprint size={16} color="#f43f5e" />
            <Text style={styles.cardTitle}>Tamper-Proof Capsule Logs</Text>
          </View>
          <Text style={styles.cardDesc}>
            Cryptographically sealed coordinate logs compiled every 30s.
          </Text>

          <View style={styles.logsContainer}>
            {capsuleSnapshots
              .slice()
              .reverse()
              .map((capsule, index) => (
                <View key={index} style={styles.logItem}>
                  <View style={styles.logMeta}>
                    <Text style={styles.logIndex}>
                      Capsule #{capsuleSnapshots.length - index}
                    </Text>
                    <Text style={styles.logTime}>
                      {new Date(capsule.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>

                  <View style={styles.tagList}>
                    {capsule.route_deviation ? (
                      <View style={[styles.logTag, styles.tagRed]}>
                        <Text style={styles.tagTextRed}>DEVIATION</Text>
                      </View>
                    ) : null}
                    {capsule.motion_anomaly ? (
                      <View style={[styles.logTag, styles.tagYellow]}>
                        <Text style={styles.tagTextYellow}>STOP</Text>
                      </View>
                    ) : null}
                    {capsule.audio_anomaly ? (
                      <View style={[styles.logTag, styles.tagOrange]}>
                        <Text style={styles.tagTextOrange}>SCREAM</Text>
                      </View>
                    ) : null}
                    <View style={[styles.logTag, styles.tagGreen]}>
                      <Text style={styles.tagTextGreen}>
                        SHA: {capsule.integrity_hash?.slice(0, 10)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

            {capsuleSnapshots.length === 0 ? (
              <Text style={styles.emptyLogsText}>Waiting for first capsule compilation...</Text>
            ) : null}
          </View>
        </View>

        {/* Simulation Controller */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Simulation Controller</Text>
            <TouchableOpacity
              style={styles.pauseBtn}
              onPress={() => setSimRunning(!simRunning)}
            >
              <Text style={styles.pauseBtnText}>{simRunning ? 'Pause' : 'Play'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardDesc}>
            Injected telemetry anomalies verifying platform notification alerts:
          </Text>

          <View style={styles.simButtonsColumn}>
            {[
              { type: 'normal', emoji: '🟢', label: 'Standard Commute Progress' },
              { type: 'deviation', emoji: '🔴', label: 'Simulate Off-Route Wrong Turn' },
              { type: 'stop', emoji: '🟡', label: 'Simulate Isolated Vehicle Stop' },
              { type: 'scream', emoji: '🟠', label: 'Simulate Vocal Distress Screams' },
            ].map((sim) => (
              <TouchableOpacity
                key={sim.type}
                style={[
                  styles.simSelector,
                  selectedSimType === sim.type && styles.simSelectorActive,
                ]}
                onPress={() => setSelectedSimType(sim.type as any)}
              >
                <Text
                  style={[
                    styles.simSelectorText,
                    selectedSimType === sim.type && styles.simSelectorTextActive,
                  ]}
                >
                  {sim.emoji} {sim.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SOS button */}
        <TouchableOpacity style={styles.sosBtnAction} onPress={handleSOS}>
          <Text style={styles.sosBtnActionText}>Trigger Emergency SOS</Text>
        </TouchableOpacity>

        {/* Cancel monitoring */}
        <TouchableOpacity style={styles.decomBtn} onPress={handleCancel}>
          <Trash2 size={16} color="#6b7280" />
          <Text style={styles.decomBtnText}>Decommission Tracking</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  mapBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e1e24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
  },
  mapBtnText: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'rgba(30, 30, 36, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
  },
  sensorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sensorBox: {
    flex: 1,
    backgroundColor: '#0f0f12',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  sensorLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  speedIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'rgba(244, 63, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  indicatorDanger: {
    borderColor: '#ef4444',
  },
  indicatorSuccess: {
    borderColor: '#10b881',
  },
  speedVal: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  sensorSub: {
    fontSize: 9,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  logsContainer: {
    gap: 8,
    maxHeight: 220,
  },
  logItem: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  logMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logIndex: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  logTime: {
    color: '#6b7280',
    fontSize: 10,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  logTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  tagYellow: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
  },
  tagOrange: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
  },
  tagGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  tagTextRed: {
    color: '#ef4444',
    fontSize: 8,
    fontWeight: 'bold',
  },
  tagTextYellow: {
    color: '#eab308',
    fontSize: 8,
    fontWeight: 'bold',
  },
  tagTextOrange: {
    color: '#f97316',
    fontSize: 8,
    fontWeight: 'bold',
  },
  tagTextGreen: {
    color: '#10b881',
    fontSize: 8,
    fontWeight: 'bold',
  },
  emptyLogsText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 20,
  },
  pauseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#1e1e24',
    borderRadius: 6,
  },
  pauseBtnText: {
    color: '#d1d5db',
    fontSize: 10,
    fontWeight: 'bold',
  },
  simButtonsColumn: {
    gap: 8,
  },
  simSelector: {
    height: 44,
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  simSelectorActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderColor: '#f43f5e',
  },
  simSelectorText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: 'bold',
  },
  simSelectorTextActive: {
    color: '#fb7185',
  },
  sosBtnAction: {
    height: 52,
    backgroundColor: '#be123c',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sosBtnActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  decomBtn: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: '#1e1e24',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  decomBtnText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusRowWidget: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusBoxWidget: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0f12',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  statusLabelWidget: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  statusValueWidget: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  statusBadgeWidget: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeGreenWidget: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
  },
  badgeRedWidget: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
  },
  statusBadgeTextWidget: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  textGreenWidget: {
    color: '#10b881',
  },
  textRedWidget: {
    color: '#ef4444',
  },
  safetyReasonText: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 14,
    fontStyle: 'italic',
  },
});
