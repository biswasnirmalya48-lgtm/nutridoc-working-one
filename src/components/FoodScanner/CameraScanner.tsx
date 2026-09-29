import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw, Zap, ZapOff, Image as ImageIcon, X, AlertCircle, Search, Sparkles } from 'lucide-react';
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
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);

  // Tap-to-focus visual ring coordinates
  const [focusRing, setFocusRing] = useState<{ x: number; y: number } | null>(null);

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

  // Tap to focus effect
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusRing({ x, y });
    setTimeout(() => {
      setFocusRing(null);
    }, 750);
  };

  // Trigger tactile shutter animation
  const triggerShutterFeedback = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(18);
    }
    setShutterFlash(true);
    setIsCapturing(true);
    setTimeout(() => setShutterFlash(false), 200);
    setTimeout(() => setIsCapturing(false), 750);
  };

  // STEP 1: Front Packet Recognition Handler
  const handleCaptureFront = async (manualImage?: string, fallbackQueryText?: string) => {
    if (!manualImage && !fallbackQueryText) {
      triggerShutterFeedback();
    }

    const capturedImg = manualImage || (!fallbackQueryText ? captureFrame() : '');
    if (!capturedImg && !fallbackQueryText) {
      setScanError('Please ensure camera is active or choose an image from gallery or search by name.');
      return;
    }

    setIsProcessing(true);
    setScanError(null);
    setLoadingText(
      isHindi ? 'पैकेट स्कैन किया जा रहा है…' : isBengali ? 'পণ্য স্ক্যান করা হচ্ছে…' : 'Scanning product'
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
    if (!manualImage) {
      triggerShutterFeedback();
    }

    const capturedBackImg = manualImage || captureFrame();
    if (!capturedBackImg) {
      setScanError('Please capture the ingredient table clearly.');
      return;
    }

    setIsProcessing(true);
    setScanError(null);
    setLoadingText(
      isHindi ? 'सामग्री पढ़ी जा रही है…' : isBengali ? 'উপাদান পড়া হচ্ছে…' : 'Reading ingredients'
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

      {/* Shutter White Flash Effect */}
      {shutterFlash && (
        <div className="absolute inset-0 z-50 bg-white pointer-events-none animate-shutter-flash" />
      )}

      {/* Top Camera Controls Overlay */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-12 pb-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full liquid-glass-control text-white flex items-center justify-center active:scale-95 transition-all shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator Pill */}
        <div className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/90 text-xs font-medium tracking-wide flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {step === 1 && (isHindi ? 'स्टेप 1: फ्रंट पैकेट' : isBengali ? 'ধাপ ১: সামনের দিক' : 'Step 1: Front Packet')}
          {step === 2 && (isHindi ? 'पैकेट पलटें' : isBengali ? 'প্যাকেট ঘোরান' : 'Turn Packet')}
          {step === 3 && (isHindi ? 'स्टेप 2: न्यूट्रिशन' : isBengali ? 'ধাপ ২: পুষ্টি তালিকা' : 'Step 2: Nutrition Table')}
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearchModal(true)}
            className="w-10 h-10 rounded-full liquid-glass-control text-white flex items-center justify-center active:scale-95 transition-all shadow-md"
            title="Search by name"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTorch}
            className={`w-10 h-10 rounded-full liquid-glass-control flex items-center justify-center active:scale-95 transition-all shadow-md ${
              torchOn ? 'bg-amber-400 text-black border-amber-300' : 'text-white'
            }`}
          >
            {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
          </button>
          <button
            onClick={switchCamera}
            className="w-10 h-10 rounded-full liquid-glass-control text-white flex items-center justify-center active:scale-95 transition-all shadow-md"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        onClick={handleViewportClick}
        className="relative flex-1 flex items-center justify-center overflow-hidden cursor-pointer"
      >
        {/* Live Video Feed */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Tap-to-focus ring feedback */}
        {focusRing && (
          <div
            style={{ left: focusRing.x - 28, top: focusRing.y - 28 }}
            className="pointer-events-none absolute w-14 h-14 rounded-xl border border-amber-300/90 shadow-[0_0_12px_rgba(252,211,77,0.3)] animate-scale-in"
          >
            <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-amber-300" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-amber-300" />
            <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0.5 h-2 bg-amber-300" />
            <span className="absolute -right-1 top-1/2 -translate-y-1/2 w-0.5 h-2 bg-amber-300" />
          </div>
        )}

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
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2.5 rounded-full bg-white text-black text-xs font-semibold shadow-md active:scale-95 transition-transform"
              >
                Upload Photo
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSearchModal(true);
                }}
                className="px-4 py-2.5 rounded-full bg-white/20 text-white text-xs font-semibold shadow-md active:scale-95 transition-transform backdrop-blur-md"
              >
                Search Name
              </button>
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {scanError && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-4 inset-x-5 z-40 bg-rose-600/90 backdrop-blur-md text-white p-3.5 rounded-2xl border border-rose-400 text-xs shadow-lg flex items-start gap-2.5 animate-fade-in"
          >
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
          <div
            className={`relative w-76 h-96 rounded-[26px] border border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.52)] flex flex-col items-center justify-between p-6 pointer-events-none transition-all duration-300 ${
              isCapturing ? 'camera-capture-ripple border-emerald-400' : ''
            }`}
          >
            {/* Animated scan line when processing */}
            {isProcessing && (
              <div className="absolute inset-x-4 h-0.5 camera-scan-line bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10B981]" />
            )}

            <div className="w-full flex justify-center">
              <span className="bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-xs font-normal border border-white/10 flex items-center gap-1.5">
                {detectedBarcode ? (
                  <>
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Barcode: {detectedBarcode}</span>
                  </>
                ) : (
                  <span>Point at the front of a food packet</span>
                )}
              </span>
            </div>

            <div className="text-center">
              <p className="text-white/80 text-xs font-normal">
                {isHindi
                  ? 'पैकेट का अगला भाग दिखाएं और शटर दबाएं'
                  : isBengali
                  ? 'প্যাকেটের সামনের দিক তাক করে শাটার চাপুন'
                  : 'Center packet in frame & tap shutter'}
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: "Turn the packet around" Simple Prompt Modal */}
        {step === 2 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative z-30 max-w-xs mx-6 bg-white rounded-[24px] p-6 text-center text-[#161616] shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-black/[0.08] animate-fade-in space-y-4"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F0EFEA] text-[#161616] flex items-center justify-center">
              <RefreshCw className="w-5 h-5 stroke-[2]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-semibold tracking-tight text-[#161616]">
                {isHindi ? 'पैकेट को पलटें' : isBengali ? 'প্যাকেটটি উল্টো করুন' : 'Turn the packet around.'}
              </h3>
              <p className="text-xs text-[#737373]">
                {isHindi
                  ? 'सामग्री और पोषण तालिका को स्कैन करें'
                  : isBengali
                  ? 'উপাদান ও পুষ্টি তালিকা স্ক্যান করুন'
                  : 'Scan the ingredients.'}
              </p>
            </div>

            {/* Recognized Product Snippet */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F7F7F5] border border-black/[0.04] text-left text-xs">
              {frontImage && (
                <img
                  src={frontImage}
                  alt="Front preview"
                  className="w-10 h-10 rounded-lg object-cover bg-black/5 shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="font-medium text-xs text-[#161616] truncate">{productMetadata.name}</p>
                <p className="text-[10px] text-[#737373]">{productMetadata.category}</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => setStep(3)}
                className="w-full py-3 rounded-full bg-[#161616] text-white text-xs font-semibold active:scale-[0.98] transition-transform"
              >
                {isHindi ? 'सामग्री स्कैन करें' : isBengali ? 'উপাদান স্ক্যান করুন' : 'Scan the ingredients'}
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
                className="w-full py-2.5 text-xs text-[#737373] hover:text-[#161616] active:scale-[0.98] transition-colors"
              >
                {isHindi ? 'अनुमानित पोषण के साथ आगे बढ़ें' : isBengali ? 'অনুমিত পুষ্টি নিয়ে চলুন' : 'Continue with recognized values'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Back / Nutrition Facts Clean Scanning Reticle */}
        {step === 3 && (
          <div
            className={`relative w-76 h-80 rounded-[26px] border border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.52)] flex flex-col items-center justify-between p-6 pointer-events-none transition-all duration-300 ${
              isCapturing ? 'camera-capture-ripple border-emerald-400' : ''
            }`}
          >
            {/* Animated scan line */}
            {isProcessing && (
              <div className="absolute inset-x-4 h-0.5 camera-scan-line bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10B981]" />
            )}

            <div className="w-full flex justify-center">
              <span className="bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-xs font-normal border border-white/10">
                Turn the packet around. Scan the ingredients.
              </span>
            </div>

            <div className="text-center">
              <p className="text-white/80 text-xs font-normal">
                {isHindi
                  ? 'सामग्री और पोषण तालिका फ्रेम में रखें और शटर दबाएं'
                  : isBengali
                  ? 'উপাদান ও পুষ্টি তালিকা ফ্রেমের মাঝে রাখুন ও শাটার চাপুন'
                  : 'Align nutrition table & tap shutter'}
              </p>
            </div>
          </div>
        )}

        {/* Processing Calm Morphing Liquid Dot Animation Overlay */}
        {isProcessing && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in"
          >
            <div className="flex items-center gap-2 justify-center py-2">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-liquid-dot-1 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-liquid-dot-2 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-liquid-dot-3 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
            </div>
            <div className="space-y-1">
              <p className="text-white text-base font-semibold tracking-tight">{loadingText}</p>
              <p className="text-white/60 text-xs">
                {loadingText === 'Scanning product'
                  ? 'Identifying packaging and brand…'
                  : loadingText === 'Reading ingredients'
                  ? 'Extracting nutrition values…'
                  : 'Preparing your result'}
              </p>
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

      {/* Bottom Shutter & Controls Tray with Floating Glass Controls */}
      {step !== 2 && (
        <div className="relative z-20 px-8 pt-4 pb-9 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between">
          {/* Gallery Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-full liquid-glass-control text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
            title="Upload photo from gallery"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Apple Floating Glass Shutter Button */}
          <button
            onClick={() => {
              if (step === 1) handleCaptureFront();
              if (step === 3) handleCaptureBack();
            }}
            disabled={isProcessing}
            aria-label="Capture photo"
            className="group relative w-19 h-19 rounded-full border-4 border-white/80 p-1 flex items-center justify-center active:scale-90 transition-transform backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
          >
            <div className="w-full h-full rounded-full bg-white transition-all group-hover:scale-95 group-active:scale-90 shadow-inner" />
          </button>

          {/* Camera Switch Button */}
          <button
            onClick={switchCamera}
            className="w-12 h-12 rounded-full liquid-glass-control text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
            title="Switch camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
