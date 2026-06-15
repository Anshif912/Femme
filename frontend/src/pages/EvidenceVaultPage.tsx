import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Lock, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Clock, Download, RefreshCw } from 'lucide-react';

export const EvidenceVaultPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchHistory = async () => {
    try {
      const data = await api.getHistory();
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDownloadPDF = async (journeyId: string, cabNumber: string) => {
    try {
      const filename = `FEMME_Evidence_${cabNumber}_${journeyId.slice(0, 8)}.pdf`;
      await api.downloadFirPdf(journeyId, filename);
    } catch (err: any) {
      alert(`PDF download failed: ${err.message}`);
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
      alert(err.message || 'Cleanup task failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Evidence Vault</h2>
          <p className="text-xs text-gray-400">Cryptographically sealed records repository. Locked permanently in emergency states.</p>
        </div>
        
        <button
          onClick={handleRetentionCleanup}
          disabled={loading}
          className="px-4 py-2 bg-dark-900 hover:bg-dark-800 disabled:bg-gray-800 border border-gray-800 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Run Retention Cleanup (24h Rule)
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex gap-2 items-start">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {/* Grid of history cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {history.map((journey, index) => {
          const isEmergency = journey.status === 'emergency';
          const isCompleted = journey.status === 'completed';
          return (
            <div 
              key={journey.id || index}
              className={`glass-card p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
                isEmergency ? 'border-red-500/30 bg-red-950/5 shadow-lg shadow-red-500/5' : 'border-gray-800/80 hover:border-gray-700'
              }`}
            >
              
              <div className="space-y-3">
                
                {/* Header status */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-mono">{new Date(journey.start_time).toLocaleDateString()}</span>
                  
                  {isEmergency ? (
                    <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      LOCKED EVIDENCE
                    </span>
                  ) : isCompleted ? (
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold rounded flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      SAFE ARRIVAL
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-400 font-semibold rounded">
                      {journey.status.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Cab Plate */}
                <div>
                  <h4 className="text-lg font-black text-white uppercase tracking-wider">{journey.cab_number}</h4>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">{journey.provider}</p>
                </div>

                {/* Route detail addresses */}
                <div className="space-y-1.5 text-xs text-gray-400 border-t border-gray-900 pt-3">
                  <div className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5"></span>
                    <span className="truncate">Source: {journey.pickup_address}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5"></span>
                    <span className="truncate">Destination: {journey.dest_address}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-900 pt-3 flex gap-2.5">
                <button
                  onClick={() => handleDownloadPDF(journey.id, journey.cab_number)}
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  FIR PDF Assist
                </button>
                <button
                  onClick={() => navigate(`/fir?journey=${journey.id}`)}
                  className="px-3 py-2 bg-dark-950 hover:bg-dark-900 border border-gray-800 text-gray-400 hover:text-white rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Inspect
                </button>
              </div>

            </div>
          );
        })}

        {history.length === 0 && (
          <div className="col-span-2 py-16 text-center text-xs text-gray-500 font-light">
            No logged journey evidence capsules found in vault history.
          </div>
        )}
      </div>

    </div>
  );
};
export default EvidenceVaultPage;
