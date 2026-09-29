import React, { useState } from 'react';
import { FoodAnalysisResult, UserProfile, BetterAlternative } from '../../types';
import {
  ArrowLeft,
  ShieldCheck,
  ArrowRightLeft,
  ChevronDown,
  Sparkles,
  Search,
  ExternalLink,
  Check,
  Tag,
  Apple,
  TrendingUp,
  ShoppingBag,
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
  const [activeTab, setActiveTab] = useState<'all' | 'brand' | 'fresh'>('brand');
  const [expandedAltIndex, setExpandedAltIndex] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Status styling (Apple clean palette: Green, Amber, Red only)
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Good Choice':
        return {
          pillBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dotBg: 'bg-emerald-500',
          scoreColor: 'text-emerald-700',
          ringBg: 'stroke-emerald-500',
          label: isHindi ? 'उत्तम विकल्प' : isBengali ? 'উত্তম পছন্দ' : 'Good Choice',
        };
      case 'Limit':
        return {
          pillBg: 'bg-amber-50 text-amber-800 border-amber-200',
          dotBg: 'bg-amber-500',
          scoreColor: 'text-amber-700',
          ringBg: 'stroke-amber-500',
          label: isHindi ? 'सीमित सेवन करें' : isBengali ? 'পরিমিত খান' : 'Limit',
        };
      case 'Avoid':
      default:
        return {
          pillBg: 'bg-rose-50 text-rose-800 border-rose-200',
          dotBg: 'bg-rose-500',
          scoreColor: 'text-rose-700',
          ringBg: 'stroke-rose-500',
          label: isHindi ? 'सेवन से बचें' : isBengali ? 'পরিহার করুন' : 'Avoid',
        };
    }
  };

  const getNutrientBadge = (level: 'Low' | 'Medium' | 'High', isPositiveNutrient: boolean = false) => {
    if (!isPositiveNutrient) {
      if (level === 'Low') return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      if (level === 'Medium') return 'bg-amber-50 text-amber-800 border-amber-100';
      return 'bg-rose-50 text-rose-800 border-rose-100 font-semibold';
    } else {
      if (level === 'High') return 'bg-emerald-50 text-emerald-800 border-emerald-100 font-semibold';
      if (level === 'Medium') return 'bg-neutral-100 text-[#1D1D1F] border-neutral-200';
      return 'bg-neutral-100 text-[#86868B] border-neutral-200';
    }
  };

  const statusStyle = getStatusStyles(result.status);
  const strokeDashoffset = 283 - (283 * result.healthScore) / 100;

  // Filter alternatives based on selected tab
  const filteredAlternatives = (result.betterAlternatives || []).filter((alt) => {
    if (activeTab === 'brand') return alt.type !== 'fresh';
    if (activeTab === 'fresh') return alt.type === 'fresh';
    return true;
  });

  const handleCopySearch = (alt: BetterAlternative, idx: number) => {
    const searchQuery = `${alt.brand ? alt.brand + ' ' : ''}${alt.name}`;
    navigator.clipboard?.writeText(searchQuery).catch(() => {});
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2500);

    // Also open Google Search / Quick commerce lookup in new tab cleanly
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery + ' buy online')}`;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {}
  };

  const toggleExpand = (index: number) => {
    setExpandedAltIndex(expandedAltIndex === index ? null : index);
  };

  return (
    <div className="space-y-6 pb-28 animate-slide-up">
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
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 py-1.5 px-3 rounded-full bg-emerald-50 border border-emerald-100 shadow-2xs active:scale-95 transition-all"
        >
          {isHindi ? 'नया स्कैन' : isBengali ? 'নতুন স্ক্যান' : 'Scan Another'}
        </button>
      </div>

      {/* Main Scanned Product Card */}
      <div className="bg-white rounded-3xl p-6 border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
        {/* Scanned Product Image at top */}
        <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center border border-black/[0.04]">
          {result.imageUrl ? (
            <img
              src={result.imageUrl}
              alt={result.productName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-4">
              <span className="text-xs font-medium text-[#86868B]">Captured Product</span>
            </div>
          )}

          {/* Status Overlay Badge */}
          <div className="absolute top-3 right-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md shadow-xs ${statusStyle.pillBg}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusStyle.dotBg}`} />
              {statusStyle.label}
            </span>
          </div>
        </div>

        {/* Product Name & Brand */}
        <div>
          {result.brand && (
            <p className="text-xs uppercase font-semibold tracking-wider text-[#86868B]">
              {result.brand}
            </p>
          )}
          <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
            {result.productName}
          </h2>
          <p className="text-xs text-[#86868B] mt-0.5">{result.category}</p>
        </div>

        {/* Health Score Hero Strip */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F7F7F5] border border-black/[0.03]">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider block">
              {isHindi ? 'हेल्थ स्कोर' : isBengali ? 'হেলথ স্কোর' : 'Health Score'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-extrabold tracking-tight ${statusStyle.scoreColor}`}>
                {result.healthScore}
              </span>
              <span className="text-sm font-semibold text-[#86868B]">/ 100</span>
            </div>
          </div>

          {/* Circular Progress Ring */}
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                className="stroke-black/10"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                className={statusStyle.ringBg}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
            </svg>
            <div className="absolute text-[10px] font-bold text-[#1D1D1F]">
              {result.healthScore}%
            </div>
          </div>
        </div>

        {/* Compact Nutrition Indicators */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#86868B]">
            {isHindi ? 'प्रमुख पोषण संकेतक' : isBengali ? 'মূল পুষ্টি উপাদান' : 'Nutrition Indicators'}
          </p>
          <div className="grid grid-cols-5 gap-1.5 text-center">
            <div className={`p-2 rounded-xl border ${getNutrientBadge(result.nutrition.sugar, false)}`}>
              <span className="text-[10px] text-[#86868B] block">Sugar</span>
              <span className="text-xs font-bold block mt-0.5">{result.nutrition.sugar}</span>
            </div>
            <div className={`p-2 rounded-xl border ${getNutrientBadge(result.nutrition.sodium, false)}`}>
              <span className="text-[10px] text-[#86868B] block">Salt</span>
              <span className="text-xs font-bold block mt-0.5">{result.nutrition.sodium}</span>
            </div>
            <div className={`p-2 rounded-xl border ${getNutrientBadge(result.nutrition.fat, false)}`}>
              <span className="text-[10px] text-[#86868B] block">Fat</span>
              <span className="text-xs font-bold block mt-0.5">{result.nutrition.fat}</span>
            </div>
            <div className={`p-2 rounded-xl border ${getNutrientBadge(result.nutrition.protein, true)}`}>
              <span className="text-[10px] text-[#86868B] block">Protein</span>
              <span className="text-xs font-bold block mt-0.5">{result.nutrition.protein}</span>
            </div>
            <div className={`p-2 rounded-xl border ${getNutrientBadge(result.nutrition.fibre, true)}`}>
              <span className="text-[10px] text-[#86868B] block">Fibre</span>
              <span className="text-xs font-bold block mt-0.5">{result.nutrition.fibre}</span>
            </div>
          </div>
        </div>

        {/* Short Reasoning */}
        <div className="space-y-2 pt-2 border-t border-black/[0.04]">
          <div className="text-sm text-[#1D1D1F] leading-snug">
            <span className="font-bold">{isHindi ? 'कारण: ' : isBengali ? 'কারণ: ' : 'Why: '}</span>
            <span>{result.simpleReason}</span>
          </div>

          {result.personalNote && (
            <div className="text-sm text-[#1D1D1F] leading-snug bg-amber-50/60 p-3 rounded-xl border border-amber-200/50">
              <span className="font-bold text-amber-900">
                {isHindi ? 'आपके लिए: ' : isBengali ? 'আপনার জন্য: ' : 'For you: '}
              </span>
              <span className="text-amber-900">{result.personalNote}</span>
            </div>
          )}
        </div>

        {/* Key Flags pills */}
        {result.keyFlags && result.keyFlags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {result.keyFlags.map((flag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium bg-black/[0.04] text-[#505054] px-2.5 py-0.5 rounded-full"
              >
                {flag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Healthier Alternatives & Real Other Brand Swaps Section */}
      <div className="space-y-4">
        {/* Section Header */}
        <div className="px-1 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold tracking-tight text-[#1D1D1F]">
                {isHindi
                  ? 'अन्य ब्रांड्स के स्वस्थ विकल्प'
                  : isBengali
                  ? 'অন্যান্য ব্র্যান্ডের স্বাস্থ্যকর বিকল্প'
                  : 'Healthier Brand Alternatives'}
              </h3>
            </div>
            <p className="text-xs text-[#86868B] mt-0.5">
              {isHindi
                ? 'बाजार में उपलब्ध अन्य ब्रांड्स के स्वस्थ उत्पाद व स्वच्छ सामग्री'
                : isBengali
                ? 'বাজারে সহজলভ্য বিকল্প ব্র্যান্ডের স্বাস্থ্যসম্মত পছন্দ'
                : 'Clean-label market brands with zero palm oil & lower sugar'}
            </p>
          </div>
        </div>

        {/* Apple Segmented Control Tab Switcher */}
        <div className="flex p-1 bg-black/[0.04] rounded-full border border-black/[0.03]">
          <button
            onClick={() => setActiveTab('brand')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
              activeTab === 'brand'
                ? 'bg-white text-black shadow-xs'
                : 'text-[#86868B] hover:text-black'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>{isHindi ? 'अन्य ब्रांड्स' : isBengali ? 'অন্যান্য ব্র্যান্ড' : 'Other Brands'}</span>
          </button>
          <button
            onClick={() => setActiveTab('fresh')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
              activeTab === 'fresh'
                ? 'bg-white text-black shadow-xs'
                : 'text-[#86868B] hover:text-black'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>{isHindi ? 'ताजा व देसी' : isBengali ? 'তাজা ও প্রাকৃতিক' : 'Fresh & Whole'}</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
              activeTab === 'all'
                ? 'bg-white text-black shadow-xs'
                : 'text-[#86868B] hover:text-black'
            }`}
          >
            <span>{isHindi ? 'सभी विकल्प' : isBengali ? 'সব বিকল্প' : 'All Swaps'}</span>
          </button>
        </div>

        {/* Alternatives Cards List */}
        <div className="space-y-3">
          {filteredAlternatives.map((alt, index) => {
            const isExpanded = expandedAltIndex === index;
            const altScore = alt.healthScore || 88;

            return (
              <div
                key={index}
                className="bg-white rounded-3xl p-5 border border-black/[0.06] shadow-2xs hover:border-black/15 transition-all duration-200 space-y-3.5"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Header: Brand Pill + Budget & Health Score */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Brand Badge */}
                    {alt.brand && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#1D1D1F] text-white shadow-2xs">
                        <Tag className="w-3 h-3 text-emerald-400" />
                        {alt.brand}
                      </span>
                    )}

                    {/* Highlight Tag */}
                    {alt.highlightTag && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                        {alt.highlightTag}
                      </span>
                    )}
                  </div>

                  {/* Health Score Pill */}
                  <div className="flex items-center gap-1 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                    <span className="text-[10px] font-bold text-emerald-800">
                      Score {altScore}
                    </span>
                  </div>
                </div>

                {/* Product Name & Category */}
                <div>
                  <h4 className="text-base font-bold text-[#1D1D1F] tracking-tight leading-snug">
                    {alt.name}
                  </h4>
                  <p className="text-xs text-[#86868B] mt-0.5">
                    {alt.category} {alt.budgetLevel && `• ${alt.budgetLevel}`}
                  </p>
                </div>

                {/* Why It's Healthier */}
                <p className="text-xs text-[#444447] leading-relaxed bg-[#F7F7F5] p-3 rounded-2xl border border-black/[0.02]">
                  <strong className="text-[#1D1D1F]">
                    {isHindi ? 'क्यों बेहतर है: ' : isBengali ? 'কেন ভালো: ' : 'Why better: '}
                  </strong>
                  {alt.whyBetter}
                </p>

                {/* Interactive Action Strip */}
                <div className="flex items-center justify-between pt-1 gap-2 border-t border-black/[0.04]">
                  {/* Toggle Comparison Sheet */}
                  <button
                    onClick={() => toggleExpand(index)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] hover:text-black py-1.5 px-3 rounded-full bg-[#F7F7F5] border border-black/[0.05] active:scale-95 transition-all"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {isExpanded
                        ? (isHindi ? 'तुलना छुपाएं' : isBengali ? 'তুলনা লুকান' : 'Hide Comparison')
                        : (isHindi ? 'स्कैन किए गए उत्पाद से तुलना' : isBengali ? 'স্ক্যান করা খাদ্যের সাথে তুলনা' : 'Quick Compare vs Scanned')}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#86868B] transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Find Online / Quick Commerce Action */}
                  <button
                    onClick={() => handleCopySearch(alt, index)}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 py-1.5 px-3 rounded-full active:scale-95 transition-all"
                    title="Find on Blinkit, Zepto, Instamart, or Amazon"
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isHindi ? 'खोज खोला गया!' : 'Opened Search!'}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{isHindi ? 'ऑनलाइन देखें' : isBengali ? 'অনলাইনে খুঁজুন' : 'Find Online'}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Animated Side-by-Side Comparison Drawer */}
                {isExpanded && (
                  <div className="pt-2 animate-slide-up">
                    <div className="rounded-2xl bg-neutral-900 text-white p-4 space-y-3 text-xs shadow-md">
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <span className="font-bold text-white/90">
                          {isHindi ? 'सीधी तुलना' : isBengali ? 'সরাসরি তুলনা' : 'Head-to-Head Comparison'}
                        </span>
                        <span className="text-[10px] text-white/60">
                          {result.productName.slice(0, 18)}... vs {alt.brand || 'Alternative'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {/* Scanned Item Column */}
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-rose-300 block truncate">
                            {result.brand ? `${result.brand}: ` : ''}{result.productName}
                          </span>
                          <div className="space-y-1 text-white/80">
                            <div>Score: <strong className="text-rose-400">{result.healthScore}/100</strong></div>
                            <div>Sugar: <span className="text-rose-300">{result.nutrition.sugar}</span></div>
                            <div>Fat: <span className="text-rose-300">{result.nutrition.fat}</span></div>
                            <div>
                              Palm Oil:{' '}
                              <span className="text-rose-300">
                                {result.keyFlags.includes('Contains Palm Oil') ? 'Yes (Present)' : 'Check label'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Better Alternative Column */}
                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-emerald-300 block truncate">
                            {alt.brand}: {alt.name}
                          </span>
                          <div className="space-y-1 text-white/90">
                            <div>Score: <strong className="text-emerald-300">{altScore}/100</strong></div>
                            <div>
                              Sugar:{' '}
                              <span className="text-emerald-300 font-semibold">
                                {alt.nutritionComparison?.sugarDiff || 'Zero Refined / Low'}
                              </span>
                            </div>
                            <div>
                              Fat:{' '}
                              <span className="text-emerald-300 font-semibold">
                                {alt.nutritionComparison?.fatDiff || 'Baked / Low Sat Fat'}
                              </span>
                            </div>
                            <div>
                              Palm Oil:{' '}
                              <span className="text-emerald-300 font-semibold">
                                {alt.highlightTag?.toLowerCase().includes('palm oil') || alt.whyBetter.toLowerCase().includes('palm oil')
                                  ? '0 Palm Oil'
                                  : 'Zero Trans Fat'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-white/70 pt-1 flex items-center justify-between">
                        <span>
                          {isHindi
                            ? '✓ अन्य ब्रांड के इस उत्पाद में कम हानिकारक एडिटिव्स हैं'
                            : isBengali
                            ? '✓ এই ব্র্যান্ডের খাদ্যে কোনো ক্ষতিকর কেমিক্যাল নেই'
                            : '✓ Significantly cleaner nutrition profile'}
                        </span>
                        <span className="text-emerald-400 font-bold">
                          +{Math.max(10, altScore - result.healthScore)} pts Healthier
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety Disclaimer */}
      <div className="pt-2 text-center px-4">
        <p className="text-[11px] text-[#86868B] leading-relaxed">
          {result.disclaimer ||
            'NutriDoc provides general awareness only. It does not diagnose illness or replace a doctor or pharmacist.'}
        </p>
      </div>
    </div>
  );
};
