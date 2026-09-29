import React from 'react';
import { ReportAnalysisResult, UserProfile } from '../../types';
import { ArrowLeft, AlertTriangle, CheckCircle2, AlertCircle, FileText, Stethoscope } from 'lucide-react';

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

  // Badge styling for lab report items
  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case 'Normal':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: isHindi ? 'सामान्य' : isBengali ? 'স্বাভাবিক' : 'Normal',
        };
      case 'High':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          label: isHindi ? 'सीमा से अधिक' : isBengali ? 'বেশি' : 'Above range',
        };
      case 'Low':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: isHindi ? 'सीमा से कम' : isBengali ? 'কম' : 'Below range',
        };
      case 'Needs Review':
      default:
        return {
          bg: 'bg-neutral-100 text-[#1D1D1F] border-neutral-200',
          dot: 'bg-neutral-500',
          label: isHindi ? 'डॉक्टर से समीक्षा' : isBengali ? 'পর্যালোচনা প্রয়োজন' : 'Needs Review',
        };
    }
  };

  const isPrescription = result.documentType === 'Prescription';

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] hover:text-black py-1.5 px-3 rounded-full bg-white border border-black/[0.06] shadow-2xs active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isHindi ? 'वापस' : isBengali ? 'পেছনে' : 'Home'}</span>
        </button>

        <button
          onClick={onScanAnother}
          className="text-xs font-semibold text-blue-700 hover:text-blue-800 py-1.5 px-3 rounded-full bg-blue-50 border border-blue-100 shadow-2xs active:scale-95 transition-all"
        >
          {isHindi ? 'नया दस्तावेज़' : isBengali ? 'নতুন ডকুমেন্ট' : 'Scan Another'}
        </button>
      </div>

      {/* Main Document Summary Card */}
      <div className="bg-white rounded-3xl p-6 border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
        {/* Document Type Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs">
              {isPrescription ? 'Rx' : 'Lab'}
            </span>
            <div>
              <h2 className="text-base font-bold text-[#1D1D1F]">
                {result.documentType}
              </h2>
              <p className="text-[10px] text-[#86868B]">
                {new Date(result.timestamp).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            {isHindi ? 'सरल भाषा' : isBengali ? 'সহজ ভাষা' : 'Plain Language'}
          </span>
        </div>

        {/* Short Plain-Language Summary */}
        <div className="p-4 rounded-2xl bg-[#F7F7F5] border border-black/[0.03] space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] block">
            {isHindi ? 'सार संक्षेप' : isBengali ? 'সংক্ষিপ্ত সার' : 'Summary'}
          </span>
          <p className="text-sm text-[#1D1D1F] leading-relaxed">
            {result.summary}
          </p>
        </div>
      </div>

      {/* Lab Report Items (if Lab Report) */}
      {result.items && result.items.length > 0 && (
        <div className="space-y-3">
          <div className="px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1D1D1F]">
              {isHindi ? 'परीक्षण परिणाम (Test Results)' : isBengali ? 'পরীক্ষার ফলাফল' : 'Test Results'}
            </h3>
            <p className="text-xs text-[#86868B]">
              {isHindi ? 'प्रत्येक टेस्ट का सरल अर्थ' : isBengali ? 'প্রতিটি টেস্টের সহজ অর্থ' : 'Short breakdown with reference ranges'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {result.items.map((item, index) => {
              const badge = getItemStatusBadge(item.status);
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-2xs space-y-2.5"
                >
                  {/* Test Name & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#1D1D1F]">
                      {item.name}
                    </h4>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.bg} shrink-0`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Result & Range */}
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-[#86868B] block text-[10px] uppercase font-semibold">Result</span>
                      <span className="text-sm font-extrabold text-[#1D1D1F]">{item.result}</span>
                    </div>
                    {item.range && (
                      <div className="border-l border-black/10 pl-4">
                        <span className="text-[#86868B] block text-[10px] uppercase font-semibold">Reference Range</span>
                        <span className="text-xs font-medium text-[#505054]">{item.range}</span>
                      </div>
                    )}
                  </div>

                  {/* Simple Meaning */}
                  <div className="pt-2 border-t border-black/[0.04] text-xs text-[#505054] leading-relaxed">
                    <span className="font-semibold text-[#1D1D1F]">Meaning: </span>
                    <span>{item.simpleMeaning}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prescription Medicine Notes (if Prescription) */}
      {result.medicineNotes && result.medicineNotes.length > 0 && (
        <div className="space-y-3">
          <div className="px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#1D1D1F]">
              {isHindi ? 'दवाइयाँ व निर्देश' : isBengali ? 'ওষুধ ও নিয়মাবলী' : 'Medicines & Instructions'}
            </h3>
            <p className="text-xs text-[#86868B]">
              {isHindi ? 'सेवन का समय व सावधानी' : isBengali ? 'খাওয়ার সময় ও সতর্কতা' : 'Timing and pharmacist safety warnings'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {result.medicineNotes.map((med, index) => {
              const isLowOrMed = med.confidence === 'Low' || med.confidence === 'Medium';
              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-2xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#1D1D1F]">
                      {med.medicineName}
                    </h4>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        med.confidence === 'High'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      Confidence: {med.confidence}
                    </span>
                  </div>

                  {/* Written instruction */}
                  <div className="text-xs text-[#1D1D1F]">
                    <span className="font-semibold text-[#86868B] block text-[10px] uppercase">Written instruction</span>
                    <span className="font-medium text-sm mt-0.5 block">“{med.writtenInstruction}”</span>
                  </div>

                  {/* Warning banner for handwriting uncertainty */}
                  {med.warning && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-snug">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Pharmacist confirmation required:</span>
                        <span>{med.warning}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Step Card */}
      {result.nextStep && (
        <div className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D1D1F]">
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <span>{isHindi ? 'अगला कदम' : isBengali ? 'পরবর্তী পদক্ষেপ' : 'Recommended Next Step'}</span>
          </div>
          <p className="text-xs text-[#505054] leading-relaxed">
            {result.nextStep}
          </p>
        </div>
      )}

      {/* Quiet Safety Disclaimer */}
      <div className="pt-4 text-center px-4">
        <p className="text-[11px] text-[#86868B] leading-relaxed">
          {result.disclaimer || 'NutriDoc provides general awareness only. It does not diagnose illness or replace a doctor or pharmacist.'}
        </p>
      </div>
    </div>
  );
};
