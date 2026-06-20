import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { FileWarning, Search, ThumbsDown, Star, AlertOctagon, CheckCircle2, ShieldAlert } from 'lucide-react';

export const CommunityReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any[] | null>(null);

  // Form states
  const [cabNumber, setCabNumber] = useState('');
  const [provider, setProvider] = useState('uber');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const tagsList = ["Speeding", "Rude Behavior", "Wrong Route", "Unwanted Conversation", "Unclean Car", "Locked Doors"];

  const fetchReports = async () => {
    try {
      const data = await api.getCabsReports();
      setReports(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!cabNumber || !review) {
      setError('Cab Plate number and Review fields are required.');
      return;
    }

    setLoading(true);
    try {
      await api.addCabReport({
        cab_number: cabNumber,
        provider,
        rating,
        review,
        tags: selectedTags,
        latitude: 12.9716, // Mock default Bengaluru coordinates for maps
        longitude: 77.5946
      });
      
      setCabNumber('');
      setReview('');
      setSelectedTags([]);
      setRating(5);
      setMessage('Anonymous cab report successfully logged to community ledger.');
      fetchReports();
    } catch (err: any) {
      setError(err.message || 'Failed to file cab report.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) {
      setSearchResult(null);
      return;
    }
    
    try {
      const data = await api.getCabReportsByPlate(searchQuery);
      setSearchResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      <div>
        <h2 className="text-2xl font-black text-white">Community Cab Warnings & Reports</h2>
        <p className="text-xs text-gray-400">Log reviews anonymously to protect other women. Search cab plates to verify driver histories.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Anonymous Report Form */}
        <div className="glass-card p-6 space-y-5 h-fit">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ThumbsDown className="w-5 h-5 text-brand-500" />
            File Anonymous Cab Review
          </h3>

          <form onSubmit={handleReport} className="space-y-4">
            
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Cab Plate Number</label>
              <input
                type="text"
                placeholder="E.g., KA03MM1122"
                value={cabNumber}
                onChange={(e) => setCabNumber(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 px-4 text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full glass-input rounded-xl py-2.5 px-4 text-xs"
              >
                <option value="uber">Uber</option>
                <option value="ola">Ola</option>
                <option value="rapido">Rapido</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Safety Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-slate-500 hover:text-amber-400 transition"
                  >
                    <Star className={`w-6 h-6 ${star <= rating ? 'text-amber-400 fill-amber-400' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Warning Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {tagsList.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                        isSelected 
                          ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
                          : 'bg-white/40 border border-white/50 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Detailed Review</label>
              <textarea
                rows={3}
                placeholder="Describe driver behavior, anomalies, or route concerns..."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-xs"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition duration-150 text-xs shadow-md"
            >
              Submit Report (100% Anonymous)
            </button>
          </form>
        </div>
        {/* Right column: Search & Feed */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Lookup plate */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Search className="w-4.5 h-4.5 text-brand-500" />
              Lookup Cab Plate History
            </h3>

            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter exact cab number (e.g., KA03MM1122)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 glass-input rounded-xl py-2.5 px-4 text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-white/60 border border-white/40 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition backdrop-blur-md"
              >
                Search Plate
              </button>
            </form>

            {searchResult !== null && (
              <div className="border-t border-slate-200/60 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Results</h4>
                {searchResult.map((r, i) => (
                  <div key={i} className="p-4 bg-red-50/40 border border-red-500/20 rounded-xl space-y-2 text-slate-800">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-900 uppercase">{r.provider} ({r.cab_number})</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {r.rating}/5
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-light">{r.review}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {r.tags.map((t: string) => (
                        <span key={t} className="px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded text-[9px] border border-red-500/10 font-bold">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}

                {searchResult.length === 0 && (
                  <div className="p-4 bg-emerald-50/40 border border-emerald-500/20 text-emerald-700 text-xs rounded-xl flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Zero incident reports matches for cab: <strong>{searchQuery.toUpperCase()}</strong>. Secured.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* General Report Feed */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Recent Community Warning Ledger</h3>

            <div className="space-y-3">
              {reports.map((report, idx) => (
                <div key={idx} className="p-4 glass-item rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900 uppercase tracking-wider">{report.cab_number}</p>
                      <p className="text-[9px] text-slate-500 font-semibold uppercase">{report.provider}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex text-amber-400">
                        {Array.from({ length: report.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-600 leading-normal font-light">{report.review}</p>
                  
                  {report.tags && report.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {report.tags.map((tag: string, index: number) => (
                        <span 
                          key={index}
                          className="px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded text-[9px] font-bold border border-red-500/10"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {reports.length === 0 && (
                <p className="text-xs text-slate-500 font-light text-center py-6">
                  No community warnings filed yet. Safe commute ledger is empty.
                </p>
              )}
            </div>
          </div>

        </div>      </div>
    </div>
  );
};
export default CommunityReportsPage;
