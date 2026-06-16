import React, { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  const [isHydrated, setIsHydrated] = useState(false);
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const router = useRouter();
  const segments = useSegments();

  const anomalyPopupActive = useStore((state) => state.anomalyPopupActive);
  const countdownSeconds = useStore((state) => state.countdownSeconds);
  const setAnomalyPopup = useStore((state) => state.setAnomalyPopup);
  const setCountdown = useStore((state) => state.setCountdown);
  const setEmergencyState = useStore((state) => state.setEmergencyState);
  const routeDeviation = useStore((state) => state.routeDeviation);
  const motionAnomaly = useStore((state) => state.motionAnomaly);
  const audioAnomaly = useStore((state) => state.audioAnomaly);

  const timerRef = useRef<any | null>(null);
  
  const [isBackendReachable, setIsBackendReachable] = useState<boolean | null>(null);

  // Verify backend connection on startup and hydration
  useEffect(() => {
    if (!isHydrated) return;

    let isMounted = true;
    const checkReachability = async () => {
      try {
        await api.checkHealth();
        if (isMounted) setIsBackendReachable(true);
      } catch (err) {
        console.log('[RootLayout] Startup reachability check failed:', err);
        if (isMounted) setIsBackendReachable(false);
      }
    };

    checkReachability();

    // Recheck periodically every 10s
    const interval = setInterval(checkReachability, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isHydrated]);

  // Monitor Zustand hydration from SecureStore
  useEffect(() => {
    console.log('[RootLayout] Hydration effect triggered. hasHydrated:', useStore.persist.hasHydrated());
    const unsubHydrate = useStore.persist.onFinishHydration(() => {
      console.log('[RootLayout] Hydration finished event.');
      setIsHydrated(true);
    });

    if (useStore.persist.hasHydrated()) {
      console.log('[RootLayout] Store already hydrated.');
      setIsHydrated(true);
    }

    return () => {
      unsubHydrate();
    };
  }, []);

  // Handle routing based on auth state
  useEffect(() => {
    console.log('[RootLayout] Navigation effect. isHydrated:', isHydrated, 'isAuthenticated:', isAuthenticated, 'segments:', segments);
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        console.log('[RootLayout] Redirecting to login...');
        router.replace('/(auth)/login');
      }
    } else {
      if (!inTabsGroup && segments[0] !== 'journey' && segments[0] !== 'sos') {
        console.log('[RootLayout] Redirecting to dashboard...');
        router.replace('/(tabs)/dashboard');
      }
    }
  }, [isAuthenticated, isHydrated, segments]);

  // Global "60 Second No Response Rule" and Active Anomaly Timer Ticks
  useEffect(() => {
    if (anomalyPopupActive && countdownSeconds > 0) {
      timerRef.current = setInterval(() => {
        setCountdown(countdownSeconds - 1);
      }, 1000);
    } else if (anomalyPopupActive && countdownSeconds === 0) {
      handleEscalate();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [anomalyPopupActive, countdownSeconds]);

  const handleSafeConfirm = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnomalyPopup(false);
    setCountdown(60);
    console.log('Traveler confirmed safe. Resetting alert check.');
  };

  const handleEscalate = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnomalyPopup(false);
    setCountdown(60);
    setEmergencyState(true);
    try {
      await api.triggerSos();
    } catch (err) {
      console.log('SOS Trigger failed:', err);
    }
    router.push('/sos/active');
  };

  if (!isHydrated) {
    console.log('[RootLayout] Rendering unhydrated loading container spinner...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#0f0f12" />
      {isBackendReachable === false && (
        <SafeAreaView style={styles.errorBannerContainer} edges={['top']}>
          <View style={styles.errorBanner}>
            <AlertTriangle size={14} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>Backend unreachable</Text>
          </View>
        </SafeAreaView>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f0f12' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="journey/setup" options={{ headerShown: false }} />
        <Stack.Screen name="journey/active" options={{ headerShown: false }} />
        <Stack.Screen name="journey/route" options={{ headerShown: false }} />
        <Stack.Screen name="sos/active" options={{ headerShown: false }} />
      </Stack>

      {/* Global "Are You Okay?" de-escalation check popup */}
      <Modal
        visible={anomalyPopupActive}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.alertIconContainer}>
              <AlertTriangle size={32} color="#ef4444" />
            </View>

            <Text style={styles.modalTitle}>Are You Okay?</Text>
            
            <Text style={styles.modalDesc}>
              We detected{' '}
              {routeDeviation && 'a Route Deviation'}
              {motionAnomaly && (routeDeviation ? ' & ' : '') + 'an Unusual Stop'}
              {audioAnomaly &&
                ((routeDeviation || motionAnomaly) ? ' & ' : '') + 'Audio distress signatures'}
              . Please confirm your safety immediately.
            </Text>

            <View style={styles.progressRing}>
              <Text style={styles.countdownText}>{countdownSeconds}s</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.safeBtn} onPress={handleSafeConfirm}>
                <Text style={styles.safeBtnText}>Yes, I am Safe</Text>
              </TouchableOpacity>

              <View style={styles.splitRow}>
                <TouchableOpacity style={styles.escalateBtn} onPress={handleEscalate}>
                  <Text style={styles.escalateBtnText}>No, Escalated</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.sosBtn} onPress={handleEscalate}>
                  <Text style={styles.sosBtnText}>SOS Emergency</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.footnote}>
              If you do not respond in {countdownSeconds} seconds, we will automatically transition to Emergency Mode, broadcast your GPS coordinate, and notify all trusted contacts.
            </Text>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f0f12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 18, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: 'rgba(30, 30, 36, 0.95)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  alertIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: 12,
    color: '#d1d5db',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  progressRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  countdownText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fca5a5',
  },
  actionButtons: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  safeBtn: {
    height: 48,
    backgroundColor: '#10b881',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  escalateBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#1e1e24',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escalateBtnText: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sosBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  footnote: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 13,
  },
  errorBannerContainer: {
    backgroundColor: '#ef4444',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  errorBannerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
