import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, BellRing, Navigation, AlertOctagon, Heart, Users } from 'lucide-react';
import { useStore } from '../store/useStore';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useStore();

  const features = [
    {
      title: "Automatic Journey Detection",
      desc: "Intercepts incoming Ola, Uber, and Rapido messages/notifications. Starts tracking instantly, hands-free.",
      icon: Navigation
    },
    {
      title: "Shield Mode Telemetry",
      desc: "Monitors GPS coordinates, speed vectors, accelerometer vibrations, and ambient audio distress frequencies in the background.",
      icon: Shield
    },
    {
      title: "Tamper-Proof Capsule",
      desc: "Hashes telemetry markers every 30s using SHA-256 signatures to preserve chronological evidence custody.",
      icon: Lock
    },
    {
      title: "Smart Escalations",
      desc: "Triggers prompt verification warnings when off-route turns or unexpected stops happen. Escalates in 60s if no response.",
      icon: BellRing
    },
    {
      title: "Trusted Contacts Sync",
      desc: "Shares live GPS maps, SMS emergency notifications, and arrival reports to priority contact lists automatically.",
      icon: Users
    },
    {
      title: "Community Map Safety",
      desc: "Allows crowd-sourced dangerous zones reviews, safety scorers, and safe stop recommendations nearby.",
      icon: AlertOctagon
    }
  ];

  return (
    <div className="min-h-screen bg-dark-950 text-gray-100 flex flex-col font-sans select-none overflow-x-hidden">
      
      {/* Background radial effects */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(244,63,94,0.12),transparent_50%)] pointer-events-none z-0" />
      
      {/* Header bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-white tracking-wide">FEMME</h1>
            <p className="text-[9px] text-brand-400 font-bold tracking-widest leading-none">SHE TRAVELS. WE GUARD.</p>
          </div>
        </div>

        <button 
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
          className="px-5 py-2.5 bg-dark-900 border border-gray-800 text-sm font-semibold text-gray-200 hover:text-white rounded-xl hover:bg-dark-800/80 transition duration-200 shadow-md"
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
        </button>
      </header>

      {/* Hero Section */}
      <section className="flex-1 max-w-5xl mx-auto px-6 py-12 md:py-24 text-center z-10 relative flex flex-col items-center justify-center">
        
        {/* Banner badge */}
        <div className="mb-6 px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold rounded-full tracking-wider animate-pulse uppercase">
          AI Invisible Travel Guardian
        </div>

        <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6 max-w-4xl">
          She Travels. <br className="md:hidden" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-rose-500 to-brand-600">We Guard.</span>
        </h2>
        
        <p className="text-gray-400 text-base md:text-xl max-w-2xl mb-10 leading-relaxed font-light">
          A production-grade, background-monitoring safety application. We parse cab notifications, track anomalies, notify emergency contacts, and seal cryptographically secure evidence.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full max-w-md">
          <button
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
            className="flex-1 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition duration-200 shadow-lg shadow-brand-500/20 hover:scale-[1.02]"
          >
            Get Protected Now
          </button>
          <a
            href="#how-it-works"
            className="flex-1 py-3.5 bg-dark-900/60 hover:bg-dark-800 border border-gray-800 text-gray-300 font-semibold rounded-xl transition duration-200 flex items-center justify-center"
          >
            Learn More
          </a>
        </div>

        {/* Feature Grid */}
        <div id="how-it-works" className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <div 
                key={idx}
                className="glass-card p-6 rounded-2xl border border-gray-800/60 hover:border-brand-500/20 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-brand-500/5 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-5 group-hover:bg-brand-500/10 group-hover:border-brand-500/20 transition-all duration-300">
                  <Icon className="w-5 h-5 text-brand-400 group-hover:text-brand-500 transition-colors" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">{f.title}</h4>
                <p className="text-sm text-gray-400 leading-relaxed font-light">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-dark-900/40 border-t border-gray-900 py-8 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left text-xs text-gray-500">
          <div>
            <p className="font-bold text-gray-400 mb-1">FEMME GUARD NETWORKS</p>
            <p>© 2026 Femme Inc. All rights reserved. Created with absolute priority for safety.</p>
          </div>
          <div className="flex items-center gap-1">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 text-brand-500 fill-brand-500" />
            <span>for a safer world.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
