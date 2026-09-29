import React from 'react';
import { UserProfile, Language } from '../../types';
import { HeartPulse, ShieldAlert, Globe, User, Check } from 'lucide-react';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, onUpdateProfile }) => {
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
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Page Header */}
      <div className="pt-1">
        <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
          {isHindi ? 'स्वास्थ्य प्रोफ़ाइल' : isBengali ? 'স্বাস্থ্য প্রোফাইল' : 'Health Profile'}
        </h2>
        <p className="text-xs text-[#86868B]">
          {isHindi
            ? 'आपके अनुसार व्यक्तिगत स्वास्थ्य स्कोर और चेतावनियां'
            : isBengali
            ? 'আপনার শারীরিক চাহিদা অনুযায়ী ব্যক্তিগত পরামর্শ'
            : 'Personalizes food analysis and safety warnings for your body'}
        </p>
      </div>

      {/* Language Selection Card */}
      <div className="bg-white rounded-3xl p-5 border border-black/[0.06] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#1D1D1F]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">
            {isHindi ? 'पसंदीदा भाषा' : isBengali ? 'পছন্দের ভাষা' : 'App Language'}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'en' as Language, label: 'English' },
            { id: 'hi' as Language, label: 'हिंदी (Hindi)' },
            { id: 'bn' as Language, label: 'বাংলা (Bengali)' },
          ].map((l) => (
            <button
              key={l.id}
              onClick={() => onUpdateProfile({ ...profile, language: l.id })}
              className={`py-2 px-3 rounded-2xl text-xs font-semibold border transition-all text-center ${
                profile.language === l.id
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-[#F7F7F5] text-[#1D1D1F] border-black/[0.04] hover:bg-black/5'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Age Group Card */}
      <div className="bg-white rounded-3xl p-5 border border-black/[0.06] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#1D1D1F]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">
            {isHindi ? 'आयु वर्ग' : isBengali ? 'বয়স সীমা' : 'Age Range'}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {ageRanges.map((age) => (
            <button
              key={age}
              onClick={() => onUpdateProfile({ ...profile, ageRange: age })}
              className={`py-1.5 px-3.5 rounded-full text-xs font-semibold border transition-all ${
                profile.ageRange === age
                  ? 'bg-black text-white border-black shadow-xs'
                  : 'bg-[#F7F7F5] text-[#1D1D1F] border-black/[0.04] hover:bg-black/5'
              }`}
            >
              {age}
            </button>
          ))}
        </div>
      </div>

      {/* Health Conditions Toggles */}
      <div className="bg-white rounded-3xl p-5 border border-black/[0.06] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">
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
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  active
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                    : 'bg-[#F7F7F5] border-black/[0.04] hover:bg-black/5'
                }`}
              >
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-[#1D1D1F]">{cond.title}</h4>
                  <p className="text-[11px] text-[#86868B]">{cond.desc}</p>
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
      <div className="bg-white rounded-3xl p-5 border border-black/[0.06] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F]">
            {isHindi ? 'एलर्जी सावधानियां' : isBengali ? 'অ্যালার্জি' : 'Food Allergies'}
          </h3>
        </div>
        <p className="text-[11px] text-[#86868B]">
          {isHindi ? 'पैकेट सामग्री में पाए जाने पर तत्काल चेतावनी दी जाएगी' : isBengali ? 'উপাদান তালিকায় থাকলে লাল সতর্কতা প্রদর্শন করা হবে' : 'Immediate red warning if detected in scanned ingredients'}
        </p>

        <div className="flex flex-wrap gap-2">
          {commonAllergies.map((allergy) => {
            const isSelected = profile.allergies.includes(allergy);
            return (
              <button
                key={allergy}
                onClick={() => toggleAllergy(allergy)}
                className={`py-1.5 px-3.5 rounded-full text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-xs'
                    : 'bg-[#F7F7F5] text-[#1D1D1F] border-black/[0.04] hover:bg-black/5'
                }`}
              >
                {allergy}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
