import React from 'react';
import { motion } from 'motion/react';

interface MadeByFooterProps {
  className?: string;
  variant?: 'footer' | 'pill' | 'dark';
}

export const MadeByFooter: React.FC<MadeByFooterProps> = ({
  className = '',
  variant = 'footer',
}) => {
  if (variant === 'dark') {
    return (
      <div className={`select-none flex items-center justify-center ${className}`}>
        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/90 shadow-lg text-[11px] font-medium tracking-tight"
        >
          <span className="text-white/70">Made with</span>
          <span
            className="animate-heart-pump text-rose-500 text-xs inline-block select-none"
            role="img"
            aria-label="heart"
          >
            ❤️
          </span>
          <span className="font-semibold text-white">by Nirmalya !</span>
        </motion.div>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div className={`select-none flex items-center justify-center ${className}`}>
        <motion.div
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full liquid-glass-capsule border border-amber-200/70 text-[#78716C] shadow-2xs text-[11px] font-medium tracking-tight cursor-default transition-all duration-200"
        >
          <span>Made with</span>
          <span
            className="animate-heart-pump text-rose-500 text-xs inline-block select-none"
            role="img"
            aria-label="heart"
          >
            ❤️
          </span>
          <span className="font-semibold text-[#1A1A18]">by Nirmalya !</span>
        </motion.div>
      </div>
    );
  }

  return (
    <footer className={`w-full text-center z-10 select-none flex items-center justify-center ${className}`}>
      <motion.div
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full liquid-glass-capsule border border-amber-200/60 shadow-2xs text-xs font-medium text-[#78716C] cursor-default transition-all duration-200"
      >
        <span>Made with</span>
        <span
          className="animate-heart-pump text-rose-500 text-xs inline-block select-none"
          role="img"
          aria-label="heart"
        >
          ❤️
        </span>
        <span className="font-semibold text-[#1A1A18]">by Nirmalya !</span>
      </motion.div>
    </footer>
  );
};
