import React from 'react';
import { motion } from 'motion/react';
import { Language, UserProfile } from '../types';

interface HeaderProps {
  profile: UserProfile;
  onUpdateLanguage: (lang: Language) => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({ profile, onUpdateLanguage, onOpenProfile }) => {
  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'hi', label: 'हिं' },
    { code: 'bn', label: 'বাং' },
  ];

  const activeConditions = Object.entries(profile.conditions)
    .filter(([_, active]) => active)
    .map(([key]) => {
      switch (key) {
        case 'diabetes': return 'Sugar';
        case 'highBP': return 'BP';
        case 'cholesterol': return 'Lipids';
        case 'weightManagement': return 'Weight';
        default: return key;
      }
    });

  return (
    <div className="sticky top-2.5 z-40 w-full max-w-md mx-auto px-3.5 pointer-events-none">
      <header className="pointer-events-auto liquid-glass-nav rounded-[22px] px-3.5 h-13 flex items-center justify-between transition-all">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold tracking-tight text-[#161616]">
            NutriDoc
          </span>
          <span className="text-[11px] text-[#737373] font-normal hidden sm:inline">
            {profile.language === 'hi' ? 'स्वास्थ्य मार्गदर्शक' : profile.language === 'bn' ? 'স্বাস্থ্য সহায়ক' : 'Everyday Health'}
          </span>
        </div>

        {/* Minimal Navigation Controls on the Right */}
        <div className="flex items-center gap-1.5">
          {/* Active Profile Health Pill with subtle refraction */}
          <button
            onClick={onOpenProfile}
            className="relative liquid-ripple text-xs text-[#525252] hover:text-[#161616] px-2.5 py-1 rounded-full liquid-glass-capsule active:scale-95 transition-all flex items-center gap-1"
            title="Edit health profile"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
            <span className="font-medium text-[11px] max-w-[85px] truncate">
              {activeConditions.length > 0 ? activeConditions.slice(0, 2).join(' · ') : profile.ageRange}
            </span>
          </button>

          {/* Liquid Language Switcher with sliding capsule */}
          <div className="relative flex items-center bg-black/[0.03] p-0.5 rounded-full border border-black/[0.04]">
            {languages.map((l) => {
              const isSelected = profile.language === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => onUpdateLanguage(l.code)}
                  className="relative px-2 py-0.5 text-[11px] font-medium transition-colors z-10"
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeLangCapsule"
                      className="absolute inset-0 rounded-full liquid-glass-capsule shadow-2xs"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span
                    className={`relative z-10 transition-colors duration-150 ${
                      isSelected ? 'text-[#161616] font-semibold' : 'text-[#737373] hover:text-[#161616]'
                    }`}
                  >
                    {l.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>
    </div>
  );
};
