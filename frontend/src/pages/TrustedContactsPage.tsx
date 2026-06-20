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
        <h2 className="text-2xl font-black text-slate-800">Trusted Contacts</h2>
        <p className="text-xs text-slate-500 font-medium">Configure priority guardian details. These contacts receive live maps and emergency alert triggers.</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex gap-2 items-start shadow-sm font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex gap-2 items-start shadow-sm font-semibold">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Form to add/edit contact */}
        <div className="glass-card p-6 space-y-5">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-600" />
            {editingId ? 'Edit Guardian Details' : 'Add New Guardian'}
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Guardian Name</label>
              <input
                type="text"
                placeholder="E.g., Mom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 px-4 text-slate-800 text-xs outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
              <input
                type="tel"
                placeholder="E.g., +91 99999 88888"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 px-4 text-slate-800 text-xs outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Alert Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full glass-input rounded-xl py-2.5 px-4 text-slate-800 text-xs outline-none transition"
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
                className="flex-1 py-3 bg-brand-650 hover:bg-brand-700 text-white font-bold rounded-xl transition duration-150 text-xs shadow-md"
              >
                {loading ? 'Saving...' : editingId ? 'Update Guardian' : 'Register Priority Guardian'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="py-3 px-4 bg-white/40 hover:bg-white/60 text-slate-600 font-bold rounded-xl transition duration-150 text-xs border border-white/50 shadow-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Side: List of configured contacts */}
        <div className="md:col-span-2 glass-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            Configured Guardians ({contacts.length})
          </h3>

          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div 
                key={contact.id || index}
                className="p-4 glass-item rounded-xl flex justify-between items-center text-xs"
              >
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-700 font-black">
                    P{contact.priority}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{contact.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{contact.phone}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditSelect(contact)}
                    className="p-2 bg-white/60 border border-white/50 hover:border-brand-500/20 text-slate-500 hover:text-brand-600 rounded-lg transition shadow-sm"
                    title="Edit Guardian"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(contact.id)}
                    className="p-2 bg-white/60 border border-white/50 hover:border-red-500/20 text-slate-500 hover:text-red-650 rounded-lg transition shadow-sm"
                    title="Remove Guardian"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {contacts.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500 font-semibold">
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
