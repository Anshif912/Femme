import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { User, ShieldCheck, Heart, UserPlus, Info, CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUserFields, updateUserProfile } = useStore();

  const [name, setName] = useState(user?.name || '');
  const [medicalInfo, setMedicalInfo] = useState(user?.profile?.medical_info || '');
  const [emergencyCard, setEmergencyCard] = useState(user?.profile?.emergency_card || '');
  const [bloodGroup, setBloodGroup] = useState(user?.profile?.blood_group || '');
  const [cabPreference, setCabPreference] = useState(user?.profile?.primary_cab_preference || 'Uber');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      // 1. Update basic fields (name) if modified
      if (name !== user?.name) {
        await api.verifyOtp(user?.phone || '', '000000', name); // Mock verification bypass
        updateUserFields({ name });
      }

      // 2. Update profile card
      const newProfile = {
        medical_info: medicalInfo,
        emergency_card: emergencyCard,
        blood_group: bloodGroup,
        primary_cab_preference: cabPreference
      };
      
      await api.updateProfile(newProfile);
      updateUserProfile(newProfile);
      
      setMessage('Profile settings and emergency card successfully updated.');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-white">Traveler Profile</h2>
        <p className="text-xs text-gray-400">Configure medical details and emergency identity profiles to assist responders during critical situations.</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex gap-2 items-start">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl flex gap-2 items-start">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Basic settings */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 h-fit">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-brand-500" />
            Identity Card
          </h3>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number (Verified)</label>
              <input
                type="text"
                value={user?.phone || ''}
                className="w-full bg-dark-950 border border-gray-800 rounded-xl py-2.5 px-4 text-gray-500 text-xs outline-none select-none cursor-not-allowed font-mono"
                disabled
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="E.g., Ananya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-4 text-white text-xs outline-none transition"
                required
              />
            </div>
          </div>
        </div>

        {/* Emergency medical settings */}
        <div className="md:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-brand-500 fill-brand-500/10" />
            First Responder Emergency Card
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Blood Group</label>
              <input
                type="text"
                placeholder="E.g., O-positive"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-4 text-white text-xs outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cab Provider Preference</label>
              <select
                value={cabPreference}
                onChange={(e) => setCabPreference(e.target.value)}
                className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-4 text-white text-xs outline-none transition"
              >
                <option value="Uber">Uber</option>
                <option value="Ola">Ola</option>
                <option value="Rapido">Rapido</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Medical Conditions & Allergies</label>
            <textarea
              rows={2}
              placeholder="E.g., Penicillin allergy, diabetic, wears contact lenses..."
              value={medicalInfo}
              onChange={(e) => setMedicalInfo(e.target.value)}
              className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl p-3 text-xs outline-none text-white transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Emergency Card Notes (Visible during SOS)</label>
            <textarea
              rows={3}
              placeholder="Describe primary instructions (e.g., call Dad first at +91 99999 88888, my medical details are logged above)..."
              value={emergencyCard}
              onChange={(e) => setEmergencyCard(e.target.value)}
              className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl p-3 text-xs outline-none text-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition duration-150 text-xs shadow-md"
          >
            {loading ? 'Saving Changes...' : 'Save Emergency Card Profile'}
          </button>
        </div>

      </form>
    </div>
  );
};
export default ProfilePage;
