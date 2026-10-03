import React, { useState } from 'react';
import { FoodAnalysisResult, ReportAnalysisResult, ScanHistoryItem, UserProfile } from '../../types';
import { History, Trash2, ArrowRight, ShieldCheck, FileText, Camera } from 'lucide-react';
import { motion } from 'motion/react';
import { MadeByFooter } from '../Common/MadeByFooter';
import { soundHaptics } from '../../utils/soundHaptics';

interface HistoryViewProps {
  history: ScanHistoryItem[];
  onSelectFood: (item: FoodAnalysisResult) => void;
  onSelectReport: (item: ReportAnalysisResult) => void;
  onClearHistory: () => void;
  onStartFoodScan: () => void;
  onStartReportScan: () => void;
  profile: UserProfile;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onSelectFood,
  onSelectReport,
  onClearHistory,
  onStartFoodScan,
  onStartReportScan,
  profile,
}) => {
  const [filter, setFilter] = useState<'all' | 'food' | 'report'>('all');

  const isHindi = profile.language === 'hi';
  const isBengali = profile.language === 'bn';

  const filteredHistory = history.filter((item) => {
    if (filter === 'food') return item.type === 'food';
    if (filter === 'report') return item.type === 'report';
    return true;
  });

  return (
    <div className="space-y-4 pb-24 animate-fade-in font-sans">
      {/* Title & Clear Action */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-xl font-bold tracking-tight text-[#1A1A18]">
              {isHindi ? 'स्कैन इतिहास' : isBengali ? 'স্ক্যান ইতিহাস' : 'Scan History'}
            </h2>
            <span className="text-xs">📜</span>
          </div>
          <p className="text-xs text-[#78716C]">
            {isHindi ? 'आपके पिछले खाद्य व रिपोर्ट परिणाम' : isBengali ? 'আপনার পূর্ববর্তী খাদ্য ও রিপোর্ট তালিকা' : 'Past foods and medical simplifications'}
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => {
              soundHaptics.playTap();
              onClearHistory();
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 py-1.5 px-3 rounded-full liquid-glass-capsule border border-amber-200/50 hover:bg-rose-50/80 transition-all cursor-pointer active:scale-95 shadow-xs"
            title="Clear all history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isHindi ? 'मिटाएं' : isBengali ? 'মুছুন' : 'Clear'}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs with Liquid Sliding Capsule */}
      <div className="relative flex gap-1 p-1 liquid-glass-capsule border border-amber-200/60 rounded-full shadow-xs">
        {(['all', 'food', 'report'] as const).map((tabKey) => {
          const isSelected = filter === tabKey;
          const label =
            tabKey === 'all'
              ? `${isHindi ? 'सभी' : isBengali ? 'সব' : 'All'} (${history.length})`
              : tabKey === 'food'
              ? `${isHindi ? 'खाद्य' : isBengali ? 'খাদ্য' : 'Food'} (${history.filter((h) => h.type === 'food').length})`
              : `${isHindi ? 'रिपोर्ट' : isBengali ? 'রিপোর্ট' : 'Reports'} (${history.filter((h) => h.type === 'report').length})`;

          return (
            <button
              key={tabKey}
              onClick={() => {
                soundHaptics.playPop();
                setFilter(tabKey);
              }}
              className="relative flex-1 py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 z-10 active:scale-95 cursor-pointer"
            >
              {isSelected && (
                <motion.div
                  layoutId="activeHistoryFilterPill"
                  className="absolute inset-0 bg-[#1A1A18] rounded-full shadow-xs -z-10 border border-amber-400/30"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className={isSelected ? 'text-white' : 'text-[#78716C]'}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredHistory.length === 0 ? (
        <div className="liquid-glass-card rounded-[24px] p-8 text-center space-y-4 my-4 shadow-sm border border-[#F3E8C8]">
          <div className="w-14 h-14 rounded-2xl bg-amber-100/60 text-amber-800 mx-auto flex items-center justify-center border border-amber-200/60">
            <History className="w-7 h-7 stroke-[1.8]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-[#1A1A18]">
              {isHindi ? 'कोई स्कैन इतिहास नहीं' : isBengali ? 'কোন স্ক্যান ইতিহাস নেই' : 'No scans saved yet'}
            </h4>
            <p className="text-xs text-[#78716C] max-w-xs mx-auto">
              {isHindi
                ? 'पैकेट स्कैन करें या अपनी मेडिकल रिपोर्ट जोड़ें। वे यहां स्वतः सहेजे जाएंगे।'
                : isBengali
                ? 'খাদ্য স্ক্যান করুন বা আপনার প্রেসক্রিপশন যোগ করুন। এখানে সংরক্ষিত থাকবে।'
                : 'Scan food packets or upload prescriptions to have your clinical summaries automatically saved.'}
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => {
                soundHaptics.playTap();
                onStartFoodScan();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1A1A18] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all spring-bounce cursor-pointer border border-amber-400/30"
            >
              <Camera className="w-3.5 h-3.5 text-amber-200" />
              <span>{isHindi ? 'खाद्य स्कैन' : isBengali ? 'খাদ্য স্ক্যান' : 'Scan Food'}</span>
            </button>
            <button
              onClick={() => {
                soundHaptics.playTap();
                onStartReportScan();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full liquid-glass-capsule border border-amber-200/60 text-[#1A1A18] text-xs font-semibold shadow-xs active:scale-95 transition-all spring-bounce cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isHindi ? 'रिपोर्ट स्कैन' : isBengali ? 'রিপোর্ট স্ক্যান' : 'Scan Report'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredHistory.map((item, index) => {
            if (item.type === 'food') {
              const f = item.data;
              const statusPill =
                f.status === 'Good Choice'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : f.status === 'Limit'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200';

              return (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(index * 0.025, 0.15),
                    type: 'spring',
                    stiffness: 450,
                    damping: 32,
                    mass: 0.8,
                  }}
                  whileHover={{ scale: 1.012, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  key={f.id || index}
                  onClick={() => {
                    soundHaptics.playTap();
                    onSelectFood(f);
                  }}
                  className="w-full text-left liquid-glass-card liquid-glass-card-interactive liquid-glass-sheen rounded-[22px] p-3.5 border border-[#F3E8C8] hover:border-amber-300 flex items-center justify-between gap-3 cursor-pointer shadow-xs cv-auto"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {f.imageUrl ? (
                      <img
                        src={f.imageUrl}
                        alt={f.productName}
                        loading="lazy"
                        decoding="async"
                        className="w-11 h-11 rounded-2xl object-cover bg-black/5 shrink-0 border border-black/5 shadow-xs"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-50 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-200/60 shadow-xs">
                        {f.productName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusPill}`}>
                          {f.status}
                        </span>
                        <span className="text-[10px] text-[#78716C] font-medium">
                          Score: {f.healthScore}/100
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-[#1A1A18] truncate mt-1">
                        {f.productName}
                      </h4>
                      <p className="text-[10px] text-[#78716C]">
                        {new Date(f.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full liquid-glass-capsule border border-amber-200/50 flex items-center justify-center text-[#78716C] shrink-0 shadow-xs">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.button>
              );
            } else {
              const r = item.data;
              return (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(index * 0.025, 0.15),
                    type: 'spring',
                    stiffness: 450,
                    damping: 32,
                    mass: 0.8,
                  }}
                  whileHover={{ scale: 1.012, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  key={r.id || index}
                  onClick={() => {
                    soundHaptics.playTap();
                    onSelectReport(r);
                  }}
                  className="w-full text-left liquid-glass-card liquid-glass-card-interactive liquid-glass-sheen rounded-[22px] p-3.5 border border-[#F3E8C8] hover:border-emerald-300 flex items-center justify-between gap-3 cursor-pointer shadow-xs cv-auto"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-950 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200/60 shadow-xs">
                      {r.documentType === 'Prescription' ? 'Rx' : 'Lab'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
                          {r.documentType}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-[#1A1A18] truncate mt-1">
                        {r.summary.slice(0, 45)}...
                      </h4>
                      <p className="text-[10px] text-[#78716C]">
                        {new Date(r.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full liquid-glass-capsule border border-amber-200/50 flex items-center justify-center text-[#78716C] shrink-0 shadow-xs">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.button>
              );
            }
          })}
        </div>
      )}

      {/* Made With ❤️ by Nirmalya ! with animated pumping heart */}
      <MadeByFooter className="pt-2 pb-4" />
    </div>
  );
};
