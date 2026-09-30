export type HealthStatus = 'Good Choice' | 'Limit' | 'Avoid';
export type NutrientLevel = 'Low' | 'Medium' | 'High';
export type Language = 'en' | 'hi' | 'bn';

export interface NutritionData {
  servingSize?: string;
  calories?: number;
  sugar?: number; // g
  sugarLevel?: NutrientLevel;
  sodium?: number; // mg
  sodiumLevel?: NutrientLevel;
  totalFat?: number; // g
  fatLevel?: NutrientLevel;
  saturatedFat?: number; // g
  transFat?: number; // g
  protein?: number; // g
  proteinLevel?: NutrientLevel;
  fibre?: number; // g
  fibreLevel?: NutrientLevel;
  ingredients?: string[];
  allergens?: string[];
  additives?: string[];
}

export interface BetterAlternative {
  name: string;
  brand?: string;
  category: string;
  whyBetter: string;
  budgetLevel?: 'Low' | 'Medium' | string;
  highlightTag?: string;
  healthScore?: number;
  type?: 'brand' | 'fresh';
  nutritionComparison?: {
    sugarDiff?: string;
    fatDiff?: string;
    proteinDiff?: string;
    sodiumDiff?: string;
  };
}

export interface FoodAnalysisResult {
  id: string;
  timestamp: number;
  productName: string;
  brand?: string;
  category: string;
  barcode?: string;
  imageUrl: string;
  referenceImages?: string[]; // Real images found online / Google / OpenFoodFacts
  isVerifiedDatabase?: boolean; // Verified from official OpenFoodFacts database
  healthScore: number; // 0 - 100
  status: HealthStatus;
  nutrition: {
    sugar: NutrientLevel;
    sodium: NutrientLevel;
    fat: NutrientLevel;
    protein: NutrientLevel;
    fibre: NutrientLevel;
  };
  rawNutrition?: NutritionData;
  keyFlags: string[];
  ingredientFlags?: {
    name: string;
    type: 'harmful' | 'beneficial' | 'neutral';
    description: string;
  }[];
  simpleReason: string;
  personalNote: string;
  betterAlternatives: BetterAlternative[];
  disclaimer: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'google';
  signedInAt: number;
}

export type ReportItemStatus = 'Normal' | 'High' | 'Low' | 'Needs Review';

export interface ReportItem {
  name: string;
  result: string;
  range: string;
  status: ReportItemStatus;
  simpleMeaning: string;
}

export interface MedicineSchedule {
  morning?: boolean;
  afternoon?: boolean;
  night?: boolean;
  mealRelation?: string;
}

export interface MedicineNote {
  medicineName: string;
  dosage?: string;
  purpose?: string;
  timing?: string;
  schedule?: MedicineSchedule;
  duration?: string;
  writtenInstruction: string;
  confidence: 'High' | 'Medium' | 'Low';
  warning?: string;
  unclearParts?: string[];
}

export interface PatientConditionInfo {
  whatHappened: string;
  simplePoints: string[];
}

export interface ReportAnalysisResult {
  id: string;
  timestamp: number;
  documentType: 'Lab Report' | 'Prescription' | 'Other';
  summary: string;
  patientCondition?: PatientConditionInfo;
  imageUrl?: string;
  items: ReportItem[];
  medicineNotes: MedicineNote[];
  doctorAdvice?: string[];
  nextStep: string;
  disclaimer: string;
}

export interface UserProfile {
  ageRange: 'Under 18' | '18–35' | '36–50' | '51–65' | '65+';
  conditions: {
    diabetes: boolean;
    highBP: boolean;
    cholesterol: boolean;
    weightManagement: boolean;
  };
  allergies: string[];
  language: Language;
}

export type ScanHistoryItem = 
  | { type: 'food'; data: FoodAnalysisResult }
  | { type: 'report'; data: ReportAnalysisResult };
