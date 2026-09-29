import { BetterAlternative, FoodAnalysisResult, HealthStatus, NutrientLevel, NutritionData, UserProfile } from '../types';

export function calculateNutrientLevel(value: number | undefined, type: 'sugar' | 'sodium' | 'fat' | 'protein' | 'fibre'): NutrientLevel {
  if (value === undefined || isNaN(value)) return 'Medium';

  switch (type) {
    case 'sugar':
      // Grams per 100g or typical serving
      if (value <= 5) return 'Low';
      if (value <= 15) return 'Medium';
      return 'High';
    case 'sodium':
      // mg per serving/100g
      if (value <= 140) return 'Low';
      if (value <= 400) return 'Medium';
      return 'High';
    case 'fat':
      // Grams per serving/100g
      if (value <= 3) return 'Low';
      if (value <= 15) return 'Medium';
      return 'High';
    case 'protein':
      // Grams
      if (value < 4) return 'Low';
      if (value < 10) return 'Medium';
      return 'High';
    case 'fibre':
      // Grams
      if (value < 2) return 'Low';
      if (value < 5) return 'Medium';
      return 'High';
  }
}

export function evaluateFoodNutrition(
  productName: string,
  category: string,
  nutrition: NutritionData,
  profile: UserProfile,
  brand?: string,
  imageUrl?: string,
  barcode?: string
): FoodAnalysisResult {
  const sugarLvl = nutrition.sugarLevel || calculateNutrientLevel(nutrition.sugar, 'sugar');
  const sodiumLvl = nutrition.sodiumLevel || calculateNutrientLevel(nutrition.sodium, 'sodium');
  const fatLvl = nutrition.fatLevel || calculateNutrientLevel(nutrition.totalFat, 'fat');
  const proteinLvl = nutrition.proteinLevel || calculateNutrientLevel(nutrition.protein, 'protein');
  const fibreLvl = nutrition.fibreLevel || calculateNutrientLevel(nutrition.fibre, 'fibre');

  let score = 70; // baseline

  // Sugar impact
  if (sugarLvl === 'High') score -= 22;
  else if (sugarLvl === 'Medium') score -= 6;
  else if (sugarLvl === 'Low') score += 5;

  // Sodium impact
  if (sodiumLvl === 'High') score -= 22;
  else if (sodiumLvl === 'Medium') score -= 6;
  else if (sodiumLvl === 'Low') score += 6;

  // Fat impact
  if (fatLvl === 'High') score -= 14;
  else if (fatLvl === 'Low') score += 5;

  // Trans fat / Saturated fat
  if ((nutrition.transFat && nutrition.transFat > 0.1) || (nutrition.saturatedFat && nutrition.saturatedFat > 4)) {
    score -= 10;
  }

  // Positive nutrient benefits
  if (proteinLvl === 'High') score += 12;
  else if (proteinLvl === 'Medium') score += 4;

  if (fibreLvl === 'High') score += 12;
  else if (fibreLvl === 'Medium') score += 5;

  // Additive / ultra-processed check from ingredients
  const safeIngredientsList = Array.isArray(nutrition.ingredients)
    ? nutrition.ingredients
    : typeof nutrition.ingredients === 'string'
    ? (nutrition.ingredients as string).split(/[,;]+/).map((s: string) => s.trim())
    : [];
  const safeAllergensList = Array.isArray(nutrition.allergens)
    ? nutrition.allergens
    : typeof nutrition.allergens === 'string'
    ? (nutrition.allergens as string).split(/[,;]+/).map((s: string) => s.trim())
    : [];

  const ingredientsStr = safeIngredientsList.join(' ').toLowerCase();
  const hasPalmOil = ingredientsStr.includes('palm oil') || ingredientsStr.includes('palmolein');
  const hasArtificialPreservative = ingredientsStr.includes('e211') || ingredientsStr.includes('benzoate') || ingredientsStr.includes('artificial');
  const hasRefinedFlour = ingredientsStr.includes('maida') || ingredientsStr.includes('refined wheat');

  if (hasPalmOil) score -= 6;
  if (hasRefinedFlour) score -= 5;
  if (hasArtificialPreservative) score -= 4;

  const keyFlags: string[] = [];
  if (sugarLvl === 'High') keyFlags.push('High Sugar');
  if (sodiumLvl === 'High') keyFlags.push('High Sodium');
  if (fatLvl === 'High') keyFlags.push('High Fat');
  if (hasPalmOil) keyFlags.push('Contains Palm Oil');
  if (hasRefinedFlour) keyFlags.push('Refined Flour (Maida)');
  if (proteinLvl === 'High') keyFlags.push('Protein Source');
  if (fibreLvl === 'High') keyFlags.push('Good Fibre');

  // Allergy Check
  let hasAllergyAlert = false;
  let matchingAllergen = '';
  if (profile.allergies && profile.allergies.length > 0) {
    for (const allergy of profile.allergies) {
      if (allergy && allergy !== 'None') {
        const lowerAllergy = allergy.toLowerCase();
        if (ingredientsStr.includes(lowerAllergy) || safeAllergensList.some(a => a.toLowerCase().includes(lowerAllergy))) {
          hasAllergyAlert = true;
          matchingAllergen = allergy;
          break;
        }
      }
    }
  }

  // User Profile personal condition impact
  let personalNote = '';
  if (hasAllergyAlert) {
    score = 15;
    personalNote = profile.language === 'hi' 
      ? `चेतावनी: आपकी एलर्जी सूची में शामिल "${matchingAllergen}" इस उत्पाद में मौजूद है।`
      : profile.language === 'bn'
      ? `সতর্কতা: আপনার অ্যালার্জি তালিকায় থাকা "${matchingAllergen}" এই খাদ্যে রয়েছে।`
      : `Allergy alert: Contains "${matchingAllergen}" from your profile.`;
    keyFlags.unshift(`Allergen: ${matchingAllergen}`);
  } else {
    const notes: string[] = [];
    if (profile.conditions.highBP && sodiumLvl === 'High') {
      score -= 12;
      notes.push(
        profile.language === 'hi'
          ? 'उच्च रक्तचाप (High BP) के लिए यह सोडियम स्तर उपयुक्त नहीं है।'
          : profile.language === 'bn'
          ? 'উচ্চ রক্তচাপ থাকলে এই মাত্রার লবণ নিয়মিত খাওয়া উচিত নয়।'
          : 'Not ideal for frequent eating with high BP.'
      );
    }
    if (profile.conditions.diabetes && sugarLvl === 'High') {
      score -= 15;
      notes.push(
        profile.language === 'hi'
          ? 'डायबिटीज में यह तुरंत ब्लड शुगर बढ़ा सकता है।'
          : profile.language === 'bn'
          ? 'ডায়াবেটিস থাকলে এটি রক্তে শর্করার মাত্রা দ্রুত বাড়িয়ে দিতে পারে।'
          : 'High sugar load; can spike blood glucose in diabetes.'
      );
    }
    if (profile.conditions.cholesterol && (fatLvl === 'High' || hasPalmOil)) {
      score -= 10;
      notes.push(
        profile.language === 'hi'
          ? 'कोलेस्ट्रॉल को ध्यान में रखते हुए इस तेल व वसा का सेवन सीमित करें।'
          : profile.language === 'bn'
          ? 'কোলেস্টেরলের সমস্যা থাকলে এই ধরণের ফ্যাট ও তেল এড়িয়ে চলাই ভালো।'
          : 'High saturated fat/palm oil is not optimal for cholesterol.'
      );
    }
    if (profile.conditions.weightManagement && (sugarLvl === 'High' || fatLvl === 'High')) {
      notes.push(
        profile.language === 'hi'
          ? 'वजन नियंत्रण के लिए कैलोरी व वसा अधिक है।'
          : profile.language === 'bn'
          ? 'ওজন নিয়ন্ত্রণের জন্য ক্যালোরি ও চর্বির পরিমাণ কিছুটা বেশি।'
          : 'High caloric density for weight management.'
      );
    }

    if (notes.length > 0) {
      personalNote = notes.join(' ');
    } else {
      personalNote = profile.language === 'hi'
        ? 'संतुलित आहार के हिस्से के रूप में सीमित मात्रा में ले सकते हैं।'
        : profile.language === 'bn'
        ? 'সুষম খাদ্যের অংশ হিসেবে পরিমিত পরিমাণে খাওয়া যেতে পারে।'
        : 'Fits reasonably well within a balanced daily routine.';
    }
  }

  // Clamp score
  score = Math.max(8, Math.min(96, score));

  // Determine status
  let status: HealthStatus = 'Limit';
  if (score >= 70) {
    status = 'Good Choice';
  } else if (score < 40) {
    status = 'Avoid';
  }

  // Simple reason
  let simpleReason = '';
  if (status === 'Avoid') {
    simpleReason = profile.language === 'hi'
      ? (sugarLvl === 'High' ? 'अत्यधिक चीनी और प्रोसेस्ड तेल।' : 'अत्यधिक नमक, रिफाइंड तेल और कम पोषण।')
      : profile.language === 'bn'
      ? (sugarLvl === 'High' ? 'অতিরিক্ত চিনি ও প্রক্রিয়াজাত তেল।' : 'অতিরিক্ত লবণ, পাম অয়েল ও কম পুষ্টিমান।')
      : (sugarLvl === 'High' ? 'High sugar and processed ingredients.' : 'High salt and processed oil.');
  } else if (status === 'Limit') {
    simpleReason = profile.language === 'hi'
      ? 'मध्यम स्तर का नमक और वसा; कभी-कभार के लिए ठीक है।'
      : profile.language === 'bn'
      ? 'মাঝারি মাত্রার সোডিয়াম ও ফ্যাট; মাঝে মাঝে খাওয়ার উপযোগী।'
      : 'Moderate sodium and processed oils; best in moderation.';
  } else {
    simpleReason = profile.language === 'hi'
      ? 'प्राकृतिक पोषक तत्व, अच्छा फाइबर व संतुलित कैलोरी।'
      : profile.language === 'bn'
      ? 'প্রাকৃতিক উপাদান, পর্যাপ্ত ফাইবার ও নিয়ন্ত্রিত সোডিয়াম।'
      : 'Wholesome ingredients, good fibre, and clean nutrients.';
  }

  // Realistic better swaps with real healthier market brands
  const betterAlternatives = generateSwapsForCategory(category, profile, brand, productName);

  return {
    id: 'food_' + Date.now(),
    timestamp: Date.now(),
    productName: productName || 'Scanned Food Product',
    brand: brand || '',
    category: category || 'Snacks',
    barcode,
    imageUrl: imageUrl || '',
    healthScore: score,
    status,
    nutrition: {
      sugar: sugarLvl,
      sodium: sodiumLvl,
      fat: fatLvl,
      protein: proteinLvl,
      fibre: fibreLvl,
    },
    rawNutrition: nutrition,
    keyFlags: keyFlags.slice(0, 4),
    simpleReason,
    personalNote,
    betterAlternatives,
    disclaimer: 'NutriDoc provides general awareness only. It does not diagnose illness or replace a doctor or pharmacist.',
  };
}

export function generateSwapsForCategory(
  category: string,
  profile: UserProfile,
  currentBrand?: string,
  productName?: string
): BetterAlternative[] {
  const cat = `${category || ''} ${productName || ''}`.toLowerCase();
  const lang = profile.language;
  const lowerCurrentBrand = (currentBrand || '').toLowerCase().trim();

  // 1. CHIPS / CRISPS / NAMKEEN / FRIED SNACKS / BHUJIA / WAFER
  if (
    cat.includes('chip') ||
    cat.includes('crisp') ||
    cat.includes('namkeen') ||
    cat.includes('fried') ||
    cat.includes('snack') ||
    cat.includes('bhujia') ||
    cat.includes('wafer') ||
    cat.includes('kurkure') ||
    cat.includes('puff')
  ) {
    const list: BetterAlternative[] = [
      {
        brand: 'TagZ Foods',
        name: 'TagZ Popped Potato Chips (Salted / Masala)',
        category: 'Popped Snacks',
        whyBetter:
          lang === 'hi'
            ? 'डीप-फ्राई की जगह प्रेशर-पॉप विधि; 50% कम वसा और शून्य पाम ऑयल।'
            : lang === 'bn'
            ? 'পাম তেলে ভাজার পরিবর্তে পপিং প্রযুক্তি; ৫০% কম চর্বি এবং শূন্য ট্রান্স ফ্যাট।'
            : 'Popped with high pressure & heat instead of deep frying in palm oil; 50% less fat & zero trans fats.',
        budgetLevel: '₹30–₹40',
        highlightTag: 'Popped Not Fried • 50% Less Fat',
        healthScore: 86,
        type: 'brand',
        nutritionComparison: { fatDiff: '-50% Fat', sugarDiff: '0g Added Sugar', proteinDiff: '+2g Protein' },
      },
      {
        brand: 'Too Yumm!',
        name: 'Too Yumm! Karare / Multigrain Chips',
        category: 'Baked Chips',
        whyBetter:
          lang === 'hi'
            ? 'रागी, मक्का व चावल से बना बेक्ड स्नैक; 40% कम सैचुरेटेड फैट।'
            : lang === 'bn'
            ? 'মাল্টিগ্রেইন বেকড স্ন্যাক্স; কোনো পাম তেল নেই এবং ৪০% কম স্যাচুরেটেড ফ্যাট।'
            : 'Baked multigrain blend (ragi, corn, rice); 40% less saturated fat and 0 trans fat.',
        budgetLevel: '₹20–₹35',
        highlightTag: 'Baked • 0 Palm Oil',
        healthScore: 82,
        type: 'brand',
        nutritionComparison: { fatDiff: '-40% Sat Fat', sugarDiff: 'Low Sugar' },
      },
      {
        brand: 'Farmley',
        name: 'Farmley Roasted Peri Peri Makhana',
        category: 'Superfood Snacks',
        whyBetter:
          lang === 'hi'
            ? 'हल्का रोस्टेड कमल का बीज (मखाना); उच्च एंटीऑक्सीडेंट, कम सोडियम और बिना पाम ऑयल।'
            : lang === 'bn'
            ? 'হালকা অলিভ অয়েলে রোস্ট করা মাখনা; ৭০% কম সোডিয়াম এবং শূন্য ক্ষতিকর তেল।'
            : 'Slow-roasted fox nuts seasoned with pink salt; 70% lower sodium and clean unsaturated fats.',
        budgetLevel: '₹40–₹55',
        highlightTag: 'Air Roasted • Clean Oils',
        healthScore: 92,
        type: 'brand',
        nutritionComparison: { fatDiff: '-70% Fat', sugarDiff: '0g Sugar', proteinDiff: '+4g Protein' },
      },
      {
        brand: 'The Whole Truth',
        name: 'The Whole Truth Roasted Cashews & Almonds',
        category: 'Clean Nuts',
        whyBetter:
          lang === 'hi'
            ? '100% साबुत मेवे; बिना पाम ऑयल, माल्टोडेक्सट्रिन या कृत्रिम फ्लेवर।'
            : lang === 'bn'
            ? 'সম্পূর্ণ খাঁটি কাজু ও বাদাম; কোনো পাম তেল বা রাসায়নিক উপাদান নেই।'
            : '100% clean whole nuts dry-roasted with natural spices; 0 palm oil, 0 artificial preservatives.',
        budgetLevel: '₹50–₹75',
        highlightTag: '100% Clean • 0 Additives',
        healthScore: 94,
        type: 'brand',
        nutritionComparison: { fatDiff: 'Healthy Omega Fats', sugarDiff: '0g Added Sugar', proteinDiff: '+6g Protein' },
      },
      {
        brand: 'Fresh Indian Kitchen',
        name: 'Roasted Chana with Light Himalayan Salt',
        category: 'Whole Food',
        whyBetter:
          lang === 'hi'
            ? 'देसी भुना चना; भरपूर प्रोटीन, उच्च फाइबर और लंबे समय तक पेट भरा रखने वाला।'
            : lang === 'bn'
            ? 'ভুনা ছোলা; উচ্চ প্রোটিন, সহজপাচ্য এবং দীর্ঘক্ষণ ক্ষুধা নিবারক।'
            : 'Natural whole roasted chickpeas with 18g plant protein per 100g and zero processed oils.',
        budgetLevel: 'Under ₹25',
        highlightTag: 'High Fibre & Protein',
        healthScore: 95,
        type: 'fresh',
      },
    ];

    return list.filter((item) => !lowerCurrentBrand || !item.brand || !item.brand.toLowerCase().includes(lowerCurrentBrand)).slice(0, 4);
  }

  // 2. BISCUITS / COOKIES / CAKES / SWEETS / CHOCOLATES / WAFERS
  if (
    cat.includes('biscuit') ||
    cat.includes('cookie') ||
    cat.includes('cake') ||
    cat.includes('sweet') ||
    cat.includes('chocolate') ||
    cat.includes('bakery') ||
    cat.includes('candy') ||
    cat.includes('bar')
  ) {
    const list: BetterAlternative[] = [
      {
        brand: 'The Whole Truth',
        name: 'The Whole Truth 71% Dark Chocolate / Protein Bar',
        category: 'Clean Chocolate',
        whyBetter:
          lang === 'hi'
            ? 'खजूर और कोकोआ से मीठा; शून्य रिफाइंड चीनी, शून्य पाम ऑयल और कोई इमल्सीफायर नहीं।'
            : lang === 'bn'
            ? '১০০% খেজুর ও খাঁটি কোকো দিয়ে তৈরি; শূন্য রিফাইন চিনি ও পাম তেল মুক্ত।'
            : 'Sweetened 100% with whole dates and raw cacao; 0 refined sugar, 0 palm oil, 0 soy lecithin.',
        budgetLevel: '₹45–₹60',
        highlightTag: '0 Refined Sugar • Dates Sweetened',
        healthScore: 92,
        type: 'brand',
        nutritionComparison: { sugarDiff: '0g Refined Sugar', fatDiff: 'Pure Cocoa Butter', proteinDiff: '+4g Protein' },
      },
      {
        brand: 'Slurrp Farm',
        name: 'Slurrp Farm Ragi & Oats Millet Cookies',
        category: 'Millet Cookies',
        whyBetter:
          lang === 'hi'
            ? '100% रागी और ओट्स मिलेट्स; बिना मैदा, बिना पाम ऑयल और प्राकृतिक मक्खन।'
            : lang === 'bn'
            ? '১০০% রাগী ও ওটস মিলেট; ময়দাহীন, পাম তেল মুক্ত এবং খাঁটি মাখনে তৈরি।'
            : 'Baked with nutrient-rich ragi millets and oats; zero maida (refined flour), zero trans fats.',
        budgetLevel: '₹30–₹45',
        highlightTag: '100% Millets • Zero Maida',
        healthScore: 89,
        type: 'brand',
        nutritionComparison: { sugarDiff: '-45% Sugar', proteinDiff: '+3g Protein' },
      },
      {
        brand: 'Yoga Bar',
        name: 'Yoga Bar Multigrain Energy / Breakfast Bars',
        category: 'Energy Bars',
        whyBetter:
          lang === 'hi'
            ? 'साबुत ओट्स, चिया, कद्दू के बीज व शहद; कोई कॉर्न सिरप या पाम ऑयल नहीं।'
            : lang === 'bn'
            ? 'ওটস, চিয়া সিড, ফ্ল্যাক্স সিড ও মধু; কোনো কৃত্রিম চিনি বা প্রিজারভেটিভ নেই।'
            : 'Whole rolled oats, chia, pumpkin seeds and almonds bound with raw honey; zero high-fructose syrup.',
        budgetLevel: '₹35–₹45',
        highlightTag: 'Whole Grains • Honey Sweetened',
        healthScore: 88,
        type: 'brand',
        nutritionComparison: { sugarDiff: '-50% Sugar', proteinDiff: '+5g Protein' },
      },
      {
        brand: 'Open Secret',
        name: 'Open Secret Un-Junked Choco Nutty Cookies',
        category: 'Nutty Cookies',
        whyBetter:
          lang === 'hi'
            ? '40-50% साबुत बादाम व मूंगफली; सामान्य क्रीम बिस्कुट की तुलना में आधी चीनी।'
            : lang === 'bn'
            ? '৪০% আস্ত বাদাম সমৃদ্ধ; সাধারণ বিস্কুটের চেয়ে অর্ধেকেরও কম চিনি।'
            : 'Packed with 40% almonds and peanuts; 0 maida and 50% less sugar than mainstream cream biscuits.',
        budgetLevel: '₹35–₹50',
        highlightTag: '40% Whole Nuts • Zero Palm Oil',
        healthScore: 86,
        type: 'brand',
        nutritionComparison: { sugarDiff: '-50% Sugar', proteinDiff: '+4g Protein' },
      },
      {
        brand: 'Fresh Kitchen / Farm',
        name: 'Whole Apple & Roasted Almonds Snack Pair',
        category: 'Natural Fruit',
        whyBetter:
          lang === 'hi'
            ? 'प्राकृतिक फ्रक्टोज और सेब का पेक्टिन फाइबर; ब्लड शुगर में अचानक उछाल नहीं लाता।'
            : lang === 'bn'
            ? 'তাজা ফল ও বাদাম; প্রাকৃতিক শর্করা এবং উচ্চ ফাইবার যা রক্তে গ্লুকোজ নিয়ন্ত্রণে রাখে।'
            : 'Natural cellular fructose balanced with soluble dietary fiber and heart-healthy nut fats.',
        budgetLevel: 'Under ₹30',
        highlightTag: 'Natural Vitamins & Fibre',
        healthScore: 97,
        type: 'fresh',
      },
    ];

    return list.filter((item) => !lowerCurrentBrand || !item.brand || !item.brand.toLowerCase().includes(lowerCurrentBrand)).slice(0, 4);
  }

  // 3. NOODLES / PASTA / INSTANT MEALS / RAMEN / SOUP
  if (
    cat.includes('noodle') ||
    cat.includes('pasta') ||
    cat.includes('instant') ||
    cat.includes('maggi') ||
    cat.includes('soup') ||
    cat.includes('ramen')
  ) {
    const list: BetterAlternative[] = [
      {
        brand: 'Slurrp Farm',
        name: 'Slurrp Farm Foxtail Millet & Veggie Noodles',
        category: 'Millet Noodles',
        whyBetter:
          lang === 'hi'
            ? 'डीप-फ्राई नहीं की गईं; 100% मिलेट, बिना मैदा, शून्य एमएसजी और बिना पाम ऑयल।'
            : lang === 'bn'
            ? 'পাম তেলে ভাজা নয়; ১০০% মিলেট, শূন্য ময়দা এবং ক্ষতিকর টেস্টিং সল্ট মুক্ত।'
            : 'Steamed and sun-dried foxtail millet noodles; zero maida, zero deep-frying in palm oil, zero MSG.',
        budgetLevel: '₹35–₹45',
        highlightTag: 'Not Fried • 100% Millet',
        healthScore: 89,
        type: 'brand',
        nutritionComparison: { fatDiff: '-80% Fat', proteinDiff: '+4g Protein' },
      },
      {
        brand: 'WickedGud',
        name: 'WickedGud 100% Multi-Millet Hakka Noodles',
        category: 'Protein Noodles',
        whyBetter:
          lang === 'hi'
            ? 'चना दाल, मसूर व मिलेट्स से निर्मित; 3 गुना अधिक प्रोटीन और 2 गुना फाइबर।'
            : lang === 'bn'
            ? 'ছোলা, ডাল ও বাজরা দিয়ে তৈরি; ৩ গুণ বেশি প্রোটিন ও শূন্য পাম তেল।'
            : 'Made from chickpeas, lentils & ancient grains; delivers 3x more protein and zero deep-fried vegetable fats.',
        budgetLevel: '₹40–₹55',
        highlightTag: '3x Protein • 2x Fibre',
        healthScore: 90,
        type: 'brand',
        nutritionComparison: { fatDiff: '-75% Fat', proteinDiff: '14g Protein per serving' },
      },
      {
        brand: 'Tata Soulfull',
        name: 'Tata Soulfull Masala Oats & Millet Meal',
        category: 'Whole Grain Meal',
        whyBetter:
          lang === 'hi'
            ? 'साबुत रागी और ओट्स; ताजी सब्जियों के फ्लेक्स और 60% कम सोडियम।'
            : lang === 'bn'
            ? 'সম্পূর্ণ রাগী ও ওটস; ৬০% কম সোডিয়াম এবং দীর্ঘস্থায়ী শক্তির উৎস।'
            : 'Whole millets with natural dehydrated herbs and veggies; 60% lower sodium than instant ramen noodles.',
        budgetLevel: '₹30–₹40',
        highlightTag: 'Low Sodium • Whole Oats',
        healthScore: 91,
        type: 'brand',
        nutritionComparison: { sodiumDiff: '-60% Sodium', fatDiff: '-80% Fat' },
      },
      {
        brand: 'Yoga Bar',
        name: 'Yoga Bar High Protein Masala Oats',
        category: 'Instant Oats',
        whyBetter:
          lang === 'hi'
            ? '12 ग्राम प्रोटीन प्रति सर्विंग; धीमी गति से पचने वाले कॉम्प्लेक्स कार्ब्स।'
            : lang === 'bn'
            ? '১২ গ্রাম খাঁটি প্রোটিন; রক্তে সুগার ওঠানামা রোধ করে।'
            : 'Rolled oats boosted with clean pea and whey protein; complex carbs that provide stable energy.',
        budgetLevel: '₹35–₹45',
        highlightTag: '12g Protein • Slow Digesting',
        healthScore: 92,
        type: 'brand',
        nutritionComparison: { proteinDiff: '+12g Protein', sodiumDiff: '-50% Sodium' },
      },
      {
        brand: 'Fresh Prep',
        name: 'Vegetable Poha with Roasted Peanuts',
        category: 'Fresh Meal',
        whyBetter:
          lang === 'hi'
            ? 'ताजा बना पोहा; सब्जियां, राई, करी पत्ता और बहुत कम सोडियम।'
            : lang === 'bn'
            ? 'সবজি ও চিনেবাদাম দিয়ে ঘরে তৈরি চিঁড়ের পোলাও; অত্যন্ত কম সোডিয়াম।'
            : 'Fresh flattened rice sauteed with curry leaves, mustard seeds, vegetables and minimal salt.',
        budgetLevel: 'Under ₹30',
        highlightTag: 'Fresh & Low Sodium',
        healthScore: 94,
        type: 'fresh',
      },
    ];

    return list.filter((item) => !lowerCurrentBrand || !item.brand || !item.brand.toLowerCase().includes(lowerCurrentBrand)).slice(0, 4);
  }

  // 4. DRINKS / SODA / COLA / JUICE / ENERGY DRINK
  if (
    cat.includes('drink') ||
    cat.includes('beverage') ||
    cat.includes('cola') ||
    cat.includes('soda') ||
    cat.includes('juice') ||
    cat.includes('energy') ||
    cat.includes('frooti') ||
    cat.includes('pepsi') ||
    cat.includes('coke') ||
    cat.includes('sting')
  ) {
    const list: BetterAlternative[] = [
      {
        brand: 'Raw Pressery',
        name: 'Raw Pressery 100% Tender Coconut Water',
        category: 'Cold-Pressed Hydration',
        whyBetter:
          lang === 'hi'
            ? 'कोल्ड-प्रेस्ड प्राकृतिक नारियल पानी; शून्य अतिरिक्त चीनी और उच्च पोटैशियम।'
            : lang === 'bn'
            ? '১০০% খাঁটি ডাবের জল; কোনো বাড়তি চিনি বা কেমিক্যাল নেই।'
            : 'Cold-pressed tender coconut water with bioavailable potassium electrolytes; 0 added sugar.',
        budgetLevel: '₹45–₹60',
        highlightTag: 'Cold Pressed • 0 Added Sugar',
        healthScore: 96,
        type: 'brand',
        nutritionComparison: { sugarDiff: '0g Added Sugar', fatDiff: '0g Fat' },
      },
      {
        brand: 'Amul',
        name: 'Amul High Protein Buttermilk (Chaas)',
        category: 'Probiotic Dairy',
        whyBetter:
          lang === 'hi'
            ? '15 ग्राम प्राकृतिक प्रोटीन; शून्य चीनी, पाचन के लिए उत्तम प्रोबायोटिक्स।'
            : lang === 'bn'
            ? '১৫ গ্রাম খাঁটি দুধের প্রোটিন; সম্পূর্ণ চিনিমুক্ত ও অন্ত্রের জন্য উপকারী প্রোবায়োটিক।'
            : 'Natural fermented buttermilk with 15g protein per carton, 0 added sugar, and gut-healthy probiotics.',
        budgetLevel: '₹25–₹30',
        highlightTag: '15g Protein • Probiotic',
        healthScore: 97,
        type: 'brand',
        nutritionComparison: { sugarDiff: '0g Added Sugar', proteinDiff: '+15g Protein' },
      },
      {
        brand: 'Paper Boat',
        name: 'Paper Boat Sugar-Free Coconut Water / Tea',
        category: 'Natural Hydration',
        whyBetter:
          lang === 'hi'
            ? 'बिना हाई-फ्रुक्टोज कॉर्न सिरप या कृत्रिम रंगों के प्राकृतिक पेय।'
            : lang === 'bn'
            ? 'প্রাকৃতিক পানীয়; কৃত্রিম রং ও অতিরিক্ত কর্ন সিরাপ মুক্ত।'
            : 'Natural thirst quencher without high-fructose corn syrup, phosphoric acid, or artificial caramel colors.',
        budgetLevel: '₹30–₹40',
        highlightTag: 'No Corn Syrup • Natural',
        healthScore: 90,
        type: 'brand',
        nutritionComparison: { sugarDiff: '-90% Sugar' },
      },
      {
        brand: 'Epigamia',
        name: 'Epigamia Greek Yogurt Smoothie',
        category: 'Greek Yogurt',
        whyBetter:
          lang === 'hi'
            ? 'साधारण दही पेय से 2 गुना प्रोटीन; लैक्टोज-मुक्त और कम ग्लाइसेमिक इंडेक्स।'
            : lang === 'bn'
            ? 'সাধারণ দইয়ের চেয়ে দ্বিগুণ প্রোটিন ও ল্যাকটোজ মুক্ত।'
            : 'Twice the protein of standard dairy beverages; made with real fruit pulp and no synthetic gums.',
        budgetLevel: '₹45–₹55',
        highlightTag: '2x Protein • Lactose-Free',
        healthScore: 88,
        type: 'brand',
        nutritionComparison: { proteinDiff: '8g Protein', sugarDiff: '-40% Sugar' },
      },
      {
        brand: 'Fresh Desi Drink',
        name: 'Fresh Salted Mint Lemon Water (Shikanji)',
        category: 'Natural Drink',
        whyBetter:
          lang === 'hi'
            ? 'ताजा नींबू, पुदीना, जीरा और सेंधा नमक; शून्य कैलोरी और प्राकृतिक विटामिन सी।'
            : lang === 'bn'
            ? 'তাজা লেবু, পুদিনা ও বিট লবণ দিয়ে তৈরি শিকঞ্জি; शून्य ক্যালোরি ও ভিটামিন সি।'
            : 'Fresh lime juice infused with fresh mint leaves and roasted cumin; zero calories & high Vitamin C.',
        budgetLevel: 'Under ₹15',
        highlightTag: '0 Calories • Vitamin C',
        healthScore: 98,
        type: 'fresh',
      },
    ];

    return list.filter((item) => !lowerCurrentBrand || !item.brand || !item.brand.toLowerCase().includes(lowerCurrentBrand)).slice(0, 4);
  }

  // 5. CEREALS / MUESLI / CORNFLAKES / CHOCOS
  if (cat.includes('cereal') || cat.includes('cornflake') || cat.includes('choco') || cat.includes('muesli')) {
    const list: BetterAlternative[] = [
      {
        brand: 'Tata Soulfull',
        name: 'Tata Soulfull Ragi Bites Choco Fills',
        category: 'Millet Cereal',
        whyBetter:
          lang === 'hi'
            ? '50% रागी मिलेट शेल; आम कॉर्नफ्लेक्स या चोकोस की तुलना में 50% कम चीनी।'
            : lang === 'bn'
            ? '৫০% রাগী মিলেট দিয়ে তৈরি; সাধারণ সিরিয়ালের চেয়ে ৫০% কম চিনি।'
            : 'Outer shell crafted from nutrient-rich finger millet; 50% less sugar than conventional chocos.',
        budgetLevel: '₹30–₹45',
        highlightTag: '50% Ragi Millet • 50% Less Sugar',
        healthScore: 87,
        type: 'brand',
        nutritionComparison: { sugarDiff: '-50% Sugar', proteinDiff: '+3g Protein' },
      },
      {
        brand: 'True Elements',
        name: 'True Elements Rolled Oats & Super Seeds Muesli',
        category: 'Clean Muesli',
        whyBetter:
          lang === 'hi'
            ? '100% साबुत अनाज व चिया/कद्दू के बीज; बिना चीनी सिरप और भरपूर बीटा-ग्लूकन।'
            : lang === 'bn'
            ? '১০০% আস্ত ওটস ও সুপার সিডস; কোনো রিফাইন্ড চিনি সিরাপ নেই।'
            : '100% whole rolled oats, pumpkin, chia and flax seeds; zero sugar syrup or artificial preservatives.',
        budgetLevel: '₹50–₹70',
        highlightTag: '100% Wholegrain • 0 Sugar Syrup',
        healthScore: 93,
        type: 'brand',
        nutritionComparison: { sugarDiff: '0g Added Sugar', proteinDiff: '+6g Protein' },
      },
      {
        brand: 'The Whole Truth',
        name: 'The Whole Truth Almond & Cranberry Granola',
        category: 'Clean Granola',
        whyBetter:
          lang === 'hi'
            ? 'शहद व मेवों से बना; शून्य रिफाइंड चीनी, शून्य पाम ऑयल।'
            : lang === 'bn'
            ? 'খাঁটি মধু ও বাদামে বেক করা গ্র্যানোলা; কোনো পাম তেল নেই।'
            : 'Oats and nuts baked gently in raw honey; 0 refined sugar, 0 palm oil, 0 synthetic flavorings.',
        budgetLevel: '₹60–₹80',
        highlightTag: '0 Refined Sugar • 0 Palm Oil',
        healthScore: 91,
        type: 'brand',
      },
    ];

    return list.filter((item) => !lowerCurrentBrand || !item.brand || !item.brand.toLowerCase().includes(lowerCurrentBrand)).slice(0, 4);
  }

  // 6. DEFAULT / ALL OTHER PACKAGED FOODS
  const defaultList: BetterAlternative[] = [
    {
      brand: 'The Whole Truth',
      name: 'The Whole Truth Roasted Seed & Nut Mix',
      category: 'Clean Nutrition',
      whyBetter:
        lang === 'hi'
          ? '100% प्राकृतिक घटक; बिना पाम ऑयल, शून्य प्रिजर्वेटिव और उच्च प्रोटीन।'
          : lang === 'bn'
          ? '১০০% প্রাকৃতিক ও খাঁটি উপাদান; ক্ষতিকর প্রিজারভেটিভ ও পাম তেল মুক্ত।'
          : '100% clean whole food ingredients; zero palm oil, zero chemical preservatives, high natural protein.',
      budgetLevel: '₹45–₹60',
      highlightTag: '100% Clean • No Palm Oil',
      healthScore: 93,
      type: 'brand',
      nutritionComparison: { sugarDiff: '0g Added Sugar', proteinDiff: '+6g Protein' },
    },
    {
      brand: 'Slurrp Farm',
      name: 'Slurrp Farm Ragi & Multi-Millet Puffs',
      category: 'Millet Snack',
      whyBetter:
        lang === 'hi'
          ? 'रोस्टेड मिलेट्स स्नैक; शून्य मैदा, शून्य ट्रांस-फैट और नियंत्रित सोडियम।'
          : lang === 'bn'
          ? 'রোস্ট করা মিলেট স্ন্যাক; ক্ষতিকর চর্বি ও অতিরিক্ত লবণ মুক্ত।'
          : 'Air-popped ancient grains with mild natural spices; zero maida and 60% lower sodium.',
      budgetLevel: '₹30–₹45',
      highlightTag: 'Air Popped • 100% Millet',
      healthScore: 90,
      type: 'brand',
      nutritionComparison: { fatDiff: '-60% Fat', sodiumDiff: '-50% Sodium' },
    },
    {
      brand: 'Farmley',
      name: 'Farmley Roasted Peri Peri Makhana',
      category: 'Lotus Seeds',
      whyBetter:
        lang === 'hi'
          ? 'कम वसा व कम नमक में रोस्टेड; दिल और वजन प्रबंधन के लिए उत्तम।'
          : lang === 'bn'
          ? 'হালকা আঁচে ভাজা মাখনা; হার্ট ও ওজনের জন্য নিরাপদ।'
          : 'Slow-roasted fox nuts rich in antioxidants with 70% lower sodium than conventional chips.',
      budgetLevel: '₹40–₹55',
      highlightTag: 'Low Sodium • Olive Oil',
      healthScore: 92,
      type: 'brand',
      nutritionComparison: { fatDiff: '-70% Fat', sugarDiff: '0g Sugar' },
    },
    {
      brand: 'Fresh Indian Kitchen',
      name: 'Whole Seasonal Fresh Fruits / Roasted Chana',
      category: 'Whole Natural',
      whyBetter:
        lang === 'hi'
          ? 'प्राकृतिक विटामिन, खनिज और फाइबर; शून्य प्रोसेस्ड एडिटिव्स।'
          : lang === 'bn'
          ? 'তাজা ফল ও प्राकृतिक উপাদান; শূন্য কেমিক্যাল।'
          : 'Unprocessed natural foods offering active digestive enzymes, pure hydration, and micronutrients.',
      budgetLevel: 'Under ₹30',
      highlightTag: '100% Natural • Zero Additives',
      healthScore: 96,
      type: 'fresh',
    },
  ];

  return defaultList.filter((item) => !lowerCurrentBrand || !item.brand || !item.brand.toLowerCase().includes(lowerCurrentBrand)).slice(0, 4);
}
