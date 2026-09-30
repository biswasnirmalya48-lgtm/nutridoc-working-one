import React, { useRef, useState } from 'react';
import { Camera, Upload, FileText, ArrowLeft, AlertCircle, Edit3, Sparkles } from 'lucide-react';
import { ReportAnalysisResult, UserProfile } from '../../types';
import { MadeByFooter } from '../Common/MadeByFooter';

interface ReportScannerProps {
  onAnalyzeComplete: (result: ReportAnalysisResult) => void;
  onCancel: () => void;
  profile: UserProfile;
}

export const ReportScanner: React.FC<ReportScannerProps> = ({
  onAnalyzeComplete,
  onCancel,
  profile,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'text'>('upload');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typedText, setTypedText] = useState<string>('');

  const isHindi = profile.language === 'hi';
  const isBengali = profile.language === 'bn';

  // Start live camera
  const startCamera = async () => {
    try {
      setErrorMessage(null);
      setActiveTab('camera');
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch (e: any) {
      console.warn('Camera failed for report:', e);
      setErrorMessage(
        isHindi
          ? 'कैमरा शुरू नहीं हो सका। कृपया फोटो अपलोड करें या पर्चा टाइप करें।'
          : isBengali
          ? 'ক্যামেরা চালু করা সম্ভব হয়নি। অনুগ্রহ করে ছবি আপলোড করুন বা টেক্সট লিখুন।'
          : 'Could not open camera. Please upload an image or type the prescription.'
      );
      setActiveTab('upload');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  // Capture from live camera
  const handleCaptureDoc = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        stopCamera();
        runServerReportAnalysis(dataUrl, 'Captured Camera Prescription');
      }
    }
  };

  // Handle File / PDF upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      runServerReportAnalysis(
        isPdf ? '' : data,
        isPdf ? `PDF Document: ${file.name}` : 'Uploaded Prescription Image'
      );
    };
    reader.readAsDataURL(file);
  };

  // Handle typed text submission
  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedText.trim() || typedText.trim().length < 5) {
      setErrorMessage(
        isHindi
          ? 'कृपया पर्चे की दवाइयाँ या डॉक्टर के निर्देश दर्ज करें।'
          : isBengali
          ? 'অনুগ্রহ করে প্রেসক্রিপশনের ওষুধ বা ডাক্তারের নির্দেশাবলী লিখুন।'
          : 'Please enter the medicine names or doctor’s prescription text.'
      );
      return;
    }
    runServerReportAnalysis('', typedText.trim());
  };

  // Call Server API for real prescription & report analysis
  const runServerReportAnalysis = async (imageBase64: string, textPayload: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setLoadingText(
      isHindi
        ? 'AI पर्चे को समझ रहा है…'
        : isBengali
        ? 'AI প্রেসক্রিপশন বিশ্লেষণ করছে…'
        : 'AI is analyzing your prescription…'
    );

    try {
      const res = await fetch('/api/report-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageBase64 || undefined,
          text: textPayload,
          language: profile.language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setLoadingText(
          isHindi ? 'परिणाम तैयार किया जा रहा है…' : isBengali ? 'ফলাফল সাজানো হচ্ছে…' : 'Finalizing simple summary…'
        );
        setTimeout(() => {
          setIsProcessing(false);
          onAnalyzeComplete(data);
        }, 300);
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to read document.');
      }
    } catch (err: any) {
      console.warn('Report API error:', err);
      setIsProcessing(false);
      setErrorMessage(
        err.message ||
          (isHindi
            ? 'दस्तावेज़ को स्पष्ट रूप से पढ़ा नहीं जा सका। कृपया स्पष्ट तस्वीर लें या टेक्स्ट दर्ज करें।'
            : isBengali
            ? 'ডকুমেন্টটি স্পষ্টভাবে পড়া যায়নি। দয়া করে পরিষ্কার ছবি তুলুন বা লিখুন।'
            : 'Could not clearly read text from this document. Please ensure the prescription is well-lit and in focus.')
      );
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Floating Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-[#161616] hover:text-black py-1.5 px-3 rounded-full liquid-glass-capsule liquid-ripple active:scale-[0.98] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isHindi ? 'वापस' : isBengali ? 'পেছনে' : 'Home'}</span>
        </button>
        <span className="text-xs font-semibold text-[#161616] tracking-tight">
          {isHindi ? 'प्रिस्क्रिप्शन व रिपोर्ट समझें' : isBengali ? 'প্রেসক্রিপশন ও রিপোর্ট সরলীকরণ' : 'Prescription Simplifier'}
        </span>
        <div className="w-12" />
      </div>

      {/* Error Banner if scan failed */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-900 space-y-2 animate-fade-in">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold">Notice</h4>
              <p className="text-xs leading-relaxed text-rose-800">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-medium text-rose-700 underline pl-6 hover:text-rose-900 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Mode Switcher Pill */}
      {activeTab !== 'camera' && (
        <div className="p-1 liquid-glass-capsule rounded-full flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all text-center cursor-pointer ${
              activeTab === 'upload' ? 'bg-[#161616] text-white shadow-xs' : 'text-[#737373] hover:text-[#161616]'
            }`}
          >
            {isHindi ? 'फोटो अपलोड' : isBengali ? 'ছবি আপলোড' : 'Upload Image'}
          </button>
          <button
            type="button"
            onClick={startCamera}
            className="flex-1 py-2 text-xs font-semibold rounded-full text-[#737373] hover:text-[#161616] transition-all text-center cursor-pointer"
          >
            {isHindi ? 'कैमरा स्कैन' : isBengali ? 'ক্যামেরা স্ক্যান' : 'Camera'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all text-center cursor-pointer ${
              activeTab === 'text' ? 'bg-[#161616] text-white shadow-xs' : 'text-[#737373] hover:text-[#161616]'
            }`}
          >
            {isHindi ? 'टाइप करें' : isBengali ? 'টাইপ করুন' : 'Type / Paste'}
          </button>
        </div>
      )}

      {/* VIEW: LIVE CAMERA */}
      {activeTab === 'camera' && (
        <div className="relative rounded-[28px] overflow-hidden bg-black aspect-3/4 flex items-center justify-center border border-white/20 shadow-xl">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />

          {/* Document Framing Guide with soft glow */}
          <div className="absolute inset-8 rounded-[24px] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.52)] flex flex-col items-center justify-between p-4 pointer-events-none">
            <span className="bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-[11px] font-medium border border-white/10">
              Align prescription inside frame
            </span>
            <span className="bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-[11px] text-center border border-white/10">
              Doctor Rx, medicines & dosage
            </span>
          </div>

          {/* Floating Glass Camera Controls */}
          <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-6">
            <button
              onClick={() => {
                stopCamera();
                setActiveTab('upload');
              }}
              className="px-4 py-2 rounded-full liquid-glass-control text-white text-xs font-medium active:scale-95 transition-all shadow-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCaptureDoc}
              aria-label="Capture prescription photo"
              className="w-16 h-16 rounded-full border-4 border-white/80 p-1 flex items-center justify-center active:scale-95 transition-transform backdrop-blur-md shadow-lg cursor-pointer"
            >
              <div className="w-full h-full rounded-full bg-white shadow-inner" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW: UPLOAD FILE */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div className="bg-white rounded-[24px] p-8 border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.03)] text-center space-y-6">
            <div className="w-16 h-16 rounded-[22px] bg-[#F0EFEA] text-[#161616] mx-auto flex items-center justify-center">
              <FileText className="w-8 h-8 stroke-[1.8]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-[#161616]">
                {isHindi ? 'डॉक्टर का पर्चा या रिपोर्ट स्कैन करें' : isBengali ? 'প্রেসক্রিপশন বা রিপোর্ট স্ক্যান করুন' : 'Scan Doctor’s Prescription'}
              </h2>
              <p className="text-xs text-[#737373] max-w-xs mx-auto leading-relaxed">
                {isHindi
                  ? 'AI आपके पर्चे को पढ़ेगा और सरल भाषा में बताएगा कि आपको क्या हुआ है और कौन सी दवा कब लेनी है।'
                  : isBengali
                  ? 'AI সম্পূর্ণ প্রেসক্রিপশন পড়ে সহজ ভাষায় পয়েন্ট আকারে বুঝিয়ে দেবে আপনার কী হয়েছে এবং কোন ওষুধ কখন খেতে হবে।'
                  : 'AI will read the entire prescription and explain what happened to you and which medicines to take when in simple points.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <button
                type="button"
                onClick={startCamera}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl liquid-glass-control text-[#161616] liquid-ripple active:scale-[0.98] transition-all shadow-xs cursor-pointer"
              >
                <Camera className="w-5 h-5 stroke-[1.8] text-[#161616]" />
                <span className="text-sm font-semibold">
                  {isHindi ? 'कैमरा से स्कैन करें' : isBengali ? 'ক্যামেরা স্ক্যান' : 'Take Photo'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-[#161616] text-white liquid-ripple active:scale-[0.98] transition-all shadow-xs cursor-pointer"
              >
                <Upload className="w-5 h-5 stroke-[1.8] text-white" />
                <span className="text-sm font-semibold">
                  {isHindi ? 'गैलरी या PDF चुनें' : isBengali ? 'গ্যালারি বা PDF' : 'Upload Image / PDF'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TYPE OR PASTE TEXT */}
      {activeTab === 'text' && (
        <form onSubmit={handleTypedSubmit} className="space-y-4">
          <div className="bg-white rounded-[24px] p-6 border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.03)] space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F0EFEA] flex items-center justify-center text-[#161616]">
                <Edit3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#161616]">
                  {isHindi ? 'पर्चा या दवाइयाँ टाइप करें' : isBengali ? 'প্রেসক্রিপশন বা ওষুধ লিখুন' : 'Paste or Type Prescription'}
                </h3>
                <p className="text-[11px] text-[#737373]">
                  {isHindi
                    ? 'डॉक्टर द्वारा लिखी दवाइयाँ, खुराक या बीमारी का नाम दर्ज करें'
                    : isBengali
                    ? 'ডাক্তারের লেখা ওষুধ, ডোজ বা লক্ষণের নাম লিখুন'
                    : 'Type medicines, dosage (1-0-1), or symptoms'}
                </p>
              </div>
            </div>

            <textarea
              rows={6}
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder={
                isHindi
                  ? "उदा. Tab Azithral 500mg 1-0-0 x 3 days\nTab Paracetamol 650mg SOS after food\nSyrup Grilinctus 2 tsp BD\nडॉक्टर ने वायरल बुखार व गले में दर्द बताया है..."
                  : isBengali
                  ? "উদাঃ Tab Azithral 500mg 1-0-0 x 3 days\nTab Paracetamol 650mg SOS\nগলায় ইনফেকশন ও জ্বর হয়েছে..."
                  : "e.g.,\nTab Augmentin 625mg 1-0-1 x 5 days after food\nTab Dolo 650mg 1-0-1\nCap Pantop D 1-0-0 before breakfast\nPatient has fever, sore throat, and acidity..."
              }
              className="w-full p-3.5 rounded-2xl bg-[#F7F7F5] border border-black/[0.08] text-xs text-[#161616] placeholder:text-[#999] focus:outline-hidden focus:border-[#161616] transition-all leading-relaxed resize-none"
            />

            <button
              type="submit"
              disabled={isProcessing || !typedText.trim()}
              className="w-full py-3.5 rounded-2xl bg-[#161616] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs hover:bg-neutral-800 active:scale-[0.985] transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isHindi ? 'सरल भाषा में समझें' : isBengali ? 'সহজ ভাষায় ব্যাখ্যা দেখুন' : 'Simplify in Plain Points'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Made With ❤️ by Nirmalya ! with animated pumping heart */}
      <MadeByFooter className="pt-2 pb-6" />

      {/* Processing Calm Morphing Liquid Dot Animation Screen */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-[#FBFBFA]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 justify-center py-2">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-liquid-dot-1 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-liquid-dot-2 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-liquid-dot-3 shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-[#161616] tracking-tight">{loadingText}</h4>
            <p className="text-xs text-[#737373] max-w-xs">
              {isHindi
                ? 'AI प्रिस्क्रिप्शन की हर दवा, खुराक और बीमारी को आसान पॉइंट्स में तैयार कर रहा है…'
                : isBengali
                ? 'AI প্রেসক্রিপশনের প্রতিটি ওষুধ, নিয়ম ও শারীরিক সমস্যা সহজ পয়েন্টে সাজাচ্ছে…'
                : 'AI is translating the diagnosis, dosage, and timings into crystal-clear points…'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
