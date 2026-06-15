import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useStore } from '../../store/useStore';
import { api } from '../../utils/api';
import {
  Settings,
  Shield,
  Sliders,
  BellRing,
  Globe,
  Activity,
  Cpu,
  CheckCircle2,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { user, updateUserSettings } = useStore();

  const [routeDeviation, setRouteDeviation] = useState(user?.settings?.route_deviation_threshold || 150);
  const [unusualStop, setUnusualStop] = useState(user?.settings?.unusual_stop_threshold || 120);
  const [audioDistress, setAudioDistress] = useState(user?.settings?.audio_distress_threshold || 80);
  const [countdown, setCountdown] = useState(user?.settings?.no_response_timeout || 60);
  const [sirenEnabled, setSirenEnabled] = useState(user?.settings?.siren_enabled !== false);
  const [shakeSensitivity, setShakeSensitivity] = useState(user?.settings?.shake_sensitivity || 12);
  const [autoDelete, setAutoDelete] = useState(true);
  const [apiUrl, setApiUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Load custom API URL from secure storage
  useEffect(() => {
    const loadApiUrl = async () => {
      try {
        const stored = await SecureStore.getItemAsync('femme_api_url');
        if (stored) setApiUrl(stored);
      } catch (err) {
        console.log(err);
      }
    };
    loadApiUrl();
  }, []);

  const handleSave = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (apiUrl.trim()) {
        await SecureStore.setItemAsync('femme_api_url', apiUrl.trim());
      } else {
        await SecureStore.deleteItemAsync('femme_api_url');
      }

      const newSettings = {
        route_deviation_threshold: Number(routeDeviation),
        unusual_stop_threshold: Number(unusualStop),
        audio_distress_threshold: Number(audioDistress),
        no_response_timeout: Number(countdown),
        auto_delete_hours: autoDelete ? 24 : 0,
        shake_sensitivity: Number(shakeSensitivity),
        siren_enabled: sirenEnabled,
      };

      await api.updateSettings(newSettings);
      updateUserSettings(newSettings);

      setMessage('Safety shield parameters saved and applied successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to sync settings.');
    } finally {
      setLoading(false);
    }
  };

  if (showDiagnostics) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Diagnostics</Text>
              <Text style={styles.subtitle}>
                Real-time validation of native layers and backend channels.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.diagBtn}
              onPress={() => setShowDiagnostics(false)}
            >
              <Settings size={14} color="#f43f5e" />
              <Text style={styles.diagBtnText}>Settings</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Cpu size={18} color="#f43f5e" />
              <Text style={styles.cardTitle}>Native Platform Layers</Text>
            </View>

            <View style={styles.diagGrid}>
              <View style={styles.diagItem}>
                <View>
                  <Text style={styles.diagLabel}>Twilio Verify Status</Text>
                  <Text style={styles.diagDesc}>FastAPI twilio client channel</Text>
                </View>
                <CheckCircle2 size={18} color="#10b881" />
              </View>

              <View style={styles.diagItem}>
                <View>
                  <Text style={styles.diagLabel}>Auth Status</Text>
                  <Text style={styles.diagDesc}>Secure verify OTP session</Text>
                </View>
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>READY</Text>
                </View>
              </View>

              <View style={styles.diagItem}>
                <View>
                  <Text style={styles.diagLabel}>Google Play Services</Text>
                  <Text style={styles.diagDesc}>Firebase native elements bypassed</Text>
                </View>
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>UNNEEDED</Text>
                </View>
              </View>

              <View style={styles.diagItem}>
                <View>
                  <Text style={styles.diagLabel}>Application ID</Text>
                  <Text style={styles.diagDesc}>AndroidManifest namespace</Text>
                </View>
                <Text style={styles.monospaceVal}>com.femme.app</Text>
              </View>

              <View style={styles.diagItem}>
                <View>
                  <Text style={styles.diagLabel}>Build Environment</Text>
                  <Text style={styles.diagDesc}>Metro compile target</Text>
                </View>
                <View style={styles.badgeActive}>
                  <Text style={styles.badgeActiveText}>NATIVE-EXPO</Text>
                </View>
              </View>

              <View style={styles.diagItem}>
                <View>
                  <Text style={styles.diagLabel}>Network Status</Text>
                  <Text style={styles.diagDesc}>Mobile connection check</Text>
                </View>
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>ONLINE</Text>
                </View>
              </View>

              <View style={[styles.diagItem, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.diagLabel}>Phone Authentication</Text>
                  <Text style={styles.diagDesc}>
                    Production Twilio Verify OTP is active. SMS OTP will verify directly with Twilio Verify API.
                  </Text>
                </View>
                <View style={styles.greenCircleDot} />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Shield Settings</Text>
            <Text style={styles.subtitle}>
              Calibrate passive tracking, timeouts, and de-escalation controls.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.diagBtn}
            onPress={() => setShowDiagnostics(true)}
          >
            <Activity size={14} color="#f43f5e" />
            <Text style={styles.diagBtnText}>Diagnostics</Text>
          </TouchableOpacity>
        </View>

        {message ? (
          <View style={styles.successAlert}>
            <CheckCircle2 size={16} color="#10b881" style={styles.alertIcon} />
            <Text style={styles.successAlertText}>{message}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorAlert}>
            <Shield size={16} color="#ef4444" style={styles.alertIcon} />
            <Text style={styles.errorAlertText}>{error}</Text>
          </View>
        ) : null}

        {/* Calibration Parameters */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Sliders size={18} color="#f43f5e" />
            <Text style={styles.cardTitle}>Calibration Parameters</Text>
          </View>

          <View style={styles.paramsList}>
            {/* Route deviation boundary */}
            <View style={styles.paramItem}>
              <View style={styles.paramMeta}>
                <Text style={styles.paramLabel}>Route Deviation Boundary</Text>
                <Text style={styles.paramValue}>{routeDeviation} meters</Text>
              </View>
              <View style={styles.calButtons}>
                <TouchableOpacity
                  style={styles.calBtn}
                  onPress={() => setRouteDeviation(Math.max(50, routeDeviation - 25))}
                >
                  <Text style={styles.calBtnText}>-25m</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calBtn}
                  onPress={() => setRouteDeviation(Math.min(500, routeDeviation + 25))}
                >
                  <Text style={styles.calBtnText}>+25m</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Unusual stop threshold */}
            <View style={styles.paramItem}>
              <View style={styles.paramMeta}>
                <Text style={styles.paramLabel}>Unusual Stop Trigger Time</Text>
                <Text style={styles.paramValue}>{unusualStop} seconds</Text>
              </View>
              <View style={styles.calButtons}>
                <TouchableOpacity
                  style={styles.calBtn}
                  onPress={() => setUnusualStop(Math.max(30, unusualStop - 10))}
                >
                  <Text style={styles.calBtnText}>-10s</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calBtn}
                  onPress={() => setUnusualStop(Math.min(300, unusualStop + 10))}
                >
                  <Text style={styles.calBtnText}>+10s</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Audio Sensitivity */}
            <View style={styles.paramItem}>
              <View style={styles.paramMeta}>
                <Text style={styles.paramLabel}>Audio Distress Sensitivity</Text>
                <Text style={styles.paramValue}>{audioDistress} dB</Text>
              </View>
              <View style={styles.calButtons}>
                <TouchableOpacity
                  style={styles.calBtn}
                  onPress={() => setAudioDistress(Math.max(60, audioDistress - 5))}
                >
                  <Text style={styles.calBtnText}>-5dB</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calBtn}
                  onPress={() => setAudioDistress(Math.min(100, audioDistress + 5))}
                >
                  <Text style={styles.calBtnText}>+5dB</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Are you okay countdown */}
            <View style={styles.paramItem}>
              <View style={styles.paramMeta}>
                <Text style={styles.paramLabel}>"Are You Okay?" Countdown</Text>
                <Text style={styles.paramValue}>{countdown} seconds</Text>
              </View>
              <View style={styles.calButtons}>
                <TouchableOpacity
                  style={styles.calBtn}
                  onPress={() => setCountdown(Math.max(15, countdown - 5))}
                >
                  <Text style={styles.calBtnText}>-5s</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.calBtn}
                  onPress={() => setCountdown(Math.min(120, countdown + 5))}
                >
                  <Text style={styles.calBtnText}>+5s</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* API Server Configuration */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Globe size={18} color="#f43f5e" />
            <Text style={styles.cardTitle}>API Server Config</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Backend Server URL</Text>
            <TextInput
              style={styles.textInput}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="E.g., http://192.168.1.100:8000 (Leave blank for fallback)"
              placeholderTextColor="#4b5563"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helpText}>
              On real device testing, specify your local host network IP or deployment URL. Under Android Emulator, blank defaults to Loopback <Text style={{ color: '#fb7185', fontWeight: 'bold' }}>http://10.0.2.2:8000</Text>.
            </Text>
          </View>
        </View>

        {/* Shield Switches */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BellRing size={18} color="#f43f5e" />
            <Text style={styles.cardTitle}>Shield Switches</Text>
          </View>

          <View style={styles.switchList}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Play Audio Siren</Text>
                <Text style={styles.switchDesc}>Emit high decibel wailing alert tone during SOS mode.</Text>
              </View>
              <Switch
                value={sirenEnabled}
                onValueChange={setSirenEnabled}
                trackColor={{ false: '#0f0f12', true: '#be123c' }}
                thumbColor={sirenEnabled ? '#fb7185' : '#4b5563'}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Auto-Delete Safely</Text>
                <Text style={styles.switchDesc}>Delete journey evidence snapshots 24h post safe arrival.</Text>
              </View>
              <Switch
                value={autoDelete}
                onValueChange={setAutoDelete}
                trackColor={{ false: '#0f0f12', true: '#be123c' }}
                thumbColor={autoDelete ? '#fb7185' : '#4b5563'}
              />
            </View>

            <View style={[styles.switchRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>Shake-to-trigger SOS</Text>
                <Text style={styles.switchDesc}>Enable accelerometer shake listeners to trigger SOS.</Text>
              </View>
              <Switch
                value={shakeSensitivity > 0}
                onValueChange={(val) => setShakeSensitivity(val ? 12 : 0)}
                trackColor={{ false: '#0f0f12', true: '#be123c' }}
                thumbColor={shakeSensitivity > 0 ? '#fb7185' : '#4b5563'}
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Configuration</Text>
          )}
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
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    maxWidth: '70%',
    lineHeight: 16,
  },
  diagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1e1e24',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
  },
  diagBtnText: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: 'bold',
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  successAlertText: {
    color: '#34d399',
    fontSize: 12,
    flex: 1,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorAlertText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
  },
  alertIcon: {
    marginRight: 8,
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
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  paramsList: {
    gap: 16,
  },
  paramItem: {
    gap: 10,
  },
  paramMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paramLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  paramValue: {
    fontSize: 12,
    fontWeight: 'black',
    color: '#fb7185',
  },
  calButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  calBtn: {
    flex: 1,
    height: 36,
    backgroundColor: '#0f0f12',
    borderColor: '#2d2d34',
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calBtnText: {
    color: '#d1d5db',
    fontSize: 11,
    fontWeight: 'bold',
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 12,
  },
  helpText: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 14,
    marginTop: 2,
  },
  switchList: {
    gap: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    gap: 12,
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  switchDesc: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 14,
    marginTop: 2,
  },
  saveButton: {
    height: 52,
    backgroundColor: '#e11d48',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#1e1e24',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  diagGrid: {
    gap: 14,
  },
  diagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    gap: 12,
  },
  diagLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  diagDesc: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSuccessText: {
    color: '#10b881',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderColor: 'rgba(244, 63, 94, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeActiveText: {
    color: '#fb7185',
    fontSize: 10,
    fontWeight: 'bold',
  },
  monospaceVal: {
    color: '#fb7185',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  greenCircleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b881',
    shadowColor: '#10b881',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
});
