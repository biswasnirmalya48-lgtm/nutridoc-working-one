import React, { useState } from 'react';
import { FoodAnalysisResult, ReportAnalysisResult, ScanHistoryItem, UserProfile } from '../../types';
import { History, Trash2, ArrowRight, ShieldCheck, FileText, Camera } from 'lucide-react';
import { MadeByFooter } from '../Common/MadeByFooter';

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
    <div className="space-y-5 pb-24 animate-fade-in">
      {/* Title & Clear Action */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
            {isHindi ? 'स्कैन इतिहास' : isBengali ? 'স্ক্যান ইতিহাস' : 'Scan History'}
          </h2>
          <p className="text-xs text-[#86868B]">
            {isHindi ? 'आपके पिछले खाद्य व रिपोर्ट परिणाम' : isBengali ? 'আপনার পূর্ববর্তী খাদ্য ও রিপোর্ট তালিকা' : 'Past foods and medical simplifications'}
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 p-2 rounded-full hover:bg-rose-50 transition-colors"
            title="Clear all history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isHindi ? 'मिटाएं' : isBengali ? 'মুছুন' : 'Clear'}</span>
          </button>
        )}
      </div>

      {/* Filter Tabs with Liquid Sliding Capsule */}
      <div className="relative flex gap-1 p-1 liquid-glass-capsule rounded-full">
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
              onClick={() => setFilter(tabKey)}
              className={`relative flex-1 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 z-10 liquid-ripple ${
                isSelected ? 'bg-[#161616] text-white shadow-xs' : 'text-[#737373] hover:text-[#161616]'
              }`}
            >
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-black/[0.06] shadow-xs space-y-4 my-4">
          <div className="w-14 h-14 rounded-2xl bg-black/5 text-[#86868B] mx-auto flex items-center justify-center">
            <History className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-[#1D1D1F]">
              {isHindi ? 'कोई स्कैन इतिहास नहीं' : isBengali ? 'কোন স্ক্যান ইতিহাস নেই' : 'No scans saved yet'}
            </h4>
            <p className="text-xs text-[#86868B] max-w-xs mx-auto">
              {isHindi
                ? 'पैकेट स्कैन करें या अपनी मेडिकल रिपोर्ट जोड़ें। वे यहां स्वतः सहेजे जाएंगे।'
                : isBengali
                ? 'খাদ্য স্ক্যান করুন বা আপনার প্রেসক্রিপশন যোগ করুন। এখানে সংরক্ষিত থাকবে।'
                : 'Scan food packets or upload reports to build your personal history.'}
            </p>
          </div>

          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={onStartFoodScan}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-xs active:scale-95 transition-transform"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan Food</span>
            </button>
            <button
              onClick={onStartReportScan}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs active:scale-95 transition-transform"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Scan Report</span>
            </button>
          </div>
        </div>
      ) : (
        /* History Item List */
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
                <button
                  key={f.id || index}
                  onClick={() => onSelectFood(f)}
                  className="w-full text-left bg-white rounded-[22px] p-4 border border-black/[0.06] shadow-[0_1px_6px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 active:scale-[0.985] transition-all hover:border-black/[0.12]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {f.imageUrl ? (
                      <img
                        src={f.imageUrl}
                        alt={f.productName}
                        className="w-12 h-12 rounded-2xl object-cover bg-black/5 shrink-0 border border-black/5"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-[#F0EFEA] text-[#161616] flex items-center justify-center font-bold text-xs shrink-0">
                        Food
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusPill}`}>
                          {f.status}
                        </span>
                        <span className="text-[10px] text-[#737373] font-medium">
                          Score: {f.healthScore}/100
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-[#161616] truncate mt-1">
                        {f.productName}
                      </h4>
                      <p className="text-[10px] text-[#737373]">
                        {new Date(f.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#F7F7F5] flex items-center justify-center text-[#737373] shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            } else {
              const r = item.data;
              return (
                <button
                  key={r.id || index}
                  onClick={() => onSelectReport(r)}
                  className="w-full text-left bg-white rounded-[22px] p-4 border border-black/[0.06] shadow-[0_1px_6px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3 active:scale-[0.985] transition-all hover:border-black/[0.12]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#F0EFEA] text-[#161616] flex items-center justify-center font-bold text-xs shrink-0">
                      {r.documentType === 'Prescription' ? 'Rx' : 'Lab'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0EFEA] text-[#161616]">
                          {r.documentType}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-[#161616] truncate mt-1">
                        {r.summary.slice(0, 45)}...
                      </h4>
                      <p className="text-[10px] text-[#737373]">
                        {new Date(r.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#F7F7F5] flex items-center justify-center text-[#737373] shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
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
