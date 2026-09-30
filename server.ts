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

// Resilient multi-model Gemini caller (prioritizes high-capability multimodal models)
async function callGemini(contents: any, config?: any) {
  if (!ai) throw new Error('AI client not initialized');
  const models = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];
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
      console.warn(`Model ${m} attempt failed:`, e?.message?.slice(0, 100) || e?.status);
      lastError = e;
    }
  }
  throw lastError || new Error('All Gemini models failed');
}

// Ultra-fast Groq LLM caller for clinical food reasoning, alternative swaps, and medical parsing
async function callGroq(messages: any[], jsonFormat = true): Promise<string> {
  const key = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;
  if (!key) throw new Error('Groq API key not set');

  const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.1,
          ...(jsonFormat ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      } else {
        const errText = await res.text();
        console.warn(`Groq ${model} error:`, errText.slice(0, 100));
      }
    } catch (err: any) {
      console.warn(`Groq ${model} failed:`, err?.message);
      lastError = err;
    }
  }
  throw lastError || new Error('All Groq models failed');
}

// Find verified, authentic product packaging photos from official OpenFoodFacts registry
async function fetchProductWebImages(productName: string, brand?: string, barcode?: string): Promise<string[]> {
  const images: string[] = [];
  const cleanBrand = brand && !/unknown/i.test(brand) ? brand.trim() : '';
  const cleanName = productName.trim();

  // 1. If barcode is known, fetch direct verified packaging images for this exact barcode SKU
  if (barcode && barcode.length >= 6) {
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
        headers: { 'User-Agent': 'NutriDoc - ProductImages/1.0 (contact@nutridoc.local)' },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        const p = data.product;
        if (p) {
          if (p.image_front_url && !images.includes(p.image_front_url)) images.push(p.image_front_url);
          if (p.image_url && !images.includes(p.image_url)) images.push(p.image_url);
          if (p.image_nutrition_url && !images.includes(p.image_nutrition_url)) images.push(p.image_nutrition_url);
          if (p.image_ingredients_url && !images.includes(p.image_ingredients_url)) images.push(p.image_ingredients_url);
        }
      }
    } catch {}
  }

  // 2. OpenFoodFacts official packaging search with keyword verification
  if (images.length < 3) {
    try {
      const query = `${cleanBrand ? cleanBrand + ' ' : ''}${cleanName}`.trim();
      const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6`;
      const offRes = await fetch(offUrl, {
        headers: { 'User-Agent': 'NutriDoc - ProductImages/1.0 (contact@nutridoc.local)' },
        signal: AbortSignal.timeout(3500),
      });
      if (offRes.ok) {
        const offData = await offRes.json();
        const brandLower = cleanBrand.toLowerCase();
        const nameKeywords = cleanName.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        for (const p of offData.products || []) {
          const pName = (p.product_name || p.product_name_en || '').toLowerCase();
          const pBrand = (p.brands || '').toLowerCase();

          // Strict match: brand must match OR at least one significant product keyword must match
          const brandMatches = brandLower && pBrand.includes(brandLower);
          const nameMatches = nameKeywords.some(kw => pName.includes(kw));

          if (brandMatches || nameMatches) {
            const img = p.image_front_url || p.image_url;
            if (img && !images.includes(img)) {
              images.push(img);
            }
          }
        }
      }
    } catch (e) {
      // Continue
    }
  }

  return images.slice(0, 5);
}

// Food analysis endpoint
app.post('/api/food-analysis', async (req: Request, res: Response) => {
  try {
    const { productName, brand, category, nutrition, ingredients, profile, imageUrl, barcode, isVerifiedDatabase } = req.body;

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
    baseEvaluation.isVerifiedDatabase = !!isVerifiedDatabase;

    // 2. Enhance personal note & reasons with AI (Groq prioritized, Gemini fallback)
    let aiEnhanced = false;
    const lang = safeProfile.language || 'en';

    const aiPrompt = `You are NutriDoc's clinical nutrition engine. Analyze this packaged food item:
Product: ${productName} (${brand || ''})
Category: ${category}
Clinical Health Score: ${baseEvaluation.healthScore}/100, Status: ${baseEvaluation.status}
Nutrients: Sugar=${baseEvaluation.nutrition.sugar}, Sodium=${baseEvaluation.nutrition.sodium}, Fat=${baseEvaluation.nutrition.fat}, Protein=${baseEvaluation.nutrition.protein}, Fibre=${baseEvaluation.nutrition.fibre}
Ingredients: ${(safeNutrition.ingredients || []).join(', ')}
Detected Specific Flags: ${(baseEvaluation.keyFlags || []).join(', ')}
User Profile: Age ${safeProfile.ageRange}, Conditions: Diabetes=${safeProfile.conditions.diabetes}, High BP=${safeProfile.conditions.highBP}, Cholesterol=${safeProfile.conditions.cholesterol}, Weight=${safeProfile.conditions.weightManagement}, Allergies=${(safeProfile.allergies || []).join(', ')}
Language: ${lang} (en=English, hi=Hindi, bn=Bengali)

CRITICAL INSTRUCTION FOR RATING EXPLANATION ("simpleReason"):
Your "simpleReason" must clearly explain whether this product is healthy, unhealthy, or should be limited BASED ON ITS SPECIFIC INGREDIENTS (e.g. presence of palm oil, hydrogenated fats, refined maida flour, chemical preservatives/TBHQ, flavor enhancers MSG, or on the positive side: whole grains, oats, nuts, seeds, real fruits, clean proteins).

CRITICAL INSTRUCTION FOR ALTERNATIVES:
Under "betterAlternatives", you MUST suggest 3-4 HEALTHIER PRODUCTS FROM OTHER REAL MARKET BRANDS (such as The Whole Truth, Yoga Bar, Slurrp Farm, Epigamia, Too Yumm!, TagZ Foods, Tata Soulfull, Farmley, True Elements, Amul, Raw Pressery, or other well-known cleaner brand alternatives). Do NOT suggest the same brand (${brand || 'current brand'}). Each suggestion must be a real packaged consumer product or clean swap.

Respond ONLY in valid JSON matching this schema:
{
  "simpleReason": "Short direct sentence in ${lang} explaining status",
  "personalNote": "Short personalized sentence for user condition in ${lang}",
  "betterAlternatives": [
    {
      "brand": "Other Real Brand",
      "name": "Full Product Name",
      "category": "Category",
      "whyBetter": "One short sentence why it's better in ${lang} (e.g. baked not fried, zero palm oil)",
      "budgetLevel": "₹30–₹50",
      "highlightTag": "Baked • 0 Palm Oil",
      "healthScore": 88,
      "type": "brand"
    }
  ]
}`;

    // Try Groq first for instant, high-quality responses
    const hasGroq = !!(process.env.GROQ_API_KEY || process.env.GROK_API_KEY);
    if (hasGroq) {
      try {
        const groqContent = await callGroq([
          { role: 'system', content: 'You are an expert clinical nutrition AI. Output strict JSON only.' },
          { role: 'user', content: aiPrompt }
        ], true);
        const parsed = extractJson<any>(groqContent);
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
      } catch (err: any) {
        console.warn('Groq food analysis error, attempting Gemini fallback:', err?.message);
      }
    }

    // Fallback to Gemini if Groq didn't succeed
    if (!aiEnhanced && ai) {
      try {
        const response = await callGemini(aiPrompt, {
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
      } catch (err: any) {
        console.warn('Gemini food analysis error, using deterministic evaluation:', err?.message);
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

    const langName = language === 'hi' ? 'Hindi (सरल हिंदी)' : language === 'bn' ? 'Bengali (সহজ বাংলা)' : 'English (Simple everyday English)';

    const systemPrompt = `You are NutriDoc's Chief Clinical Prescription & Medical Report Simplifier.
Your mission is to read patient prescriptions, doctor notes, and medical lab reports (including handwriting, abbreviations like OD, BD, TDS, SOS, Tab, Cap, Syr), and translate EVERYTHING into crystal-clear "waterline-simple" language that any ordinary patient, elder, or family member can immediately understand.

Target Output Language: ${langName}. ALL descriptions, reasons, points, and instructions MUST be in ${langName}.

Strict Requirements:
1. "What happens to the user" (Diagnosis & Condition):
   Explain in plain, compassionate, simple language what problem or condition the patient is experiencing.
   Provide 2 to 4 clear bullet points ("simplePoints") explaining:
   - What the illness/condition is in everyday words.
   - Why the body is experiencing these symptoms.
   - What the medical goal of this prescription is.

2. "What medicine to take and when" (Point-by-point Medicine Guide):
   For every single medicine listed on the prescription:
   - "medicineName": Full medicine name and strength (e.g., "Paracetamol 650mg", "Amoxicillin 500mg").
   - "dosage": Amount to take (e.g., "1 Tablet", "2 Teaspoons / 10ml").
   - "purpose": In plain language, exactly why the user is taking this medicine (e.g., "Relieves high fever, headache, and body aches", "Kills the bacteria causing your throat infection").
   - "timing": Clear instruction on when to take it (e.g., "Take in the morning and at night, strictly after meals").
   - "schedule": Object with boolean flags { "morning": boolean, "afternoon": boolean, "night": boolean, "mealRelation": "Before Food (Empty Stomach)" | "After Food" | "With Food" | "As Needed (SOS)" }.
   - "duration": How many days to take it (e.g., "For 5 days", "Take continuously until review").
   - "writtenInstruction": Doctor's exact notation (e.g., "1-0-1 after food x 5 days").
   - "confidence": "High", "Medium", or "Low" (if handwriting is faint or ambiguous).
   - "warning": Any essential precaution (e.g., "Finish the full antibiotic course even if you feel better", "May cause drowsiness, avoid driving").

3. "Doctor's Advice & Precaution Points":
   Provide 2 to 4 clear bullet points ("doctorAdvice") with any dietary restrictions, rest advice, hydration guidance, or follow-up timelines mentioned or recommended.

4. If the document is a Lab Report instead of a Prescription:
   - Document type is "Lab Report".
   - Break down test results with "name", "result", "range", "status" ("Normal"|"High"|"Low"|"Needs Review"), and a 1-sentence "simpleMeaning" in ${langName}.

Return STRICT JSON only matching this exact schema:
{
  "documentType": "Prescription" | "Lab Report" | "Other",
  "summary": "Short 1-2 sentence overall summary in ${langName}",
  "patientCondition": {
    "whatHappened": "Plain simple explanation of what illness or issue the patient has in ${langName}",
    "simplePoints": [
      "Point 1 explaining what is happening to the user in simple words",
      "Point 2 explaining the cause or symptoms",
      "Point 3 explaining the treatment purpose"
    ]
  },
  "medicineNotes": [
    {
      "medicineName": "Medicine Brand & Strength",
      "dosage": "1 Tablet / 5ml syrup",
      "purpose": "What this medicine does in simple language",
      "timing": "When to take it in plain language",
      "schedule": {
        "morning": true,
        "afternoon": false,
        "night": true,
        "mealRelation": "After Food"
      },
      "duration": "For 5 days",
      "writtenInstruction": "1-0-1 after food x 5 days",
      "confidence": "High",
      "warning": "Key safety note or caution"
    }
  ],
  "doctorAdvice": [
    "Advice point 1 (e.g. Drink plenty of warm fluids)",
    "Advice point 2 (e.g. Avoid cold/oily foods)",
    "Advice point 3 (e.g. Consult doctor if fever exceeds 101°F)"
  ],
  "items": [],
  "nextStep": "Clear next action for the user in ${langName}",
  "disclaimer": "NutriDoc provides general awareness and plain-language simplification only. Always follow the direct instructions of your physician and licensed pharmacist."
}`;

    // Path 1: If image is provided, use Gemini Vision (primary for prescriptions & handwritten camera scans)
    if (imageBase64 && ai) {
      try {
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const parts: any[] = [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          { text: systemPrompt },
        ];

        const response = await callGemini({ parts }, {
          responseMimeType: 'application/json',
        });

        if (response && response.text) {
          const parsed = extractJson<any>(response.text);
          if (parsed && (parsed.summary || parsed.patientCondition || parsed.medicineNotes)) {
            return res.json({
              id: 'report_' + Date.now(),
              timestamp: Date.now(),
              ...parsed,
            });
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini vision prescription analysis error:', geminiErr?.message || geminiErr);
      }
    }

    // Path 2: If text is provided, try Groq or Gemini text models
    const hasGroq = !!(process.env.GROQ_API_KEY || process.env.GROK_API_KEY);
    if (hasGroq && rawText && rawText.length > 5) {
      try {
        const content = await callGroq([
          { role: 'system', content: 'You are an expert clinical medical prescription simplifier. Return strict JSON only.' },
          { role: 'user', content: `${systemPrompt}\n\nPrescription / Medical Document text to analyze:\n${rawText}` }
        ], true);

        const parsed = extractJson<any>(content);
        if (parsed && (parsed.summary || parsed.patientCondition || parsed.medicineNotes)) {
          return res.json({
            id: 'report_' + Date.now(),
            timestamp: Date.now(),
            ...parsed,
          });
        }
      } catch (groqErr: any) {
        console.warn('Groq prescription analysis error:', groqErr?.message);
      }
    }

    // Path 3: Gemini text fallback if rawText exists
    if (ai && rawText && rawText.length > 5) {
      try {
        const response = await callGemini({
          parts: [{ text: `${systemPrompt}\n\nPatient Document Text:\n${rawText}` }]
        }, {
          responseMimeType: 'application/json',
        });
        if (response && response.text) {
          const parsed = extractJson<any>(response.text);
          if (parsed && (parsed.summary || parsed.patientCondition || parsed.medicineNotes)) {
            return res.json({
              id: 'report_' + Date.now(),
              timestamp: Date.now(),
              ...parsed,
            });
          }
        }
      } catch (e: any) {
        console.warn('Gemini text fallback error:', e?.message);
      }
    }

    // Path 4: Intelligent local fallback if OCR detected text
    if (rawText && rawText.length > 10 && !rawText.startsWith('Uploaded Image Document') && !rawText.startsWith('Captured Camera Document')) {
      const isPrescription = /rx|tab|cap|syrup|mg|daily|od|bd|tds|empty stomach|after food|fever|cough|pain/i.test(rawText);
      const documentType = isPrescription ? 'Prescription' : 'Lab Report';

      const medicineNotes: any[] = [];
      const lines = rawText.split('\n').filter((l: string) => l.trim().length > 0);

      for (const line of lines) {
        if (/tab|cap|syrup|drop|ointment|mg|paracetamol|amox|pantop|azith/i.test(line)) {
          const isMorning = /morning|od|bd|tds|1-0|1-1/i.test(line);
          const isNight = /night|bd|tds|0-1|1-1/i.test(line);
          const isAfternoon = /noon|tds|1-1-1/i.test(line);
          const isBeforeFood = /before food|empty stomach|ac/i.test(line);

          medicineNotes.push({
            medicineName: line.split('-')[0]?.trim() || line,
            dosage: '1 unit as prescribed',
            purpose: language === 'hi' ? 'लक्षणों को कम करने और स्वास्थ्य सुधारने के लिए' : language === 'bn' ? 'উপসর্গ কমাতে ও আরোগ্য লাভের জন্য' : 'To reduce symptoms and support clinical recovery',
            timing: isBeforeFood
              ? (language === 'hi' ? 'भोजन से पहले (खाली पेट)' : language === 'bn' ? 'খাওয়ার আগে (খালি পেটে)' : 'Before food on empty stomach')
              : (language === 'hi' ? 'भोजन के बाद' : language === 'bn' ? 'খাওয়ার পরে' : 'After food'),
            schedule: {
              morning: isMorning,
              afternoon: isAfternoon,
              night: isNight,
              mealRelation: isBeforeFood ? 'Before Food (Empty Stomach)' : 'After Food',
            },
            duration: 'As advised by doctor',
            writtenInstruction: line,
            confidence: 'Medium',
          });
        }
      }

      return res.json({
        id: 'report_' + Date.now(),
        timestamp: Date.now(),
        documentType,
        summary: language === 'hi'
          ? 'आपके पर्चे की आवश्यक दवाइयाँ और सेवन के नियम।'
          : language === 'bn'
          ? 'আপনার প্রেসক্রিপশনের প্রয়োজনীয় ওষুধ এবং নিয়মাবলী।'
          : 'Prescription simplified with key medicines, timings, and instructions.',
        patientCondition: {
          whatHappened: language === 'hi'
            ? 'स्वास्थ्य समस्या के लिए डॉक्टर द्वारा निर्धारित उपचार।'
            : language === 'bn'
            ? 'চিকিৎসক দ্বারা নির্দেশিত প্রেসক্রিপশন পর্যালোচনা।'
            : 'Treatment protocol prescribed by your physician for symptom recovery.',
          simplePoints: [
            language === 'hi' ? 'चिकित्सक ने यह दवाइयाँ बीमारी के इलाज के लिए दी हैं।' : language === 'bn' ? 'চিকিৎসক অসুস্থতা নিরাময়ের জন্য এই ওষুধগুলি দিয়েছেন।' : 'Your doctor prescribed these medications to clear the acute condition.',
            language === 'hi' ? 'दवाइयों को नियमित समय पर और सही विधि से लें।' : language === 'bn' ? 'ওষুধগুলি নির্দিষ্ট সময়ে ও সঠিক নিয়মে গ্রহণ করুন।' : 'Follow the exact dosage schedule consistently for best results.',
          ],
        },
        medicineNotes,
        doctorAdvice: [
          language === 'hi' ? 'भरपूर मात्रा में स्वच्छ पानी पिएं और पर्याप्त आराम करें।' : language === 'bn' ? 'পর্যাপ্ত জল পান করুন এবং বিশ্রাম নিন।' : 'Drink plenty of clean water and get adequate rest.',
          language === 'hi' ? 'यदि लक्षण बने रहें तो डॉक्टर से दोबारा संपर्क करें।' : language === 'bn' ? 'উপসর্গ অব্যাহত থাকলে পুনরায় চিকিৎসকের পরামর্শ নিন।' : 'Follow up with your physician if symptoms do not improve.',
        ],
        items: [],
        nextStep: language === 'hi'
          ? 'इस जानकारी को अपने डॉक्टर या फार्मासिस्ट के साथ साझा करें।'
          : language === 'bn'
          ? 'এই তথ্যটি আপনার চিকিৎসকের সাথে নিশ্চিত করুন।'
          : 'Confirm any unclear dosages directly with your registered pharmacist.',
        disclaimer: 'NutriDoc provides general awareness only. Always follow the advice of your licensed doctor or pharmacist.',
      });
    }

    return res.status(422).json({
      error: language === 'hi'
        ? 'दस्तावेज़ को स्पष्ट रूप से पढ़ा नहीं जा सका। कृपया सुनिश्चित करें कि प्रिस्क्रिप्शन साफ़ और अच्छी रोशनी में है।'
        : language === 'bn'
        ? 'ডকুমেন্টটি স্পষ্টভাবে পড়া সম্ভব হয়নি। অনুগ্রহ করে পরিষ্কার ও ভালো আলোয় ছবি তুলুন।'
        : 'Could not clearly read text from this document. Please ensure the prescription or report is clear, well-lit, and in focus.',
    });
  } catch (err: any) {
    console.error('Error in /api/report-analysis:', err);
    res.status(500).json({ error: 'Failed to analyze report', details: err.message });
  }
});

// OpenFoodFacts Official Database Precision Helpers
async function lookupOpenFoodFactsBarcode(barcode: string) {
  const cleanBarcode = barcode.replace(/\D/g, '').trim();
  if (!cleanBarcode || cleanBarcode.length < 5) return null;

  const domains = ['world', 'in', 'us', 'fr'];
  for (const domain of domains) {
    try {
      const res = await fetch(`https://${domain}.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`, {
        headers: { 'User-Agent': 'NutriDoc - Healthcare Nutrition Web - Version 1.0 (contact@nutridoc.local)' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const p = data.product;
          const nutriments = p.nutriments || {};

          // Energy kcal (direct kcal or converted from kJ / 4.184)
          const cal = Math.round(
            Number(nutriments['energy-kcal_100g']) ||
            Number(nutriments['energy-kcal_serving']) ||
            Number(nutriments['energy-kcal']) ||
            (Number(nutriments['energy_100g']) ? Number(nutriments['energy_100g']) / 4.184 : 0) ||
            (Number(nutriments['energy_serving']) ? Number(nutriments['energy_serving']) / 4.184 : 0) ||
            0
          );

          // Sugar
          const sugar = parseFloat(
            (Number(nutriments.sugars_100g ?? nutriments.sugars_serving ?? nutriments.sugars ?? 0)).toFixed(1)
          );

          // Sodium in mg
          let sodium = 0;
          if (nutriments.sodium_100g != null) {
            sodium = Math.round(Number(nutriments.sodium_100g) * 1000);
          } else if (nutriments.sodium_serving != null) {
            sodium = Math.round(Number(nutriments.sodium_serving) * 1000);
          } else if (nutriments.salt_100g != null) {
            sodium = Math.round(Number(nutriments.salt_100g) * 400);
          } else if (nutriments.salt_serving != null) {
            sodium = Math.round(Number(nutriments.salt_serving) * 400);
          }

          // Fats
          const totalFat = parseFloat(
            (Number(nutriments.fat_100g ?? nutriments.fat_serving ?? nutriments.fat ?? 0)).toFixed(1)
          );
          const saturatedFat = parseFloat(
            (Number(nutriments['saturated-fat_100g'] ?? nutriments['saturated-fat_serving'] ?? 0)).toFixed(1)
          );
          const transFat = parseFloat(
            (Number(nutriments['trans-fat_100g'] ?? nutriments['trans-fat_serving'] ?? 0)).toFixed(2)
          );

          // Protein & Fibre
          const protein = parseFloat(
            (Number(nutriments.proteins_100g ?? nutriments.proteins_serving ?? nutriments.proteins ?? 0)).toFixed(1)
          );
          const fibre = parseFloat(
            (Number(nutriments.fiber_100g ?? nutriments.fiber_serving ?? nutriments.fiber ?? 0)).toFixed(1)
          );

          const ingredients: string[] = p.ingredients_text
            ? p.ingredients_text.split(/[,;\n]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0)
            : [];
          const allergens: string[] = Array.isArray(p.allergens_tags)
            ? p.allergens_tags.map((a: string) => a.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').trim())
            : [];

          return {
            isFood: true,
            isVerifiedDatabase: true,
            productName: p.product_name || p.product_name_en || 'Packaged Product',
            brand: p.brands || '',
            category: p.categories?.split(',')?.[0]?.trim() || 'Packaged Food',
            barcode: cleanBarcode,
            imageUrl: p.image_front_url || p.image_url || undefined,
            confidence: 1.0,
            source: 'OpenFoodFacts Official Database (Verified)',
            nutrition: {
              servingSize: p.serving_size || '100g',
              calories: cal,
              sugar,
              sodium,
              totalFat,
              saturatedFat,
              transFat,
              protein,
              fibre,
              ingredients,
              allergens,
              additives: Array.isArray(p.additives_tags) ? p.additives_tags.map((t: string) => t.replace(/^[a-z]{2}:/, '')) : [],
            },
          };
        }
      }
    } catch (e) {
      // Continue next domain
    }
  }
  return null;
}

async function searchOpenFoodFactsByName(productName: string, brand?: string) {
  try {
    const cleanBrand = brand && !/unknown/i.test(brand) ? brand.trim() : '';
    const query = `${cleanBrand ? cleanBrand + ' ' : ''}${productName}`.trim();
    const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6`, {
      headers: { 'User-Agent': 'NutriDoc - Healthcare Nutrition Web - Version 1.0 (contact@nutridoc.local)' },
    });
    if (res.ok) {
      const data = await res.json();
      const words = productName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const brandLower = cleanBrand.toLowerCase();

      // Find genuine matching product
      const p = (data.products || []).find((prod: any) => {
        const pName = (prod.product_name || prod.product_name_en || '').toLowerCase();
        const pBrand = (prod.brands || '').toLowerCase();
        const brandMatches = brandLower ? pBrand.includes(brandLower) : false;
        const nameMatches = words.some(w => pName.includes(w));
        return brandMatches || nameMatches;
      });

      if (p) {
        const nutriments = p.nutriments || {};

        const cal = Math.round(
          Number(nutriments['energy-kcal_100g']) ||
          Number(nutriments['energy-kcal_serving']) ||
          Number(nutriments['energy-kcal']) ||
          (Number(nutriments['energy_100g']) ? Number(nutriments['energy_100g']) / 4.184 : 0) || 0
        );

        if (cal > 0 || nutriments.sugars_100g != null) {
          const sugar = parseFloat((Number(nutriments.sugars_100g ?? nutriments.sugars_serving ?? 0)).toFixed(1));
          let sodium = 0;
          if (nutriments.sodium_100g != null) sodium = Math.round(Number(nutriments.sodium_100g) * 1000);
          else if (nutriments.salt_100g != null) sodium = Math.round(Number(nutriments.salt_100g) * 400);

          const totalFat = parseFloat((Number(nutriments.fat_100g ?? nutriments.fat_serving ?? 0)).toFixed(1));
          const saturatedFat = parseFloat((Number(nutriments['saturated-fat_100g'] ?? 0)).toFixed(1));
          const transFat = parseFloat((Number(nutriments['trans-fat_100g'] ?? 0)).toFixed(2));
          const protein = parseFloat((Number(nutriments.proteins_100g ?? nutriments.proteins_serving ?? 0)).toFixed(1));
          const fibre = parseFloat((Number(nutriments.fiber_100g ?? 0)).toFixed(1));

          const ingredients: string[] = p.ingredients_text
            ? p.ingredients_text.split(/[,;\n]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0)
            : [];
          const allergens: string[] = Array.isArray(p.allergens_tags)
            ? p.allergens_tags.map((a: string) => a.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').trim())
            : [];

          return {
            productName: p.product_name || productName,
            brand: p.brands || cleanBrand,
            category: p.categories?.split(',')?.[0]?.trim() || 'Packaged Food',
            barcode: p.code || '',
            imageUrl: p.image_front_url || p.image_url || undefined,
            isVerifiedDatabase: true,
            nutrition: {
              servingSize: p.serving_size || '100g',
              calories: cal,
              sugar,
              sodium,
              totalFat,
              saturatedFat,
              transFat,
              protein,
              fibre,
              ingredients,
              allergens,
              additives: [],
            },
          };
        }
      }
    }
  } catch (err) {
    console.warn('searchOpenFoodFactsByName error:', err);
  }
  return null;
}

// Dedicated Barcode Lookup endpoint
app.post('/api/barcode-lookup', async (req: Request, res: Response) => {
  try {
    const { barcode } = req.body;
    if (!barcode) {
      return res.status(400).json({ error: 'Barcode number is required' });
    }

    const match = await lookupOpenFoodFactsBarcode(barcode);
    if (match) {
      const googleImages = await fetchProductWebImages(match.productName, match.brand);
      return res.json({
        ...match,
        googleImages: googleImages.length > 0 ? googleImages : (match.imageUrl ? [match.imageUrl] : []),
      });
    }

    return res.status(404).json({
      error: `Barcode "${barcode}" was not found in the global OpenFoodFacts food database.`,
      notFound: true,
    });
  } catch (err: any) {
    console.error('Error in /api/barcode-lookup:', err);
    res.status(500).json({ error: 'Barcode lookup failed', details: err.message });
  }
});

// Product Recognition endpoint (Front packet recognition & OpenFoodFacts database match)
app.post('/api/recognize-product', async (req: Request, res: Response) => {
  try {
    const { imageBase64, barcode, fallbackQuery } = req.body;

    // 1. If barcode is provided, check OpenFoodFacts first with 100% precision
    if (barcode) {
      const match = await lookupOpenFoodFactsBarcode(barcode);
      if (match) {
        const googleImages = await fetchProductWebImages(match.productName, match.brand);
        return res.json({
          ...match,
          googleImages: googleImages.length > 0 ? googleImages : (match.imageUrl ? [match.imageUrl] : []),
        });
      }
    }

    // 2. Use Gemini Vision to recognize the food item or packet with strict disqualification
    if (imageBase64) {
      try {
        let mimeType = 'image/jpeg';
        if (imageBase64.includes('data:image/png')) mimeType = 'image/png';
        else if (imageBase64.includes('data:image/webp')) mimeType = 'image/webp';
        
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const prompt = `You are NutriDoc's strict food security and packet validation classifier.
Analyze this photo from the user's camera.

CRITICAL DISQUALIFICATION RULES (MUST BE STRICT):
1. Is this a human person, man, woman, child, selfie, face, body part, clothing, or skin?
   -> DISQUALIFY IMMEDIATELY!
   Return: { "isFood": false, "disqualificationType": "person", "reason": "Person or human face detected. NutriDoc only scans packaged food and grocery products. Please frame a real food packet." }

2. Is this an animal, dog, cat, bird, pet, insect, or wildlife?
   -> DISQUALIFY IMMEDIATELY!
   Return: { "isFood": false, "disqualificationType": "animal", "reason": "Animal or pet detected. Please point camera at a real packaged food or drink packet." }

3. Is this a non-food household item, room, computer, screen, keyboard, desk, chair, car, wall, floor, furniture, electronic, book, or paper document?
   -> DISQUALIFY IMMEDIATELY!
   Return: { "isFood": false, "disqualificationType": "non-food", "reason": "No food packet detected. Please frame the front of a real packaged snack, food, or beverage." }

ACCEPTANCE CRITERIA:
Accept ONLY if the image shows:
- A real packaged food packet, pouch, box, can, bottle, dairy product, instant food, beverage, grocery item, fresh fruit, or edible dish.

If ACCEPTED, return:
{
  "isFood": true,
  "productName": "Exact Brand and Product Name (e.g. Lay's Classic Salted Potato Chips)",
  "brand": "Brand Name (e.g. Lay's)",
  "category": "Chips & Namkeen | Biscuits | Beverages | Dairy | Instant Noodles | Chocolates | Groceries | etc.",
  "confidence": 0.95,
  "barcode": "",
  "nutrition": {
    "servingSize": "100g",
    "calories": 520,
    "sugar": 3.5,
    "sodium": 550,
    "totalFat": 32,
    "saturatedFat": 11,
    "transFat": 0.1,
    "protein": 6.8,
    "fibre": 3.2,
    "ingredients": ["Potatoes", "Edible Vegetable Oil", "Salt"],
    "allergens": [],
    "additives": []
  }
}
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
            // Check for rejection
            if (parsed.isFood === false || parsed.disqualificationType) {
              return res.status(422).json({
                isFood: false,
                disqualificationType: parsed.disqualificationType || 'non-food',
                error: parsed.reason || 'Only real food or drink packets can be scanned. Please do not scan people, animals, or non-food objects.',
              });
            }

            const rawName = parsed.productName || parsed.name;
            if (!rawName || /unknown|unidentified|human|person|animal/i.test(rawName)) {
              return res.status(422).json({
                isFood: false,
                disqualificationType: 'non-food',
                error: 'Could not detect a clear food packet. Please point camera steadily at the front of a packaged food item.',
              });
            }

            // Real food packet identified! Fetch real web packaging photos!
            const googleImages = await fetchProductWebImages(rawName, parsed.brand);

            // Check OpenFoodFacts official database for exact nutritional truth
            const dbProduct = await searchOpenFoodFactsByName(rawName, parsed.brand);
            if (dbProduct && dbProduct.nutrition && dbProduct.nutrition.calories > 0) {
              parsed.isFood = true;
              parsed.isVerifiedDatabase = true;
              parsed.productName = rawName || dbProduct.productName;
              parsed.brand = parsed.brand || dbProduct.brand || '';
              parsed.barcode = dbProduct.barcode || parsed.barcode || '';
              parsed.nutrition = dbProduct.nutrition;
              if (dbProduct.imageUrl && !googleImages.includes(dbProduct.imageUrl)) {
                googleImages.unshift(dbProduct.imageUrl);
              }
              parsed.googleImages = googleImages;
              return res.json(parsed);
            }

            parsed.isFood = true;
            parsed.productName = rawName;
            parsed.brand = parsed.brand && !/unknown/i.test(parsed.brand) ? parsed.brand : '';
            parsed.category = parsed.category && !/unknown/i.test(parsed.category) ? parsed.category : 'Packaged Food';
            parsed.googleImages = googleImages;
            if (googleImages.length > 0 && !parsed.imageUrl) {
              parsed.imageUrl = googleImages[0];
            }
            parsed.nutrition = {
              servingSize: parsed.nutrition?.servingSize || '100g',
              calories: Math.round(Number(parsed.nutrition?.calories) || 380),
              sugar: parseFloat((Number(parsed.nutrition?.sugar) || 5).toFixed(1)),
              sodium: Math.round(Number(parsed.nutrition?.sodium) || 280),
              totalFat: parseFloat((Number(parsed.nutrition?.totalFat) || 12).toFixed(1)),
              saturatedFat: parseFloat((Number(parsed.nutrition?.saturatedFat) || 4).toFixed(1)),
              transFat: parseFloat((Number(parsed.nutrition?.transFat) || 0).toFixed(2)),
              protein: parseFloat((Number(parsed.nutrition?.protein) || 5).toFixed(1)),
              fibre: parseFloat((Number(parsed.nutrition?.fibre) || 2).toFixed(1)),
              ingredients: Array.isArray(parsed.nutrition?.ingredients) && parsed.nutrition.ingredients.length > 0
                ? parsed.nutrition.ingredients
                : ['Grain / Potatoes / Flour', 'Edible Vegetable Oil', 'Iodised Salt'],
              allergens: Array.isArray(parsed.nutrition?.allergens) ? parsed.nutrition.allergens : [],
              additives: Array.isArray(parsed.nutrition?.additives) ? parsed.nutrition.additives : [],
            };
            return res.json(parsed);
          }
        }
      } catch (err: any) {
        console.warn('Gemini food recognition error:', err?.message || err);
        return res.status(422).json({
          isFood: false,
          error: 'Could not clearly recognize a food packet. Please hold the front of the food packet steady, ensure good lighting, or search by product name.',
        });
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
  "productName": "Exact product name",
  "brand": "Brand",
  "category": "Category",
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

        let parsed: any = null;
        const hasGroq = !!(process.env.GROQ_API_KEY || process.env.GROK_API_KEY);
        if (hasGroq) {
          try {
            const content = await callGroq([
              { role: 'system', content: 'You are an expert food nutritionist. Return strict JSON only.' },
              { role: 'user', content: queryPrompt }
            ], true);
            parsed = extractJson<any>(content);
          } catch (e) {
            // Fallback to Gemini
          }
        }

        if (!parsed && ai) {
          const queryRes = await callGemini(queryPrompt, { responseMimeType: 'application/json' });
          if (queryRes.text) {
            parsed = extractJson<any>(queryRes.text);
          }
        }

        if (parsed && parsed.productName) {
          const googleImages = await fetchProductWebImages(parsed.productName, parsed.brand);
          parsed.googleImages = googleImages;
          if (googleImages.length > 0 && !parsed.imageUrl) {
            parsed.imageUrl = googleImages[0];
          }
          parsed.isFood = true;
          return res.json(parsed);
        }
      } catch (err) {
        console.warn('Fallback query error:', err);
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
