import React from 'react';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * SafetyRoutePanel displays three route options (Safest, Fastest, Balanced)
 * with score, distance, duration, risk level, and reasons.
 * It expects an array of route objects with the following shape:
 *   { type: string; score: number; distance: number; duration: number; reasons?: string[] }
 */
const SafetyRoutePanel: React.FC<{
  routes: Array<{
    type: string;
    score: number;
    distance: number; // meters
    duration: number; // seconds
    reasons?: string[];
  }>;
  selected: string;
  onSelect: (type: string) => void;
}> = ({ routes, selected, onSelect }) => {
  const riskLevel = (score: number) => {
    if (score >= 71) return 'Low';
    if (score >= 41) return 'Medium';
    return 'High';
  };

  const bgColor = (level: string) => {
    switch (level) {
      case 'Low':
        return 'bg-emerald-900/30 border-emerald-500';
      case 'Medium':
        return 'bg-amber-900/30 border-amber-500';
      default:
        return 'bg-rose-900/30 border-rose-500';
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {routes.map((route) => {
        const level = riskLevel(route.score);
        const classes = bgColor(level);
        const isActive = selected === route.type;
        return (
          <div
            key={route.type}
            className={`flex-1 p-4 rounded-lg border ${classes} cursor-pointer transition-transform duration-200 ${isActive ? 'scale-105' : ''}`}
            onClick={() => onSelect(route.type)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase">{route.type.charAt(0).toUpperCase() + route.type.slice(1)} Route</h3>
              <span className="text-xs font-bold">{route.score}/100</span>
            </div>
            <p className="text-xs text-gray-300">Distance: {(route.distance / 1000).toFixed(1)} km</p>
            <p className="text-xs text-gray-300">Duration: {(route.duration / 60).toFixed(0)} min</p>
            <p className="text-xs text-gray-300">Risk: {level}</p>
            {route.reasons && route.reasons.length > 0 && (
              <ul className="mt-2 list-disc list-inside text-xs text-gray-400">
                {route.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SafetyRoutePanel;
