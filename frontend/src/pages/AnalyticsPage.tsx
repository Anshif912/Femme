import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { BarChart2, Shield, AlertTriangle, TrendingUp, Calendar, Clock } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [historyCount, setHistoryCount] = useState(7);
  const [anomalyCount, setAnomalyCount] = useState(1);
  const [shieldUptime, setShieldUptime] = useState(180); // minutes

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const hist = await api.getHistory();
        setHistoryCount(hist.length);
        
        // Count total anomalies in history (simulation count)
        let totalAnoms = 0;
        hist.forEach((j: any) => {
          if (j.status === 'emergency') totalAnoms += 1;
        });
        setAnomalyCount(totalAnoms);
        setShieldUptime(hist.length * 25); // estimate ~25m per trip
      } catch (e) {}
    };
    fetchStats();
  }, []);

  // Weekly safety scores
  const weeklyScores = [
    { day: "Mon", score: 98, trips: 2 },
    { day: "Tue", score: 95, trips: 1 },
    { day: "Wed", score: 88, trips: 3 },
    { day: "Thu", score: 96, trips: 2 },
    { day: "Fri", score: 92, trips: 1 },
    { day: "Sat", score: 85, trips: 1 },
    { day: "Sun", score: 98, trips: 2 }
  ];

  return (
    <div className="space-y-6">
      
      <div>
        <h2 className="text-2xl font-black text-white">Safety Analytics</h2>
        <p className="text-xs text-gray-400">Weekly safety summaries, shield uptime metrics, and safety score historical trends.</p>
      </div>

      {/* Grid of basic stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="glass-card p-5 rounded-2xl border border-gray-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Average Safety Score</span>
            <span className="text-2xl font-black text-white">93.1/100</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-gray-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Shield Uptime</span>
            <span className="text-2xl font-black text-white">{shieldUptime} <span className="text-xs font-light text-gray-400">mins</span></span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-gray-800 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Critical SOS Triggers</span>
            <span className="text-2xl font-black text-white">{anomalyCount}</span>
          </div>
        </div>

      </div>

      {/* Weekly Safety Score Bar Chart (Premium Custom HTML/CSS build!) */}
      <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-6">
        <div>
          <span className="text-xs font-bold text-brand-400 tracking-widest uppercase mb-0.5 block">Commute Safety Trend</span>
          <h3 className="text-base font-bold text-white">Safety Score Index (Last 7 Days)</h3>
        </div>

        <div className="h-64 flex items-end gap-3 sm:gap-6 border-b border-gray-900 pb-3 pr-2">
          
          {/* Y Axis descriptors */}
          <div className="flex flex-col justify-between h-full text-[9px] text-gray-500 font-bold w-6 shrink-0 select-none pb-2">
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
            <span>0</span>
          </div>

          {weeklyScores.map((dayData, index) => {
            // Determine height percentage
            const heightPercent = `${dayData.score}%`;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end relative">
                
                {/* Score hover tooltip */}
                <div className="absolute top-[-25px] bg-dark-900 border border-gray-800 text-[10px] px-2 py-0.5 rounded font-black text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                  {dayData.score}%
                </div>

                {/* Animated bar */}
                <div 
                  style={{ height: heightPercent }}
                  className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 group-hover:opacity-80 ${
                    dayData.score >= 90 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/5' :
                    dayData.score >= 75 ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-lg shadow-amber-500/5' :
                    'bg-gradient-to-t from-rose-600 to-rose-400 shadow-lg shadow-rose-500/5'
                  }`}
                />
                
                {/* X axis tag */}
                <span className="text-[10px] font-bold text-gray-400 select-none">{dayData.day}</span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 border-t border-gray-900 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Safe Travel (&gt;90)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Caution Advised (75-90)</span>
          </div>
        </div>
      </div>

    </div>
  );
};
export default AnalyticsPage;
