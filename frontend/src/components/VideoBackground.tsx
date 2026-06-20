import React from 'react';

/**
 * Global video background layer.
 * Renders the looping guard video at low opacity.
 * Hidden on mobile, low‑performance devices, and when the user prefers reduced motion.
 */
const VideoBackground: React.FC = () => {
  return (
    <video
      className="bg-video"
      src="/guardian.mp4"
      autoPlay
      loop
      muted
      playsInline
    />
  );
};

export default VideoBackground;
