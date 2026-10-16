import React, { useEffect, useRef, useState } from 'react';
import { evaluateResizeSync } from '../../game/rules';
import { cyberAudio } from '../../game/audio';
import { Maximize2, Check } from 'lucide-react';

interface DimensionalTunerModuleProps {
  digit: string;
  windowWidth: number;
  windowHeight: number;
  isCleared: boolean;
  onCleared: () => void;
  onAutoCalibrateResize: (targetW: number, targetH: number) => void;
}

const TARGET_WIDTH = 550;
const TARGET_HEIGHT = 250;
const TOLERANCE = 15;
const HOLD_DURATION_SEC = 1.5;

export const DimensionalTunerModule: React.FC<DimensionalTunerModuleProps> = ({
  digit,
  windowWidth,
  windowHeight,
  isCleared,
  onCleared,
  onAutoCalibrateResize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [holdProgress, setHoldProgress] = useState<number>(isCleared ? 100 : 0);
  const holdTimeRef = useRef<number>(isCleared ? HOLD_DURATION_SEC : 0);
  const clearedRef = useRef<boolean>(isCleared);
  const onClearedRef = useRef(onCleared);

  useEffect(() => {
    onClearedRef.current = onCleared;
  }, [onCleared]);

  useEffect(() => {
    clearedRef.current = isCleared;
    if (isCleared) {
      setHoldProgress(100);
    }
  }, [isCleared]);

  // Listen to real browser window resize so dragging the Chrome window edge also calibrates!
  useEffect(() => {
    const mountTime = performance.now();
    let lastBrowserW = window.innerWidth;
    let lastBrowserH = window.innerHeight;

    const handleBrowserResize = () => {
      if (performance.now() - mountTime < 600) {
        lastBrowserW = window.innerWidth;
        lastBrowserH = window.innerHeight;
        return;
      }
      const dw = window.innerWidth - lastBrowserW;
      const dh = window.innerHeight - lastBrowserH;
      lastBrowserW = window.innerWidth;
      lastBrowserH = window.innerHeight;

      if (Math.abs(dw) > 2 && Math.abs(dw) < 300) {
        onAutoCalibrateResize(
          Math.max(360, Math.min(720, windowWidth + dw)),
          Math.max(195, Math.min(420, windowHeight + dh))
        );
      }
    };

    window.addEventListener('resize', handleBrowserResize);
    return () => window.removeEventListener('resize', handleBrowserResize);
  }, [windowWidth, windowHeight, onAutoCalibrateResize]);

  const syncState = evaluateResizeSync(
    windowWidth,
    windowHeight,
    TARGET_WIDTH,
    TARGET_HEIGHT,
    TOLERANCE
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const currentSync = evaluateResizeSync(
        windowWidth,
        windowHeight,
        TARGET_WIDTH,
        TARGET_HEIGHT,
        TOLERANCE
      );

      if (currentSync.inSync && !clearedRef.current) {
        holdTimeRef.current = Math.min(HOLD_DURATION_SEC, holdTimeRef.current + dt);
        const pct = Math.round((holdTimeRef.current / HOLD_DURATION_SEC) * 100);
        setHoldProgress(pct);

        if (holdTimeRef.current >= HOLD_DURATION_SEC) {
          clearedRef.current = true;
          onClearedRef.current();
        }
      } else if (!clearedRef.current) {
        holdTimeRef.current = Math.max(0, holdTimeRef.current - dt * 1.2);
        setHoldProgress(Math.round((holdTimeRef.current / HOLD_DURATION_SEC) * 100));
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#F4F1EA';
      ctx.fillRect(0, 0, w, h);

      // Draw Precision Vernier Caliper Ruler Ticks along Top & Left edges
      ctx.strokeStyle = '#141413';
      ctx.fillStyle = '#141413';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 10) {
        const isMajor = x % 50 === 0;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, isMajor ? 12 : 6);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 10) {
        const isMajor = y % 50 === 0;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(isMajor ? 12 : 6, y);
        ctx.stroke();
      }

      // Reference Wave (Cobalt Blue / Forest Green when locked)
      const isLocked = currentSync.inSync || clearedRef.current;
      ctx.strokeStyle = isLocked ? '#008A4B' : '#0047FF';
      ctx.lineWidth = isLocked ? 3 : 2;
      ctx.beginPath();
      for (let x = 16; x < w; x++) {
        const y =
          h / 2 +
          6 +
          Math.sin(x * 0.038 + now * 0.005) * 26 * Math.sin(((x - 16) / (w - 16)) * Math.PI);
        if (x === 16) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Caliper Wave (International Orange when out of sync)
      if (!isLocked) {
        const freqError = (windowWidth - TARGET_WIDTH) * 0.00025;
        const ampError = (windowHeight - TARGET_HEIGHT) * 0.22;
        ctx.strokeStyle = '#FF4F00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 16; x < w; x++) {
          const y =
            h / 2 +
            6 +
            Math.sin(x * (0.038 + freqError) - now * 0.006) *
              (26 + ampError) *
              Math.sin(((x - 16) / (w - 16)) * Math.PI);
          if (x === 16) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#008A4B';
        ctx.font = '700 54px "Space Grotesk", "JetBrains Mono", monospace';
        ctx.fillText(digit, w / 2, h / 2 + 4);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [digit, windowWidth, windowHeight]);

  return (
    <div className="flex flex-col flex-1 p-3 gap-2 text-xs select-none bg-[#FFFFFF]">
      <div className="flex items-center justify-between border-b border-[#141413] pb-1.5 font-mono text-[10px]">
        <span className="font-bold text-[#141413]">
          ACTION: RESIZE MODULE OR BROWSER TO 550×250px
        </span>
        <button
          type="button"
          onClick={() => {
            cyberAudio.playClick(1.1);
            onAutoCalibrateResize(TARGET_WIDTH, TARGET_HEIGHT);
          }}
          className="px-2 py-0.5 bg-[#F4F1EA] hover:bg-[#0047FF] hover:text-white text-[#141413] border border-[#141413] font-mono text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3 h-3" />
          <span>규격 동기화</span>
        </button>
      </div>

      {/* Vernier Readout Strip */}
      <div className="flex items-center justify-between px-2.5 py-1 bg-[#E6E2D8] border-[1.5px] border-[#141413] font-mono text-[11px] tabular-nums">
        <div>
          <span className="text-[#78756E]">ACTUAL: </span>
          <span className="font-bold text-[#141413]">
            {Math.round(windowWidth)}×{Math.round(windowHeight)}px
          </span>
        </div>
        <div>
          <span className="text-[#78756E]">SPEC: </span>
          <span className="font-bold text-[#0047FF]">550×250px (±15)</span>
        </div>
        <div>
          {syncState.inSync || isCleared ? (
            <span className="text-[#008A4B] font-bold flex items-center gap-0.5">
              <Check className="w-3.5 h-3.5" /> LOCKED ({holdProgress}%)
            </span>
          ) : (
            <span className="text-[#FF4F00] font-bold">UNCALIBRATED</span>
          )}
        </div>
      </div>

      <div className="relative flex-1 min-h-[85px] border-[1.5px] border-[#141413] overflow-hidden bg-[#F4F1EA]">
        <canvas
          ref={canvasRef}
          width={480}
          height={105}
          className="w-full h-full block"
        />
        {isCleared && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#008A4B] text-white border border-[#141413] font-mono text-[10px] font-bold">
            PIN #04: {digit}
          </div>
        )}
      </div>
    </div>
  );
};
