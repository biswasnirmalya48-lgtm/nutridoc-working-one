import React, { useRef, useState, useEffect } from 'react';
import {
  RefreshCw,
  Zap,
  ZapOff,
  Image as ImageIcon,
  X,
  AlertCircle,
  Search,
  Sparkles,
  Barcode,
  CheckCircle2,
  ArrowRight,
  SkipForward,
} from 'lucide-react';
import { NutritionData, UserProfile } from '../../types';
import { soundHaptics } from '../../utils/soundHaptics';
import { MadeByFooter } from '../Common/MadeByFooter';

interface CameraScannerProps {
  onCaptureComplete: (data: {
    productName: string;
    brand: string;
    category: string;
    barcode?: string;
    frontImageUrl: string;
    referenceImages?: string[];
    isVerifiedDatabase?: boolean;
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

  // Step 1: Front Packet, Step 2: Barcode Live Scanner, Step 3: Back Nutrition Label (Optional)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);
  const [barcodeScanSuccess, setBarcodeScanSuccess] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);

  // Tap-to-focus visual ring coordinates
  const [focusRing, setFocusRing] = useState<{ x: number; y: number } | null>(null);

  // Manual Name Search Drawer
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Manual Barcode Input Modal
  const [showBarcodeManualModal, setShowBarcodeManualModal] = useState<boolean>(false);
  const [manualBarcodeInput, setManualBarcodeInput] = useState<string>('');

  // Stored Step 1 data
  const [frontImage, setFrontImage] = useState<string>('');
  const [productMetadata, setProductMetadata] = useState<{
    name: string;
    brand: string;
    category: string;
    barcode?: string;
    nutrition?: NutritionData;
    referenceImages?: string[];
    isVerifiedDatabase?: boolean;
  }>({
    name: '',
    brand: '',
    category: '',
  });

  const isHindi = profile.language === 'hi';
  const isBengali = profile.language === 'bn';

  // Tactile Vibration Helper (Physical Motion Haptics)
  const triggerHaptic = (pattern: number | number[] = 25) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  };

  // Audio chirp feedback for barcode scan
  const playBarcodeChirp = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12); // E6
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
      triggerHaptic([30, 40, 60]);
    } catch {}
  };

  // Initialize camera for all steps with resilient fallbacks
  const initCamera = async () => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser or iframe environment. Please upload a packet photo from your gallery.');
      }

      let newStream: MediaStream | null = null;
      try {
        // Attempt 1: Facing mode with ideal HD resolution
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr) {
        try {
          // Attempt 2: Facing mode without resolution requirement
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false,
          });
        } catch (secondErr) {
          // Attempt 3: Any available video stream
          newStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!newStream) {
        throw new Error('No camera stream could be acquired.');
      }

      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play().catch((err) => console.log('Video play error:', err));
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera permissions in your browser or upload a photo from your device.'
          : err.message || 'Camera is currently unavailable. Please upload a photo from your gallery or search by name.'
      );
    }
  };

  useEffect(() => {
    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode]);

  // Handle barcode found (live or manual)
  const handleBarcodeLookup = async (codeToLookup: string) => {
    const clean = codeToLookup.replace(/\D/g, '').trim();
    if (!clean || clean.length < 5) {
      setScanError('Please enter a valid barcode (at least 6 digits).');
      return;
    }

    playBarcodeChirp();
    setBarcodeScanSuccess(true);
    setDetectedBarcode(clean);
    setIsProcessing(true);
    setShowBarcodeManualModal(false);
    setLoadingText(
      isHindi
        ? `बारकोड ${clean} की आधिकारिक पुष्टि…`
        : isBengali
        ? `বারকোড ${clean} যাচাই করা হচ্ছে…`
        : `Verifying Barcode ${clean} in official database…`
    );

    try {
      const res = await fetch('/api/barcode-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: clean }),
      });

      if (res.ok) {
        const data = await res.json();
        setProductMetadata((prev) => ({
          ...prev,
          name: data.productName || prev.name || 'Packaged Product',
          brand: data.brand || prev.brand || '',
          category: data.category || prev.category || 'Packaged Food',
          barcode: clean,
          nutrition: data.nutrition,
          referenceImages: data.googleImages?.length > 0 ? data.googleImages : prev.referenceImages,
          isVerifiedDatabase: true,
        }));
        if (data.imageUrl && !frontImage) {
          setFrontImage(data.imageUrl);
        }
        setIsProcessing(false);
        setTimeout(() => {
          setStep(3); // Move to Step 3 (Back label is optional)
        }, 500);
      } else {
        // Not in database, keep barcode and proceed to Step 3
        setProductMetadata((prev) => ({
          ...prev,
          barcode: clean,
        }));
        setIsProcessing(false);
        setTimeout(() => {
          setStep(3);
        }, 400);
      }
    } catch (e) {
      setProductMetadata((prev) => ({
        ...prev,
        barcode: clean,
      }));
      setIsProcessing(false);
      setStep(3);
    }
  };

  // Real-time Barcode Detection in Step 2 using Native BarcodeDetector API
  useEffect(() => {
    let barcodeInterval: any = null;
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

    if (step === 2 && stream && !barcodeScanSuccess) {
      if (hasBarcodeDetector) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39', 'itf'],
          });

          barcodeInterval = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4 && !isProcessing && !barcodeScanSuccess) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const raw = barcodes[0].rawValue;
                  if (raw && raw.length >= 6) {
                    // Tactile physical lock vibration on real-time barcode/object detection
                    triggerHaptic([35, 45, 55]);
                    handleBarcodeLookup(raw);
                  }
                }
              } catch (e) {
                // Ignore transient frame glitch
              }
            }
          }, 250);
        } catch (e) {
          console.log('BarcodeDetector error:', e);
        }
      }
    }

    return () => {
      if (barcodeInterval) clearInterval(barcodeInterval);
    };
  }, [step, stream, isProcessing, barcodeScanSuccess]);

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
    // Light physical autofocus tap
    triggerHaptic(18);
    setTimeout(() => {
      setFocusRing(null);
    }, 750);
  };

  // Trigger tactile shutter animation with mechanical recoil vibration and shutter sound
  const triggerShutterFeedback = () => {
    setIsCapturing(true);
    setShutterFlash(true);
    // Tactile physical shutter capture recoil and acoustic snap
    soundHaptics.playShutter();
    triggerHaptic([45, 25, 70]);
    setTimeout(() => setShutterFlash(false), 200);
    setTimeout(() => setIsCapturing(false), 600);
  };

  // STEP 1: Front Packet Capture Handler
  const handleCaptureFront = async (manualImage?: string, fallbackQueryText?: string) => {
    let capturedImg = manualImage;
    if (!capturedImg && !fallbackQueryText) {
      triggerShutterFeedback();
      capturedImg = captureFrame();
      if (!capturedImg) {
        setScanError('Unable to access camera frame. Please try again or search by name.');
        return;
      }
    }

    setIsProcessing(true);
    setScanError(null);
    setLoadingText(
      isHindi ? 'पैकेट या न्यूट्रिशन लेबल स्कैन हो रहा है…' : isBengali ? 'প্যাকেট বা পুষ্টি লেবেল স্ক্যান করা হচ্ছে…' : 'Scanning packet or nutrition label…'
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
        if (data.isFood === false || data.error) {
          throw new Error(data.error || 'Please hold up a food packet or nutrition facts label to scan.');
        }

        const validWebImages = Array.isArray(data.googleImages) ? data.googleImages : [];

        if (!capturedImg) {
          if (data.verifiedDatabaseImageUrl) {
            setFrontImage(data.verifiedDatabaseImageUrl);
          } else if (data.imageUrl) {
            setFrontImage(data.imageUrl);
          }
        }

        // Tactile double-pulse motion confirming successful object detection
        triggerHaptic([40, 50, 45]);

        setProductMetadata({
          name: data.productName || 'Recognized Product',
          brand: data.brand || '',
          category: data.category || 'Packaged Food',
          barcode: data.barcode || detectedBarcode || '',
          nutrition: data.nutrition,
          referenceImages: validWebImages,
          isVerifiedDatabase: !!data.isVerifiedDatabase,
        });

        setIsProcessing(false);
        setShowSearchModal(false);
        setStep(2); // Automatically advance to Step 2: Barcode Scanner
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Please hold up a food packet or nutrition facts label to scan.');
      }
    } catch (e: any) {
      console.warn('Recognition failed:', e);
      setIsProcessing(false);
      setScanError(
        e.message || 'Could not recognize product. You can search by name or upload a clear photo.'
      );
    }
  };

  // STEP 3: Back / Nutrition Label Capture Handler (Optional)
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
        // Tactile pulse for successful label OCR extraction
        triggerHaptic([35, 40, 40]);
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
        referenceImages: productMetadata.referenceImages,
        isVerifiedDatabase: productMetadata.isVerifiedDatabase,
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
        referenceImages: productMetadata.referenceImages,
        isVerifiedDatabase: productMetadata.isVerifiedDatabase,
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

  // Direct completion from Step 3 without scanning back (using verified database values)
  const handleCompleteDirect = () => {
    // Tactile confirmation click on final capture completion
    triggerHaptic([30, 40, 50]);

    onCaptureComplete({
      productName: productMetadata.name || 'Packaged Food Product',
      brand: productMetadata.brand || '',
      category: productMetadata.category || 'Packaged Food',
      barcode: productMetadata.barcode,
      frontImageUrl: frontImage,
      referenceImages: productMetadata.referenceImages,
      isVerifiedDatabase: productMetadata.isVerifiedDatabase,
      nutrition: productMetadata.nutrition || {
        servingSize: '100g',
        calories: 380,
        sugar: 5,
        sodium: 280,
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

  // Manual Barcode Submit Handler
  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcodeInput.trim()) return;
    handleBarcodeLookup(manualBarcodeInput.trim());
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
          <span className={`w-1.5 h-1.5 rounded-full ${step === 2 ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse`} />
          {step === 1 && (isHindi ? 'स्टेप 1: पैकेट या न्यूट्रिशन लेबल' : isBengali ? 'ধাপ ১: প্যাকেট বা পুষ্টি লেবেল' : 'Step 1: Packet or Nutrition Label')}
          {step === 2 && (isHindi ? 'स्टेप 2: बारकोड स्कैन (सटीक)' : isBengali ? 'ধাপ ২: বারকোড স্ক্যান' : 'Step 2: Barcode Scan')}
          {step === 3 && (isHindi ? 'स्टेप 3: समीक्षा (वैकल्पिक)' : isBengali ? 'ধাপ ৩: পুষ্টি তালিকা' : 'Step 3: Review / Back Label')}
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2">
          {step === 1 && (
            <button
              onClick={() => setShowSearchModal(true)}
              className="w-10 h-10 rounded-full liquid-glass-control text-white flex items-center justify-center active:scale-95 transition-all shadow-md"
              title="Search by name"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          {step === 2 && (
            <button
              onClick={() => setShowBarcodeManualModal(true)}
              className="px-3 h-10 rounded-full liquid-glass-control text-white text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-md"
              title="Type barcode"
            >
              <Barcode className="w-4 h-4" />
              <span>Type</span>
            </button>
          )}
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
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  initCamera();
                }}
                className="px-4 py-2.5 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-transform flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>
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

        {/* STEP 1: Front Packet or Nutrition Label Scanning Reticle */}
        {step === 1 && (
          <div
            className={`relative w-76 h-96 rounded-[26px] border border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.52)] flex flex-col items-center justify-between p-6 pointer-events-none transition-all duration-300 ${
              isCapturing ? 'camera-capture-ripple border-emerald-400' : ''
            }`}
          >
            {isProcessing && (
              <div className="absolute inset-x-4 h-0.5 camera-scan-line bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10B981]" />
            )}

            <div className="w-full flex justify-center">
              <span className="bg-black/60 backdrop-blur-md px-3.5 py-1 rounded-full text-white text-xs font-normal border border-white/10 flex items-center gap-1.5">
                <span>{isHindi ? 'पैकेट या न्यूट्रिशन लेबल दिखाएं' : isBengali ? 'প্যাকেট বা পুষ্টি লেবেল দেখান' : 'Point at food packet or nutrition label'}</span>
              </span>
            </div>

            <div className="text-center px-2">
              <p className="text-white/90 text-xs font-medium">
                {isHindi
                  ? 'पैकेट का अगला भाग या पोषण तालिका (Nutrition Facts) दिखाएं'
                  : isBengali
                  ? 'প্যাকেট বা পুষ্টি লেবেল (Nutrition Facts) ফ্রেম করে শাটার চাপুন'
                  : 'Frame food packet or nutrition facts label & tap shutter'}
              </p>
              <p className="text-white/60 text-[11px] mt-0.5">
                {isHindi
                  ? 'हाथ में पकड़कर या वेबकैम के सामने आराम से दिखाएं'
                  : isBengali
                  ? 'হাতে ধরে বা ক্যামেরার সামনে যেকোনো দিক স্ক্যান করতে পারেন'
                  : 'Works with packet front, cans, bottles, or back nutrition facts'}
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Dedicated Barcode Live Laser Reticle (High Precision) */}
        {step === 2 && (
          <div className="relative flex flex-col items-center justify-center pointer-events-none">
            {/* Barcode reticle frame with red/green laser */}
            <div
              className={`relative w-80 h-48 rounded-2xl border-2 transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] flex flex-col items-center justify-between p-3.5 ${
                barcodeScanSuccess
                  ? 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                  : 'border-white/80'
              }`}
            >
              {/* Corner accent marks */}
              <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-rose-500" />
              <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-rose-500" />
              <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-rose-500" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-rose-500" />

              {/* Laser scanning beam */}
              {!barcodeScanSuccess && (
                <div className="absolute inset-x-2 h-0.5 camera-scan-line bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#F43F5E]" />
              )}

              {/* Status Header */}
              <div className="w-full flex justify-center">
                <span className="bg-black/75 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-semibold border border-white/10 flex items-center gap-1.5 shadow-sm">
                  {barcodeScanSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Barcode Detected: {detectedBarcode}</span>
                    </>
                  ) : (
                    <>
                      <Barcode className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isHindi ? 'बारकोड लाइनों को फ्रेम में रखें' : 'Align Barcode in Reticle'}</span>
                    </>
                  )}
                </span>
              </div>

              {/* Subtitle guidance */}
              <div className="text-center">
                <p className="text-white/80 text-[11px] font-medium drop-shadow-sm">
                  {isHindi
                    ? '0% त्रुटि के साथ सटीक पोषण मान पाने के लिए बारकोड स्कैन करें'
                    : isBengali
                    ? 'নির্ভুল তথ্যের জন্য বারকোড স্ক্যান করুন'
                    : 'Auto-detects for 0% error official nutrition'}
                </p>
              </div>
            </div>

            {/* Recognized Product banner in Step 2 */}
            <div className="mt-4 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15 text-white text-xs flex items-center gap-2 max-w-xs truncate">
              {frontImage && (
                <img src={frontImage} alt="Scanned" className="w-7 h-7 rounded-lg object-cover" />
              )}
              <span className="truncate font-semibold">{productMetadata.name || 'Food Product'}</span>
            </div>
          </div>
        )}

        {/* STEP 3: Back Nutrition Label (Optional!) */}
        {step === 3 && (
          <div className="relative flex flex-col items-center justify-between w-full h-full p-6 pt-24 pb-36 pointer-events-none">
            {/* Top Verified Summary Card if Barcode was Matched */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-emerald-500/30 text-[#161616] space-y-2 pointer-events-auto animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {productMetadata.isVerifiedDatabase
                    ? (isHindi ? 'आधिकारिक डेटाबेस से सत्यापित (0% त्रुटि)' : 'Verified Official Database (0% Error)')
                    : (isHindi ? 'उत्पाद विवरण लोड हो गया' : 'Product Profile Ready')}
                </span>
                {productMetadata.barcode && (
                  <span className="text-[10px] text-[#737373] font-mono">#{productMetadata.barcode}</span>
                )}
              </div>

              <div className="text-xs text-[#161616] font-semibold truncate">
                {productMetadata.name}
              </div>

              {productMetadata.nutrition && (
                <div className="flex items-center justify-between text-[11px] text-[#737373] bg-[#F7F7F5] rounded-xl p-2">
                  <span>Cal: <b className="text-[#161616]">{productMetadata.nutrition.calories ?? 0} kcal</b></span>
                  <span>Sugar: <b className="text-[#161616]">{productMetadata.nutrition.sugar ?? 0}g</b></span>
                  <span>Salt: <b className="text-[#161616]">{productMetadata.nutrition.sodium ?? 0}mg</b></span>
                  <span>Fat: <b className="text-[#161616]">{productMetadata.nutrition.totalFat ?? 0}g</b></span>
                </div>
              )}

              {/* Direct primary action */}
              <button
                onClick={handleCompleteDirect}
                className="w-full py-2.5 rounded-full bg-[#161616] text-white text-xs font-semibold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-1.5 liquid-ripple"
              >
                <span>{isHindi ? 'सटीक पोषण की समीक्षा करें' : isBengali ? 'সরাসরি বিশ্লেষণ করুন' : 'Confirm & Review Nutrients'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Viewfinder frame for optional back photo */}
            <div
              className={`relative w-76 h-64 rounded-[24px] border border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.52)] flex flex-col items-center justify-between p-4 transition-all duration-300 ${
                isCapturing ? 'camera-capture-ripple border-emerald-400' : ''
              }`}
            >
              {isProcessing && (
                <div className="absolute inset-x-4 h-0.5 camera-scan-line bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10B981]" />
              )}

              <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-medium border border-white/10">
                {isHindi ? 'वैकल्पिक: मुद्रित तालिका की तस्वीर लें' : 'Optional: Photograph Printed Back Label'}
              </span>

              <p className="text-white/80 text-[11px] text-center font-normal">
                {isHindi
                  ? 'सामग्री जांचने के लिए शटर दबाएं, या ऊपर जारी रखें'
                  : 'Tap shutter to OCR check label, or tap Confirm above'}
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
                {loadingText.includes('Scanning') || loadingText.includes('स्कैन')
                  ? 'Analyzing food packaging, brand, or nutrition facts…'
                  : loadingText.includes('barco') || loadingText.includes('बारकोड')
                  ? 'Accessing official nutrition registry with 0% error…'
                  : 'Extracting nutritional parameters…'}
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
              Enter brand or product name (e.g. Lay's, Maggi, Oreo, Doritos, Kurkure, Amul, Tropicana):
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

      {/* Manual Barcode Input Modal */}
      {showBarcodeManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#F7F7F5] w-full max-w-sm rounded-3xl p-6 space-y-4 border border-black/10 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-[#1D1D1F]" />
                <h3 className="text-base font-bold text-[#1D1D1F]">
                  Enter Barcode Number
                </h3>
              </div>
              <button
                onClick={() => setShowBarcodeManualModal(false)}
                className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#86868B]">
              Type the 8 to 13 digits printed directly below the barcode lines on the packaging:
            </p>

            <form onSubmit={handleManualBarcodeSubmit} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={manualBarcodeInput}
                onChange={(e) => setManualBarcodeInput(e.target.value)}
                placeholder="e.g. 8901491101837"
                className="w-full px-4 py-3 rounded-2xl bg-white border border-black/10 text-base font-mono font-bold tracking-widest text-[#1D1D1F] focus:outline-none focus:border-black text-center"
              />
              <button
                type="submit"
                disabled={!manualBarcodeInput.trim()}
                className="w-full py-3.5 rounded-full bg-[#161616] text-white text-xs font-semibold shadow-md active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>Lookup Official Database (0% Error)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Shutter & Controls Tray */}
      {step === 1 && (
        <div className="relative z-20 px-8 pt-4 pb-9 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-full liquid-glass-control text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
            title="Upload photo from gallery"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button
            onClick={() => handleCaptureFront()}
            disabled={isProcessing}
            aria-label="Capture food packet or nutrition label"
            className="group relative w-19 h-19 rounded-full border-4 border-white/80 p-1 flex items-center justify-center active:scale-90 transition-transform backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
          >
            <div className="w-full h-full rounded-full bg-white transition-all group-hover:scale-95 group-active:scale-90 shadow-inner" />
          </button>

          <button
            onClick={switchCamera}
            className="w-12 h-12 rounded-full liquid-glass-control text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
            title="Switch camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Step 2 Bottom Controls: Barcode Actions */}
      {step === 2 && (
        <div className="relative z-20 px-6 pt-3 pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between gap-3">
          <button
            onClick={() => setShowBarcodeManualModal(true)}
            className="px-4 py-3 rounded-full liquid-glass-control text-white text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all shadow-md"
          >
            <Barcode className="w-4 h-4 text-rose-400" />
            <span>Enter Manually</span>
          </button>

          <button
            onClick={() => setStep(3)}
            className="px-5 py-3 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 active:scale-95 transition-all shadow-md"
          >
            <span>Skip Barcode</span>
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Step 3 Bottom Controls: Optional Back Label / Confirm */}
      {step === 3 && (
        <div className="relative z-20 px-8 pt-4 pb-9 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-full liquid-glass-control text-white flex items-center justify-center active:scale-95 transition-all shadow-lg"
            title="Upload photo from gallery"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Shutter for optional back capture */}
          <button
            onClick={() => handleCaptureBack()}
            disabled={isProcessing}
            aria-label="Capture nutrition label"
            className="group relative w-19 h-19 rounded-full border-4 border-white/80 p-1 flex items-center justify-center active:scale-90 transition-transform backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
            title="Photograph back label"
          >
            <div className="w-full h-full rounded-full bg-white transition-all group-hover:scale-95 group-active:scale-90 shadow-inner" />
          </button>

          <button
            onClick={handleCompleteDirect}
            className="px-3.5 py-2.5 rounded-full bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-all shadow-lg flex items-center gap-1"
            title="Skip and view results"
          >
            <span>Skip</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sleek Minimal Animated Tag */}
      <div className="relative z-20 pb-2 flex justify-center pointer-events-auto">
        <MadeByFooter variant="dark" />
      </div>
    </div>
  );
};
