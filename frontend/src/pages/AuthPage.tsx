import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { Shield, Smartphone, KeyRound, ArrowRight, Info, CheckCircle2 } from 'lucide-react';

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

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    
    setLoading(true);
    setError('');
    
    try {
      const formattedPhone = phone.trim();
      const res = await api.requestOtp(formattedPhone);
      setOtpMessage(res.message);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP verification. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await api.verifyOtp(phone, otp, name);
      // Save in Zustand
      setAuth(res.user, res.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed. Double check and retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative font-sans">
      
      {/* Background blur blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-brand-500/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-brand-500/5 blur-[80px] pointer-events-none" />

      <div className="glass-card max-w-md w-full p-8 rounded-2xl border border-gray-800 shadow-2xl relative z-10 overflow-hidden">
        
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20 mb-4 animate-pulse-slow">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide">Secure Sign In</h2>
          <p className="text-xs text-gray-400 mt-1">FEMME AI Passive Travel Shield</p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-lg mb-6 leading-relaxed flex gap-2 items-start">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
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
                  placeholder="+91 99999 99999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-3 pl-11 pr-4 text-white text-sm outline-none transition duration-200"
                  required
                />
              </div>
            </div>



            <button
              type="submit"
              disabled={loading || !phone}
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
