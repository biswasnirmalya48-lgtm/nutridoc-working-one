import React from 'react';
import { Language, UserProfile } from '../types';
import { Sparkles, Globe, HeartPulse } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-[#F7F7F5]/90 backdrop-blur-md border-b border-black/[0.04] transition-all">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shadow-xs">
            <span className="font-semibold text-sm tracking-tight text-white flex items-center">
              N<span className="text-emerald-400 text-xs">●</span>
            </span>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-[#1D1D1F] leading-none">
              NutriDoc
            </h1>
            <p className="text-[10px] text-[#86868B] font-medium tracking-wide">
              {profile.language === 'hi' ? 'स्वास्थ्य मार्गदर्शक' : profile.language === 'bn' ? 'স্বাস্থ্য সহায়িকা' : 'Health & Nutrition'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Active Profile Health Tag */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-black/[0.04] text-[#1D1D1F] hover:bg-black/[0.07] transition-colors"
            title="Active health profile"
          >
            <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px]">
              {activeConditions.length > 0 ? activeConditions.slice(0, 2).join(' • ') : profile.ageRange}
            </span>
          </button>

          {/* Language Selector */}
          <div className="flex items-center bg-black/[0.04] p-0.5 rounded-full border border-black/[0.02]">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => onUpdateLanguage(l.code)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all ${
                  profile.language === l.code
                    ? 'bg-white text-black shadow-xs'
                    : 'text-[#86868B] hover:text-black'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
