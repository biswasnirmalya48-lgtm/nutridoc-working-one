import React, { useState } from 'react';
import { Camera, FileText, ArrowRight } from 'lucide-react';
import { FoodAnalysisResult, ReportAnalysisResult, ScanHistoryItem, UserProfile } from '../types';
import { MadeByFooter } from './Common/MadeByFooter';

interface HomeViewProps {
  onStartFoodScan: () => void;
  onStartReportScan: () => void;
  profile: UserProfile;
  history?: ScanHistoryItem[];
  onSelectFood?: (item: FoodAnalysisResult) => void;
  onSelectReport?: (item: ReportAnalysisResult) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartFoodScan,
  onStartReportScan,
  profile,
  history = [],
  onSelectFood,
  onSelectReport,
}) => {
  const isHindi = profile.language === 'hi';
  const isBengali = profile.language === 'bn';

  // Liquid option switching state: 'food' | 'report'
  const [activeScanMode, setActiveScanMode] = useState<'food' | 'report'>('food');

  // Calm time-of-day greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? isHindi ? 'शुभ प्रभात' : isBengali ? 'শুভ সকাল' : 'Good morning'
      : hour < 17
      ? isHindi ? 'शुभ दोपहर' : isBengali ? 'শুভ দুপুর' : 'Good afternoon'
      : isHindi ? 'शुभ संध्या' : isBengali ? 'শুভ সন্ধ্যা' : 'Good evening';

  const recentItems = history.slice(0, 3);

  const handleModeSwitch = (mode: 'food' | 'report') => {
    setActiveScanMode(mode);
  };

  return (
    <div className="space-y-5 pb-20 pt-1">
      {/* Calm Header Greeting & Minimal UNSCRIPTED Team Logo */}
      <div className="flex items-center justify-between px-1 gap-2">
        <div className="space-y-0.5 min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-[#161616]">
            {greeting}
          </h2>
          <p className="text-sm text-[#737373] truncate">
            {isHindi
              ? 'आज आप क्या जांचना चाहते हैं?'
              : isBengali
              ? 'আজ কি পরীক্ষা করতে চান?'
              : 'What would you like to check today?'}
          </p>
        </div>

        {/* Minimal Visible Team Logo of 'UNSCRIPTED' */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-black/[0.08] shadow-[0_1px_4px_rgba(0,0,0,0.03)] backdrop-blur-xs select-none hover:border-black/[0.16] transition-all cursor-default shrink-0 group"
          title="Team UNSCRIPTED"
        >
          <div className="w-4 h-4 rounded-[5px] bg-[#161616] text-white flex items-center justify-center text-[9px] font-black tracking-tighter group-hover:scale-105 transition-transform">
            U
          </div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#161616]">
            UNSCRIPTED
          </span>
        </div>
      </div>

      {/* Liquid Mode Pill Switcher (Water-drop flow under glass) */}
      <div className="relative p-1 liquid-glass-capsule rounded-full flex items-center">
        <button
          onClick={() => handleModeSwitch('food')}
          className={`relative flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-full transition-all duration-200 z-10 liquid-ripple ${
            activeScanMode === 'food' ? 'bg-[#161616] text-white shadow-xs' : 'text-[#737373] hover:text-[#161616]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{isHindi ? 'खाद्य स्कैन' : isBengali ? 'খাদ্য স্ক্যান' : 'Food Scan'}</span>
        </button>

        <button
          onClick={() => handleModeSwitch('report')}
          className={`relative flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-full transition-all duration-200 z-10 liquid-ripple ${
            activeScanMode === 'report' ? 'bg-[#161616] text-white shadow-xs' : 'text-[#737373] hover:text-[#161616]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{isHindi ? 'रिपोर्ट / पर्चा' : isBengali ? 'রিপোর্ট স্ক্যান' : 'Report Scan'}</span>
        </button>
      </div>

      {/* The Two Main Action Areas (Large, Elegant, Touch-Friendly) */}
      <div className="grid grid-cols-1 gap-3.5">
        {/* Action 1: Scan Food */}
        <button
          onClick={onStartFoodScan}
          className={`w-full text-left bg-white rounded-[22px] p-5.5 border transition-all flex items-center justify-between gap-4 group liquid-ripple ${
            activeScanMode === 'food'
              ? 'border-black/[0.14] shadow-[0_4px_20px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04]'
              : 'border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-black/[0.1]'
          } active:scale-[0.985]`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-13 h-13 rounded-2xl bg-[#F0EFEA] text-[#161616] flex items-center justify-center shrink-0 group-hover:bg-[#EAE9E4] transition-colors">
              <Camera className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-base font-semibold text-[#161616] tracking-tight">
                {isHindi ? 'खाद्य पैकेट स्कैन करें' : isBengali ? 'খাদ্যের প্যাকেট স্ক্যান করুন' : 'Scan Food'}
              </h3>
              <p className="text-xs text-[#737373] leading-relaxed">
                {isHindi
                  ? 'नमक, चीनी व तेल की मात्रा और स्वस्थ विकल्प'
                  : isBengali
                  ? 'উপাদান ও স্বাস্থ্যকর বিকল্প সন্ধান'
                  : 'Check ingredients, sugars, and healthier swaps'}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#F7F7F5] flex items-center justify-center text-[#737373] group-hover:text-[#161616] shrink-0 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>

        {/* Action 2: Understand Prescription / Report */}
        <button
          onClick={onStartReportScan}
          className={`w-full text-left bg-white rounded-[22px] p-5.5 border transition-all flex items-center justify-between gap-4 group liquid-ripple ${
            activeScanMode === 'report'
              ? 'border-black/[0.14] shadow-[0_4px_20px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.04]'
              : 'border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-black/[0.1]'
          } active:scale-[0.985]`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-13 h-13 rounded-2xl bg-[#F0EFEA] text-[#161616] flex items-center justify-center shrink-0 group-hover:bg-[#EAE9E4] transition-colors">
              <FileText className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 className="text-base font-semibold text-[#161616] tracking-tight">
                {isHindi ? 'प्रिस्क्रिप्शन या रिपोर्ट समझें' : isBengali ? 'প্রেসক্রিপশন বা রিপোর্ট বুঝুন' : 'Understand Prescription / Report'}
              </h3>
              <p className="text-xs text-[#737373] leading-relaxed">
                {isHindi
                  ? 'कठिन मेडिकल शब्दों व दवाओं का सरल अर्थ'
                  : isBengali
                  ? 'সহজ ভাষায় রিপোর্ট ও ওষুধের নিয়ম'
                  : 'Translate medical terms and dosage schedules'}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#F7F7F5] flex items-center justify-center text-[#737373] group-hover:text-[#161616] shrink-0 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Visually Quiet and Secondary Recent Scans */}
      {recentItems.length > 0 && (
        <div className="pt-2 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-[#737373]">
              {isHindi ? 'हाल के स्कैन' : isBengali ? 'সাম্প্রতিক স্ক্যান' : 'Recent scans'}
            </span>
          </div>

          <div className="space-y-2">
            {recentItems.map((item, index) => {
              if (item.type === 'food') {
                const f = item.data;
                const statusDot =
                  f.status === 'Good Choice'
                    ? 'bg-emerald-500'
                    : f.status === 'Limit'
                    ? 'bg-amber-500'
                    : 'bg-rose-500';

                return (
                  <button
                    key={f.id || index}
                    onClick={() => onSelectFood?.(f)}
                    className="w-full text-left bg-white rounded-2xl p-3.5 border border-black/[0.05] shadow-[0_1px_6px_rgba(0,0,0,0.02)] hover:border-black/[0.1] active:scale-[0.99] transition-all flex items-center justify-between gap-3 liquid-ripple"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {f.imageUrl ? (
                        <img
                          src={f.imageUrl}
                          alt={f.productName}
                          className="w-10 h-10 rounded-xl object-cover bg-black/5 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#F0EFEA] text-[#161616] flex items-center justify-center font-bold text-xs shrink-0">
                          {f.productName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                          <span className="text-[11px] font-medium text-[#737373]">
                            {f.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-[#161616] truncate mt-0.5">
                          {f.productName}
                        </h4>
                      </div>
                    </div>
                    <div className="text-[11px] text-[#737373] shrink-0 font-medium">
                      {f.healthScore}/100
                    </div>
                  </button>
                );
              } else {
                const r = item.data;
                return (
                  <button
                    key={r.id || index}
                    onClick={() => onSelectReport?.(r)}
                    className="w-full text-left bg-white rounded-2xl p-3.5 border border-black/[0.05] shadow-[0_1px_6px_rgba(0,0,0,0.02)] hover:border-black/[0.1] active:scale-[0.99] transition-all flex items-center justify-between gap-3 liquid-ripple"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#F0EFEA] text-[#161616] flex items-center justify-center font-bold text-xs shrink-0">
                        {r.documentType === 'Prescription' ? 'Rx' : 'Lab'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-[#737373]">
                            {r.documentType}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-[#161616] truncate mt-0.5">
                          {r.summary.slice(0, 36)}...
                        </h4>
                      </div>
                    </div>
                    <div className="text-[11px] text-[#737373] shrink-0 font-medium">
                      {new Date(r.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </button>
                );
              }
            })}
          </div>
        </div>
      )}

      {/* Visibly Minimal Team UNSCRIPTED Badge */}
      <div className="pt-3 pb-1 flex justify-center items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none">
          <div className="w-3.5 h-3.5 rounded bg-[#161616] text-white flex items-center justify-center text-[8px] font-black">
            U
          </div>
          <span className="text-[10px] font-medium text-[#737373]">
            Powered by Team <strong className="font-semibold text-[#161616] tracking-wider">UNSCRIPTED</strong>
          </span>
        </div>
      </div>

      {/* Made With ❤️ by Nirmalya ! with animated pumping heart */}
      <MadeByFooter className="pt-1 pb-4" />
    </div>
  );
};
