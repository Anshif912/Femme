import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import { api } from '../../utils/api';
import { Shield, Smartphone, KeyRound, ArrowRight, Info, CheckSquare } from 'lucide-react-native';

export default function LoginScreen() {
  console.log('[LoginScreen] Rendering login form...');
  const router = useRouter();
  const setAuth = useStore((state) => state.setAuth);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpMessage, setOtpMessage] = useState('');

  const handleRequestOtp = async () => {
    if (!phone.trim()) return;

    setLoading(true);
    setError('');

    try {
      const formattedPhone = phone.trim();
      const res = await api.requestOtp(formattedPhone);
      setOtpMessage(res.message || 'OTP verification SMS dispatched successfully.');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.verifyOtp(phone.trim(), otp.trim(), name.trim() || undefined);

      if (res.success === false) {
        throw new Error(res.message || 'Invalid OTP');
      }

      setAuth(res.user, res.access_token);
      // Let _layout.tsx handle navigation redirection
    } catch (err: any) {
      setError(err.message || 'Verification failed. Double check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          {/* Background decorative layers */}
          <View style={styles.radialGlow1} />
          <View style={styles.radialGlow2} />

          <View style={styles.card}>
            {/* Header Icon & Brand */}
            <View style={styles.brandContainer}>
              <View style={styles.logoContainer}>
                <Shield size={28} color="#ffffff" />
              </View>
              <Text style={styles.title}>Secure Sign In</Text>
              <Text style={styles.subtitle}>FEMME AI Passive Travel Shield</Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <View style={styles.errorHeader}>
                  <Info size={14} color="#f87171" style={styles.errorIcon} />
                  <Text style={styles.errorTitle}>Authentication Alert</Text>
                </View>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={() => setError('')} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Dismiss & Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {step === 'phone' ? (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <Smartphone size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="+919999999999"
                      placeholderTextColor="#4b5563"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      autoFocus
                    />
                  </View>
                  <Text style={styles.hintText}>
                    Include country code prefix (e.g., <Text style={{ color: '#9ca3af', fontWeight: 'bold' }}>+91</Text> for India) for phone dispatch.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, (!phone.trim() || loading) && styles.buttonDisabled]}
                  onPress={handleRequestOtp}
                  disabled={!phone.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Request OTP Code</Text>
                      <ArrowRight size={16} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.successAlert}>
                  <CheckSquare size={16} color="#10b881" style={styles.successIcon} />
                  <Text style={styles.successAlertText}>
                    {otpMessage || 'We have sent a verification code to your registered mobile number.'}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.inputNoIcon]}
                    placeholder="Your name"
                    placeholderTextColor="#4b5563"
                    value={name}
                    onChangeText={setName}
                    autoComplete="name"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification Code</Text>
                  <View style={styles.inputWrapper}>
                    <KeyRound size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.otpInput]}
                      placeholder="6-digit OTP"
                      placeholderTextColor="#4b5563"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.button, (!otp.trim() || loading) && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={!otp.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Verify & Sign In</Text>
                      <ArrowRight size={16} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setStep('phone')}
                  disabled={loading}
                >
                  <Text style={styles.backButtonText}>Back to Phone Number Entry</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0f0f12',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  radialGlow1: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(244, 63, 94, 0.04)',
    zIndex: -1,
  },
  radialGlow2: {
    position: 'absolute',
    bottom: '10%',
    right: '10%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(244, 63, 94, 0.04)',
    zIndex: -1,
  },
  card: {
    backgroundColor: 'rgba(30, 30, 36, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: 'rgba(76, 5, 25, 0.2)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  errorIcon: {
    marginRight: 6,
  },
  errorTitle: {
    color: '#f87171',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fb7185',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    height: '100%',
  },
  inputNoIcon: {
    backgroundColor: '#0f0f12',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 14,
  },
  otpInput: {
    letterSpacing: 4,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
  hintText: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 14,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  successIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  successAlertText: {
    flex: 1,
    color: '#34d399',
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#e11d48',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#1e1e24',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#9ca3af',
    fontSize: 12,
  },
});
