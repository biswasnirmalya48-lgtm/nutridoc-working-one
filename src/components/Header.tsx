import React from 'react';
import { Language, UserAccount, UserProfile } from '../types';

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
          {/* Google Login / Avatar Button */}
          {currentUser ? (
            <button
              onClick={onOpenGoogleAuth}
              className="relative p-0.5 rounded-full border border-black/10 hover:border-black/25 active:scale-95 transition-all shadow-xs flex items-center bg-white"
              title={`${currentUser.name} (${currentUser.email})`}
            >
              <img
                src={currentUser.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(currentUser.email)}`}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 border border-white" />
            </button>
          ) : (
            <button
              onClick={onOpenGoogleAuth}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-black/10 shadow-xs hover:bg-[#F7F7F5] active:scale-95 transition-all text-[11px] font-semibold text-[#161616]"
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
                  className={`relative px-2 py-0.5 text-[11px] font-medium rounded-full transition-all duration-200 z-10 ${
                    isSelected ? 'bg-white text-[#161616] font-semibold shadow-xs' : 'text-[#737373] hover:text-[#161616]'
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
