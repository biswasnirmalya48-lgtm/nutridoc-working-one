import React from 'react';
import { History, User, Home } from 'lucide-react';
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
    <nav className="fixed bottom-4 inset-x-4 max-w-xs mx-auto z-40 liquid-glass-nav rounded-full p-1.5 transition-all">
      <div className="flex items-center justify-around relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex items-center justify-center py-2 px-4 rounded-full transition-all duration-200 liquid-ripple ${
                isActive ? 'bg-[#161616] text-white shadow-xs' : 'text-[#737373] hover:text-[#161616]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
                <span className="text-xs">{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
