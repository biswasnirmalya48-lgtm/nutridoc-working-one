import React, { useState } from 'react';
import { ReportAnalysisResult, UserProfile } from '../../types';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Check,
  AlertCircle,
  Clock,
  HeartPulse,
  Pill,
  Sparkles,
  Info,
  Calendar,
  Sun,
  Sunset,
  Moon,
  Utensils,
} from 'lucide-react';
import { MadeByFooter } from '../Common/MadeByFooter';

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

  // Text-to-speech audio reader
  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const conditionText = result.patientCondition
      ? `${result.patientCondition.whatHappened}. ${result.patientCondition.simplePoints.join('. ')}`
      : result.summary;

    const medText = (result.medicineNotes || [])
      .map(
        (m) =>
          `${m.medicineName}: ${m.purpose ? m.purpose + '. ' : ''}${m.timing || m.writtenInstruction}`
      )
      .join('. ');

    const textToSpeak = `${conditionText}. ${medText}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (profile.language === 'hi') utterance.lang = 'hi-IN';
    else if (profile.language === 'bn') utterance.lang = 'bn-IN';
    else utterance.lang = 'en-US';

    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const isPrescription = result.documentType === 'Prescription';

  return (
    <div className="space-y-6 pb-24 animate-fade-in font-sans">
      {/* Top Floating Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-[#161616] hover:text-black py-1.5 px-3 rounded-full liquid-glass-capsule liquid-ripple active:scale-[0.98] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isHindi ? 'होम' : isBengali ? 'হোম' : 'Home'}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Read aloud action */}
          <button
            type="button"
            onClick={handleToggleSpeak}
            className={`flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-full liquid-glass-capsule liquid-ripple active:scale-[0.98] transition-all cursor-pointer ${
              isSpeaking
                ? 'bg-rose-50/90 text-rose-800 border-rose-200'
                : 'text-[#161616]'
            }`}
            title="Listen to summary"
          >
            {isSpeaking ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#737373]" />
            )}
            <span>{isSpeaking ? 'Stop' : isHindi ? 'सुनें' : isBengali ? 'শুনুন' : 'Listen'}</span>
          </button>

          <button
            type="button"
            onClick={onScanAnother}
            className="text-xs font-medium text-[#161616] py-1.5 px-3.5 rounded-full bg-[#161616] text-white hover:bg-neutral-800 liquid-ripple active:scale-[0.98] transition-all cursor-pointer shadow-xs"
          >
            {isHindi ? 'नया स्कैन' : isBengali ? 'নতুন স্ক্যান' : 'Scan Another'}
          </button>
        </div>
      </div>

      {/* Main Prescription Summary Card */}
      <div className="bg-white rounded-[24px] p-6 border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#161616] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {isPrescription ? 'Rx' : 'Lab'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#161616]">
                  {isPrescription
                    ? isHindi ? 'डॉक्टर का पर्चा' : isBengali ? 'প্রেসক্রিপশন বিবরণ' : 'Doctor’s Prescription'
                    : isHindi ? 'लैब रिपोर्ट' : isBengali ? 'ল্যাব রিপোর্ট' : 'Lab Report'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-semibold">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>AI Simplified</span>
                </span>
              </div>
              <p className="text-xs text-[#737373] mt-0.5">
                {new Date(result.timestamp).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Short Warm Summary */}
        <div className="space-y-1 pt-1 border-t border-black/[0.04]">
          <span className="text-[11px] font-bold text-[#737373] uppercase tracking-wider block">
            {isHindi ? 'मुख्य सारसंक्षेप' : isBengali ? 'সারসংক্ষেপ' : 'Overview'}
          </span>
          <p className="text-sm text-[#161616] leading-relaxed">
            {result.summary}
          </p>
        </div>
      </div>

      {/* SECTION 1: WHAT HAPPENS TO THE USER (Diagnosis & Condition in Waterline Simple Language) */}
      {(result.patientCondition || isPrescription) && (
        <div className="bg-white rounded-[24px] p-6 border border-emerald-500/20 shadow-[0_4px_20px_rgba(16,185,129,0.04)] space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-2xl pointer-events-none" />

          {/* Section Header */}
          <div className="flex items-start gap-3 relative z-10">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-xs">
              <HeartPulse className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#161616] tracking-tight">
                {isHindi
                  ? 'आपको क्या समस्या हुई है?'
                  : isBengali
                  ? 'আপনার কী সমস্যা হয়েছে?'
                  : 'What is happening to you?'}
              </h3>
              <p className="text-xs text-[#737373]">
                {isHindi
                  ? 'डॉक्टर के पर्चे का आसान और स्पष्ट विश्लेषण'
                  : isBengali
                  ? 'প্রেসক্রিপশন অনুযায়ী শারীরিক সমস্যার সহজ ব্যাখ্যা'
                  : 'Simple clinical breakdown in plain everyday words'}
              </p>
            </div>
          </div>

          {/* Condition paragraph */}
          {result.patientCondition?.whatHappened && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 text-[#161616] text-xs font-medium leading-relaxed relative z-10">
              {result.patientCondition.whatHappened}
            </div>
          )}

          {/* Point-by-point Bullet Breakdown */}
          {result.patientCondition?.simplePoints && result.patientCondition.simplePoints.length > 0 && (
            <div className="space-y-2.5 pt-1 relative z-10">
              <span className="text-[11px] font-bold text-[#161616] uppercase tracking-wider block">
                {isHindi ? 'मुख्य बिंदु (सरल भाषा में):' : isBengali ? 'মূল বিষয়গুলি পয়েন্ট আকারে:' : 'Key Points in Simple Language:'}
              </span>
              <ul className="space-y-2">
                {result.patientCondition.simplePoints.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-[#222] leading-relaxed p-2.5 rounded-xl bg-[#F7F7F5] border border-black/[0.04]"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: MEDICINES YOU NEED TO TAKE & WHEN (Schedule, Dosage & Timing Points) */}
      {result.medicineNotes && result.medicineNotes.length > 0 && (
        <div className="space-y-3.5">
          <div className="px-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#161616] text-white flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#161616]">
                  {isHindi
                    ? 'कौन सी दवा कब लेनी है?'
                    : isBengali
                    ? 'কোন ওষুধ কখন খাবেন?'
                    : 'Medicines to Take & When'}
                </h3>
                <p className="text-xs text-[#737373]">
                  {isHindi ? 'खुराक, समय और लेने का नियम' : isBengali ? 'ওষুধ, খাওয়ার সময় ও নিয়মাবলী' : 'Exact timing, schedule & purpose'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {result.medicineNotes.map((med, index) => {
              const isUnclear = med.confidence === 'Low' || med.confidence === 'Medium';
              const doseKeys = ['Morning', 'Afternoon', 'Night'];

              return (
                <div
                  key={index}
                  className="bg-white rounded-[24px] p-5 border border-black/[0.08] shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-3.5 transition-all hover:border-black/[0.16]"
                >
                  {/* Medicine Name and Dosage / Confidence */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-[#161616] flex items-center gap-2">
                        <span>{med.medicineName}</span>
                      </h4>
                      {med.dosage && (
                        <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {med.dosage}
                        </span>
                      )}
                    </div>

                    {isUnclear ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-900 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300">
                        <AlertCircle className="w-3 h-3 text-amber-700" />
                        <span>{isHindi ? 'जांच लें' : isBengali ? 'যাচাই করুন' : 'Confirm'}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300">
                        {isHindi ? 'स्पष्ट' : isBengali ? 'স্পষ্ট' : 'Clear Rx'}
                      </span>
                    )}
                  </div>

                  {/* Point 1: Why take this medicine (Purpose in Waterline Simple Language) */}
                  {med.purpose && (
                    <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-start gap-2.5 text-xs text-[#161616]">
                      <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-900 block text-[11px] uppercase tracking-wide">
                          {isHindi ? 'यह दवा क्यों लेनी है:' : isBengali ? 'এই ওষুধটি কেন খাবেন:' : 'Why take this medicine:'}
                        </span>
                        <p className="leading-relaxed mt-0.5">{med.purpose}</p>
                      </div>
                    </div>
                  )}

                  {/* Point 2: When to take this medicine (Timing & Meal Relation) */}
                  <div className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-black/[0.04] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-xs font-bold text-[#161616]">
                          {isHindi ? 'लेने का समय:' : isBengali ? 'খাওয়ার সময়:' : 'When to take:'}
                        </span>
                      </div>
                      {med.duration && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-[#555] bg-white px-2.5 py-0.5 rounded-full border border-black/[0.06]">
                          <Calendar className="w-3 h-3 text-[#737373]" />
                          <span>{med.duration}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-[#222] font-medium leading-relaxed">
                      {med.timing || med.writtenInstruction}
                    </p>

                    {/* Visual Schedule Chips (Morning / Afternoon / Night / Meal) */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div
                        className={`p-2 rounded-xl border text-center transition-all ${
                          med.schedule?.morning
                            ? 'bg-amber-100/60 border-amber-300 text-amber-950 font-bold'
                            : 'bg-white/80 border-black/[0.04] text-[#888]'
                        }`}
                      >
                        <Sun className={`w-3.5 h-3.5 mx-auto mb-0.5 ${med.schedule?.morning ? 'text-amber-600' : 'text-[#aaa]'}`} />
                        <span className="text-[11px] block">
                          {isHindi ? 'सुबह' : isBengali ? 'সকাল' : 'Morning'}
                        </span>
                      </div>

                      <div
                        className={`p-2 rounded-xl border text-center transition-all ${
                          med.schedule?.afternoon
                            ? 'bg-amber-100/60 border-amber-300 text-amber-950 font-bold'
                            : 'bg-white/80 border-black/[0.04] text-[#888]'
                        }`}
                      >
                        <Sunset className={`w-3.5 h-3.5 mx-auto mb-0.5 ${med.schedule?.afternoon ? 'text-amber-600' : 'text-[#aaa]'}`} />
                        <span className="text-[11px] block">
                          {isHindi ? 'दोपहर' : isBengali ? 'দুপুর' : 'Afternoon'}
                        </span>
                      </div>

                      <div
                        className={`p-2 rounded-xl border text-center transition-all ${
                          med.schedule?.night
                            ? 'bg-indigo-100/60 border-indigo-300 text-indigo-950 font-bold'
                            : 'bg-white/80 border-black/[0.04] text-[#888]'
                        }`}
                      >
                        <Moon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${med.schedule?.night ? 'text-indigo-600' : 'text-[#aaa]'}`} />
                        <span className="text-[11px] block">
                          {isHindi ? 'रात' : isBengali ? 'রাত' : 'Night'}
                        </span>
                      </div>
                    </div>

                    {/* Meal Relation Badge */}
                    {med.schedule?.mealRelation && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#444] pt-1">
                        <Utensils className="w-3.5 h-3.5 text-emerald-700" />
                        <span>
                          <strong className="text-[#161616]">
                            {isHindi ? 'भोजन निर्देश: ' : isBengali ? 'খাবার নিয়ম: ' : 'Meal Rule: '}
                          </strong>
                          {med.schedule.mealRelation}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Gentle Daily Dose Tracker Checklist */}
                  <div className="space-y-1.5 pt-0.5">
                    <span className="text-[10px] font-bold text-[#737373] uppercase tracking-wider block">
                      {isHindi ? 'आज की खुराक मार्क करें:' : isBengali ? 'আজকের ডোজ সম্পন্ন করুন:' : 'Mark Today’s Dose:'}
                    </span>
                    <div className="flex items-center gap-2">
                      {doseKeys.map((dose) => {
                        const key = `${med.medicineName}_${dose}`;
                        const isDone = !!checkedDoses[key];
                        const isScheduled =
                          (dose === 'Morning' && med.schedule?.morning) ||
                          (dose === 'Afternoon' && med.schedule?.afternoon) ||
                          (dose === 'Night' && med.schedule?.night) ||
                          (!med.schedule);

                        return (
                          <button
                            key={dose}
                            type="button"
                            onClick={() => toggleDose(key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.98] cursor-pointer ${
                              isDone
                                ? 'bg-[#161616] text-white shadow-xs'
                                : isScheduled
                                ? 'bg-[#F0EFEA] text-[#161616] hover:bg-neutral-200'
                                : 'bg-[#F7F7F5] text-[#999]'
                            }`}
                          >
                            <Check className={`w-3.5 h-3.5 ${isDone ? 'stroke-[2.5]' : 'opacity-30'}`} />
                            <span>
                              {dose === 'Morning'
                                ? isHindi ? 'सुबह' : isBengali ? 'সকাল' : 'Morning'
                                : dose === 'Afternoon'
                                ? isHindi ? 'दोपहर' : isBengali ? 'দুপুর' : 'Noon'
                                : isHindi ? 'रात' : isBengali ? 'রাত' : 'Night'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Warning Note if needed */}
                  {med.warning && (
                    <p className="text-xs text-rose-900 bg-rose-50/90 p-2.5 rounded-xl border border-rose-200/80 leading-snug">
                      ⚠️ {med.warning}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: DOCTOR'S ADVICE & PRECAUTION POINTS */}
      {result.doctorAdvice && result.doctorAdvice.length > 0 && (
        <div className="bg-white rounded-[24px] p-6 border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <div>
              <h3 className="text-sm font-bold text-[#161616]">
                {isHindi ? 'डॉक्टर की सलाह व सावधानियां' : isBengali ? 'ডাক্তারের পরামর্শ ও সতর্কতা' : 'Doctor’s Advice & Care Tips'}
              </h3>
              <p className="text-[11px] text-[#737373]">
                {isHindi ? 'जल्दी स्वस्थ होने के लिए ज़रूरी बातें' : isBengali ? 'দ্রুত আরোগ্য লাভের প্রয়োজনীয় পরামর্শ' : 'Important steps for faster recovery'}
              </p>
            </div>
          </div>

          <ul className="space-y-2 pt-1">
            {result.doctorAdvice.map((advice, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-xs text-[#222] p-2.5 rounded-xl bg-[#F7F7F5] border border-black/[0.03] leading-relaxed"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{advice}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* LAB REPORT ITEMS IF LAB DOCUMENT */}
      {result.items && result.items.length > 0 && (
        <div className="space-y-3">
          <div className="px-1">
            <h3 className="text-base font-bold text-[#161616]">
              {isHindi ? 'जांच परिणाम' : isBengali ? 'টেস্ট ফলাফল' : 'Lab Test Results'}
            </h3>
            <p className="text-xs text-[#737373]">
              {isHindi ? 'परिणाम और उनका सरल अर्थ' : isBengali ? 'ফলাফল ও সহজ অর্থ' : 'Results and one-line plain meaning'}
            </p>
          </div>

          <div className="space-y-2">
            {result.items.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-[20px] p-4 border border-black/[0.06] shadow-[0_1px_6px_rgba(0,0,0,0.02)] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-[#161616]">{item.name}</h4>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      item.status === 'Normal'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : item.status === 'High'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : item.status === 'Low'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-neutral-100 text-neutral-800 border-neutral-200'
                    }`}
                  >
                    <span>{item.status}</span>
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-[#737373] text-[11px] block">Result</span>
                    <span className="text-sm font-bold text-[#161616]">{item.result}</span>
                  </div>
                  {item.range && (
                    <div className="border-l border-black/[0.06] pl-4">
                      <span className="text-[#737373] text-[11px] block">Reference Range</span>
                      <span className="text-xs text-[#161616]">{item.range}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-[#737373] leading-relaxed pt-1 border-t border-black/[0.04]">
                  {item.simpleMeaning}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEXT STEP ACTION CARD */}
      {result.nextStep && (
        <div className="bg-emerald-50/70 rounded-[20px] p-4 border border-emerald-200/80 space-y-1">
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide block">
            {isHindi ? 'आगे क्या करें:' : isBengali ? 'পরবর্তী পদক্ষেপ:' : 'Next Step:'}
          </span>
          <p className="text-xs text-emerald-900 leading-relaxed font-medium">
            {result.nextStep}
          </p>
        </div>
      )}

      {/* Safety Disclaimer */}
      <div className="pt-2 text-center px-4">
        <p className="text-[11px] text-[#737373] leading-relaxed">
          {result.disclaimer ||
            'NutriDoc is for plain-language awareness only. Always consult your doctor or certified pharmacist before starting or modifying any medication.'}
        </p>
      </div>

      {/* Made With ❤️ by Nirmalya ! with animated pumping heart */}
      <MadeByFooter className="pt-2 pb-6" />
    </div>
  );
};
