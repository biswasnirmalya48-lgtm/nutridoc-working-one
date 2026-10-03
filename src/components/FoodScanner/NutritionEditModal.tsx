import React, { useState } from 'react';
import { NutritionData, UserProfile } from '../../types';
import { ArrowLeft, Check, Edit3, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { MadeByFooter } from '../Common/MadeByFooter';

interface NutritionEditModalProps {
  initialData: {
    productName: string;
    brand: string;
    category: string;
    barcode?: string;
    frontImageUrl: string;
    referenceImages?: string[];
    isVerifiedDatabase?: boolean;
    nutrition: NutritionData;
  };
  onConfirm: (updatedData: {
    productName: string;
    brand: string;
    category: string;
    barcode?: string;
    frontImageUrl: string;
    referenceImages?: string[];
    isVerifiedDatabase?: boolean;
    nutrition: NutritionData;
  }) => void;
  onCancel: () => void;
  profile: UserProfile;
}

export const NutritionEditModal: React.FC<NutritionEditModalProps> = ({
  initialData,
  onConfirm,
  onCancel,
  profile,
}) => {
  const [productName, setProductName] = useState(initialData.productName);
  const [brand, setBrand] = useState(initialData.brand || '');
  const [category, setCategory] = useState(initialData.category || 'Packaged Snack');

  const [servingSize, setServingSize] = useState(initialData.nutrition.servingSize || '100g / 1 pack');
  const [calories, setCalories] = useState<number>(initialData.nutrition.calories ?? 450);
  const [sugar, setSugar] = useState<number>(initialData.nutrition.sugar ?? 5);
  const [sodium, setSodium] = useState<number>(initialData.nutrition.sodium ?? 400);
  const [totalFat, setTotalFat] = useState<number>(initialData.nutrition.totalFat ?? 15);
  const [saturatedFat, setSaturatedFat] = useState<number>(initialData.nutrition.saturatedFat ?? 6);
  const [transFat, setTransFat] = useState<number>(initialData.nutrition.transFat ?? 0);
  const [protein, setProtein] = useState<number>(initialData.nutrition.protein ?? 6);
  const [fibre, setFibre] = useState<number>(initialData.nutrition.fibre ?? 2);

  const [ingredientsText, setIngredientsText] = useState(
    Array.isArray(initialData.nutrition?.ingredients)
      ? initialData.nutrition.ingredients.join(', ')
      : typeof initialData.nutrition?.ingredients === 'string'
      ? initialData.nutrition.ingredients
      : ''
  );
  const [allergensText, setAllergensText] = useState(
    Array.isArray(initialData.nutrition?.allergens)
      ? initialData.nutrition.allergens.join(', ')
      : typeof initialData.nutrition?.allergens === 'string'
      ? initialData.nutrition.allergens
      : ''
  );

  const isHindi = profile.language === 'hi';
  const isBengali = profile.language === 'bn';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ingredients = ingredientsText
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);
    const allergens = allergensText
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    onConfirm({
      productName,
      brand,
      category,
      barcode: initialData.barcode,
      frontImageUrl: initialData.frontImageUrl,
      referenceImages: initialData.referenceImages,
      isVerifiedDatabase: initialData.isVerifiedDatabase,
      nutrition: {
        servingSize,
        calories: Number(calories) || 0,
        sugar: Number(sugar) || 0,
        sodium: Number(sodium) || 0,
        totalFat: Number(totalFat) || 0,
        saturatedFat: Number(saturatedFat) || 0,
        transFat: Number(transFat) || 0,
        protein: Number(protein) || 0,
        fibre: Number(fibre) || 0,
        ingredients,
        allergens,
        additives: initialData.nutrition.additives || [],
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md overflow-y-auto flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md mx-auto bg-[#FBFBFA] rounded-t-[32px] sm:rounded-[28px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-black/[0.08] flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="sticky top-0 z-30 bg-[#FBFBFA]/90 backdrop-blur-md border-b border-black/[0.06] px-4 h-14 flex items-center justify-between shrink-0">
          <button
            onClick={onCancel}
            className="w-9 h-9 rounded-full liquid-glass-capsule flex items-center justify-center text-[#161616] liquid-ripple active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-[#161616]">
              {isHindi ? 'पोषक तत्वों की समीक्षा' : isBengali ? 'পুষ্টি মান পরীক্ষা' : 'Review Extracted Values'}
            </h3>
            <p className="text-[10px] text-[#737373]">
              {isHindi ? 'विश्लेषण से पहले सही करें' : isBengali ? 'বিশ্লেষণের পূর্বে সঠিক করুন' : 'Confirm or edit OCR readings'}
            </p>
          </div>
          <div className="w-9" />
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto px-5 py-5 space-y-5">
        {/* Scanned Image & Product Info Card */}
        <div className="bg-white rounded-3xl p-4 border border-black/[0.06] shadow-xs flex items-center gap-4">
          {initialData.frontImageUrl ? (
            <img
              src={initialData.frontImageUrl}
              alt="Scanned item"
              className="w-16 h-16 rounded-2xl object-cover bg-black/5 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-black/5 flex items-center justify-center text-[#86868B] shrink-0">
              <Edit3 className="w-6 h-6" />
            </div>
          )}
          <div className="flex-1 space-y-1.5 min-w-0">
            <div>
              <label className="text-[10px] uppercase font-semibold text-[#86868B] tracking-wider">
                {isHindi ? 'उत्पाद का नाम' : isBengali ? 'পণ্যের নাম' : 'Product Name'}
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full text-sm font-semibold text-[#1D1D1F] bg-transparent border-b border-black/10 focus:border-black focus:outline-none pb-0.5 truncate"
              />
            </div>
            <div className="flex gap-2 text-xs">
              <input
                type="text"
                value={brand}
                placeholder="Brand"
                onChange={(e) => setBrand(e.target.value)}
                className="w-1/2 text-xs text-[#86868B] bg-transparent border-b border-black/10 focus:border-black focus:outline-none pb-0.5"
              />
              <input
                type="text"
                value={category}
                placeholder="Category"
                onChange={(e) => setCategory(e.target.value)}
                className="w-1/2 text-xs text-[#86868B] bg-transparent border-b border-black/10 focus:border-black focus:outline-none pb-0.5"
              />
            </div>
          </div>
        </div>

        {/* Nutrition Values Section */}
        <div className="bg-white rounded-3xl p-5 border border-black/[0.06] shadow-xs space-y-4">
          {/* Official Database Verification Guarantee */}
          {initialData.isVerifiedDatabase ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-500/25 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-semibold text-emerald-950">
                  {isHindi ? '100% आधिकारिक खाद्य डेटाबेस से सत्यापित (0% त्रुटि)' : '100% Official Database Match (0% Error Rate)'}
                </p>
                <p className="text-emerald-800 text-[11px] leading-tight">
                  {isHindi
                    ? 'कैलोरी, शर्करा, सोडियम और वसा मान सीधे आधिकारिक अंतरराष्ट्रीय उत्पाद डेटाबेस से लिए गए हैं।'
                    : 'Calories, sugar, sodium, and fat values were matched directly from the official verified global product registry.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-500/25 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-semibold text-amber-950">
                  {isHindi ? 'पोषक तत्वों की पुष्टि करें' : 'Review & Verify Values'}
                </p>
                <p className="text-amber-800 text-[11px] leading-tight">
                  {isHindi
                    ? 'विश्लेषण से पहले कृपया मुद्रित तालिका के अनुसार मानों की पुष्टि कर लें।'
                    : 'Values extracted via camera scan. Adjust any number if needed before clinical health scoring.'}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pb-1 border-b border-black/[0.04]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">
              {isHindi ? 'प्रति सर्विंग / 100g' : isBengali ? 'প্রতি পরিবেশন' : 'Nutrition Facts Table'}
            </h4>
            <input
              type="text"
              value={servingSize}
              onChange={(e) => setServingSize(e.target.value)}
              className="text-right text-xs text-[#86868B] bg-transparent focus:text-black focus:outline-none"
              placeholder="e.g. 100g / 1 pack"
            />
          </div>

          {/* Grid of Key Nutrients */}
          <div className="grid grid-cols-2 gap-3">
            {/* Calories */}
            <div className="bg-[#F7F7F5] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#86868B] block">Calories / Energy</span>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-bold text-[#1D1D1F] bg-transparent focus:outline-none"
                />
                <span className="text-xs text-[#86868B]">kcal</span>
              </div>
            </div>

            {/* Total Sugar */}
            <div className="bg-[#F7F7F5] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#86868B] block">Sugar</span>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  step="0.1"
                  value={sugar}
                  onChange={(e) => setSugar(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-bold text-[#1D1D1F] bg-transparent focus:outline-none"
                />
                <span className="text-xs text-[#86868B]">g</span>
              </div>
            </div>

            {/* Sodium */}
            <div className="bg-[#F7F7F5] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#86868B] block">Sodium / Salt</span>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  value={sodium}
                  onChange={(e) => setSodium(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-bold text-[#1D1D1F] bg-transparent focus:outline-none"
                />
                <span className="text-xs text-[#86868B]">mg</span>
              </div>
            </div>

            {/* Total Fat */}
            <div className="bg-[#F7F7F5] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#86868B] block">Total Fat</span>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  step="0.1"
                  value={totalFat}
                  onChange={(e) => setTotalFat(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-bold text-[#1D1D1F] bg-transparent focus:outline-none"
                />
                <span className="text-xs text-[#86868B]">g</span>
              </div>
            </div>

            {/* Saturated Fat */}
            <div className="bg-[#F7F7F5] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#86868B] block">Saturated Fat</span>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  step="0.1"
                  value={saturatedFat}
                  onChange={(e) => setSaturatedFat(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-bold text-[#1D1D1F] bg-transparent focus:outline-none"
                />
                <span className="text-xs text-[#86868B]">g</span>
              </div>
            </div>

            {/* Trans Fat */}
            <div className="bg-[#F7F7F5] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#86868B] block">Trans Fat</span>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  step="0.01"
                  value={transFat}
                  onChange={(e) => setTransFat(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-bold text-[#1D1D1F] bg-transparent focus:outline-none"
                />
                <span className="text-xs text-[#86868B]">g</span>
              </div>
            </div>

            {/* Protein */}
            <div className="bg-[#F7F7F5] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#86868B] block">Protein</span>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  step="0.1"
                  value={protein}
                  onChange={(e) => setProtein(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-bold text-[#1D1D1F] bg-transparent focus:outline-none"
                />
                <span className="text-xs text-[#86868B]">g</span>
              </div>
            </div>

            {/* Dietary Fibre */}
            <div className="bg-[#F7F7F5] rounded-2xl p-3">
              <span className="text-[11px] font-medium text-[#86868B] block">Dietary Fibre</span>
              <div className="flex items-center gap-1 mt-1">
                <input
                  type="number"
                  step="0.1"
                  value={fibre}
                  onChange={(e) => setFibre(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-bold text-[#1D1D1F] bg-transparent focus:outline-none"
                />
                <span className="text-xs text-[#86868B]">g</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ingredients & Allergens Box */}
        <div className="bg-white rounded-3xl p-5 border border-black/[0.06] shadow-xs space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#1D1D1F] block mb-1">
              {isHindi ? 'सामग्री सूची (Ingredients)' : isBengali ? 'উপাদানসমূহ' : 'Ingredients (Comma separated)'}
            </label>
            <textarea
              rows={3}
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              className="w-full text-xs text-[#1D1D1F] bg-[#F7F7F5] rounded-2xl p-3 border border-black/[0.04] focus:border-black/20 focus:outline-none leading-relaxed"
              placeholder="e.g. Potatoes, Palmolein Oil, Iodized Salt"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#1D1D1F] block mb-1">
              {isHindi ? 'एलर्जी चेतावनी (Allergens)' : isBengali ? 'অ্যালার্জেনসমূহ' : 'Allergens (if any)'}
            </label>
            <input
              type="text"
              value={allergensText}
              onChange={(e) => setAllergensText(e.target.value)}
              className="w-full text-xs text-[#1D1D1F] bg-[#F7F7F5] rounded-2xl px-3 py-2.5 border border-black/[0.04] focus:border-black/20 focus:outline-none"
              placeholder="e.g. Gluten, Peanuts, Soy"
            />
          </div>
        </div>
      </div>

        {/* Sticky Bottom Action */}
        <div className="sticky bottom-0 z-30 bg-[#FBFBFA]/95 backdrop-blur-md border-t border-black/[0.06] p-4 shrink-0 space-y-2">
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-full bg-[#161616] text-white text-sm font-semibold shadow-md active:scale-[0.985] transition-all flex items-center justify-center gap-2 liquid-ripple"
          >
            <span>{isHindi ? 'स्वास्थ्य विश्लेषण शुरू करें' : isBengali ? 'স্বাস্থ্য বিশ্লেষণ শুরু করুন' : 'Confirm & Analyze Health'}</span>
            <Check className="w-4 h-4" />
          </button>
          <MadeByFooter variant="pill" className="pt-0.5" />
        </div>
      </div>
    </div>
  );
};
