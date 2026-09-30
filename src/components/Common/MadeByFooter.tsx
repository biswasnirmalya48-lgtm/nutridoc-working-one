import React from 'react';

interface MadeByFooterProps {
  className?: string;
}

export const MadeByFooter: React.FC<MadeByFooterProps> = ({ className = '' }) => {
  return (
    <footer className={`w-full text-center z-10 py-3.5 select-none ${className}`}>
      <p className="text-xs font-medium text-[#737373] tracking-normal inline-flex items-center justify-center">
        <span>Made With </span>
        <span
          className="animate-heart-pump text-rose-500 mx-1.5 text-sm select-none inline-block drop-shadow-xs"
          role="img"
          aria-label="heart"
        >
          ❤️
        </span>
        <span> by Nirmalya !</span>
      </p>
    </footer>
  );
};
