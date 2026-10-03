import React, { useState } from 'react';
import { Camera, FileText, ArrowRight, Sparkles, Sun, ChevronRight, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { FoodAnalysisResult, ReportAnalysisResult, ScanHistoryItem, UserProfile } from '../types';
import { MadeByFooter } from './Common/MadeByFooter';
import { soundHaptics } from '../utils/soundHaptics';

interface HomeViewProps {
  onStartFoodScan: () => void;
  onStartReportScan: () => void;
  profile: UserProfile;
  history?: ScanHistoryItem[];
  onSelectFood?: (item: FoodAnalysisResult) => void;
  onSelectReport?: (item: ReportAnalysisResult) => void;
  onViewAllHistory?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartFoodScan,
  onStartReportScan,
  profile,
  history = [],
  onSelectFood,
  onSelectReport,
  onViewAllHistory,
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

  const recentItems = history.slice(0, 10);

  const handleModeSwitch = (mode: 'food' | 'report') => {
    soundHaptics.playPop();
    setActiveScanMode(mode);
  };

  const handleFoodClick = () => {
    soundHaptics.playTap();
    onStartFoodScan();
  };

  const handleReportClick = () => {
    soundHaptics.playTap();
    onStartReportScan();
  };

  const formatShortDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24 && d.getDate() === now.getDate()) {
      return isHindi ? 'आज' : isBengali ? 'আজ' : 'Today';
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4 pb-20 pt-1">
      {/* Calm Header Greeting & Minimal UNSCRIPTED Team Logo */}
      <div className="flex items-center justify-between px-1 gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xl font-bold tracking-tight text-[#1A1A18]">
              {greeting}
            </h2>
            <span className="text-amber-500 animate-pulse text-xs">☀️</span>
          </div>
          <p className="text-xs text-[#78716C] truncate">
            {isHindi
              ? 'आज आप क्या जांचना चाहते हैं?'
              : isBengali
              ? 'আজ কি পরীক্ষা করতে চান?'
              : 'What wholesome food or report would you like to check?'}
          </p>
        </div>

        {/* Minimal Visible Team Logo of 'UNSCRIPTED' with Sunny Chamomile Rim */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass-capsule border border-amber-200/70 select-none transition-all duration-300 cursor-default shrink-0 group spring-bounce shadow-xs"
          title="Team UNSCRIPTED"
        >
          <div className="w-4 h-4 rounded-[5px] bg-[#1A1A18] text-amber-200 flex items-center justify-center text-[9px] font-black tracking-tighter group-hover:rotate-12 transition-transform duration-300">
            U
          </div>
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#1A1A18]">
            UNSCRIPTED
          </span>
        </div>
      </div>

      {/* Tiny Nature Wellness Note (Natural Chamomile Honey Look) */}
      <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-gradient-to-r from-amber-100/70 via-yellow-50/70 to-emerald-50/50 border border-amber-200/70 shadow-2xs">
        <span className="text-sm shrink-0">🌿</span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-[#78350F] leading-snug">
            {isHindi
              ? 'दैनिक प्रकृति सुझाव: ताजी सब्जियां व मौसमी फल आंतों और शरीर को प्राकृतिक ऊर्जा प्रदान करते हैं।'
              : isBengali
              ? 'দৈনিক প্রকৃতি টিপ: প্রাকৃতিক শাকসবজি ও ফলমূল শারীরিক শক্তি ও হজম ক্ষমতা বাড়ায়।'
              : 'Nature’s Daily Note: Whole unrefined foods & fresh botanical nutrients support sustained metabolic vitality.'}
          </p>
        </div>
      </div>

      {/* Liquid Mode Pill Switcher with Apple-grade sliding bubble */}
      <div className="relative p-1 liquid-glass-capsule border border-amber-200/60 rounded-full flex items-center shadow-xs">
        <button
          onClick={() => handleModeSwitch('food')}
          className="relative flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-full transition-colors duration-200 z-10 active:scale-95 cursor-pointer"
        >
          {activeScanMode === 'food' && (
            <motion.div
              layoutId="activeScanModeBubble"
              className="absolute inset-0 bg-[#1A1A18] rounded-full shadow-xs -z-10 border border-amber-400/30"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <Camera className={`w-3.5 h-3.5 transition-transform duration-200 ${activeScanMode === 'food' ? 'text-amber-200 scale-105' : 'text-[#78716C]'}`} />
          <span className={activeScanMode === 'food' ? 'text-white' : 'text-[#78716C]'}>
            {isHindi ? 'खाद्य स्कैन' : isBengali ? 'খাদ্য স্ক্যান' : 'Food Scan'}
          </span>
        </button>

        <button
          onClick={() => handleModeSwitch('report')}
          className="relative flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-full transition-colors duration-200 z-10 active:scale-95 cursor-pointer"
        >
          {activeScanMode === 'report' && (
            <motion.div
              layoutId="activeScanModeBubble"
              className="absolute inset-0 bg-[#1A1A18] rounded-full shadow-xs -z-10 border border-amber-400/30"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <FileText className={`w-3.5 h-3.5 transition-transform duration-200 ${activeScanMode === 'report' ? 'text-amber-200 scale-105' : 'text-[#78716C]'}`} />
          <span className={activeScanMode === 'report' ? 'text-white' : 'text-[#78716C]'}>
            {isHindi ? 'रिपोर्ट / पर्चा' : isBengali ? 'রিপোর্ট স্ক্যান' : 'Report Scan'}
          </span>
        </button>
      </div>

      {/* The Two Main Action Areas (Apple Liquid Glass Cards with Over-Animating Sheen) */}
      <div className="grid grid-cols-1 gap-3">
        {/* Action 1: Scan Food */}
        <motion.button
          whileHover={{ scale: 1.012, y: -2 }}
          whileTap={{ scale: 0.985 }}
          style={{ willChange: 'transform', transform: 'translateZ(0)' }}
          transition={{ type: 'spring', stiffness: 520, damping: 35, mass: 0.6 }}
          onClick={handleFoodClick}
          className={`w-full text-left liquid-glass-card liquid-glass-card-interactive liquid-glass-sheen rounded-[22px] p-5 border flex items-center justify-between gap-4 group cursor-pointer ${
            activeScanMode === 'food'
              ? 'border-amber-400/60 ring-2 ring-amber-400/20 shadow-[0_8px_28px_rgba(245,158,11,0.14)]'
              : 'border-[#F3E8C8] hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-50 text-amber-900 border border-amber-300/60 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 group-hover:rotate-[-4deg] transition-all duration-300">
              <Camera className="w-5 h-5 stroke-[2] text-amber-700" />
              {activeScanMode === 'food' && (
                <span className="absolute inset-0 rounded-2xl animate-liquid-pulse-glow pointer-events-none" />
              )}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-[#1A1A18] tracking-tight">
                  {isHindi ? 'खाद्य पैकेट या लेबल स्कैन करें' : isBengali ? 'খাদ্য বা পুষ্টি লেবেল স্ক্যান' : 'Scan Food or Nutrition Label'}
                </h3>
              </div>
              <p className="text-xs text-[#78716C] leading-relaxed truncate">
                {isHindi
                  ? 'नमक, चीनी व तेल की मात्रा और स्वस्थ विकल्प'
                  : isBengali
                  ? 'উপাদান ও স্বাস্থ্যকর বিকল্প সন্ধান'
                  : 'Check ingredients, sugars, and healthier swaps'}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full liquid-glass-capsule border border-amber-200/60 flex items-center justify-center text-[#78716C] group-hover:text-[#1A1A18] group-hover:translate-x-1 shrink-0 transition-all duration-300 shadow-xs">
            <ArrowRight className="w-4 h-4" />
          </div>
        </motion.button>

        {/* Action 2: Understand Prescription / Report */}
        <motion.button
          whileHover={{ scale: 1.012, y: -2 }}
          whileTap={{ scale: 0.985 }}
          style={{ willChange: 'transform', transform: 'translateZ(0)' }}
          transition={{ type: 'spring', stiffness: 520, damping: 35, mass: 0.6 }}
          onClick={handleReportClick}
          className={`w-full text-left liquid-glass-card liquid-glass-card-interactive liquid-glass-sheen rounded-[22px] p-5 border flex items-center justify-between gap-4 group cursor-pointer ${
            activeScanMode === 'report'
              ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-[0_8px_28px_rgba(16,185,129,0.14)]'
              : 'border-[#F3E8C8] hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-950 border border-emerald-300/60 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 group-hover:rotate-[4deg] transition-all duration-300">
              <FileText className="w-5 h-5 stroke-[2] text-emerald-700" />
              {activeScanMode === 'report' && (
                <span className="absolute inset-0 rounded-2xl animate-liquid-pulse-glow pointer-events-none" />
              )}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-[#1A1A18] tracking-tight">
                  {isHindi ? 'प्रिस्क्रिप्शन या रिपोर्ट समझें' : isBengali ? 'প্রেসক্রিপশন বা রিপোর্ট বুঝুন' : 'Understand Prescription / Report'}
                </h3>
              </div>
              <p className="text-xs text-[#78716C] leading-relaxed truncate">
                {isHindi
                  ? 'कठिन मेडिकल शब्दों व दवाओं का सरल अर्थ'
                  : isBengali
                  ? 'সহজ ভাষায় रिपोर्ट ও ওষুধের नियम'
                  : 'Translate medical terms and dosage schedules'}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full liquid-glass-capsule border border-amber-200/60 flex items-center justify-center text-[#78716C] group-hover:text-[#1A1A18] group-hover:translate-x-1 shrink-0 transition-all duration-300 shadow-xs">
            <ArrowRight className="w-4 h-4" />
          </div>
        </motion.button>
      </div>

      {/* Horizontal Recent Scans Carousel for Faster Direct Access */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🌾</span>
            <h3 className="text-xs font-bold text-[#1A1A18] tracking-wide uppercase">
              {isHindi ? 'हाल के स्कैन' : isBengali ? 'সাম্প্রতিক স্ক্যান' : 'Recent Scans'}
            </h3>
            {history.length > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60">
                {history.length}
              </span>
            )}
          </div>

          {onViewAllHistory && history.length > 0 && (
            <button
              onClick={() => {
                soundHaptics.playPop();
                onViewAllHistory();
              }}
              className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-0.5 active:scale-95 transition-all cursor-pointer group"
            >
              <span>{isHindi ? 'सभी देखें' : isBengali ? 'সব দেখুন' : 'View all'}</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        {recentItems.length > 0 ? (
          <div className="flex gap-2.5 overflow-x-auto pb-2.5 pt-0.5 px-0.5 -mx-1 snap-x snap-mandatory scrollbar-none overscroll-x-contain smooth-scroll-x">
            {recentItems.map((item, index) => {
              if (item.type === 'food') {
                const f = item.data;
                const sharedId = f.id || f.productName;
                const statusPill =
                  f.status === 'Good Choice'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : f.status === 'Limit'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300';

                return (
                  <motion.button
                    whileHover={{ scale: 1.025, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    key={f.id || `food_${index}`}
                    onClick={() => {
                      soundHaptics.playTap();
                      onSelectFood?.(f);
                    }}
                    className="snap-start shrink-0 w-[160px] sm:w-[175px] text-left liquid-glass-card rounded-[20px] p-3 border border-[#F3E8C8] hover:border-amber-400 shadow-2xs flex flex-col justify-between gap-2.5 cursor-pointer relative group transition-all"
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      {f.imageUrl ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/5 shrink-0 border border-black/5 shadow-2xs">
                          <img
                            src={f.imageUrl}
                            alt={f.productName}
                            loading="eager"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-50 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-200">
                          {f.productName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusPill}`}>
                        {f.healthScore}/100
                      </span>
                    </div>

                    <div className="min-w-0 w-full">
                      <h4 className="text-xs font-semibold text-[#1A1A18] truncate group-hover:text-amber-900 transition-colors">
                        {f.productName}
                      </h4>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-[#78716C]">
                        <span className="truncate max-w-[85px] font-medium">{f.status}</span>
                        <span className="text-[9px] shrink-0">{formatShortDate(f.timestamp)}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              } else {
                const r = item.data;
                return (
                  <motion.button
                    whileHover={{ scale: 1.025, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    key={r.id || `report_${index}`}
                    onClick={() => {
                      soundHaptics.playTap();
                      onSelectReport?.(r);
                    }}
                    className="snap-start shrink-0 w-[160px] sm:w-[175px] text-left liquid-glass-card rounded-[20px] p-3 border border-[#F3E8C8] hover:border-emerald-400 shadow-2xs flex flex-col justify-between gap-2.5 cursor-pointer relative group transition-all"
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-950 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200 shadow-2xs">
                        {r.documentType === 'Prescription' ? 'Rx' : 'Lab'}
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 shrink-0">
                        {r.documentType === 'Prescription' ? 'Rx' : 'Report'}
                      </span>
                    </div>

                    <div className="min-w-0 w-full">
                      <h4 className="text-xs font-semibold text-[#1A1A18] truncate group-hover:text-emerald-900 transition-colors">
                        {r.summary.slice(0, 24)}...
                      </h4>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-[#78716C]">
                        <span className="font-medium">Summary</span>
                        <span className="text-[9px] shrink-0">{formatShortDate(r.timestamp)}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              }
            })}
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl liquid-glass-card border border-[#F3E8C8] flex items-center gap-3 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-amber-100/60 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/50">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-[11px] text-[#78716C] leading-snug">
              {isHindi
                ? 'अभी कोई हालिया स्कैन नहीं है। ऊपर किसी पैकेट या रिपोर्ट को स्कैन करें।'
                : isBengali
                ? 'এখনও কোনো সাম্প্রতিক স্ক্যান নেই। দ্রুত অ্যাক্সেসের জন্য স্ক্যান করুন।'
                : 'No recent scans yet. Scan a food package or report above for instant access here!'}
            </p>
          </div>
        )}
      </div>

      {/* Visibly Minimal Team UNSCRIPTED Badge */}
      <div className="pt-1 pb-1 flex justify-center items-center">
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full liquid-glass-capsule border border-amber-200/60 shadow-xs select-none cursor-default"
        >
          <div className="w-3.5 h-3.5 rounded bg-[#1A1A18] text-amber-200 flex items-center justify-center text-[8px] font-black">
            U
          </div>
          <span className="text-[10px] font-medium text-[#78716C]">
            Crafted with Nature by Team <strong className="font-semibold text-[#1A1A18] tracking-wider">UNSCRIPTED</strong>
          </span>
        </motion.div>
      </div>

      {/* Made With ❤️ by Nirmalya ! with animated pumping heart */}
      <MadeByFooter className="pt-1 pb-3" />
    </div>
  );
};
