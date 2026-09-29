import React from 'react';
import { Home, History, User } from 'lucide-react';
import { Language } from '../types';

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#F7F7F5]/90 backdrop-blur-xl border-t border-black/[0.05] pb-[env(safe-area-inset-bottom,12px)] pt-1">
      <div className="max-w-md mx-auto px-6 h-14 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive ? 'text-black' : 'text-[#86868B] hover:text-[#505054]'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.7]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-black" />
                )}
              </div>
              <span className={`text-[11px] mt-1 transition-all ${isActive ? 'font-semibold text-black' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
