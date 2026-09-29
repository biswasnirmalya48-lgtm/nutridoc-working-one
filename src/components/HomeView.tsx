import React from 'react';
import { Camera, FileText, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';

interface HomeViewProps {
  onStartFoodScan: () => void;
  onStartReportScan: () => void;
  profile: UserProfile;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartFoodScan,
  onStartReportScan,
  profile,
}) => {
  const isHindi = profile.language === 'hi';
  const isBengali = profile.language === 'bn';

  return (
    <div className="space-y-6 pb-20 pt-2 animate-fade-in">
      {/* Friendly Apple Welcome Header */}
      <div className="space-y-1">
        <p className="text-[13px] font-medium text-[#86868B] uppercase tracking-wider">
          {isHindi ? 'दैनिक स्वास्थ्य साथी' : isBengali ? 'দৈনিক স্বাস্থ্য সহায়ক' : 'Everyday Health Companion'}
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-[#1D1D1F]">
          {isHindi ? 'आप क्या जांचना चाहते हैं?' : isBengali ? 'আজ কি পরীক্ষা করতে চান?' : 'What would you like to check?'}
        </h2>
      </div>

      {/* The Two Main Actions (Strictly Minimal & Large) */}
      <div className="grid grid-cols-1 gap-4">
        {/* Action 1: Scan Food */}
        <button
          onClick={onStartFoodScan}
          className="group relative w-full text-left bg-white rounded-3xl p-6 border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] active:scale-[0.985] transition-all overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-emerald-500/10 via-emerald-500/5 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          
          <div className="flex items-start justify-between">
            <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <Camera className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="w-9 h-9 rounded-full bg-[#F7F7F5] flex items-center justify-center text-[#86868B] group-hover:text-black group-hover:bg-black/5 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-5 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isHindi ? 'स्टेप 1: फ्रंट • स्टेप 2: इंग्रीडिएंट्स' : isBengali ? 'ধাপ ১: সামনের দিক • ধাপ ২: উপাদান' : '2-Step Smart Camera Scan'}
            </div>
            <h3 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
              {isHindi ? 'खाद्य पैकेट स्कैन करें' : isBengali ? 'খাদ্যের প্যাকেট স্ক্যান করুন' : 'Scan Food'}
            </h3>
            <p className="text-sm text-[#86868B] leading-relaxed">
              {isHindi
                ? 'नमक, चीनी, तेल और हानिकारक एडिटिव्स तुरंत पहचानें। स्वस्थ विकल्प पाएं।'
                : isBengali
                ? 'লবণ, চিনি ও তেলের সঠিক মাত্রা জানুন। সহজ স্বাস্থ্যকর বিকল্প খুঁজুন।'
                : 'Point camera at any packaged food or upload packet photos. Instant nutrient breakdown.'}
            </p>
          </div>
        </button>

        {/* Action 2: Understand Prescription / Report */}
        <button
          onClick={onStartReportScan}
          className="group relative w-full text-left bg-white rounded-3xl p-6 border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] active:scale-[0.985] transition-all overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-blue-500/10 via-blue-500/5 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

          <div className="flex items-start justify-between">
            <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <FileText className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="w-9 h-9 rounded-full bg-[#F7F7F5] flex items-center justify-center text-[#86868B] group-hover:text-black group-hover:bg-black/5 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-5 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {isHindi ? 'सरल भाषा • डॉक्टर पर्चा व टेस्ट' : isBengali ? 'সহজ ভাষা • প্রেসক্রিপশন ও রিপোর্ট' : 'Reports & Handwritten Rx'}
            </div>
            <h3 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
              {isHindi ? 'प्रिस्क्रिप्शन या रिपोर्ट समझें' : isBengali ? 'প্রেসক্রিপশন বা রিপোর্ট বুঝুন' : 'Understand Prescription / Report'}
            </h3>
            <p className="text-sm text-[#86868B] leading-relaxed">
              {isHindi
                ? 'कठिन मेडिकल शब्दों को सरल बनाएं। हाई/लो टेस्ट वैल्यूज और दवा का सही समय जानें।'
                : isBengali
                ? 'জটিল ডাক্তারি রিপোর্টকে সহজ বাংলায় বুঝুন। হাই/লো ফলাফল ও ওষুধের নিয়ম জানুন।'
                : 'Translate medical terms into plain words. High/low values & dosage timing simplified.'}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
