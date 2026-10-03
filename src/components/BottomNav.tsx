import React from 'react';
import { History, User, Home } from 'lucide-react';
import { motion } from 'motion/react';
import { Language } from '../types';
import { soundHaptics } from '../utils/soundHaptics';

interface BottomNavProps {
  activeTab: 'home' | 'history' | 'profile';
  onChangeTab: (tab: 'home' | 'history' | 'profile') => void;
  language: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, language }) => {
  const tabs = [
    {
      id: 'home' as const,
      label: language === 'hi' ? 'होम' : language === 'bn' ? 'হোম' : 'Home',
      icon: Home,
    },
    {
      id: 'history' as const,
      label: language === 'hi' ? 'इतिहास' : language === 'bn' ? 'ইতিহাস' : 'History',
      icon: History,
    },
    {
      id: 'profile' as const,
      label: language === 'hi' ? 'प्रोफाइल' : language === 'bn' ? 'প্রোফাইল' : 'Profile',
      icon: User,
    },
  ];

  const handleTabClick = (tabId: 'home' | 'history' | 'profile') => {
    soundHaptics.playPop();
    onChangeTab(tabId);
  };

  return (
    <nav className="fixed bottom-4 inset-x-4 max-w-xs mx-auto z-40 liquid-glass-nav rounded-full p-1.5 transition-all duration-300 shadow-[0_12px_32px_-4px_rgba(217,148,38,0.14)] border border-[#F3E8C8]">
      <div className="flex items-center justify-around relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className="relative flex items-center justify-center py-2 px-3.5 rounded-full transition-all duration-200 liquid-ripple group active:scale-95 z-10 cursor-pointer"
            >
              {isActive && (
                <motion.div
                  layoutId="activeBottomNavPill"
                  className="absolute inset-0 bg-gradient-to-r from-[#292524] to-[#1C1917] rounded-full shadow-xs -z-10 border border-amber-500/20"
                  style={{ willChange: 'transform', transform: 'translateZ(0)' }}
                  transition={{ type: 'spring', stiffness: 550, damping: 36, mass: 0.6 }}
                />
              )}
              <span className={`flex items-center gap-1.5 transition-colors duration-200 ${
                isActive ? 'text-amber-100 font-semibold' : 'text-[#78716C] group-hover:text-[#1A1A18]'
              }`}>
                <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'stroke-[2.2] text-amber-300' : 'stroke-[1.8]'
                }`} />
                <span className="text-xs font-medium">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
