import React from 'react';
import { UserProfile, Language, UserAccount } from '../../types';
import { HeartPulse, ShieldAlert, Globe, User, Check } from 'lucide-react';
import { MadeByFooter } from '../Common/MadeByFooter';

interface ProfileViewProps {
  profile: UserProfile;
  currentUser?: UserAccount | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenGoogleAuth?: () => void;
  onLogout?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  currentUser,
  onUpdateProfile,
  onOpenGoogleAuth,
  onLogout,
}) => {
  const isHindi = profile.language === 'hi';
  const isBengali = profile.language === 'bn';

  const ageRanges: UserProfile['ageRange'][] = [
    'Under 18',
    '18–35',
    '36–50',
    '51–65',
    '65+',
  ];

  const commonAllergies = ['Gluten', 'Peanuts', 'Dairy', 'Soy', 'Tree Nuts', 'Shellfish'];

  const toggleCondition = (key: keyof UserProfile['conditions']) => {
    onUpdateProfile({
      ...profile,
      conditions: {
        ...profile.conditions,
        [key]: !profile.conditions[key],
      },
    });
  };

  const toggleAllergy = (allergy: string) => {
    const exists = profile.allergies.includes(allergy);
    const updated = exists
      ? profile.allergies.filter((a) => a !== allergy)
      : [...profile.allergies, allergy];
    onUpdateProfile({
      ...profile,
      allergies: updated,
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <div className="pt-1 px-1">
        <h2 className="text-xl font-bold tracking-tight text-[#161616]">
          {isHindi ? 'स्वास्थ्य प्रोफ़ाइल' : isBengali ? 'স্বাস্থ্য প্রোফাইল' : 'Health Profile'}
        </h2>
        <p className="text-xs text-[#737373]">
          {isHindi
            ? 'आपके अनुसार व्यक्तिगत स्वास्थ्य स्कोर और चेतावनियां'
            : isBengali
            ? 'আপনার শারীরিক চাহিদা অনুযায়ী ব্যক্তিগত পরামর্শ'
            : 'Personalizes food analysis and safety warnings for your body'}
        </p>
      </div>

      {/* Google Account Sync Card */}
      <div className="bg-white rounded-[24px] p-5 border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.13z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/>
            </svg>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#161616]">
              Google Account
            </h3>
          </div>
          {currentUser && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Check className="w-3 h-3 text-emerald-600" />
              Connected
            </span>
          )}
        </div>

        {currentUser ? (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={currentUser.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(currentUser.email)}`}
                alt={currentUser.name}
                className="w-11 h-11 rounded-full object-cover border border-emerald-500/30 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#161616] truncate">{currentUser.name}</p>
                <p className="text-[11px] text-[#737373] truncate font-mono">{currentUser.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenGoogleAuth && (
                <button
                  onClick={onOpenGoogleAuth}
                  className="px-2.5 py-1.5 rounded-full bg-[#F0EFEA] hover:bg-[#EAE9E4] text-xs font-medium text-[#161616] active:scale-95 transition-all"
                >
                  Manage
                </button>
              )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-2.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-xs font-medium text-rose-700 active:scale-95 transition-all"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-[#737373] leading-relaxed">
              Sign in with your Google account to backup your health profile, conditions, and scan history safely in the cloud.
            </p>
            {onOpenGoogleAuth && (
              <button
                onClick={onOpenGoogleAuth}
                className="w-full py-2.5 rounded-full bg-[#161616] text-white text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xs"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.26C.46 8.19 0 9.99 0 12s.46 3.81 1.26 5.41l4.02-3.13z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.59l4.02 3.13c.95-2.83 3.6-4.97 6.72-4.97z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Language Selection Card with Liquid Sliding Indicator */}
      <div className="bg-white rounded-[24px] p-5 border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#161616]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#161616]">
            {isHindi ? 'पसंदीदा भाषा' : isBengali ? 'পছন্দের ভাষা' : 'App Language'}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2 p-1 bg-[#F0EFEA] rounded-2xl relative">
          {[
            { id: 'en' as Language, label: 'English' },
            { id: 'hi' as Language, label: 'हिंदी' },
            { id: 'bn' as Language, label: 'বাংলা' },
          ].map((l) => {
            const isSelected = profile.language === l.id;
            return (
              <button
                key={l.id}
                onClick={() => onUpdateProfile({ ...profile, language: l.id })}
                className={`relative py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 text-center liquid-ripple z-10 ${
                  isSelected ? 'bg-white text-[#161616] shadow-xs border border-black/[0.04]' : 'text-[#737373] hover:text-[#161616]'
                }`}
              >
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Age Group Card with Liquid Sliding Pill */}
      <div className="bg-white rounded-[24px] p-5 border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#161616]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#161616]">
            {isHindi ? 'आयु वर्ग' : isBengali ? 'বয়স সীমা' : 'Age Range'}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {ageRanges.map((age) => {
            const isSelected = profile.ageRange === age;
            return (
              <button
                key={age}
                onClick={() => onUpdateProfile({ ...profile, ageRange: age })}
                className={`relative py-1.5 px-3.5 rounded-full text-xs font-semibold transition-all liquid-ripple ${
                  isSelected
                    ? 'bg-[#161616] text-white shadow-xs'
                    : 'bg-[#F0EFEA] text-[#161616] hover:bg-[#EAE9E4]'
                }`}
              >
                {age}
              </button>
            );
          })}
        </div>
      </div>

      {/* Health Conditions Toggles */}
      <div className="bg-white rounded-[24px] p-5 border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#161616]">
            {isHindi ? 'स्वास्थ्य स्थितियां' : isBengali ? 'শারীরিক অবস্থা' : 'Health Conditions'}
          </h3>
        </div>

        <div className="space-y-2">
          {[
            {
              key: 'diabetes' as const,
              title: isHindi ? 'डायबिटीज (Diabetes)' : isBengali ? 'ডায়াবেটিস' : 'Diabetes / High Blood Sugar',
              desc: isHindi ? 'अत्यधिक चीनी व कार्ब्स पर तुरंत चेतावनी' : isBengali ? 'চিনি ও অতিরিক্ত শর্করার ক্ষেত্রে সতর্কতা' : 'Flags high added sugars & rapid glucose spikes',
            },
            {
              key: 'highBP' as const,
              title: isHindi ? 'हाई बीपी (High Blood Pressure)' : isBengali ? 'উচ্চ রক্তচাপ (High BP)' : 'High Blood Pressure (Hypertension)',
              desc: isHindi ? 'पैकेट में अत्यधिक सोडियम/नमक पर चेतावनी' : isBengali ? 'অতিরিক্ত সোডিয়াম বা লবণের ক্ষেত্রে সতর্কতা' : 'Flags high sodium & salt density in processed snacks',
            },
            {
              key: 'cholesterol' as const,
              title: isHindi ? 'हाई कोलेस्ट्रॉल (High Cholesterol)' : isBengali ? 'কোলেস্টেরল' : 'High Cholesterol / Heart Health',
              desc: isHindi ? 'पाम ऑयल व सैचुरेटेड फैट पर चेतावनी' : isBengali ? 'পাম তেল ও ক্ষতিকর ফ্যাট পরিহারের পরামর্শ' : 'Flags palm oil, trans fats & saturated oils',
            },
            {
              key: 'weightManagement' as const,
              title: isHindi ? 'वजन नियंत्रण (Weight Goal)' : isBengali ? 'ওজন নিয়ন্ত্রণ' : 'Weight Management',
              desc: isHindi ? 'अनावश्यक कैलोरी और वसा को सीमित करें' : isBengali ? 'উচ্চ ক্যালোরি নিয়ন্ত্রণ' : 'Highlights high caloric density and low-fibre items',
            },
          ].map((cond) => {
            const active = profile.conditions[cond.key];
            return (
              <button
                key={cond.key}
                onClick={() => toggleCondition(cond.key)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 liquid-ripple ${
                  active
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                    : 'bg-[#F7F7F5] border-black/[0.04] hover:border-black/[0.1]'
                }`}
              >
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-[#161616]">{cond.title}</h4>
                  <p className="text-[11px] text-[#737373]">{cond.desc}</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    active ? 'bg-emerald-600 text-white' : 'border-2 border-black/20'
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Allergies Card */}
      <div className="bg-white rounded-[24px] p-5 border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#161616]">
            {isHindi ? 'एलर्जी सावधानियां' : isBengali ? 'অ্যালার্জি' : 'Food Allergies'}
          </h3>
        </div>
        <p className="text-[11px] text-[#737373]">
          {isHindi ? 'पैकेट सामग्री में पाए जाने पर तत्काल चेतावनी दी जाएगी' : isBengali ? 'উপাদান তালিকায় থাকলে লাল সতর্কতা প্রদর্শন করা হবে' : 'Immediate red warning if detected in scanned ingredients'}
        </p>

        <div className="flex flex-wrap gap-2">
          {commonAllergies.map((allergy) => {
            const isSelected = profile.allergies.includes(allergy);
            return (
              <button
                key={allergy}
                onClick={() => toggleAllergy(allergy)}
                className={`py-1.5 px-3.5 rounded-full text-xs font-semibold border transition-all liquid-ripple ${
                  isSelected
                    ? 'bg-rose-50 text-rose-900 border-rose-300 shadow-xs'
                    : 'bg-[#F0EFEA] text-[#161616] border-black/[0.04] hover:bg-[#EAE9E4]'
                }`}
              >
                {allergy}
              </button>
            );
          })}
        </div>
      </div>

      {/* Made With ❤️ by Nirmalya ! with animated pumping heart */}
      <MadeByFooter className="pt-2 pb-4" />
    </div>
  );
};
