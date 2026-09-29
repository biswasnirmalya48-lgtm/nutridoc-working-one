import React, { useRef, useState } from 'react';
import { Camera, Upload, FileText, ArrowLeft, AlertCircle } from 'lucide-react';
import { ReportAnalysisResult, UserProfile } from '../../types';

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

  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isHindi = profile.language === 'hi';
  const isBengali = profile.language === 'bn';

  // Start live camera
  const startCamera = async () => {
    try {
      setErrorMessage(null);
      setMode('camera');
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
      setErrorMessage('Could not open camera. Please upload an image or PDF instead.');
      setMode('upload');
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        stopCamera();
        runServerReportAnalysis(dataUrl, 'Captured Camera Document');
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
        isPdf ? `PDF Document: ${file.name}` : 'Uploaded Image Document'
      );
    };
    reader.readAsDataURL(file);
  };

  // Call Server API for real report analysis
  const runServerReportAnalysis = async (imageBase64: string, fallbackText: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setLoadingText(
      isHindi ? 'दस्तावेज़ पढ़ा जा रहा है…' : isBengali ? 'ডকুমেন্ট পড়া হচ্ছে…' : 'Reading document'
    );

    try {
      const res = await fetch('/api/report-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageBase64 || undefined,
          text: fallbackText,
          language: profile.language,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setLoadingText('Preparing your result');
        setTimeout(() => {
          setIsProcessing(false);
          onAnalyzeComplete(data);
        }, 350);
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to read document.');
      }
    } catch (err: any) {
      console.warn('Report API error:', err);
      setIsProcessing(false);
      setErrorMessage(
        err.message || 'Could not accurately read text from the document. Please ensure the document is clear, well-lit, and in focus.'
      );
    }
  };

  return (
    <div className="space-y-6 pb-20">
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
          className="flex items-center gap-1.5 text-xs font-medium text-[#161616] hover:text-black py-1.5 px-3 rounded-full liquid-glass-capsule liquid-ripple active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isHindi ? 'वापस' : isBengali ? 'পেছনে' : 'Home'}</span>
        </button>
        <span className="text-xs font-semibold text-[#161616]">
          {isHindi ? 'रिपोर्ट व पर्चा समझें' : isBengali ? 'রিপোর্ট ও প্রেসক্রিপশন' : 'Prescription & Report'}
        </span>
        <div className="w-12" />
      </div>

      {/* Error Banner if scan failed */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-900 space-y-2 animate-fade-in">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold">Document Notice</h4>
              <p className="text-xs leading-relaxed text-rose-800">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-medium text-rose-700 underline pl-6 hover:text-rose-900"
          >
            Try Again
          </button>
        </div>
      )}

      {/* If in live camera mode */}
      {mode === 'camera' ? (
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
              Align document inside frame
            </span>
            <span className="bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-[11px] text-center border border-white/10">
              Printed lab report or doctor Rx
            </span>
          </div>

          {/* Floating Glass Camera Controls */}
          <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-6">
            <button
              onClick={() => {
                stopCamera();
                setMode('upload');
              }}
              className="px-4 py-2 rounded-full liquid-glass-control text-white text-xs font-medium active:scale-95 transition-all shadow-md"
            >
              Cancel
            </button>
            <button
              onClick={handleCaptureDoc}
              className="w-16 h-16 rounded-full border-4 border-white/80 p-1 flex items-center justify-center active:scale-95 transition-transform backdrop-blur-md shadow-lg"
            >
              <div className="w-full h-full rounded-full bg-white shadow-inner" />
            </button>
          </div>
        </div>
      ) : (
        /* Large Simple Document Upload Area */
        <div className="space-y-4">
          <div className="bg-white rounded-[24px] p-8 border border-black/[0.06] shadow-[0_2px_16px_rgba(0,0,0,0.03)] text-center space-y-6">
            <div className="w-16 h-16 rounded-[22px] bg-[#F0EFEA] text-[#161616] mx-auto flex items-center justify-center">
              <FileText className="w-8 h-8 stroke-[1.8]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-[#161616]">
                {isHindi ? 'प्रिस्क्रिप्शन या हेल्थ रिपोर्ट अपलोड करें' : isBengali ? 'প্রেসক্রিপশন বা স্বাস্থ্য রিপোর্ট আপলোড করুন' : 'Upload a prescription or health report'}
              </h2>
              <p className="text-xs text-[#737373]">
                {isHindi
                  ? 'प्रिंटेड रिपोर्ट या डॉक्टर का हस्तलिखित पर्चा'
                  : isBengali
                  ? 'ল্যাব টেস্ট বা ডাক্তারের প্রেসক্রিপশন'
                  : 'Printed lab tests or doctor’s prescription'}
              </p>
            </div>

            {/* Large Soft Glass Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <button
                onClick={startCamera}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl liquid-glass-control text-[#161616] liquid-ripple active:scale-[0.98] transition-all shadow-xs"
              >
                <Camera className="w-5 h-5 stroke-[1.8] text-[#161616]" />
                <span className="text-sm font-semibold">
                  {isHindi ? 'कैमरा से स्कैन करें' : isBengali ? 'ক্যামেরা দিয়ে স্ক্যান' : 'Use Camera'}
                </span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl liquid-glass-control text-[#161616] liquid-ripple active:scale-[0.98] transition-all shadow-xs"
              >
                <Upload className="w-5 h-5 stroke-[1.8] text-[#161616]" />
                <span className="text-sm font-semibold">
                  {isHindi ? 'गैलरी या PDF चुनें' : isBengali ? 'ছবি বা PDF আপলোড' : 'Upload File / PDF'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                ? 'कठिन मेडिकल शब्दों को आसान भाषा में तैयार किया जा रहा है…'
                : isBengali
                ? 'জটিল ডাক্তারি পরিভাষা সহজ ভাষায় অনুবাদ করা হচ্ছে…'
                : 'Translating clinical markers and instructions into plain language…'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
