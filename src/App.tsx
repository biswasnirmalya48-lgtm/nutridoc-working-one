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
import { GoogleAuthModal } from './components/Auth/GoogleAuthModal';
import { LoginPage } from './components/Auth/LoginPage';
import { auth, onAuthStateChanged, checkRedirectResult, logoutGoogle } from './firebase';
import {
  FoodAnalysisResult,
  Language,
  NutritionData,
  ReportAnalysisResult,
  ScanHistoryItem,
  UserAccount,
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
    referenceImages?: string[];
    isVerifiedDatabase?: boolean;
    nutrition: NutritionData;
  } | null>(null);

  const [activeFoodResult, setActiveFoodResult] = useState<FoodAnalysisResult | null>(null);
  const [activeReportResult, setActiveReportResult] = useState<ReportAnalysisResult | null>(null);

  // 4. Google User Account State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('nutridoc_google_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nutridoc_guest_entry') === 'true';
    } catch {
      return false;
    }
  });
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);

  // Sync with Firebase Google Auth on boot and handle redirect login
  useEffect(() => {
    checkRedirectResult()
      .then((fbUser) => {
        if (fbUser) {
          const user: UserAccount = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            avatar:
              fbUser.photoURL ||
              `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(fbUser.email || 'user')}&backgroundColor=e5e7eb`,
            provider: 'google',
            signedInAt: Date.now(),
          };
          handleLoginSuccess(user);
        }
      })
      .catch((err) => console.warn('Redirect check note:', err));

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const user: UserAccount = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email || '',
          avatar:
            fbUser.photoURL ||
            `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(fbUser.email || 'user')}&backgroundColor=e5e7eb`,
          provider: 'google',
          signedInAt: Date.now(),
        };
        handleLoginSuccess(user);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('nutridoc_google_user', JSON.stringify(user));
      localStorage.removeItem('nutridoc_guest_entry');
    } catch (e) {
      console.warn('Failed to save google user', e);
    }
  };

  const handleContinueAsGuest = () => {
    setIsGuest(true);
    try {
      localStorage.setItem('nutridoc_guest_entry', 'true');
    } catch (e) {}
  };

  const handleLogout = async () => {
    try {
      await logoutGoogle();
    } catch (e) {
      console.warn('Firebase signout note', e);
    }
    setCurrentUser(null);
    setIsGuest(false);
    try {
      localStorage.removeItem('nutridoc_google_user');
      localStorage.removeItem('nutridoc_guest_entry');
    } catch (e) {
      console.warn('Failed to remove google user', e);
    }
  };

  // 5. Scan History (Real user scans only)
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
    referenceImages?: string[];
    isVerifiedDatabase?: boolean;
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
        if (confirmedData.referenceImages && confirmedData.referenceImages.length > 0) {
          result.referenceImages = confirmedData.referenceImages;
        }
        if (confirmedData.isVerifiedDatabase) {
          result.isVerifiedDatabase = true;
        }
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
        if (confirmedData.referenceImages && confirmedData.referenceImages.length > 0) {
          evalResult.referenceImages = confirmedData.referenceImages;
        }
        if (confirmedData.isVerifiedDatabase) {
          evalResult.isVerifiedDatabase = true;
        }
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
      if (confirmedData.referenceImages && confirmedData.referenceImages.length > 0) {
        evalResult.referenceImages = confirmedData.referenceImages;
      }
      if (confirmedData.isVerifiedDatabase) {
        evalResult.isVerifiedDatabase = true;
      }
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

  // If not logged in and not guest, render the dedicated Apple-style Google Login Page
  if (!currentUser && !isGuest) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onContinueAsGuest={handleContinueAsGuest}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#161616] flex flex-col font-sans antialiased selection:bg-neutral-200">
      {/* Top Apple Minimal Header */}
      <Header
        profile={profile}
        currentUser={currentUser}
        onUpdateLanguage={handleUpdateLanguage}
        onOpenProfile={() => {
          setActiveTab('profile');
          setActiveView('main');
        }}
        onOpenGoogleAuth={() => setShowGoogleModal(true)}
      />

      {/* Main Responsive Viewport Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-3 pb-24 relative">
        {/* VIEW 1: Live Food Camera Scanner */}
        {activeView === 'food_camera' && (
          <div key="food_camera" className="animate-fade-in">
            <CameraScanner
              onCaptureComplete={handleFoodCaptureComplete}
              onCancel={() => setActiveView('main')}
              profile={profile}
            />
          </div>
        )}

        {/* VIEW 2: Nutrition Confirmation & Edit Screen */}
        {activeView === 'food_confirm' && stagedFoodData && (
          <div key="food_confirm" className="animate-fade-in">
            <NutritionEditModal
              initialData={stagedFoodData}
              onConfirm={handleFoodConfirmed}
              onCancel={() => setActiveView('main')}
              profile={profile}
            />
          </div>
        )}

        {/* VIEW 3: Food Result Screen */}
        {activeView === 'food_result' && activeFoodResult && (
          <div key="food_result" className="animate-fade-in">
            <FoodResultView
              result={activeFoodResult}
              onBack={() => setActiveView('main')}
              onScanAnother={() => setActiveView('food_camera')}
              profile={profile}
            />
          </div>
        )}

        {/* VIEW 4: Prescription & Report Scanner */}
        {activeView === 'report_scanner' && (
          <div key="report_scanner" className="animate-fade-in">
            <ReportScanner
              onAnalyzeComplete={handleReportAnalysisComplete}
              onCancel={() => setActiveView('main')}
              profile={profile}
            />
          </div>
        )}

        {/* VIEW 5: Report Result Screen */}
        {activeView === 'report_result' && activeReportResult && (
          <div key="report_result" className="animate-fade-in">
            <ReportResultView
              result={activeReportResult}
              onBack={() => setActiveView('main')}
              onScanAnother={() => setActiveView('report_scanner')}
              profile={profile}
            />
          </div>
        )}

        {/* VIEW 6: Home Screen or Bottom Tabs */}
        {activeView === 'main' && (
          <div key={`main_${activeTab}`} className="animate-fade-in">
            {activeTab === 'home' && (
              <HomeView
                onStartFoodScan={() => setActiveView('food_camera')}
                onStartReportScan={() => setActiveView('report_scanner')}
                profile={profile}
                history={scanHistory}
                onSelectFood={(f) => {
                  setActiveFoodResult(f);
                  setActiveView('food_result');
                }}
                onSelectReport={(r) => {
                  setActiveReportResult(r);
                  setActiveView('report_result');
                }}
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
                currentUser={currentUser}
                onUpdateProfile={(updated) => setProfile(updated)}
                onOpenGoogleAuth={() => setShowGoogleModal(true)}
                onLogout={handleLogout}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation */}
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

      {/* Google Authentication Modal */}
      <GoogleAuthModal
        currentUser={currentUser}
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
      />
    </div>
  );
}
