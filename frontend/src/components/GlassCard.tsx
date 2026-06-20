import React, { ReactNode } from 'react';

/**
 * Reusable glass‑morphism card component.
 * Applies a semi‑transparent background with backdrop blur and subtle border.
 * Usage: <GlassCard className="custom" >…</GlassCard>
 */
const GlassCard: React.FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div
      className={`glass-card rounded-xl p-4 shadow-lg backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassCard;
