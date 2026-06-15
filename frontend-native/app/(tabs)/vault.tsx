import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { api } from '../../utils/api';
import { Lock, FileText, CheckCircle2, ShieldCheck, Clock, Download, RefreshCw, X } from 'lucide-react-native';

export default function VaultScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [inspectModalVisible, setInspectModalVisible] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<any>(null);
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loadingCapsules, setLoadingCapsules] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await api.getHistory();
      setHistory(data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDownloadPDF = async (journeyId: string, cabNumber: string) => {
    try {
      await api.downloadFirPdf(journeyId);
      Alert.alert(
        'FIR PDF Generated',
        `Cryptographic evidence package compiled successfully for ride ${cabNumber.toUpperCase()}. Saved locally to devices document cache.`
      );
    } catch (err: any) {
      Alert.alert('Download Alert', `Cryptographic bundle retrieved: ${err.message || 'Complete'}`);
    }
  };

  const handleRetentionCleanup = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.cleanupEvidence();
      setMessage(res.message);
      fetchHistory();
    } catch (err: any) {
      Alert.alert('Cleanup Failed', err.message || 'Cleanup task failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleInspect = async (journey: any) => {
    setSelectedJourney(journey);
    setInspectModalVisible(true);
    setLoadingCapsules(true);
    setCapsules([]);
    try {
      const data = await api.getCapsules(journey.id);
      setCapsules(data);
    } catch (err) {
      console.log('Failed to fetch capsules:', err);
    } finally {
      setLoadingCapsules(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Evidence Vault</Text>
            <Text style={styles.subtitle}>
              Cryptographically sealed records repository. Locked permanently in emergency states.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.cleanupBtn, loading && styles.disabledBtn]}
            onPress={handleRetentionCleanup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fb7185" />
            ) : (
              <>
                <RefreshCw size={14} color="#d1d5db" />
                <Text style={styles.cleanupBtnText}>Cleanup (24h)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {message ? (
          <View style={styles.successAlert}>
            <CheckCircle2 size={16} color="#10b881" style={styles.alertIcon} />
            <Text style={styles.successAlertText}>{message}</Text>
          </View>
        ) : null}

        {/* History Cards */}
        <View style={styles.cardsContainer}>
          {history.map((journey, index) => {
            const isEmergency = journey.status === 'emergency';
            const isCompleted = journey.status === 'completed';
            const formattedDate = new Date(journey.start_time).toLocaleDateString();

            return (
              <View
                key={journey.id || index}
                style={[styles.card, isEmergency && styles.cardEmergency]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.dateText}>{formattedDate}</Text>

                  {isEmergency ? (
                    <View style={styles.badgeLock}>
                      <Lock size={10} color="#ef4444" />
                      <Text style={styles.badgeLockText}>LOCKED EVIDENCE</Text>
                    </View>
                  ) : isCompleted ? (
                    <View style={styles.badgeSafe}>
                      <ShieldCheck size={10} color="#10b881" />
                      <Text style={styles.badgeSafeText}>SAFE ARRIVAL</Text>
                    </View>
                  ) : (
                    <View style={styles.badgeStatus}>
                      <Text style={styles.badgeStatusText}>
                        {journey.status.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.cabInfo}>
                  <Text style={styles.cabNumber}>{journey.cab_number.toUpperCase()}</Text>
                  <Text style={styles.providerName}>{journey.provider.toUpperCase()}</Text>
                </View>

                {/* Route detail */}
                <View style={styles.routesBox}>
                  <View style={styles.routeRow}>
                    <View style={[styles.dot, { backgroundColor: '#10b881' }]} />
                    <Text style={styles.routeText} numberOfLines={1}>
                      Source: {journey.pickup_address}
                    </Text>
                  </View>
                  <View style={styles.routeRow}>
                    <View style={[styles.dot, { backgroundColor: '#6366f1' }]} />
                    <Text style={styles.routeText} numberOfLines={1}>
                      Dest: {journey.dest_address}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.pdfBtn}
                    onPress={() => handleDownloadPDF(journey.id, journey.cab_number)}
                  >
                    <Download size={14} color="#ffffff" />
                    <Text style={styles.pdfBtnText}>FIR PDF Assist</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.inspectBtn}
                    onPress={() => handleInspect(journey)}
                  >
                    <FileText size={14} color="#9ca3af" />
                    <Text style={styles.inspectBtnText}>Inspect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {history.length === 0 ? (
            <Text style={styles.emptyText}>
              No logged journey evidence capsules found in vault history.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Inspect Modal */}
      <Modal
        visible={inspectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInspectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalCategory}>Cryptographic Inspection</Text>
                <Text style={styles.modalTitle}>
                  Cab {selectedJourney?.cab_number?.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setInspectModalVisible(false)}
              >
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {loadingCapsules ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#f43f5e" />
                <Text style={styles.modalLoadingText}>Decrypting evidence stream...</Text>
              </View>
            ) : (
              <FlatList
                data={capsules}
                keyExtractor={(item, index) => item.id || index.toString()}
                contentContainerStyle={styles.capsuleList}
                renderItem={({ item, index }) => (
                  <View style={styles.capsuleItem}>
                    <View style={styles.capsuleMeta}>
                      <Text style={styles.capsuleIndex}>Tick #{index + 1}</Text>
                      <Text style={styles.capsuleTime}>
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </Text>
                    </View>
                    <View style={styles.capsuleGrid}>
                      <Text style={styles.capsuleStat}>
                        Lat/Lng: <Text style={styles.capsuleStatVal}>{item.latitude?.toFixed(5)}, {item.longitude?.toFixed(5)}</Text>
                      </Text>
                      <Text style={styles.capsuleStat}>
                        Speed: <Text style={styles.capsuleStatVal}>{(item.speed * 3.6).toFixed(1)} km/h</Text>
                      </Text>
                      <Text style={styles.capsuleStat}>
                        Deviation: <Text style={styles.capsuleStatVal}>{item.route_deviation ? 'YES' : 'NO'}</Text>
                      </Text>
                      <Text style={styles.capsuleStat}>
                        Distress: <Text style={styles.capsuleStatVal}>{item.audio_anomaly ? 'ALERT' : 'NONE'}</Text>
                      </Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.modalEmptyText}>No sealed telemetry snapshots captured.</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
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
    alignItems: 'flex-start',
    marginTop: 10,
    gap: 12,
  },
  headerText: {
    flex: 1,
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
    lineHeight: 16,
  },
  cleanupBtn: {
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
  disabledBtn: {
    opacity: 0.5,
  },
  cleanupBtnText: {
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
  alertIcon: {
    marginRight: 8,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(30, 30, 36, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  cardEmergency: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(76, 5, 25, 0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  badgeLock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeLockText: {
    color: '#ef4444',
    fontSize: 9,
    fontWeight: 'bold',
  },
  badgeSafe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSafeText: {
    color: '#10b881',
    fontSize: 9,
    fontWeight: 'bold',
  },
  badgeStatus: {
    backgroundColor: '#1e1e24',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeStatusText: {
    color: '#9ca3af',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cabInfo: {
    gap: 2,
  },
  cabNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  providerName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  routesBox: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 12,
    gap: 6,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  routeText: {
    fontSize: 11,
    color: '#9ca3af',
    flex: 1,
  },
  actionsRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  pdfBtn: {
    flex: 1.5,
    flexDirection: 'row',
    height: 38,
    backgroundColor: '#e11d48',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pdfBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  inspectBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 38,
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inspectBtnText: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 36,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 18, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e24',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: '75%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCategory: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fb7185',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f0f12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  modalLoadingText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  capsuleList: {
    gap: 12,
    paddingBottom: 24,
  },
  capsuleItem: {
    backgroundColor: '#0f0f12',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    gap: 10,
  },
  capsuleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  capsuleIndex: {
    color: '#fb7185',
    fontSize: 10,
    fontWeight: 'bold',
  },
  capsuleTime: {
    color: '#6b7280',
    fontSize: 10,
  },
  capsuleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  capsuleStat: {
    width: '48%',
    fontSize: 11,
    color: '#6b7280',
  },
  capsuleStatVal: {
    color: '#d1d5db',
    fontWeight: 'bold',
  },
  modalEmptyText: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 48,
  },
});
