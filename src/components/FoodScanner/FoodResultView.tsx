import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FoodAnalysisResult, UserProfile, BetterAlternative } from '../../types';
import {
  ArrowLeft,
  ArrowRightLeft,
  ChevronDown,
  ExternalLink,
  Check,
  ShoppingBag,
  Volume2,
  VolumeX,
  Package,
} from 'lucide-react';

interface FoodResultViewProps {
  result: FoodAnalysisResult;
  onBack: () => void;
  onScanAnother: () => void;
  profile: UserProfile;
}

export const FoodResultView: React.FC<FoodResultViewProps> = ({
  result,
  onBack,
  onScanAnother,
  profile,
}) => {
  const isHindi = profile.language === 'hi';
  const isBengali = profile.language === 'bn';

  // Interactive states
  const [activeTab, setActiveTab] = useState<'brand' | 'fresh'>('brand');
  const [expandedAltIndex, setExpandedAltIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Smooth Apple animated score counter
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 600;
    const target = result.healthScore;

    function step(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(target * ease));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [result.healthScore]);

  // Audio Speech Synthesis
  const handleToggleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = `${result.productName}. Health score ${result.healthScore} out of 100. Status: ${result.status}. Why it matters: ${result.simpleReason}. ${result.personalNote ? 'For you: ' + result.personalNote : ''}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Status Styling: One small coloured glass pill
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Good Choice':
        return {
          label: isHindi ? 'उत्तम विकल्प' : isBengali ? 'উত্তম পছন্দ' : 'Good Choice',
          pillClass: 'bg-emerald-50/80 text-emerald-800 border-emerald-300/60 shadow-[0_1px_6px_rgba(16,185,129,0.12)]',
          dotClass: 'bg-emerald-500',
          scoreTextClass: 'text-emerald-700',
          ringStroke: 'stroke-emerald-500',
        };
      case 'Limit':
        return {
          label: isHindi ? 'सीमित सेवन' : isBengali ? 'পরিমিত খান' : 'Limit',
          pillClass: 'bg-amber-50/85 text-amber-900 border-amber-300/60 shadow-[0_1px_6px_rgba(245,158,11,0.12)]',
          dotClass: 'bg-amber-500',
          scoreTextClass: 'text-amber-700',
          ringStroke: 'stroke-amber-500',
        };
      case 'Avoid':
      default:
        return {
          label: isHindi ? 'सेवन से बचें' : isBengali ? 'পরিহার করুন' : 'Avoid',
          pillClass: 'bg-rose-50/85 text-rose-900 border-rose-300/60 shadow-[0_1px_6px_rgba(244,63,94,0.12)]',
          dotClass: 'bg-rose-500',
          scoreTextClass: 'text-rose-700',
          ringStroke: 'stroke-rose-500',
        };
    }
  };

  const statusConfig = getStatusConfig(result.status);
  const strokeDashoffset = 283 - (283 * displayScore) / 100;

  // Nutrient Pill Styling in Clean Simple Rows
  const getNutrientStyle = (level: 'Low' | 'Medium' | 'High', isPositive: boolean) => {
    if (!isPositive) {
      if (level === 'Low') return 'bg-[#F0EFEA] text-[#161616]';
      if (level === 'Medium') return 'bg-amber-50/90 text-amber-900 border border-amber-200/80 font-medium';
      return 'bg-rose-50/90 text-rose-900 border border-rose-200/80 font-semibold';
    } else {
      if (level === 'High') return 'bg-emerald-50/90 text-emerald-800 border border-emerald-200/80 font-medium';
      return 'bg-[#F0EFEA] text-[#161616]';
    }
  };

  // Filter alternatives
  const alternatives = result.betterAlternatives || [];
  const filteredAlternatives = alternatives.filter((alt) => {
    if (activeTab === 'brand') return alt.type !== 'fresh';
    if (activeTab === 'fresh') return alt.type === 'fresh';
    return true;
  });

  const handleCopySearch = (alt: BetterAlternative, idx: number) => {
    const query = `${alt.brand ? alt.brand + ' ' : ''}${alt.name}`;
    navigator.clipboard?.writeText(query).catch(() => {});
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2500);

    const url = `https://www.google.com/search?q=${encodeURIComponent(query + ' buy online')}`;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  const toggleExpand = (index: number) => {
    setExpandedAltIndex(expandedAltIndex === index ? null : index);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Floating Glass Navigation */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-[#161616] hover:text-black py-1.5 px-3 rounded-full liquid-glass-capsule liquid-ripple active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isHindi ? 'वापस' : isBengali ? 'পেছনে' : 'Home'}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Calm Audio Speak Action */}
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
            {isHindi ? 'नया स्कैन' : isBengali ? 'নতুন স্ক্যান' : 'Scan Another'}
          </button>
        </div>
      </div>

      {/* Main Scanned Product Container (Clean Flat Spacious Card with soft depth) */}
      <div className="bg-white rounded-[24px] p-6 border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-6">
        {/* Scanned Product Image is the Visual Hero (Staggered Soft Fade) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full h-56 rounded-[20px] overflow-hidden bg-[#F7F7F5] flex items-center justify-center border border-black/[0.04]"
        >
          {result.imageUrl ? (
            <img
              src={result.imageUrl}
              alt={result.productName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[#737373]">
              <Package className="w-10 h-10 stroke-[1.5]" />
              <span className="text-xs">Product Image</span>
            </div>
          )}
        </motion.div>

        {/* Product Name & Category */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-0.5"
        >
          {result.brand && (
            <p className="text-xs uppercase tracking-wider font-semibold text-[#737373]">
              {result.brand}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-[#161616]">
            {result.productName}
          </h1>
          <p className="text-sm text-[#737373]">{result.category}</p>
        </motion.div>

        {/* Health Score & Small Coloured Glass Status Pill */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between pt-1 pb-1"
        >
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-[#737373]">
              Health Score: {displayScore}/100
            </span>
            <div>
              {/* One small coloured glass pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold liquid-glass-tag border ${statusConfig.pillClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                {statusConfig.label}
              </span>
            </div>
          </div>

          {/* Minimal Apple Progress Ring with smooth animated fill */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-black/[0.06]"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                className={statusConfig.ringStroke}
                strokeWidth="7"
                fill="transparent"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.15s ease-out' }}
              />
            </svg>
            <span className="absolute text-xs font-semibold text-[#161616]">
              {displayScore}
            </span>
          </div>
        </motion.div>

        {/* Nutrition values in one clean horizontal row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="pt-2 border-t border-black/[0.04]"
        >
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className={`p-2.5 rounded-2xl ${getNutrientStyle(result.nutrition.sugar, false)}`}>
              <span className="text-[11px] text-[#737373] block">Sugar</span>
              <span className="text-xs font-semibold block mt-0.5">{result.nutrition.sugar}</span>
            </div>
            <div className={`p-2.5 rounded-2xl ${getNutrientStyle(result.nutrition.sodium, false)}`}>
              <span className="text-[11px] text-[#737373] block">Salt</span>
              <span className="text-xs font-semibold block mt-0.5">{result.nutrition.sodium}</span>
            </div>
            <div className={`p-2.5 rounded-2xl ${getNutrientStyle(result.nutrition.fat, false)}`}>
              <span className="text-[11px] text-[#737373] block">Fat</span>
              <span className="text-xs font-semibold block mt-0.5">{result.nutrition.fat}</span>
            </div>
            <div className={`p-2.5 rounded-2xl ${getNutrientStyle(result.nutrition.protein, true)}`}>
              <span className="text-[11px] text-[#737373] block">Protein</span>
              <span className="text-xs font-semibold block mt-0.5">{result.nutrition.protein}</span>
            </div>
            <div className={`p-2.5 rounded-2xl ${getNutrientStyle(result.nutrition.fibre, true)}`}>
              <span className="text-[11px] text-[#737373] block">Fibre</span>
              <span className="text-xs font-semibold block mt-0.5">{result.nutrition.fibre}</span>
            </div>
          </div>
        </motion.div>

        {/* Why it matters: One short sentence only */}
        <div className="space-y-1.5 pt-2 border-t border-black/[0.04]">
          <h3 className="text-xs font-semibold text-[#161616] uppercase tracking-wider">
            {isHindi ? 'यह क्यों महत्वपूर्ण है' : isBengali ? 'কেন এটি গুরুত্বপূর্ণ' : 'Why it matters'}
          </h3>
          <p className="text-sm text-[#161616] leading-relaxed">
            {result.simpleReason}
          </p>
        </div>

        {/* For you: One short personalised sentence only */}
        {result.personalNote && (
          <div className="space-y-1.5 pt-2 border-t border-black/[0.04]">
            <h3 className="text-xs font-semibold text-[#161616] uppercase tracking-wider">
              {isHindi ? 'आपके लिए' : isBengali ? 'আপনার জন্য' : 'For you'}
            </h3>
            <p className="text-sm text-[#161616] leading-relaxed">
              {result.personalNote}
            </p>
          </div>
        )}
      </div>

      {/* Better swaps Section */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#161616]">
              {isHindi ? 'बेहतर विकल्प' : isBengali ? 'স্বাস্থ্যকর বিকল্প' : 'Better swaps'}
            </h2>
            <p className="text-xs text-[#737373]">
              {isHindi
                ? 'अन्य स्वस्थ ब्रांड्स के विकल्प'
                : isBengali
                ? 'অন্যান্য ব্র্যান্ডের স্বাস্থ্যকর বিকল্প'
                : 'Healthier alternatives from other brands'}
            </p>
          </div>

          {/* Liquid Sliding Tab Control */}
          <div className="relative flex p-0.5 liquid-glass-capsule rounded-full">
            <button
              onClick={() => setActiveTab('brand')}
              className="relative px-3 py-1 text-xs transition-colors z-10 liquid-ripple"
            >
              {activeTab === 'brand' && (
                <motion.div
                  layoutId="activeSwapTabCapsule"
                  className="absolute inset-0 rounded-full liquid-glass-active-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 font-medium transition-colors duration-150 ${
                  activeTab === 'brand' ? 'text-white' : 'text-[#737373] hover:text-[#161616]'
                }`}
              >
                {isHindi ? 'ब्रांड्स' : isBengali ? 'ব্র্যান্ড' : 'Brands'}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('fresh')}
              className="relative px-3 py-1 text-xs transition-colors z-10 liquid-ripple"
            >
              {activeTab === 'fresh' && (
                <motion.div
                  layoutId="activeSwapTabCapsule"
                  className="absolute inset-0 rounded-full liquid-glass-active-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 font-medium transition-colors duration-150 ${
                  activeTab === 'fresh' ? 'text-white' : 'text-[#737373] hover:text-[#161616]'
                }`}
              >
                {isHindi ? 'प्राकृतिक' : isBengali ? 'প্রাকৃতিক' : 'Whole food'}
              </span>
            </button>
          </div>
        </div>

        {/* Alternatives Cards List with Understated Glass Hover/Tap Response */}
        <div className="space-y-3">
          {filteredAlternatives.map((alt, index) => {
            const isExpanded = expandedAltIndex === index;
            const altScore = alt.healthScore || 85;

            return (
              <div
                key={index}
                className="bg-white rounded-[22px] p-5 border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3 transition-all hover:border-black/[0.12]"
              >
                {/* Brand Badge & Budget Label */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {alt.brand && (
                      <span className="text-[11px] font-semibold text-[#161616] bg-[#F0EFEA] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {alt.brand}
                      </span>
                    )}
                    {alt.highlightTag && (
                      <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                        {alt.highlightTag}
                      </span>
                    )}
                  </div>

                  {alt.budgetLevel && (
                    <span className="text-[11px] text-[#737373]">
                      {alt.budgetLevel} budget
                    </span>
                  )}
                </div>

                {/* Name */}
                <div>
                  <h4 className="text-base font-semibold text-[#161616] tracking-tight">
                    {alt.name}
                  </h4>
                  <p className="text-xs text-[#737373] mt-0.5">{alt.category}</p>
                </div>

                {/* One Short Reason */}
                <p className="text-xs text-[#161616] leading-relaxed bg-[#F7F7F5] p-3 rounded-2xl">
                  {alt.whyBetter}
                </p>

                {/* Interactive Actions Row */}
                <div className="flex items-center justify-between pt-1 gap-2 border-t border-black/[0.04]">
                  {/* Quick Compare Button */}
                  <button
                    onClick={() => toggleExpand(index)}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#161616] hover:text-black py-1.5 px-3 rounded-full liquid-glass-capsule liquid-ripple active:scale-[0.98] transition-all"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {isExpanded
                        ? (isHindi ? 'तुलना छुपाएं' : isBengali ? 'তুলনা লুকান' : 'Hide comparison')
                        : (isHindi ? 'सीधी तुलना करें' : isBengali ? 'তুলনা করুন' : 'Compare')}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#737373] transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Find Online Action */}
                  <button
                    onClick={() => handleCopySearch(alt, index)}
                    className="flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50/90 hover:bg-emerald-100/70 border border-emerald-200/60 py-1.5 px-3 rounded-full liquid-ripple active:scale-[0.98] transition-all"
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Opened!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{isHindi ? 'ऑनलाइन देखें' : isBengali ? 'অনলাইনে খুঁজুন' : 'Find online'}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Smooth Expandable Comparison Card */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="pt-2 overflow-hidden"
                  >
                    <div className="rounded-2xl bg-[#F7F7F5] p-3.5 border border-black/[0.06] space-y-2 text-xs">
                      <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.06]">
                        <span className="font-semibold text-[#161616]">
                          Head-to-Head
                        </span>
                        <span className="text-[11px] text-emerald-700 font-medium">
                          +{Math.max(10, altScore - result.healthScore)} pts cleaner
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {/* Current Scanned Item */}
                        <div className="p-2.5 rounded-xl bg-white border border-black/[0.04] space-y-1">
                          <span className="font-semibold text-rose-800 block truncate">
                            {result.productName}
                          </span>
                          <div className="text-[#737373] space-y-0.5">
                            <div>Score: <span className="font-semibold text-rose-700">{result.healthScore}/100</span></div>
                            <div>Sugar: {result.nutrition.sugar}</div>
                            <div>Fat: {result.nutrition.fat}</div>
                          </div>
                        </div>

                        {/* Cleaner Alternative */}
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60 space-y-1">
                          <span className="font-semibold text-emerald-900 block truncate">
                            {alt.brand ? `${alt.brand}: ` : ''}{alt.name}
                          </span>
                          <div className="text-emerald-800 space-y-0.5">
                            <div>Score: <span className="font-semibold text-emerald-800">{altScore}/100</span></div>
                            <div>Sugar: {alt.nutritionComparison?.sugarDiff || 'Low / Natural'}</div>
                            <div>Fat: {alt.nutritionComparison?.fatDiff || 'Zero Palm Oil'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety Disclaimer */}
      <div className="pt-2 text-center px-4">
        <p className="text-xs text-[#737373] leading-relaxed">
          {result.disclaimer ||
            'NutriDoc provides everyday nutritional guidance and does not replace medical advice.'}
        </p>
      </div>
    </div>
  );
};
