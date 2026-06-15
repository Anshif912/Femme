import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { Shield, Smartphone, KeyRound, ArrowRight, Info, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import { auth, missingKeys, isInitialized } from '../utils/firebase';
import { Logger } from '../utils/Logger';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useStore((state) => state.setAuth);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Initialize reCAPTCHA on mount if Firebase is ready
  useEffect(() => {
    if (isInitialized && auth) {
      try {
        Logger.info("Setting up invisible reCAPTCHA verifier...");
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            Logger.info("reCAPTCHA verifier successfully resolved.");
          }
        });
      } catch (err: any) {
        Logger.error("Failed to initialize reCAPTCHA verifier:", err);
      }
    }
  }, []);

  const formatFirebaseError = (errCode: string): { message: string; fix: string } => {
    switch (errCode) {
      case 'auth/operation-not-allowed':
        return {
          message: 'Phone Authentication is disabled in the Firebase Console.',
          fix: 'Go to Firebase Console -> Build -> Authentication -> Sign-in Method and enable Phone provider.'
        };
      case 'auth/network-request-failed':
        return {
          message: 'Network request failed. No internet connection or endpoint blocked.',
          fix: 'Verify your phone/emulator has active internet access. Check AndroidManifest network settings.'
        };
      case 'auth/invalid-app-credential':
        return {
          message: 'Invalid application credentials (SHA fingerprint or Package Name mismatch).',
          fix: 'Ensure your app\'s package name matches com.femme.app and that your SHA-1 / SHA-256 keys are added to the Firebase project settings.'
        };
      case 'auth/missing-client-identifier':
        return {
          message: 'Missing Client Identifier (App Verification Failed).',
          fix: 'Firebase could not verify that requests are coming from your app. Ensure you are using the correct debug/release keystores.'
        };
      case 'auth/too-many-requests':
        return {
          message: 'Too many requests. SMS quota exceeded or device blocked temporarily.',
          fix: 'Wait a few minutes before trying again, or register test numbers in the Firebase Console under Sign-in Method -> Phone -> Test phone numbers.'
        };
      case 'auth/invalid-verification-code':
        return {
          message: 'Invalid verification code.',
          fix: 'Double check the 6-digit SMS OTP code sent to your phone and try again.'
        };
      default:
        return {
          message: `Firebase error occurred (${errCode}).`,
          fix: 'Ensure you have uploaded google-services.json to android/app/ and verified all credentials.'
        };
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    
    setLoading(true);
    setError('');
    setFirebaseError(null);
    Logger.info(`OTP dispatch requested for phone number: ${phone}`);

    if (!isInitialized || !auth) {
      setError('Firebase authentication is not initialized. Please configure VITE_FIREBASE_* credentials.');
      setLoading(false);
      return;
    }
    
    try {
      const formattedPhone = phone.trim();
      let verifier = (window as any).recaptchaVerifier;
      if (!verifier) {
        verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
        (window as any).recaptchaVerifier = verifier;
      }

      Logger.info(`Triggering Firebase signInWithPhoneNumber for: ${formattedPhone}`);
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      (window as any).confirmationResult = confirmationResult;
      
      Logger.info(`OTP successfully dispatched by Firebase for: ${formattedPhone}`);
      setOtpMessage('Firebase verification SMS dispatched successfully.');
      setStep('otp');
    } catch (err: any) {
      const errCode = err.code || 'unknown';
      Logger.error(`Firebase Phone Auth request failed for: ${phone} (Code: ${errCode})`, err);
      setFirebaseError(errCode);
      const details = formatFirebaseError(errCode);
      setError(`${details.message}\nRecommended Fix: ${details.fix}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    
    setLoading(true);
    setError('');
    setFirebaseError(null);
    Logger.info(`OTP verification submitted for code: ${otp}`);
    
    try {
      const confirmationResult = (window as any).confirmationResult;
      if (!confirmationResult) {
        throw new Error('No active verification session. Please request a new code.');
      }
      
      // 1. Confirm OTP with Firebase Auth
      Logger.info("Submitting verification code to Firebase...");
      const userCredential = await confirmationResult.confirm(otp);
      const user = userCredential.user;
      Logger.info(`Firebase client verification success! Verified user phone: ${user.phoneNumber}, UID: ${user.uid}`);
      
      // 2. Retrieve Firebase ID Token
      const idToken = await user.getIdToken();
      Logger.info("Firebase ID Token successfully retrieved from client.");
      
      // 3. Exchange ID Token with FastAPI backend
      Logger.info("Exchanging Firebase token for API JWT access token...");
      const res = await api.verifyOtp(phone, idToken, name);
      Logger.info("Backend token exchange successful! Establishing session.");
      
      // 4. Save in Zustand store
      setAuth(res.user, res.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      const errCode = err.code || 'unknown';
      Logger.error(`Firebase OTP verification failed (Code: ${errCode})`, err);
      setFirebaseError(errCode);
      const details = formatFirebaseError(errCode);
      setError(`${details.message} ${details.fix}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative font-sans">
      <div id="recaptcha-container"></div>
      
      {/* Background blur blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-brand-500/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-brand-500/5 blur-[80px] pointer-events-none" />

      <div className="glass-card max-w-md w-full p-8 rounded-2xl border border-gray-800 shadow-2xl relative z-10 overflow-hidden">
        
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide">Secure Sign In</h2>
          <p className="text-xs text-gray-400 mt-1">FEMME AI Passive Travel Shield</p>
        </div>

        {/* Missing Env Keys Warning */}
        {missingKeys.length > 0 && (
          <div className="p-4 bg-amber-950/20 border border-amber-500/30 text-amber-400 text-xs rounded-xl mb-6 space-y-2">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Missing Environment Variables</span>
            </div>
            <p className="leading-relaxed text-[11px] text-gray-300">
              Please define the following keys in your <code className="text-amber-400 font-semibold font-mono">frontend/.env</code> configuration file:
            </p>
            <ul className="list-disc pl-4 font-mono text-[10px] space-y-1 text-amber-200/90">
              {missingKeys.map(k => <li key={k}>{k}</li>)}
            </ul>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl mb-6 space-y-1">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
              <Info className="w-4 h-4 shrink-0" />
              <span>Authentication Alert</span>
            </div>
            <p className="leading-relaxed font-semibold whitespace-pre-line text-red-300">{error}</p>
            {firebaseError && (
              <button 
                type="button"
                onClick={() => {
                  setError('');
                  setFirebaseError(null);
                }} 
                className="mt-2 text-[10px] text-brand-400 hover:text-brand-300 font-bold uppercase tracking-wider flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Dismiss & Retry
              </button>
            )}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="tel"
                  placeholder="+919999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none transition duration-200"
                  required
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                Include country code prefix (e.g., <code className="text-gray-400">+91</code> for India) for phone dispatch.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !phone || missingKeys.length > 0}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl transition duration-200 shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? 'Sending Code...' : 'Request OTP Code'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-3 bg-emerald-950/15 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-start gap-2 mb-2">
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-400" />
              <span>{otpMessage || 'We have sent a verification code to your registered mobile number.'}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Name (Optional)</label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-3 px-4 text-white text-sm outline-none transition duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Verification Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none tracking-widest text-center font-mono transition duration-200"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !otp}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl transition duration-200 shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying OTP...' : 'Verify & Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-center text-xs text-gray-400 hover:text-white transition-colors duration-150 py-1"
            >
              Back to Phone Number Entry
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
