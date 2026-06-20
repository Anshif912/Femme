import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  onRetry: () => void;
}

export const LocationPermissionModal: React.FC<Props> = ({ onRetry }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-dark-900 border border-gray-800 rounded-xl p-6 max-w-sm w-full glass-card shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
          <h2 className="text-lg font-bold text-white">Location Access Required</h2>
        </div>
        <p className="text-sm text-gray-300 mb-6">
          The app needs your browser location to enable real‑time route monitoring and safety tracking.
          <br />
          Please grant permission or retry the request.
        </p>
        <button
          onClick={onRetry}
          className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md transition"
        >
          Retry Permission
        </button>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
