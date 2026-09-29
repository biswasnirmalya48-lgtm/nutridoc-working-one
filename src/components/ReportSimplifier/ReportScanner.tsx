import React, { useRef, useState } from 'react';
import { Camera, Upload, FileText, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
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
      isHindi ? 'आपकी रिपोर्ट पढ़ी जा रही है…' : isBengali ? 'আপনার রিপোর্টটি পড়া হচ্ছে…' : 'Reading your report…'
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
        setIsProcessing(false);
        onAnalyzeComplete(data);
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
    <div className="space-y-6 pb-20 animate-fade-in">
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] hover:text-black py-1.5 px-3 rounded-full bg-white border border-black/[0.06] shadow-2xs active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isHindi ? 'वापस' : isBengali ? 'পেছনে' : 'Home'}</span>
        </button>
        <span className="text-xs font-bold text-[#1D1D1F]">
          {isHindi ? 'रिपोर्ट व पर्चा समझें' : isBengali ? 'রিপোর্ট ও প্রেসক্রিপশন' : 'Prescription & Report'}
        </span>
        <div className="w-12" />
      </div>

      {/* Error Banner if scan failed */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2 animate-fade-in">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold">Document Error</h4>
              <p className="text-xs leading-relaxed text-rose-800">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold text-rose-700 underline pl-6 hover:text-rose-900"
          >
            Try Again
          </button>
        </div>
      )}

      {/* If in live camera mode */}
      {mode === 'camera' ? (
        <div className="relative rounded-3xl overflow-hidden bg-black aspect-3/4 flex items-center justify-center border border-black/10 shadow-lg">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />

          {/* Document Framing Guide */}
          <div className="absolute inset-8 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex flex-col items-center justify-between p-4 pointer-events-none">
            <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-medium">
              Align document inside frame
            </span>
            <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] text-center">
              Printed lab report or Doctor Rx
            </span>
          </div>

          {/* Shutter button */}
          <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-6">
            <button
              onClick={() => {
                stopCamera();
                setMode('upload');
              }}
              className="px-4 py-2 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-md"
            >
              Cancel
            </button>
            <button
              onClick={handleCaptureDoc}
              className="w-16 h-16 rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-95 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-white" />
            </button>
          </div>
        </div>
      ) : (
        /* Upload & Action Choices Card */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-black/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-[#1D1D1F]">
                {isHindi ? 'दस्तावेज़ जोड़ें' : isBengali ? 'ডকুমেন্ট যুক্ত করুন' : 'Scan or Upload Document'}
              </h3>
              <p className="text-xs text-[#86868B] max-w-xs mx-auto leading-relaxed">
                {isHindi
                  ? 'फोटो खींचें, फोटो गैलरी से चुनें, या PDF अपलोड करें। हस्तलिखित पर्चे या प्रिंटेड लैब रिपोर्ट दोनों समर्थित हैं।'
                  : isBengali
                  ? 'ছবি তুলুন, গ্যালারি থেকে নির্বাচন করুন বা PDF আপলোড করুন। ল্যাব টেস্ট ও হাতের লেখা প্রেসক্রিপশন উভয়ই সমর্থিত।'
                  : 'Take a photo, upload an image or PDF. Reads printed lab tests and handwritten prescriptions with high accuracy.'}
              </p>
            </div>

            {/* Two Primary Input Options */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={startCamera}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#F7F7F5] border border-black/[0.04] hover:bg-black/5 active:scale-95 transition-all text-center"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-2xs">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#1D1D1F]">
                  {isHindi ? 'कैमरा से फोटो' : isBengali ? 'ক্যামেরা ফটো' : 'Take Photo'}
                </span>
                <span className="text-[10px] text-[#86868B]">Live document frame</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#F7F7F5] border border-black/[0.04] hover:bg-black/5 active:scale-95 transition-all text-center"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-2xs">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#1D1D1F]">
                  {isHindi ? 'गैलरी या PDF' : isBengali ? 'গ্যালারি বা PDF' : 'Upload Image / PDF'}
                </span>
                <span className="text-[10px] text-[#86868B]">PNG, JPG, PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Screen State */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-[#F7F7F5]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in">
          <div className="w-12 h-12 rounded-full border-3 border-black/10 border-t-blue-600 animate-spin" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-[#1D1D1F]">{loadingText}</h4>
            <p className="text-xs text-[#86868B] max-w-xs">
              {isHindi
                ? 'कठिन मेडिकल शब्दों को आसान भाषा में तैयार किया जा रहा है...'
                : isBengali
                ? 'জটিল ডাক্তারি পরিভাষা সহজ ভাষায় অনুবাদ করা হচ্ছে...'
                : 'Translating clinical markers and instructions into simple language...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
