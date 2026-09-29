import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, Zap, ZapOff, Image as ImageIcon, Check, X, AlertCircle, Search } from 'lucide-react';
import { NutritionData, UserProfile } from '../../types';

interface CameraScannerProps {
  onCaptureComplete: (data: {
    productName: string;
    brand: string;
    category: string;
    barcode?: string;
    frontImageUrl: string;
    nutrition: NutritionData;
  }) => void;
  onCancel: () => void;
  profile: UserProfile;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onCaptureComplete,
  onCancel,
  profile,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 1: Front Packet Recognition, Step 2: "Turn the packet around" Guide, Step 3: Back/Ingredient Table
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState<number | null>(null);

  // Manual Name Search Drawer
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Stored Step 1 data
  const [frontImage, setFrontImage] = useState<string>('');
  const [productMetadata, setProductMetadata] = useState<{
    name: string;
    brand: string;
    category: string;
    barcode?: string;
    nutrition?: NutritionData;
  }>({
    name: '',
    brand: '',
    category: '',
  });

  const isHindi = profile.language === 'hi';
  const isBengali = profile.language === 'bn';

  // Auto-capture countdown for steady hands
  useEffect(() => {
    let timer: any = null;
    let count = 3;

    if ((step === 1 || step === 3) && stream && !isProcessing && !cameraError && !scanError && !showSearchModal) {
      setAutoCaptureCountdown(3);
      timer = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setAutoCaptureCountdown(count);
        } else {
          clearInterval(timer);
          setAutoCaptureCountdown(null);
          // Trigger automatic capture
          if (step === 1) {
            handleCaptureFront();
          } else if (step === 3) {
            handleCaptureBack();
          }
        }
      }, 1000);
    } else {
      setAutoCaptureCountdown(null);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, stream, isProcessing, cameraError, scanError, showSearchModal]);

  // Initialize camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function initCamera() {
      try {
        setCameraError(null);
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = newStream;
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.play().catch((err) => console.log('Video play error:', err));
        }
      } catch (err: any) {
        console.warn('Camera access denied or unavailable:', err);
        setCameraError(err.message || 'Camera unavailable. Please upload a packet photo from your gallery or search by name.');
      }
    }

    if (step === 1 || step === 3) {
      initCamera();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, step]);

  // Real-time Barcode Detection using Native BarcodeDetector API if supported
  useEffect(() => {
    let barcodeInterval: any = null;
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

    if (hasBarcodeDetector && (step === 1 || step === 3) && stream) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128'],
        });

        barcodeInterval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4 && !isProcessing) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                if (code && code !== detectedBarcode) {
                  setDetectedBarcode(code);
                }
              }
            } catch (e) {
              // Ignore frame detection glitch
            }
          }
        }, 800);
      } catch (e) {
        console.log('BarcodeDetector init error:', e);
      }
    }

    return () => {
      if (barcodeInterval) clearInterval(barcodeInterval);
    };
  }, [step, stream, isProcessing, detectedBarcode]);

  // Torch toggle
  const toggleTorch = async () => {
    if (!stream) return;
    try {
      const track = stream.getVideoTracks()[0];
      const capabilities: any = track.getCapabilities?.();
      if (capabilities?.torch) {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } else {
        setTorchOn(!torchOn);
      }
    } catch (e) {
      console.log('Torch error:', e);
    }
  };

  // Switch camera front/back
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture current video frame
  const captureFrame = (): string => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    }
    return '';
  };

  // STEP 1: Front Packet Recognition Handler
  const handleCaptureFront = async (manualImage?: string, fallbackQueryText?: string) => {
    const capturedImg = manualImage || (!fallbackQueryText ? captureFrame() : '');
    if (!capturedImg && !fallbackQueryText) {
      setScanError('Please ensure the camera is active, choose an image from your gallery, or search by name.');
      return;
    }

    setIsProcessing(true);
    setScanError(null);
    setLoadingText(
      isHindi ? 'पैकेट पहचाना जा रहा है…' : isBengali ? 'পণ্য শনাক্ত করা হচ্ছে…' : 'Recognising product…'
    );

    if (capturedImg) {
      setFrontImage(capturedImg);
    }

    try {
      const res = await fetch('/api/recognize-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedImg || undefined,
          barcode: detectedBarcode || undefined,
          fallbackQuery: fallbackQueryText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error);
        }

        if (data.verifiedDatabaseImageUrl) {
          setFrontImage(data.verifiedDatabaseImageUrl);
        } else if (data.imageUrl && !capturedImg) {
          setFrontImage(data.imageUrl);
        }

        setProductMetadata({
          name: data.productName || 'Recognized Product',
          brand: data.brand || '',
          category: data.category || 'Packaged Food',
          barcode: data.barcode || detectedBarcode || '',
          nutrition: data.nutrition,
        });

        setIsProcessing(false);
        setShowSearchModal(false);
        setStep(2); // Move to Step 2 guide
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Could not recognize the food packet.');
      }
    } catch (e: any) {
      console.warn('Recognition failed:', e);
      setIsProcessing(false);
      setScanError(
        e.message || 'Could not recognize product. You can search by name or upload a clear photo.'
      );
    }
  };

  // STEP 3: Back / Nutrition Label Capture Handler
  const handleCaptureBack = async (manualImage?: string) => {
    const capturedBackImg = manualImage || captureFrame();
    if (!capturedBackImg) {
      setScanError('Please capture the ingredient table clearly.');
      return;
    }

    setIsProcessing(true);
    setScanError(null);
    setLoadingText(
      isHindi ? 'पोषण तालिका पढ़ी जा रही है…' : isBengali ? 'পুষ্টি तालिका পড়া হচ্ছে…' : 'Reading nutrition label…'
    );

    try {
      const res = await fetch('/api/ocr-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: capturedBackImg,
          mode: 'nutrition-label',
        }),
      });

      let finalNutrition: NutritionData = productMetadata.nutrition || {
        servingSize: '100g',
        calories: 0,
        sugar: 0,
        sodium: 0,
        totalFat: 0,
        saturatedFat: 0,
        transFat: 0,
        protein: 0,
        fibre: 0,
        ingredients: [],
        allergens: [],
        additives: [],
      };

      if (res.ok) {
        const ocrData = await res.json();
        if (ocrData.calories || ocrData.sodium || ocrData.sugar || ocrData.ingredients) {
          finalNutrition = {
            servingSize: ocrData.servingSize || finalNutrition.servingSize || '100g',
            calories: Number(ocrData.calories) || finalNutrition.calories || 0,
            sugar: Number(ocrData.sugar) || finalNutrition.sugar || 0,
            sodium: Number(ocrData.sodium) || finalNutrition.sodium || 0,
            totalFat: Number(ocrData.totalFat) || finalNutrition.totalFat || 0,
            saturatedFat: Number(ocrData.saturatedFat) || finalNutrition.saturatedFat || 0,
            transFat: Number(ocrData.transFat) || finalNutrition.transFat || 0,
            protein: Number(ocrData.protein) || finalNutrition.protein || 0,
            fibre: Number(ocrData.fibre) || finalNutrition.fibre || 0,
            ingredients: Array.isArray(ocrData.ingredients) && ocrData.ingredients.length > 0
              ? ocrData.ingredients
              : finalNutrition.ingredients || [],
            allergens: Array.isArray(ocrData.allergens)
              ? ocrData.allergens
              : finalNutrition.allergens || [],
            additives: Array.isArray(ocrData.additives)
              ? ocrData.additives
              : finalNutrition.additives || [],
          };
        }
      }

      setIsProcessing(false);
      onCaptureComplete({
        productName: productMetadata.name || 'Packaged Food Product',
        brand: productMetadata.brand || '',
        category: productMetadata.category || 'Packaged Snack',
        barcode: productMetadata.barcode,
        frontImageUrl: frontImage,
        nutrition: finalNutrition,
      });
    } catch (e: any) {
      console.warn('OCR label read warning, moving to manual edit:', e);
      setIsProcessing(false);
      onCaptureComplete({
        productName: productMetadata.name || 'Packaged Food Product',
        brand: productMetadata.brand || '',
        category: productMetadata.category || 'Packaged Snack',
        barcode: productMetadata.barcode,
        frontImageUrl: frontImage,
        nutrition: productMetadata.nutrition || {
          servingSize: '100g',
          calories: 0,
          sugar: 0,
          sodium: 0,
          totalFat: 0,
          saturatedFat: 0,
          transFat: 0,
          protein: 0,
          fibre: 0,
          ingredients: [],
          allergens: [],
          additives: [],
        },
      });
    }
  };

  // Gallery File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (step === 1) {
        handleCaptureFront(base64);
      } else if (step === 3) {
        handleCaptureBack(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Manual Name Search Handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    handleCaptureFront(undefined, searchQuery.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none animate-fade-in">
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Camera Controls Overlay */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-12 pb-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/25 active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/90 text-xs font-semibold tracking-wide flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {step === 1 && (isHindi ? 'स्टेप 1: फ्रंट पैकेट पहचान' : isBengali ? 'ধাপ ১: সামনের দিক' : 'Step 1: Front Packet')}
          {step === 2 && (isHindi ? 'गाइड: पैकेट पलटें' : isBengali ? 'গাইড: প্যাकेट ঘোরান' : 'Turn Packet')}
          {step === 3 && (isHindi ? 'स्टेप 2: न्यूट्रिशन टेबल' : isBengali ? 'ধাপ ২: উপাদান তালিকা' : 'Step 2: Nutrition Table')}
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearchModal(true)}
            className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/25 active:scale-95 transition-all"
            title="Search by name"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTorch}
            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center active:scale-95 transition-all ${
              torchOn ? 'bg-amber-400 text-black' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
          </button>
          <button
            onClick={switchCamera}
            className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/25 active:scale-95 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Live Video Feed */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Fallback pattern if camera has error or permission denied */}
        {cameraError && (
          <div className="absolute inset-0 bg-[#161617] flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white/70">
              <ImageIcon className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold">Camera Access</h4>
              <p className="text-xs text-white/60 max-w-xs">{cameraError}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-full bg-white text-black text-xs font-semibold shadow-md active:scale-95 transition-transform"
              >
                Upload Photo
              </button>
              <button
                onClick={() => setShowSearchModal(true)}
                className="px-4 py-2.5 rounded-full bg-white/20 text-white text-xs font-semibold shadow-md active:scale-95 transition-transform backdrop-blur-md"
              >
                Search Name
              </button>
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {scanError && (
          <div className="absolute top-4 inset-x-5 z-40 bg-rose-600/90 backdrop-blur-md text-white p-3.5 rounded-2xl border border-rose-400 text-xs shadow-lg flex items-start gap-2.5 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
            <div className="flex-1 space-y-1.5">
              <p className="font-semibold">{scanError}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="underline text-[11px] font-bold text-white hover:text-white/80"
                >
                  Search by Product Name →
                </button>
                <button
                  onClick={() => setScanError(null)}
                  className="text-[11px] text-white/80 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Front Packet Scanning Reticle */}
        {step === 1 && (
          <div className="relative w-76 h-92 rounded-3xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] flex flex-col items-center justify-between p-6 pointer-events-none transition-all">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-white rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-white rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-white rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-white rounded-br-xl" />

            <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34D399] animate-[bounce_2.5s_infinite]" />

            <div className="w-full flex justify-center">
              <span className={`backdrop-blur-md px-3.5 py-1 rounded-full text-white text-[11px] font-semibold tracking-wide border transition-all ${
                autoCaptureCountdown !== null
                  ? 'bg-emerald-600/90 border-emerald-400 text-white shadow-lg animate-pulse'
                  : 'bg-black/70 border-white/10'
              }`}>
                {autoCaptureCountdown !== null
                  ? `Hold steady • Auto-capturing in ${autoCaptureCountdown}s`
                  : detectedBarcode
                  ? `Barcode: ${detectedBarcode}`
                  : 'Position Item or Packet Inside Frame'}
              </span>
            </div>

            <div className="text-center bg-black/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15">
              <p className="text-white text-xs font-medium">
                {isHindi
                  ? 'खाद्य पैकेट या फल/स्नैक पर पॉइंट करें • अपने आप कैप्चर होगा'
                  : isBengali
                  ? 'খাদ্য প্যাকেট বা ফলে ফোকাস করুন • নিজে থেকেই ক্যাপচার হবে'
                  : 'Point at food packet, snack, or fruit • Auto-captures'}
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: "Turn the packet around" Guide Modal */}
        {step === 2 && (
          <div className="relative z-30 max-w-sm mx-5 bg-[#F7F7F5] rounded-3xl p-6 text-center text-[#1D1D1F] shadow-2xl border border-black/10 animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black text-white flex items-center justify-center shadow-md animate-pulse">
              <RefreshCw className="w-8 h-8 text-emerald-400 stroke-[2]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-100 mb-2">
              <Check className="w-3.5 h-3.5" />
              <span>Product Recognized</span>
            </div>

            <h3 className="text-xl font-bold tracking-tight text-[#1D1D1F]">
              {isHindi ? 'पैकेट को पलटें' : isBengali ? 'প্যাকেটটি উল্টো করুন' : 'Turn the packet around'}
            </h3>

            <p className="text-sm text-[#86868B] mt-1.5 leading-relaxed">
              {isHindi
                ? 'हमें पोषण तालिका व सामग्री सूची (Nutrition Table & Ingredients) की आवश्यकता है।'
                : isBengali
                ? 'আমাদের উপাদানের তালিকা ও পুষ্টি মান দেখতে হবে।'
                : 'We need the ingredient table.'}
            </p>

            {/* Recognized Product Badge */}
            <div className="mt-4 flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-black/5 text-xs text-[#1D1D1F]">
              {frontImage && (
                <img
                  src={frontImage}
                  alt="Front preview"
                  className="w-11 h-11 rounded-xl object-cover bg-black/5 shrink-0"
                />
              )}
              <div className="text-left min-w-0">
                {productMetadata.brand && (
                  <p className="text-[10px] uppercase font-bold text-[#86868B] leading-none">
                    {productMetadata.brand}
                  </p>
                )}
                <p className="font-bold text-xs truncate mt-0.5">{productMetadata.name}</p>
                <p className="text-[10px] text-emerald-700 font-medium">{productMetadata.category}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={() => setStep(3)}
                className="w-full py-3.5 rounded-full bg-black text-white text-xs font-semibold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <span>{isHindi ? 'इंग्रीडिएंट्स टेबल स्कैन करें (स्टेप 2)' : isBengali ? 'উপাদান স্ক্যান করুন (ধাপ ২)' : 'Scan Ingredient Table (Step 2)'}</span>
                <span>→</span>
              </button>

              <button
                onClick={() => {
                  onCaptureComplete({
                    productName: productMetadata.name || 'Packaged Food Product',
                    brand: productMetadata.brand || '',
                    category: productMetadata.category || 'Packaged Snack',
                    barcode: productMetadata.barcode,
                    frontImageUrl: frontImage,
                    nutrition: productMetadata.nutrition || {
                      servingSize: '100g',
                      calories: 350,
                      sugar: 5,
                      sodium: 300,
                      totalFat: 12,
                      saturatedFat: 4,
                      transFat: 0,
                      protein: 5,
                      fibre: 2,
                      ingredients: [],
                      allergens: [],
                      additives: [],
                    },
                  });
                }}
                className="w-full py-3 rounded-full bg-white text-[#1D1D1F] border border-black/10 text-xs font-medium hover:bg-black/5 active:scale-95 transition-transform"
              >
                {isHindi ? 'पहचाने गए पोषण के साथ आगे बढ़ें' : isBengali ? 'অনুমিত পুষ্টি মান নিয়ে এগিয়ে চলুন' : 'Continue with Recognized Nutrition →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Back / Nutrition Facts Scanning Reticle */}
        {step === 3 && (
          <div className="relative w-80 h-76 rounded-3xl border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] flex flex-col items-center justify-between p-6 pointer-events-none transition-all">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-xl" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-xl" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-xl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-xl" />

            <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_12px_#10B981] animate-[bounce_2s_infinite]" />

            <div className="w-full flex justify-center">
              <span className={`backdrop-blur-md px-3.5 py-1 rounded-full text-white text-[11px] font-semibold border transition-all ${
                autoCaptureCountdown !== null
                  ? 'bg-emerald-600/90 border-emerald-400 animate-pulse text-white shadow-lg'
                  : 'bg-emerald-950/80 border-emerald-500/20 text-emerald-300'
              }`}>
                {autoCaptureCountdown !== null
                  ? `Hold steady • Reading label in ${autoCaptureCountdown}s`
                  : 'Ingredients & Nutrition Facts'}
              </span>
            </div>

            <div className="text-center bg-black/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15">
              <p className="text-white text-xs font-medium">
                {isHindi
                  ? 'सामग्री और पोषण तालिका को फ्रेम में रखें'
                  : isBengali
                  ? 'উপাদান ও পুষ্টি তালিকা ফ্রেমের মাঝে রাখুন'
                  : 'Hold steady over nutrition & ingredients table'}
              </p>
            </div>
          </div>
        )}

        {/* Processing Spinner Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-white/20 border-t-emerald-400 animate-spin" />
            <div className="space-y-1">
              <p className="text-white text-sm font-semibold tracking-wide">{loadingText}</p>
              <p className="text-white/60 text-xs">Extracting precise values...</p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F7F7F5] w-full max-w-sm rounded-3xl p-6 space-y-4 border border-black/10 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1D1D1F]">
                Search Any Food Item
              </h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#86868B]">
              Enter brand or product name (e.g. Lay's, Maggi, Oreo, Doritos, Kurkure, Tropicana, Milk):
            </p>

            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Product name or brand..."
                className="w-full px-4 py-3 rounded-2xl bg-white border border-black/10 text-sm font-medium text-[#1D1D1F] focus:outline-none focus:border-black"
              />
              <button
                type="submit"
                disabled={!searchQuery.trim()}
                className="w-full py-3.5 rounded-full bg-black text-white text-xs font-semibold shadow-md active:scale-95 transition-transform disabled:opacity-50"
              >
                Find & Analyze Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Shutter & Controls Tray */}
      {step !== 2 && (
        <div className="relative z-20 px-8 pt-3 pb-8 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-between">
          {/* Gallery Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/25 active:scale-95 transition-all"
            title="Upload photo from gallery"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Apple Shutter Button */}
          <button
            onClick={() => {
              if (step === 1) handleCaptureFront();
              if (step === 3) handleCaptureBack();
            }}
            disabled={isProcessing}
            className="group relative w-19 h-19 rounded-full border-4 border-white/90 p-1 flex items-center justify-center active:scale-95 transition-transform"
          >
            <div className="w-full h-full rounded-full bg-white transition-all group-hover:scale-95 group-active:scale-90" />
          </button>

          {/* Camera Switch Button */}
          <button
            onClick={switchCamera}
            className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/25 active:scale-95 transition-all"
            title="Switch camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
