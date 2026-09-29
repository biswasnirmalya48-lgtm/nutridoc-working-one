import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { evaluateFoodNutrition } from './src/utils/nutritionEngine.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Google GenAI (Server-side only)
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to init GoogleGenAI:', err);
  }
}

// Robust JSON extractor that handles markdown codeblocks, preamble, and stray characters
function extractJson<T = any>(rawText: string | undefined | null): T | null {
  if (!rawText) return null;
  let text = String(rawText).trim();
  // Strip markdown codeblocks
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Try direct parse
  try {
    return JSON.parse(text) as T;
  } catch (_) {
    // Try finding the outermost JSON object { ... }
    const startObj = text.indexOf('{');
    const endObj = text.lastIndexOf('}');
    if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
      try {
        return JSON.parse(text.substring(startObj, endObj + 1)) as T;
      } catch (e) {
        // Continue
      }
    }
    // Try finding the outermost JSON array [ ... ]
    const startArr = text.indexOf('[');
    const endArr = text.lastIndexOf(']');
    if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
      try {
        return JSON.parse(text.substring(startArr, endArr + 1)) as T;
      } catch (e) {
        // Continue
      }
    }
  }
  return null;
}

// Resilient multi-model Gemini caller (prioritizes stable gemini-2.5-flash to prevent 503 outages)
async function callGemini(contents: any, config?: any) {
  if (!ai) throw new Error('AI client not initialized');
  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const m of models) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents,
        config,
      });
      if (res && res.text) {
        return res;
      }
    } catch (e: any) {
      console.warn(`Model ${m} attempt failed:`, e?.message || e?.status);
      lastError = e;
    }
  }
  throw lastError || new Error('All Gemini models failed');
}

// Food analysis endpoint
app.post('/api/food-analysis', async (req: Request, res: Response) => {
  try {
    const { productName, brand, category, nutrition, ingredients, profile, imageUrl, barcode } = req.body;

    const safeProfile = profile || {
      ageRange: '18–35',
      conditions: { diabetes: false, highBP: false, cholesterol: false, weightManagement: false },
      allergies: [],
      language: 'en',
    };

    const safeNutrition = {
      ...(nutrition || {}),
      ingredients: ingredients || nutrition?.ingredients || [],
    };

    // 1. Calculate deterministic rule-based scoring first (ensures consistency)
    const baseEvaluation = evaluateFoodNutrition(
      productName,
      category,
      safeNutrition,
      safeProfile,
      brand,
      imageUrl,
      barcode
    );

    // 2. Enhance personal note & reasons with AI (Grok or Gemini) if keys are provided
    let aiEnhanced = false;
    const lang = safeProfile.language || 'en';

    if (process.env.GROK_API_KEY) {
      try {
        const grokPrompt = `You are NutriDoc's clinical nutrition engine. Analyze this packaged food item:
Product: ${productName} (${brand || ''})
Category: ${category}
Deterministic Health Score: ${baseEvaluation.healthScore}/100, Status: ${baseEvaluation.status}
Nutrients: Sugar=${baseEvaluation.nutrition.sugar}, Sodium=${baseEvaluation.nutrition.sodium}, Fat=${baseEvaluation.nutrition.fat}, Protein=${baseEvaluation.nutrition.protein}, Fibre=${baseEvaluation.nutrition.fibre}
Ingredients: ${(safeNutrition.ingredients || []).join(', ')}
User Profile: Age ${safeProfile.ageRange}, Conditions: Diabetes=${safeProfile.conditions.diabetes}, High BP=${safeProfile.conditions.highBP}, Cholesterol=${safeProfile.conditions.cholesterol}, Weight=${safeProfile.conditions.weightManagement}, Allergies=${(safeProfile.allergies || []).join(', ')}
Language: ${lang} (en=English, hi=Hindi, bn=Bengali)

CRITICAL INSTRUCTION FOR ALTERNATIVES:
Under "betterAlternatives", you MUST suggest 3-4 HEALTHIER PRODUCTS FROM OTHER REAL MARKET BRANDS (such as The Whole Truth, Yoga Bar, Slurrp Farm, Epigamia, Too Yumm!, TagZ Foods, Tata Soulfull, Farmley, True Elements, Amul, Raw Pressery, or other well-known cleaner brand alternatives). Do NOT suggest the same brand (${brand || 'current brand'}). Each suggestion must be a real packaged consumer product or clean swap.

Respond ONLY in valid JSON matching this schema:
{
  "simpleReason": "Short direct sentence (Why status is Good Choice/Limit/Avoid)",
  "personalNote": "Short personalized sentence for the user's specific health condition",
  "betterAlternatives": [
    {
      "brand": "Other Brand Name",
      "name": "Full Product Name",
      "category": "Category",
      "whyBetter": "One short sentence why it's better (e.g., zero palm oil, 50% less fat, sweetened with dates)",
      "budgetLevel": "₹30–₹50",
      "highlightTag": "Baked • 0 Palm Oil",
      "healthScore": 88,
      "type": "brand"
    }
  ]
}
No markdown backticks, just raw json. Keep reasons concise, Apple-like, no long biology text.`;

        const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'grok-beta',
            messages: [{ role: 'user', content: grokPrompt }],
            temperature: 0.2,
          }),
        });

        if (grokRes.ok) {
          const grokData = await grokRes.json();
          const rawText = grokData.choices?.[0]?.message?.content?.trim();
          const parsed = extractJson<any>(rawText);
          if (parsed) {
            if (parsed.simpleReason) baseEvaluation.simpleReason = parsed.simpleReason;
            if (parsed.personalNote) baseEvaluation.personalNote = parsed.personalNote;
            if (parsed.betterAlternatives && Array.isArray(parsed.betterAlternatives) && parsed.betterAlternatives.length > 0) {
              baseEvaluation.betterAlternatives = parsed.betterAlternatives.map((alt: any, idx: number) => ({
                brand: alt.brand || 'Healthier Choice',
                name: alt.name || `Alternative Option ${idx + 1}`,
                category: alt.category || category || 'Healthier Swap',
                whyBetter: alt.whyBetter || 'Better nutrient balance and cleaner ingredients.',
                budgetLevel: alt.budgetLevel || 'Under ₹40',
                highlightTag: alt.highlightTag || 'Clean Ingredients',
                healthScore: Number(alt.healthScore) || (82 + (idx % 3) * 5),
                type: alt.type || 'brand',
                nutritionComparison: alt.nutritionComparison,
              }));
            }
            aiEnhanced = true;
          }
        }
      } catch (e) {
        console.warn('Grok API call fallback to deterministic rules:', e);
      }
    } else if (ai) {
      try {
        const geminiPrompt = `Analyze this food for NutriDoc:
Product: ${productName} (${brand || ''}), Category: ${category}
Deterministic Status: ${baseEvaluation.status} (${baseEvaluation.healthScore}/100)
Nutrients: Sugar=${baseEvaluation.nutrition.sugar}, Sodium=${baseEvaluation.nutrition.sodium}, Fat=${baseEvaluation.nutrition.fat}, Protein=${baseEvaluation.nutrition.protein}, Fibre=${baseEvaluation.nutrition.fibre}
Ingredients: ${(safeNutrition.ingredients || []).join(', ')}
User Profile: Age ${safeProfile.ageRange}, Conditions: Diabetes=${safeProfile.conditions.diabetes}, High BP=${safeProfile.conditions.highBP}, Cholesterol=${safeProfile.conditions.cholesterol}, Weight=${safeProfile.conditions.weightManagement}, Allergies=${(safeProfile.allergies || []).join(', ')}
Language: ${lang}

CRITICAL: In 'betterAlternatives', provide 3 to 4 HEALTHIER PRODUCT ALTERNATIVES FROM OTHER REAL MARKET BRANDS (such as The Whole Truth, Yoga Bar, Slurrp Farm, Epigamia, Too Yumm!, TagZ Foods, Tata Soulfull, Farmley, True Elements, Amul, Raw Pressery, etc. or international cleaner brands like Simple Mills, Popchips, RXBAR). Do NOT suggest the current brand (${brand || 'scanned brand'}). Include exact brand and product name!

Return ONLY valid JSON:
{
  "simpleReason": "Brief reason in ${lang}",
  "personalNote": "Brief personal note for their specific condition in ${lang}",
  "betterAlternatives": [
    {
      "brand": "Other Brand Name",
      "name": "Full Product Name",
      "category": "Category",
      "whyBetter": "Specific punchy reason in ${lang} (e.g. baked not fried, zero palm oil, no refined sugar)",
      "budgetLevel": "₹30–₹50",
      "highlightTag": "0 Palm Oil • 50% Less Fat",
      "healthScore": 88,
      "type": "brand"
    }
  ]
}`;

        const response = await callGemini(geminiPrompt, {
          responseMimeType: 'application/json',
        });

        if (response.text) {
          const parsed = extractJson<any>(response.text);
          if (parsed) {
            if (parsed.simpleReason) baseEvaluation.simpleReason = parsed.simpleReason;
            if (parsed.personalNote) baseEvaluation.personalNote = parsed.personalNote;
            if (parsed.betterAlternatives && Array.isArray(parsed.betterAlternatives) && parsed.betterAlternatives.length > 0) {
              baseEvaluation.betterAlternatives = parsed.betterAlternatives.map((alt: any, idx: number) => ({
                brand: alt.brand || 'Healthier Choice',
                name: alt.name || `Alternative Option ${idx + 1}`,
                category: alt.category || category || 'Healthier Swap',
                whyBetter: alt.whyBetter || 'Better nutrient balance and cleaner ingredients.',
                budgetLevel: alt.budgetLevel || 'Under ₹40',
                highlightTag: alt.highlightTag || 'Clean Ingredients',
                healthScore: Number(alt.healthScore) || (82 + (idx % 3) * 5),
                type: alt.type || 'brand',
                nutritionComparison: alt.nutritionComparison,
              }));
            }
            aiEnhanced = true;
          }
        }
      } catch (err) {
        console.warn('Gemini food analysis error, using deterministic evaluation:', err);
      }
    }

    res.json(baseEvaluation);
  } catch (err: any) {
    console.error('Error in /api/food-analysis:', err);
    res.status(500).json({ error: 'Failed to analyze food product', details: err.message });
  }
});

// Prescription & Medical Report simplifier endpoint
app.post('/api/report-analysis', async (req: Request, res: Response) => {
  try {
    const { text, imageBase64, language = 'en' } = req.body;

    const rawText = text || '';

    // If Gemini Vision or Text is available
    if (ai) {
      try {
        const parts: any[] = [];
        if (imageBase64) {
          const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          });
        }

        const promptText = `You are NutriDoc's medical report and prescription simplifier.
Target Language: ${language} (en=English, hi=Hindi, bn=Bengali).

Input OCR or patient document:
${rawText}

Instructions:
1. Translate difficult medical and clinical terms into plain, everyday language suitable for an elderly patient or family member.
2. Determine documentType: "Lab Report", "Prescription", or "Other".
3. For Lab Reports:
   - Identify extracted test names, numerical results, and reference ranges.
   - Set status to "Normal", "High", "Low", or "Needs Review". Mark high/low ONLY when reference range or clinical threshold is clearly available.
   - Provide a 1-sentence simpleMeaning in ${language}.
4. For Prescriptions:
   - Extract medicine names and written instructions (timing, with food, frequency).
   - Rate confidence: "High", "Medium", or "Low".
   - If handwritten or uncertain, explicitly specify warning: "Confirm unclear handwriting with a pharmacist or doctor."
   - Never silently guess dosage or medicine names.
5. Provide a short 2-sentence summary in ${language}.
6. Next step recommendation (e.g. "Discuss this report with your doctor.").

Return strict JSON only matching:
{
  "documentType": "Lab Report | Prescription | Other",
  "summary": "...",
  "items": [
    {
      "name": "...",
      "result": "...",
      "range": "...",
      "status": "Normal | High | Low | Needs Review",
      "simpleMeaning": "..."
    }
  ],
  "medicineNotes": [
    {
      "medicineName": "...",
      "writtenInstruction": "...",
      "confidence": "High | Medium | Low",
      "warning": "..."
    }
  ],
  "nextStep": "...",
  "disclaimer": "NutriDoc provides general awareness only. It does not diagnose illness or replace a doctor or pharmacist."
}`;

        parts.push({ text: promptText });

        const response = await callGemini({ parts }, {
          responseMimeType: 'application/json',
        });

        if (response.text) {
          const parsed = extractJson<any>(response.text);
          if (parsed && (parsed.summary || parsed.items || parsed.medicineNotes)) {
            return res.json({
              id: 'report_' + Date.now(),
              timestamp: Date.now(),
              ...parsed,
            });
          }
        }
      } catch (err) {
        console.warn('Gemini report analysis error, falling back to local extractor:', err);
      }
    }

    // Only parse if genuine document text is provided
    if (rawText && rawText.length > 20 && !rawText.startsWith('Uploaded Image Document') && !rawText.startsWith('Captured Camera Document')) {
      const isPrescription = /rx|tab|cap|syrup|mg|daily|od|bd|tds|empty stomach|after food/i.test(rawText);
      const documentType = isPrescription ? 'Prescription' : 'Lab Report';

      const items: any[] = [];
      const medicineNotes: any[] = [];

      const lines = rawText.split('\n').filter((l: string) => l.trim().length > 0);
      for (const line of lines) {
        if (/tab|cap|syrup|drop|ointment|mg/i.test(line)) {
          const isUnclear = /unclear|\?|\[|doubt/i.test(line);
          medicineNotes.push({
            medicineName: line.split('-')[0]?.trim() || line,
            writtenInstruction: line.split('-')[1]?.trim() || 'As directed by physician',
            confidence: isUnclear ? 'Medium' : 'High',
            warning: isUnclear ? 'Confirm unclear handwriting with a pharmacist or doctor.' : undefined,
          });
        }
      }

      if (items.length > 0 || medicineNotes.length > 0) {
        return res.json({
          id: 'report_' + Date.now(),
          timestamp: Date.now(),
          documentType,
          summary: isPrescription
            ? (language === 'hi' ? 'प्रिस्क्रिप्शन में दी गई दवाओं का संक्षिप्त विवरण।' : language === 'bn' ? 'প্রেসক্রিপশনে নির্দেশিত ওষুধের তালিকা।' : 'Medications and instructions extracted from document.')
            : (language === 'hi' ? 'लैब रिपोर्ट के परीक्षण परिणाम।' : language === 'bn' ? 'ল্যাব পরীক্ষার ফলাফল।' : 'Diagnostic lab report parameters extracted.'),
          items,
          medicineNotes,
          nextStep: language === 'hi'
            ? 'इस रिपोर्ट को अपने डॉक्टर या फार्मासिस्ट के साथ साझा करें।'
            : language === 'bn'
            ? 'এই রিপোর্টটি আপনার চিকিৎসকের সাথে আলোচনা করুন।'
            : 'Discuss this report with a doctor or certified healthcare provider.',
          disclaimer: 'NutriDoc provides general awareness only. It does not diagnose illness or replace a doctor or pharmacist.',
        });
      }
    }

    return res.status(422).json({
      error: 'Could not clearly read text from this document. Please ensure the prescription or lab report is clear, legible, and well-lit.',
    });
  } catch (err: any) {
    console.error('Error in /api/report-analysis:', err);
    res.status(500).json({ error: 'Failed to analyze report', details: err.message });
  }
});

// Product Recognition endpoint (Front packet recognition & OpenFoodFacts database match)
app.post('/api/recognize-product', async (req: Request, res: Response) => {
  try {
    const { imageBase64, barcode, fallbackQuery } = req.body;

    // 1. If barcode is provided, check OpenFoodFacts first
    if (barcode) {
      try {
        const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
          headers: { 'User-Agent': 'NutriDoc - Web - Version 1.0' },
        });
        if (offRes.ok) {
          const offData = await offRes.json();
          if (offData.status === 1 && offData.product) {
            const p = offData.product;
            const nutriments = p.nutriments || {};
            return res.json({
              productName: p.product_name || p.product_name_en || 'Recognized Product',
              brand: p.brands || '',
              category: p.categories?.split(',')?.[0]?.trim() || 'Packaged Food',
              barcode: barcode,
              imageUrl: p.image_front_url || p.image_url || undefined,
              confidence: 0.98,
              source: 'OpenFoodFacts Database',
              nutrition: {
                servingSize: p.serving_size || '100g',
                calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal_serving'] || 450),
                sugar: parseFloat((nutriments.sugars_100g ?? nutriments.sugars_serving ?? 5).toFixed(1)),
                sodium: Math.round(nutriments.sodium_100g ? nutriments.sodium_100g * 1000 : (nutriments.salt_100g ? nutriments.salt_100g * 400 : 350)),
                totalFat: parseFloat((nutriments.fat_100g ?? nutriments.fat_serving ?? 15).toFixed(1)),
                saturatedFat: parseFloat((nutriments['saturated-fat_100g'] ?? 5).toFixed(1)),
                transFat: parseFloat((nutriments['trans-fat_100g'] ?? 0).toFixed(2)),
                protein: parseFloat((nutriments.proteins_100g ?? 6).toFixed(1)),
                fibre: parseFloat((nutriments.fiber_100g ?? 2).toFixed(1)),
                ingredients: p.ingredients_text ? p.ingredients_text.split(',').map((s: string) => s.trim()) : [],
                allergens: p.allergens_tags ? p.allergens_tags.map((a: string) => a.replace('en:', '')) : [],
              },
            });
          }
        }
      } catch (err) {
        console.warn('OpenFoodFacts barcode lookup error:', err);
      }
    }

    // 2. Use Gemini Vision to recognize the food item or packet
    if (imageBase64) {
      try {
        let mimeType = 'image/jpeg';
        if (imageBase64.includes('data:image/png')) mimeType = 'image/png';
        else if (imageBase64.includes('data:image/webp')) mimeType = 'image/webp';
        
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const prompt = `You are NutriDoc's precision food recognition engine.
Analyze this image thoroughly. It contains a food item, beverage, snack packet, box, can, bottle, fresh fruit, vegetable, cooked meal, or grocery product.

TASK:
1. Detect and identify the exact food item or product.
2. Determine:
   - "productName": Specific product name and flavor (e.g. "Lay's Classic Salted Potato Chips", "Maggi 2-Minute Masala Noodles", "Oreo Original Sandwich Cookies", "Coca-Cola", "Fresh Red Apple", "Amul Butter", "Britannia Good Day Butter Cookies", "Kurkure Masala Munch", "Haldiram's Bhujia Sev", "Roasted Makhana", etc.)
   - "brand": Brand name (e.g. "Lay's", "Maggi", "Oreo", "Coca-Cola", "Amul", "Britannia", "Nestle", "Cadbury", "Parle", "Tropicana", or "Fresh / Farm" if unbranded)
   - "category": Standard category (e.g. "Chips & Namkeen", "Instant Noodles", "Biscuits & Cookies", "Carbonated Beverages", "Fruit Juices", "Dairy & Cheese", "Chocolates & Sweets", "Fresh Produce", "Healthy Snacks")
   - "barcode": Visible barcode string if readable, else ""
   - "confidence": 0.85 to 0.99
   - "nutrition": Realistic nutritional profile per 100g or standard pack:
     * "servingSize": string (e.g. "100g" or "1 packet (30g)")
     * "calories": number (kcal)
     * "sugar": number (grams)
     * "sodium": number (milligrams)
     * "totalFat": number (grams)
     * "saturatedFat": number (grams)
     * "transFat": number (grams)
     * "protein": number (grams)
     * "fibre": number (grams)
     * "ingredients": array of real ingredients (e.g. ["Potatoes", "Edible Vegetable Oil", "Iodised Salt"])
     * "allergens": array of allergens (e.g. ["Gluten", "Dairy", "Soy"])
     * "additives": array of additives or INS numbers (e.g. ["Thickener 412", "INS 500"])

3. If the image clearly shows NO food, beverage, grocery item, or edible product (e.g. empty wall, floor, keyboard, person face):
   Return: { "isFood": false, "reason": "No food item detected. Please point camera at a food packet, snack, fruit, or beverage." }

Return STRICT JSON only matching this schema.`;

        const response = await callGemini({
          parts: [
            { inlineData: { mimeType, data: cleanBase64 } },
            { text: prompt },
          ],
        }, {
          responseMimeType: 'application/json',
        });

        if (response.text) {
          const parsed = extractJson<any>(response.text);
          if (parsed) {
            if (parsed.isFood === false) {
              return res.status(422).json({
                error: parsed.reason || 'No food or beverage item detected. Please aim clearly at a food packet or item.'
              });
            }
            if (parsed.productName) {
              parsed.nutrition = {
                servingSize: parsed.nutrition?.servingSize || '100g',
                calories: Math.round(Number(parsed.nutrition?.calories) || 350),
                sugar: parseFloat((Number(parsed.nutrition?.sugar) || 5).toFixed(1)),
                sodium: Math.round(Number(parsed.nutrition?.sodium) || 200),
                totalFat: parseFloat((Number(parsed.nutrition?.totalFat) || 10).toFixed(1)),
                saturatedFat: parseFloat((Number(parsed.nutrition?.saturatedFat) || 3).toFixed(1)),
                transFat: parseFloat((Number(parsed.nutrition?.transFat) || 0).toFixed(2)),
                protein: parseFloat((Number(parsed.nutrition?.protein) || 5).toFixed(1)),
                fibre: parseFloat((Number(parsed.nutrition?.fibre) || 2).toFixed(1)),
                ingredients: Array.isArray(parsed.nutrition?.ingredients) ? parsed.nutrition.ingredients : [],
                allergens: Array.isArray(parsed.nutrition?.allergens) ? parsed.nutrition.allergens : [],
                additives: Array.isArray(parsed.nutrition?.additives) ? parsed.nutrition.additives : [],
              };
              return res.json(parsed);
            }
          }
        }
      } catch (err) {
        console.warn('Gemini food recognition error:', err);
      }
    }

    // 3. If a text search query was provided directly (e.g. user typed product name or assisted)
    if (fallbackQuery && fallbackQuery.trim().length > 1) {
      try {
        const queryPrompt = `You are an expert food nutritionist.
Given the product name or brand: "${fallbackQuery.trim()}"
Provide exact brand, category, and nutritional profile per 100g or standard pack.
Return STRICT JSON:
{
  "productName": "...",
  "brand": "...",
  "category": "...",
  "barcode": "",
  "confidence": 0.95,
  "nutrition": {
    "servingSize": "100g",
    "calories": 450,
    "sugar": 5,
    "sodium": 400,
    "totalFat": 15,
    "saturatedFat": 5,
    "transFat": 0,
    "protein": 6,
    "fibre": 2,
    "ingredients": ["..."],
    "allergens": ["..."],
    "additives": ["..."]
  }
}`;

        const queryRes = await callGemini(queryPrompt, { responseMimeType: 'application/json' });
        if (queryRes.text) {
          const parsed = extractJson<any>(queryRes.text);
          if (parsed && parsed.productName) {
            return res.json(parsed);
          }
        }
      } catch (err) {
        console.warn('Gemini fallback query error:', err);
      }
    }

    return res.status(422).json({
      error: 'Could not recognize the food packet. Please hold the front of the packet steady, ensure good lighting, or search by product name.'
    });
  } catch (err: any) {
    console.error('Error in /api/recognize-product:', err);
    res.status(500).json({ error: 'Failed to recognize product', details: err.message });
  }
});

// Real-time OCR endpoint using Gemini Vision
app.post('/api/ocr-scan', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mode } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    if (ai) {
      const isNutritionLabel = mode === 'food-label' || mode === 'nutrition-label' || mode === 'back-label';
      const prompt = isNutritionLabel
        ? `Read this food packet ingredient table and nutrition facts.
Extract all exact numerical and textual values in strict JSON:
{
  "productName": "...",
  "brand": "...",
  "category": "...",
  "barcode": "...",
  "servingSize": "...",
  "calories": 0,
  "sugar": 0,
  "sodium": 0,
  "totalFat": 0,
  "saturatedFat": 0,
  "transFat": 0,
  "protein": 0,
  "fibre": 0,
  "ingredients": ["..."],
  "allergens": ["..."],
  "additives": ["..."]
}`
        : `Read this medical document, lab report or handwritten prescription. Extract all text clearly.
If handwriting is unclear, put [unclear: ...?].
Return JSON:
{
  "rawText": "...",
  "documentType": "Lab Report | Prescription | Other",
  "confidenceWarnings": ["..."]
}`;

      const response = await callGemini({
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt },
        ],
      }, {
        responseMimeType: 'application/json',
      });

      if (response.text) {
        const parsed = extractJson<any>(response.text);
        if (parsed) {
          return res.json(parsed);
        }
      }
    }

    // If vision model is not available or extraction returned nothing, return honest error
    return res.status(422).json({
      error: 'Could not extract nutrition or ingredient table. Please capture a clear, well-lit photo of the label.'
    });
  } catch (err: any) {
    console.error('Error in /api/ocr-scan:', err);
    res.status(500).json({ error: 'OCR extraction failed', details: err.message });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NutriDoc server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
