import React, { useState } from 'react';
import { UserAccount } from '../../types';
import { ArrowRight, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { signInWithGoogle } from '../../firebase';
import { MadeByFooter } from '../Common/MadeByFooter';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
  onContinueAsGuest?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real, Live Google Authentication via official Google OAuth Popup
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        const user: UserAccount = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Nirmalya',
          email: fbUser.email || 'user@gmail.com',
          avatar:
            fbUser.photoURL ||
            `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(fbUser.email || 'user')}&backgroundColor=e5e7eb`,
          provider: 'google',
          signedInAt: Date.now(),
        };
        onLoginSuccess(user);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        // User closed popup without signing in
        setIsProcessing(false);
        return;
      }
      setErrorMessage(
        err?.message || 'Google authentication was interrupted. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#161616] flex flex-col justify-between items-center px-4 py-8 font-sans relative selection:bg-neutral-200 overflow-hidden">
      {/* Subtle Apple Radial Ambient Glow */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Empty Top Anchor to balance vertical alignment */}
      <div className="w-full max-w-sm h-4" />

      {/* Main Center Login Card — Has the ONLY ONE Logo on the page */}
      <div className="w-full max-w-sm my-auto py-4 z-10 animate-fade-in flex flex-col items-center text-center">
        {/* THE ONLY ONE LOGO */}
        <div className="mb-5 flex flex-col items-center">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-[22px] bg-[#161616] text-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center justify-center">
              <span className="font-extrabold text-2xl tracking-tighter">N</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs border-2 border-[#F7F7F5]">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#161616]">
            NutriDoc
          </h1>
          <p className="text-xs text-[#737373] mt-1 font-medium">
            Food & Health Intelligence
          </p>
        </div>

        <p className="text-xs text-[#737373] max-w-xs leading-relaxed mb-7">
          Scan packaged foods, detect harmful additives & hidden sugars, and simplify complex health reports.
        </p>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 text-left animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-900">Sign-in issue</p>
              <p className="text-[11px] text-rose-700 leading-snug">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Action Container */}
        <div className="w-full space-y-3">
          {/* Main Working Live Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isProcessing}
            aria-label="Sign in with Google"
            className="w-full relative flex items-center justify-center gap-3 py-3.5 px-4 bg-white text-[#161616] rounded-2xl border border-black/[0.12] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_18px_rgba(0,0,0,0.08)] hover:border-black/[0.2] active:scale-[0.985] transition-all duration-200 group font-semibold text-sm cursor-pointer disabled:opacity-60"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#161616] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Connecting with Google...</span>
              </div>
            ) : (
              <>
                {/* Official Google Vector Logo */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Guest option */}
          {onContinueAsGuest && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="inline-flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#161616] transition-colors py-1 cursor-pointer"
              >
                <span>Or explore as guest</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-2 gap-2 w-full text-left">
          <div className="p-3 rounded-2xl bg-white/70 border border-black/[0.04] shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">
              Strict Verification
            </span>
            <span className="text-[11px] text-[#444] leading-tight block">
              Ingredient-based health scoring with zero false claims.
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white/70 border border-black/[0.04] shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-0.5">
              Real Better Swaps
            </span>
            <span className="text-[11px] text-[#444] leading-tight block">
              Healthier alternatives from other real supermarket brands.
            </span>
          </div>
        </div>

        {/* Quiet Privacy & Security Note */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#888]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Real Google Authentication</span>
        </div>
      </div>

      {/* Made with ❤️ by Nirmalya ! */}
      <MadeByFooter className="pb-3 pt-4" />
    </div>
  );
};
