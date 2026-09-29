import React, { useState } from 'react';
import { ReportAnalysisResult, UserProfile } from '../../types';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Check,
  AlertCircle,
} from 'lucide-react';

interface ReportResultViewProps {
  result: ReportAnalysisResult;
  onBack: () => void;
  onScanAnother: () => void;
  profile: UserProfile;
}

export const ReportResultView: React.FC<ReportResultViewProps> = ({
  result,
  onBack,
  onScanAnother,
  profile,
}) => {
  const isHindi = profile.language === 'hi';
  const isBengali = profile.language === 'bn';

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [checkedDoses, setCheckedDoses] = useState<Record<string, boolean>>({});

  const toggleDose = (key: string) => {
    setCheckedDoses((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const medText = (result.medicineNotes || [])
      .map((m) => `${m.medicineName}: ${m.writtenInstruction}`)
      .join('. ');
    const labText = (result.items || [])
      .map((i) => `${i.name}: ${i.result}, ${i.status}. ${i.simpleMeaning}`)
      .join('. ');

    const textToSpeak = `Summary: ${result.summary}. ${medText} ${labText}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Badge styling for lab report items
  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'Normal':
        return {
          pillClass: 'bg-emerald-50/80 text-emerald-800 border-emerald-300/60 liquid-glass-tag',
          dotClass: 'bg-emerald-500',
          label: isHindi ? 'सामान्य' : isBengali ? 'স্বাভাবিক' : 'Normal',
        };
      case 'High':
        return {
          pillClass: 'bg-rose-50/85 text-rose-900 border-rose-300/60 liquid-glass-tag',
          dotClass: 'bg-rose-500',
          label: isHindi ? 'अधिक' : isBengali ? 'বেশি' : 'High',
        };
      case 'Low':
        return {
          pillClass: 'bg-amber-50/85 text-amber-900 border-amber-300/60 liquid-glass-tag',
          dotClass: 'bg-amber-500',
          label: isHindi ? 'कम' : isBengali ? 'কম' : 'Low',
        };
      case 'Needs Review':
      default:
        return {
          pillClass: 'bg-[#F0EFEA] text-[#161616] border-black/[0.06]',
          dotClass: 'bg-[#737373]',
          label: isHindi ? 'समीक्षा' : isBengali ? 'পর্যালোচনা' : 'Review',
        };
    }
  };

  const isPrescription = result.documentType === 'Prescription';

  return (
    <div className="space-y-6 pb-24">
      {/* Top Floating Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-[#161616] hover:text-black py-1.5 px-3 rounded-full liquid-glass-capsule liquid-ripple active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isHindi ? 'वापस' : isBengali ? 'পেছনে' : 'Home'}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Read aloud action */}
          <button
            onClick={handleToggleSpeak}
            className={`flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-full liquid-glass-capsule liquid-ripple active:scale-[0.98] transition-all ${
              isSpeaking
                ? 'bg-rose-50/90 text-rose-800 border-rose-200'
                : 'text-[#161616]'
            }`}
            title="Read summary"
          >
            {isSpeaking ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#737373]" />
            )}
            <span>{isSpeaking ? 'Stop' : isHindi ? 'सुनें' : 'Listen'}</span>
          </button>

          <button
            onClick={onScanAnother}
            className="text-xs font-medium text-[#161616] py-1.5 px-3 rounded-full bg-[#F0EFEA] hover:bg-[#EAE9E4] liquid-ripple active:scale-[0.98] transition-all"
          >
            {isHindi ? 'नया दस्तावेज़' : isBengali ? 'নতুন স্ক্যান' : 'Scan Another'}
          </button>
        </div>
      </div>

      {/* Main Document Summary Card */}
      <div className="bg-white rounded-[24px] p-6 border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-4">
        {/* Document Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#F0EFEA] text-[#161616] flex items-center justify-center font-bold text-xs">
              {isPrescription ? 'Rx' : 'Lab'}
            </span>
            <div>
              <h2 className="text-base font-bold text-[#161616]">
                {result.documentType}
              </h2>
              <p className="text-xs text-[#737373]">
                {new Date(result.timestamp).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Short Plain-Language Summary */}
        <div className="space-y-1 pt-1">
          <span className="text-xs font-semibold text-[#161616] uppercase tracking-wider block">
            {isHindi ? 'मुख्य सारांश' : isBengali ? 'সারসংক্ষেপ' : 'Summary'}
          </span>
          <p className="text-sm text-[#161616] leading-relaxed">
            {result.summary}
          </p>
        </div>
      </div>

      {/* Lab Report Items: Each test as a simple row */}
      {result.items && result.items.length > 0 && (
        <div className="space-y-3">
          <div className="px-1">
            <h3 className="text-base font-bold text-[#161616]">
              {isHindi ? 'जांच परिणाम' : isBengali ? 'টেস্ট ফলাফল' : 'Test results'}
            </h3>
            <p className="text-xs text-[#737373]">
              {isHindi ? 'परिणाम और उनका सरल अर्थ' : isBengali ? 'ফলাফল ও সহজ অর্থ' : 'Results and one-line meaning'}
            </p>
          </div>

          <div className="space-y-2">
            {result.items.map((item, index) => {
              const badge = getItemStatusBadge(item.status);
              return (
                <div
                  key={index}
                  className="bg-white rounded-[20px] p-4 border border-black/[0.06] shadow-[0_1px_6px_rgba(0,0,0,0.02)] space-y-2 transition-all hover:border-black/[0.12]"
                >
                  {/* Row: Name and Status */}
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-[#161616]">
                      {item.name}
                    </h4>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.pillClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Result & Reference Range */}
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-[#737373] text-[11px] block">Result</span>
                      <span className="text-sm font-bold text-[#161616]">{item.result}</span>
                    </div>
                    {item.range && (
                      <div className="border-l border-black/[0.06] pl-4">
                        <span className="text-[#737373] text-[11px] block">Normal range</span>
                        <span className="text-xs text-[#161616]">{item.range}</span>
                      </div>
                    )}
                  </div>

                  {/* One-Line Meaning */}
                  <p className="text-xs text-[#737373] leading-relaxed pt-1 border-t border-black/[0.04]">
                    {item.simpleMeaning}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prescription Medicines & Schedule */}
      {result.medicineNotes && result.medicineNotes.length > 0 && (
        <div className="space-y-3">
          <div className="px-1 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#161616]">
                {isHindi ? 'दवाइयाँ व नियम' : isBengali ? 'ওষুধ ও নিয়মাবলী' : 'Medicines & schedule'}
              </h3>
              <p className="text-xs text-[#737373]">
                {isHindi ? 'खुराक और समय' : isBengali ? 'ওষুধ খাওয়ার সময়' : 'Dosage instructions'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {result.medicineNotes.map((med, index) => {
              const isUnclear = med.confidence === 'Low' || med.confidence === 'Medium';
              const doseKeys = ['Morning', 'Afternoon', 'Night'];

              return (
                <div
                  key={index}
                  className="bg-white rounded-[22px] p-5 border border-black/[0.06] shadow-[0_1px_8px_rgba(0,0,0,0.02)] space-y-3 transition-all hover:border-black/[0.12]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-semibold text-[#161616]">
                      {med.medicineName}
                    </h4>

                    {/* Subtle amber liquid-glass tag for unclear handwriting */}
                    {isUnclear ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-900 bg-amber-50/85 px-2.5 py-0.5 rounded-full border border-amber-300/60 liquid-glass-tag shadow-2xs">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        <span>Needs confirmation</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50/85 px-2.5 py-0.5 rounded-full border border-emerald-300/60 liquid-glass-tag">
                        Clear
                      </span>
                    )}
                  </div>

                  {/* One-Line Instruction */}
                  <div className="bg-[#F7F7F5] p-3 rounded-2xl">
                    <p className="text-xs text-[#161616] leading-relaxed">
                      {med.writtenInstruction}
                    </p>
                  </div>

                  {/* Gentle Daily Dose Tracker */}
                  <div className="flex items-center gap-2 pt-0.5">
                    {doseKeys.map((dose) => {
                      const key = `${med.medicineName}_${dose}`;
                      const isDone = !!checkedDoses[key];
                      return (
                        <button
                          key={dose}
                          onClick={() => toggleDose(key)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all liquid-ripple active:scale-[0.98] ${
                            isDone
                              ? 'bg-[#161616] text-white'
                              : 'bg-[#F0EFEA] text-[#737373] hover:text-[#161616]'
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 ${isDone ? 'stroke-[2.5]' : 'opacity-30'}`} />
                          <span>{dose}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Warning Note if needed */}
                  {med.warning && (
                    <p className="text-xs text-amber-900 bg-amber-50/90 p-2.5 rounded-xl border border-amber-200/80">
                      {med.warning}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Safety Disclaimer */}
      <div className="pt-2 text-center px-4">
        <p className="text-xs text-[#737373] leading-relaxed">
          {result.disclaimer ||
            'NutriDoc is for everyday awareness. Always verify your prescription with your doctor or pharmacist.'}
        </p>
      </div>
    </div>
  );
};
