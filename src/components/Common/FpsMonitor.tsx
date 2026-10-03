import React, { useEffect, useState, useRef } from 'react';

export const FpsMonitor: React.FC = () => {
  const [fps, setFps] = useState<number>(144);
  const [frameTimeMs, setFrameTimeMs] = useState<number>(6.94);
  const [p95Ms, setP95Ms] = useState<number>(6.8);
  const [droppedFrames, setDroppedFrames] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('fps') === 'true' || urlParams.get('perf') === '1' || import.meta.env.DEV;
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const droppedCountRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);
  const updateTimerRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) return;

    const measureFrame = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Filter out background tab pauses
      if (dt > 0 && dt < 200) {
        const buffer = frameTimesRef.current;
        buffer.push(dt);
        if (buffer.length > 120) {
          buffer.shift();
        }

        // Frame budget for 144Hz is 6.94ms, 120Hz is 8.33ms, 60Hz is 16.67ms
        // Any frame exceeding 16.7ms is considered dropped for high refresh
        if (dt > 16.7) {
          droppedCountRef.current++;
        }
      }

      // Throttle React state updates to ~4 times per second to prevent re-render overhead
      if (now - updateTimerRef.current > 250) {
        updateTimerRef.current = now;
        const buffer = frameTimesRef.current;
        if (buffer.length > 0) {
          const avgDt = buffer.reduce((a, b) => a + b, 0) / buffer.length;
          const currentFps = Math.min(144, Math.round(1000 / avgDt));
          
          // Calculate p95
          const sorted = [...buffer].sort((a, b) => a - b);
          const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
          const p95 = sorted[p95Index] || avgDt;

          setFps(currentFps);
          setFrameTimeMs(Number(avgDt.toFixed(2)));
          setP95Ms(Number(p95.toFixed(2)));
          setDroppedFrames(droppedCountRef.current);
        }
      }

      rafIdRef.current = requestAnimationFrame(measureFrame);
    };

    lastTimeRef.current = performance.now();
    rafIdRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  const isOptimal = p95Ms <= 8.33; // 120-144Hz budget
  const isFair = p95Ms <= 16.67;

  return (
    <div
      className="fixed bottom-2 left-2 z-50 pointer-events-auto select-none font-mono text-[10px]"
      style={{ willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}
    >
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer bg-black/80 hover:bg-black/90 text-white backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/15 shadow-lg flex items-center gap-2 transition-transform active:scale-95"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isOptimal ? 'bg-emerald-400 animate-pulse' : isFair ? 'bg-amber-400' : 'bg-rose-400'
          }`}
        />
        <span className="font-bold text-white tracking-tight">
          {fps} <span className="font-normal text-white/70">FPS</span>
        </span>
        <span className="text-white/50">|</span>
        <span className="text-white/90">
          {frameTimeMs} <span className="text-white/60">ms</span>
        </span>
        {isExpanded && (
          <span className="text-[9px] text-emerald-400 pl-1">
            p95: {p95Ms}ms {droppedFrames > 0 && `(drop: ${droppedFrames})`}
          </span>
        )}
      </div>
    </div>
  );
};
