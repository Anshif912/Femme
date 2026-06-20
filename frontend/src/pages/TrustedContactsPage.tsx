/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/rules-of-hooks */
import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import api from '../utils/api';
import { Users, UserPlus, Trash2, ShieldAlert, CheckCircle2, Edit } from 'lucide-react';

export const TrustedContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [priority, setPriority] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleEditSelect = (contact: any) => {
    setEditingId(contact.id);
    setName(contact.name);
    setPhone(contact.phone);
    setPriority(contact.priority);
    setError('');
    setMessage('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setPriority(1);
    setError('');
    setMessage('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!name || !phone) {
      setError('Name and Phone fields are required.');
      return;
    }

    const payload = { name, phone, priority };
    console.log("Adding contact...");
    console.log("Request payload...", payload);

    setLoading(true);
    try {
      let res;
      if (editingId) {
        res = await api.updateContact(editingId, payload);
        console.log("Response received...", res);
        setMessage('Contact details updated successfully.');
        setEditingId(null);
      } else {
        res = await api.addContact(payload);
        console.log("Response received...", res);
        setMessage('Contact successfully registered as priority guardian.');
      }
      setName('');
      setPhone('');
      setPriority(1);
      fetchContacts();
    } catch (err: any) {
      console.log("Response received (error)...", err);
      setError(err.message || 'Failed to save contact.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (confirm("Remove this contact from emergency guardian list?")) {
      try {
        await api.deleteContact(contactId);
        fetchContacts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-white">Trusted Contacts</h2>
        <p className="text-xs text-gray-400">Configure priority guardian details. These contacts receive live maps and emergency alert triggers.</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex gap-2 items-start">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl flex gap-2 items-start">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Form to add/edit contact */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-500" />
            {editingId ? 'Edit Guardian Details' : 'Add New Guardian'}
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Guardian Name</label>
              <input
                type="text"
                placeholder="E.g., Mom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-4 text-white text-xs outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Phone Number</label>
              <input
                type="tel"
                placeholder="E.g., +91 99999 88888"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-4 text-white text-xs outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Alert Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full bg-dark-950 border border-gray-800 focus:border-brand-500/40 rounded-xl py-2.5 px-4 text-white text-xs outline-none transition"
              >
                <option value={1}>Priority 1 (Primary Direct SMS)</option>
                <option value={2}>Priority 2 (Secondary SMS)</option>
                <option value={3}>Priority 3 (Fallback notify only)</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition duration-150 text-xs shadow-md"
              >
                {loading ? 'Saving...' : editingId ? 'Update Guardian' : 'Register Priority Guardian'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition duration-150 text-xs"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: List of configured contacts */}
        <div className="md:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-500" />
            Configured Guardians ({contacts.length})
          </h3>

          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div 
                key={contact.id || index}
                className="p-4 bg-dark-950/40 border border-gray-800/80 rounded-xl flex justify-between items-center text-xs"
              >
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-400 font-black">
                    P{contact.priority}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{contact.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">{contact.phone}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditSelect(contact)}
                    className="p-2 bg-gray-900 border border-gray-800 hover:border-brand-500/20 text-gray-500 hover:text-brand-400 rounded-lg transition"
                    title="Edit Guardian"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 bg-gray-900 border border-gray-800 hover:border-red-500/20 text-gray-500 hover:text-red-400 rounded-lg transition"
                    title="Remove Guardian"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {contacts.length === 0 && (
              <div className="py-12 text-center text-xs text-gray-500 font-light">
                No trusted contacts configured. Make sure to add at least one priority contact before traveling.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default TrustedContactsPage;
