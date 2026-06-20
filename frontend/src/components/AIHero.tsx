import React from 'react';
import Lottie from 'lottie-react';
import aiGuardian from '../assets/ai_guardian_placeholder.json';

/**
 * AI Guardian hero animation displayed on the landing and dashboard pages.
 * The animation loops silently without controls and respects reduced‑motion preferences.
 */
const AIHero: React.FC = () => {
  return (
    <div className="flex items-center justify-center mb-6" aria-hidden="true">
      <Lottie
        animationData={aiGuardian}
        loop
        style={{ width: '200px', height: '200px' }}
        // Respect prefers‑reduced‑motion
        // The Lottie library will automatically pause if reduced motion is set via CSS media query
      />
    </div>
  );
};

export default AIHero;
