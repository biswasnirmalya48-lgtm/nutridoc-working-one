import React, { useState } from 'react';
import { UserAccount } from '../../types';
import { X, Check, ShieldCheck, LogOut, AlertCircle } from 'lucide-react';
import { signInWithGoogle, logoutGoogle } from '../../firebase';

interface GoogleAuthModalProps {
  currentUser: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  onLogout: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onLoginSuccess,
  onLogout,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLiveGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const fbUser = await signInWithGoogle();
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
        onLoginSuccess(user);
        onClose();
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setIsProcessing(false);
        return;
      }
      setErrorMessage(err?.message || 'Failed to authenticate with Google. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
    } catch (e) {
      console.warn('Sign out note', e);
    }
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#FFFFFF] w-full max-w-sm rounded-[28px] p-6 shadow-2xl border border-black/[0.08] relative space-y-5 animate-scale-in">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#161616] active:scale-95 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {currentUser ? (
          // LOGGED IN STATE
          <div className="space-y-5 pt-1 text-center">
            <div className="relative w-18 h-18 mx-auto">
              <img
                src={currentUser.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(currentUser.email)}`}
                alt={currentUser.name}
                className="w-18 h-18 rounded-full object-cover shadow-md border-2 border-emerald-500/30"
              />
              <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-xs">
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-500/20 text-emerald-800 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Account Connected</span>
              </div>
              <h3 className="text-lg font-bold text-[#161616]">{currentUser.name}</h3>
              <p className="text-xs text-[#737373] font-mono">{currentUser.email}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F7F7F5] border border-black/[0.04] text-left text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[#161616] font-medium">
                <span>Cloud Sync Active</span>
                <span className="text-emerald-600 font-semibold">● Live</span>
              </div>
              <p className="text-[11px] text-[#737373]">
                Your health conditions, allergy profile, and scan history are safely saved to your Google account.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-3 rounded-full bg-[#F0EFEA] hover:bg-[#EAE9E4] text-rose-600 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of Google</span>
              </button>
            </div>
          </div>
        ) : (
          // SIGN IN STATE
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#F0EFEA] flex items-center justify-center shrink-0 shadow-xs border border-black/[0.04]">
                <svg viewBox="0 0 24 24" className="w-6 h-6">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.13z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#161616] tracking-tight">
                  Sign in with Google
                </h3>
                <p className="text-xs text-[#737373]">
                  Sync your health records & scans
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="text-[11px] leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Live Sign-in Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLiveGoogleSignIn}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 bg-[#161616] text-white rounded-2xl flex items-center justify-center gap-3 font-semibold text-xs shadow-md hover:bg-neutral-800 active:scale-[0.985] transition-all cursor-pointer disabled:opacity-60"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting Google...</span>
                  </div>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-4 h-4">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
