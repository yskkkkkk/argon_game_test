import React, { useEffect, useRef } from 'react';
import { computeOverlapRegion, Rect } from '../../game/rules';
import { cyberAudio } from '../../game/audio';
import { ExternalLink, ScanEye, Crosshair } from 'lucide-react';

interface BlueprintModuleProps {
  digit: string;
  inPageLensRect: Rect | null;
  remotePopupScreenRect: Rect | null;
  isCleared: boolean;
  onCleared: () => void;
  onPopOutLensWindow: () => void;
  onAlignInPageLens: (targetScreenX: number, targetScreenY: number) => void;
  onReportBlueprintGeometry?: (viewportRect: Rect, secretCoord: { x: number; y: number }) => void;
}

export const BlueprintModule: React.FC<BlueprintModuleProps> = ({
  digit,
  inPageLensRect,
  remotePopupScreenRect,
  isCleared,
  onCleared,
  onPopOutLensWindow,
  onAlignInPageLens,
  onReportBlueprintGeometry,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const secretCoordRef = useRef<{ x: number; y: number }>({
    x: 120 + (parseInt(digit, 10) % 4) * 50,
    y: 76 + (parseInt(digit, 10) % 3) * 32,
  });
  const holdTimerRef = useRef<number>(0);
  const clearedRef = useRef<boolean>(isCleared);
  const onClearedRef = useRef(onCleared);

  useEffect(() => {
    onClearedRef.current = onCleared;
  }, [onCleared]);

  useEffect(() => {
    clearedRef.current = isCleared;
  }, [isCleared]);

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

      const w = canvas.width;
      const h = canvas.height;
      const canvasBounds = canvas.getBoundingClientRect();

      const blueprintViewportRect: Rect = {
        x: canvasBounds.left,
        y: canvasBounds.top,
        width: canvasBounds.width,
        height: canvasBounds.height,
      };

      if (onReportBlueprintGeometry) {
        onReportBlueprintGeometry(blueprintViewportRect, secretCoordRef.current);
      }

      const scaleX = w / Math.max(1, canvasBounds.width);
      const scaleY = h / Math.max(1, canvasBounds.height);

      const targetViewportPos = {
        x: secretCoordRef.current.x / scaleX,
        y: secretCoordRef.current.y / scaleY,
      };

      // 1. Check In-Page Lens Overlap
      const inPageOverlap = inPageLensRect
        ? computeOverlapRegion(blueprintViewportRect, inPageLensRect, targetViewportPos)
        : { hasOverlap: false, intersectionLocal: null, isTargetRevealed: false };

      // 2. Check Real Pop-Out Chrome Window Overlap (Monitor Absolute Coordinates)
      let popupOverlap = {
        hasOverlap: false,
        intersectionLocal: null as Rect | null,
        isTargetRevealed: false,
      };
      if (remotePopupScreenRect) {
        const chromeOffsetX = Math.max(0, (window.outerWidth - window.innerWidth) / 2);
        const chromeOffsetY = Math.max(0, window.outerHeight - window.innerHeight);
        const blueprintMonitorRect: Rect = {
          x: window.screenX + chromeOffsetX + blueprintViewportRect.x,
          y: window.screenY + chromeOffsetY + blueprintViewportRect.y,
          width: blueprintViewportRect.width,
          height: blueprintViewportRect.height,
        };
        popupOverlap = computeOverlapRegion(
          blueprintMonitorRect,
          remotePopupScreenRect,
          targetViewportPos
        );
      }

      const activeOverlap = popupOverlap.hasOverlap ? popupOverlap : inPageOverlap;

      if (activeOverlap.hasOverlap) {
        cyberAudio.playScanHum('xray');
      }

      if (activeOverlap.isTargetRevealed && !clearedRef.current) {
        holdTimerRef.current += dt;
        if (holdTimerRef.current >= 0.4) {
          clearedRef.current = true;
          onClearedRef.current();
        }
      } else {
        holdTimerRef.current = Math.max(0, holdTimerRef.current - dt * 0.5);
      }

      // Draw Architectural Drafting Blueprint Surface
      ctx.fillStyle = '#E6E2D8';
      ctx.fillRect(0, 0, w, h);

      // Architectural Grid
      ctx.strokeStyle = 'rgba(20, 20, 19, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Mechanical Vault Escapement Schematic Lines
      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(18, 18, w - 36, h - 36);

      // Gear & Lever Schematic Circles
      ctx.beginPath();
      ctx.arc(85, 85, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(85, 85, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(295, 95, 44, 0, Math.PI * 2);
      ctx.stroke();

      // Dimension callout lines
      ctx.beginPath();
      ctx.moveTo(85, 85);
      ctx.lineTo(295, 95);
      ctx.stroke();

      ctx.fillStyle = '#141413';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillText('FIG 2.4 // ESCAPEMENT GEAR TRAIN', 28, 34);
      ctx.fillText('SCALE 1:1 · TOLERANCE ±0.02mm', 28, h - 26);

      // X-RAY MAGNIFIER INTERSECTION LAYER
      if (activeOverlap.hasOverlap && activeOverlap.intersectionLocal) {
        const ix = activeOverlap.intersectionLocal.x * scaleX;
        const iy = activeOverlap.intersectionLocal.y * scaleY;
        const iw = activeOverlap.intersectionLocal.width * scaleX;
        const ih = activeOverlap.intersectionLocal.height * scaleY;

        ctx.save();
        ctx.beginPath();
        ctx.rect(ix, iy, iw, ih);
        ctx.clip();

        // High-contrast blueprint negative / Cobalt & International Orange inspection layer
        ctx.fillStyle = '#141413';
        ctx.fillRect(ix, iy, iw, ih);

        // Fine Cobalt grid inside X-Ray window
        ctx.strokeStyle = 'rgba(0, 71, 255, 0.35)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 16) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }

        // Decoy inspection annotations
        ctx.fillStyle = '#E6E2D8';
        ctx.font = '500 10px "JetBrains Mono", monospace';
        ctx.fillText('REV_A: VOID', 36, 52);
        ctx.fillText('BOLT_TORQUE: 42Nm', 255, 155);

        // Hidden Red-Ink Engineer Stamp & 2nd Vault Digit
        const sx = secretCoordRef.current.x;
        const sy = secretCoordRef.current.y;

        ctx.strokeStyle = '#FF4F00';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - 48, sy - 38, 96, 68);

        ctx.fillStyle = '#FF4F00';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RED INK STAMP // PIN #02', sx, sy - 22);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '700 48px "Space Grotesk", "JetBrains Mono", monospace';
        ctx.fillText(digit, sx, sy + 18);

        // Sharp frame around overlap region
        ctx.strokeStyle = '#FF4F00';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(ix + 1, iy + 1, iw - 2, ih - 2);

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [digit, inPageLensRect, remotePopupScreenRect, onReportBlueprintGeometry]);

  const handleSnapInPageLens = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    cyberAudio.playClick(1.1);
    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, bounds.width);
    const scaleY = canvas.height / Math.max(1, bounds.height);
    const screenX = bounds.left + secretCoordRef.current.x / scaleX - 105;
    const screenY = bounds.top + secretCoordRef.current.y / scaleY - 80;
    onAlignInPageLens(screenX, screenY);
  };

  return (
    <div className="flex flex-col flex-1 p-3 gap-2 text-xs select-none bg-[#FFFFFF]">
      <div className="flex items-center justify-between border-b border-[#141413] pb-1.5 font-mono text-[10px]">
        <span className="font-bold text-[#141413]">ACTION: OVERLAP X-RAY LENS WINDOW</span>
        <span className="text-[#0047FF] font-bold">SYNC: BroadcastChannel + screenX/Y</span>
      </div>

      <div className="relative flex-1 min-h-[140px] border-[1.5px] border-[#141413] overflow-hidden bg-[#E6E2D8]">
        <canvas
          ref={canvasRef}
          width={410}
          height={185}
          className="w-full h-full block"
        />
        {isCleared && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#008A4B] text-white border border-[#141413] font-mono text-[10px] font-bold">
            PIN #02: {digit}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => {
            cyberAudio.playClick();
            onPopOutLensWindow();
          }}
          className="flex-1 px-2.5 py-1.5 bg-[#FF4F00] hover:bg-[#e04500] text-white border-[1.5px] border-[#141413] shadow-mechanical-sm font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span>새 크롬 창으로 투시 렌즈 열기 (Pop-out)</span>
        </button>

        <button
          type="button"
          onClick={handleSnapInPageLens}
          className="px-2.5 py-1.5 bg-[#F4F1EA] hover:bg-[#141413] hover:text-white text-[#141413] border-[1.5px] border-[#141413] shadow-mechanical-sm font-mono text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          title="화면 내 투시 렌즈를 암호 스탬프 좌표로 즉시 정렬합니다"
        >
          <Crosshair className="w-3.5 h-3.5 text-[#0047FF]" />
          <span>신호 좌표로 렌즈 정렬</span>
        </button>
      </div>
    </div>
  );
};
