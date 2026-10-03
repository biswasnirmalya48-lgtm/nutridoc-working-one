import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Sun } from 'lucide-react';
import { Language, UserAccount, UserProfile } from '../types';
import { soundHaptics } from '../utils/soundHaptics';

interface HeaderProps {
  profile: UserProfile;
  currentUser: UserAccount | null;
  onUpdateLanguage: (lang: Language) => void;
  onOpenProfile: () => void;
  onOpenGoogleAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  currentUser,
  onUpdateLanguage,
  onOpenProfile,
  onOpenGoogleAuth,
}) => {
  const [soundActive, setSoundActive] = useState(soundHaptics.isSoundEnabled());

  const toggleSound = () => {
    const nextState = !soundActive;
    soundHaptics.setSoundEnabled(nextState);
    setSoundActive(nextState);
    if (nextState) {
      soundHaptics.playSuccess();
    } else {
      soundHaptics.vibrate(20);
    }
  };

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
      <header className="pointer-events-auto liquid-glass-nav rounded-[22px] px-3.5 h-13 flex items-center justify-between transition-all duration-300 hover:shadow-[0_12px_36px_-4px_rgba(217,148,38,0.12)] border border-[#F3E8C8]">
        {/* Brand with Warm Natural Botanical Touch */}
        <div className="flex items-center gap-1.5 group cursor-default">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 via-amber-300 to-emerald-400 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.5)]">
            <span className="text-[10px]">🌱</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold tracking-tight text-[#1A1A18] flex items-center gap-1">
              NutriDoc
              <span className="text-[9px] font-semibold text-amber-700 bg-amber-100/80 px-1 py-0.2 rounded-full border border-amber-300/60 leading-none">
                Pure
              </span>
            </span>
            <span className="text-[10px] text-[#78716C] font-normal leading-tight hidden sm:inline">
              {profile.language === 'hi' ? 'प्राकृतिक स्वास्थ्य' : profile.language === 'bn' ? 'প্রাকৃতিক স্বাস্থ্য' : 'Natural Health'}
            </span>
          </div>
        </div>

        {/* Minimal Navigation Controls on the Right */}
        <div className="flex items-center gap-1.5">
          {/* Sound & Touch Haptics Log / Toggle Pill */}
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-full liquid-glass-capsule active:scale-90 transition-all flex items-center justify-center cursor-pointer border ${
              soundActive
                ? 'text-amber-800 border-amber-200/80 bg-amber-50/70 shadow-xs'
                : 'text-[#A8A29E] border-black/[0.04]'
            }`}
            title={soundActive ? 'Sound & Touch Haptics: Active' : 'Sound & Touch Haptics: Muted'}
          >
            {soundActive ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#A8A29E]" />
            )}
          </button>

          {/* Google Login / Avatar Button */}
          {currentUser ? (
            <button
              onClick={() => {
                soundHaptics.playTap();
                onOpenGoogleAuth();
              }}
              className="relative p-0.5 rounded-full border border-amber-200 hover:border-amber-400 active:scale-95 transition-all shadow-xs flex items-center bg-white spring-bounce cursor-pointer"
              title={`${currentUser.name} (${currentUser.email})`}
            >
              <img
                src={currentUser.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(currentUser.email)}`}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 border border-white shadow-[0_0_4px_#10B981]" />
            </button>
          ) : (
            <button
              onClick={() => {
                soundHaptics.playTap();
                onOpenGoogleAuth();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md border border-amber-200/70 shadow-xs hover:bg-amber-50/60 active:scale-95 transition-all text-[11px] font-semibold text-[#1A1A18] spring-bounce cursor-pointer"
              title="Sign in with Google"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.13z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/>
              </svg>
              <span>Sign In</span>
            </button>
          )}

          {/* Active Profile Health Pill with Honey Chamomile highlight */}
          <button
            onClick={() => {
              soundHaptics.playTap();
              onOpenProfile();
            }}
            className="relative liquid-ripple text-xs text-[#57534E] hover:text-[#1A1A18] px-2.5 py-1 rounded-full liquid-glass-capsule border border-amber-200/60 active:scale-95 transition-all flex items-center gap-1 spring-bounce cursor-pointer"
            title="Edit health profile"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
            <span className="font-medium text-[11px] max-w-[80px] truncate text-[#44403C]">
              {activeConditions.length > 0 ? activeConditions.slice(0, 2).join(' · ') : profile.ageRange}
            </span>
          </button>

          {/* Liquid Language Switcher */}
          <div className="relative flex items-center bg-amber-100/40 p-0.5 rounded-full border border-amber-200/50 backdrop-blur-md">
            {languages.map((l) => {
              const isSelected = profile.language === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => {
                    soundHaptics.playTap();
                    onUpdateLanguage(l.code);
                  }}
                  className={`relative px-2 py-0.5 text-[11px] font-medium rounded-full transition-all duration-300 z-10 active:scale-90 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-[#1A1A18] font-semibold shadow-xs scale-102 border border-amber-200/50'
                      : 'text-[#78716C] hover:text-[#1A1A18]'
                  }`}
                >
                  <span>{l.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>
    </div>
  );
};
