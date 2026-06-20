import React from 'react';
import { CountUp } from 'react-countup';
import { motion } from 'framer-motion';

/**
 * AnimatedCounter displays a numeric value with a counting animation.
 * It accepts a target number, an optional suffix, and a label.
 * The component fades/scale in using Framer Motion.
 */
const AnimatedCounter: React.FC<{
  end: number;
  suffix?: string;
  label: string;
}> = ({ end, suffix = '', label }) => {
  return (
    <motion.div
      className="flex flex-col items-center p-4 bg-dark-950/30 border border-gray-800 rounded-xl"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <CountUp
        start={0}
        end={end}
        duration={2}
        separator="," 
        suffix={suffix}
        className="text-3xl font-bold text-white"
      />
      <span className="mt-1 text-xs font-medium text-gray-400">{label}</span>
    </motion.div>
  );
};

export default AnimatedCounter;
