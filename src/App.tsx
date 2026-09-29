/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { CameraScanner } from './components/FoodScanner/CameraScanner';
import { NutritionEditModal } from './components/FoodScanner/NutritionEditModal';
import { FoodResultView } from './components/FoodScanner/FoodResultView';
import { ReportScanner } from './components/ReportSimplifier/ReportScanner';
import { ReportResultView } from './components/ReportSimplifier/ReportResultView';
import { HistoryView } from './components/History/HistoryView';
import { ProfileView } from './components/Profile/ProfileView';
import {
  FoodAnalysisResult,
  Language,
  NutritionData,
  ReportAnalysisResult,
  ScanHistoryItem,
  UserProfile,
} from './types';
import { evaluateFoodNutrition } from './utils/nutritionEngine';

const DEFAULT_PROFILE: UserProfile = {
  ageRange: '18–35',
  conditions: {
    diabetes: false,
    highBP: false,
    cholesterol: false,
    weightManagement: false,
  },
  allergies: [],
  language: 'en',
};

export default function App() {
  // 1. Profile State
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('nutridoc_profile');
      return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  // 2. Navigation State
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'profile'>('home');
  const [activeView, setActiveView] = useState<
    'main' | 'food_camera' | 'food_confirm' | 'food_result' | 'report_scanner' | 'report_result'
  >('main');

  // 3. Staging data for food scan flow
  const [stagedFoodData, setStagedFoodData] = useState<{
    productName: string;
    brand: string;
    category: string;
    barcode?: string;
    frontImageUrl: string;
    nutrition: NutritionData;
  } | null>(null);

  const [activeFoodResult, setActiveFoodResult] = useState<FoodAnalysisResult | null>(null);
  const [activeReportResult, setActiveReportResult] = useState<ReportAnalysisResult | null>(null);

  // 4. Scan History (Real user scans only)
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('nutridoc_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse history from localStorage', e);
    }
    return [];
  });

  // Save profile changes
  useEffect(() => {
    try {
      localStorage.setItem('nutridoc_profile', JSON.stringify(profile));
    } catch (e) {
      console.warn('Error saving profile', e);
    }
  }, [profile]);

  // Save history changes
  useEffect(() => {
    try {
      localStorage.setItem('nutridoc_history', JSON.stringify(scanHistory));
    } catch (e) {
      console.warn('Error saving history', e);
    }
  }, [scanHistory]);

  const handleUpdateLanguage = (lang: Language) => {
    setProfile((prev) => ({ ...prev, language: lang }));
  };

  const handleSaveToHistory = (item: ScanHistoryItem) => {
    setScanHistory((prev) => [item, ...prev]);
  };

  const handleClearHistory = () => {
    setScanHistory([]);
    try {
      localStorage.removeItem('nutridoc_history');
    } catch {}
  };

  // Flow Step: Camera capture complete -> open Confirmation/Edit screen
  const handleFoodCaptureComplete = (data: {
    productName: string;
    brand: string;
    category: string;
    barcode?: string;
    frontImageUrl: string;
    nutrition: NutritionData;
  }) => {
    setStagedFoodData(data);
    setActiveView('food_confirm');
  };

  // Flow Step: Confirmation screen confirmed -> call server API & evaluate
  const handleFoodConfirmed = async (confirmedData: typeof stagedFoodData) => {
    if (!confirmedData) return;

    try {
      const res = await fetch('/api/food-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: confirmedData.productName,
          brand: confirmedData.brand,
          category: confirmedData.category,
          nutrition: confirmedData.nutrition,
          ingredients: confirmedData.nutrition.ingredients,
          profile,
          imageUrl: confirmedData.frontImageUrl,
          barcode: confirmedData.barcode,
        }),
      });

      if (res.ok) {
        const result: FoodAnalysisResult = await res.json();
        setActiveFoodResult(result);
        handleSaveToHistory({ type: 'food', data: result });
        setActiveView('food_result');
      } else {
        const evalResult = evaluateFoodNutrition(
          confirmedData.productName,
          confirmedData.category,
          confirmedData.nutrition,
          profile,
          confirmedData.brand,
          confirmedData.frontImageUrl,
          confirmedData.barcode
        );
        setActiveFoodResult(evalResult);
        handleSaveToHistory({ type: 'food', data: evalResult });
        setActiveView('food_result');
      }
    } catch (err) {
      console.warn('Food analysis API error, fallback to local scoring engine:', err);
      const evalResult = evaluateFoodNutrition(
        confirmedData.productName,
        confirmedData.category,
        confirmedData.nutrition,
        profile,
        confirmedData.brand,
        confirmedData.frontImageUrl,
        confirmedData.barcode
      );
      setActiveFoodResult(evalResult);
      handleSaveToHistory({ type: 'food', data: evalResult });
      setActiveView('food_result');
    }
  };

  // Report Simplifier complete handler
  const handleReportAnalysisComplete = (result: ReportAnalysisResult) => {
    setActiveReportResult(result);
    handleSaveToHistory({ type: 'report', data: result });
    setActiveView('report_result');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#1D1D1F] flex flex-col font-sans antialiased selection:bg-[#E5E5EA]">
      {/* Top Apple Minimal Header */}
      <Header
        profile={profile}
        onUpdateLanguage={handleUpdateLanguage}
        onOpenProfile={() => {
          setActiveTab('profile');
          setActiveView('main');
        }}
      />

      {/* Main Responsive Viewport Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-3 pb-20">
        {/* VIEW 1: Live Food Camera Scanner */}
        {activeView === 'food_camera' && (
          <CameraScanner
            onCaptureComplete={handleFoodCaptureComplete}
            onCancel={() => setActiveView('main')}
            profile={profile}
          />
        )}

        {/* VIEW 2: Nutrition Confirmation & Edit Screen */}
        {activeView === 'food_confirm' && stagedFoodData && (
          <NutritionEditModal
            initialData={stagedFoodData}
            onConfirm={handleFoodConfirmed}
            onCancel={() => setActiveView('main')}
            profile={profile}
          />
        )}

        {/* VIEW 3: Food Result Screen */}
        {activeView === 'food_result' && activeFoodResult && (
          <FoodResultView
            result={activeFoodResult}
            onBack={() => setActiveView('main')}
            onScanAnother={() => setActiveView('food_camera')}
            profile={profile}
          />
        )}

        {/* VIEW 4: Prescription & Report Scanner */}
        {activeView === 'report_scanner' && (
          <ReportScanner
            onAnalyzeComplete={handleReportAnalysisComplete}
            onCancel={() => setActiveView('main')}
            profile={profile}
          />
        )}

        {/* VIEW 5: Report Result Screen */}
        {activeView === 'report_result' && activeReportResult && (
          <ReportResultView
            result={activeReportResult}
            onBack={() => setActiveView('main')}
            onScanAnother={() => setActiveView('report_scanner')}
            profile={profile}
          />
        )}

        {/* VIEW 6: Home Screen or Bottom Tabs */}
        {activeView === 'main' && (
          <>
            {activeTab === 'home' && (
              <HomeView
                onStartFoodScan={() => setActiveView('food_camera')}
                onStartReportScan={() => setActiveView('report_scanner')}
                profile={profile}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                history={scanHistory}
                onSelectFood={(f) => {
                  setActiveFoodResult(f);
                  setActiveView('food_result');
                }}
                onSelectReport={(r) => {
                  setActiveReportResult(r);
                  setActiveView('report_result');
                }}
                onClearHistory={handleClearHistory}
                onStartFoodScan={() => setActiveView('food_camera')}
                onStartReportScan={() => setActiveView('report_scanner')}
                profile={profile}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                profile={profile}
                onUpdateProfile={(updated) => setProfile(updated)}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Glassmorphic Bottom Navigation */}
      {activeView === 'main' && (
        <BottomNav
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            setActiveView('main');
          }}
          language={profile.language}
        />
      )}
    </div>
  );
}
