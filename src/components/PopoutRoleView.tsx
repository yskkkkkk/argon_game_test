import React, { useEffect, useRef, useState } from 'react';
import { ScreenGeometryPayload, computeOverlapRegion, Rect } from '../game/rules';
import { ScanEye, Zap, Radio } from 'lucide-react';

interface PopoutRoleViewProps {
  role: 'lens' | 'laser';
}

export const PopoutRoleView: React.FC<PopoutRoleViewProps> = ({ role }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [coords, setCoords] = useState({ x: window.screenX, y: window.screenY });
  const [statusText, setStatusText] = useState<string>('WAITING FOR MAIN VAULT WINDOW...');
  const [isAligned, setIsAligned] = useState<boolean>(false);
  const mainStateRef = useRef<ScreenGeometryPayload | null>(null);

  useEffect(() => {
    document.title =
      role === 'lens'
        ? 'THE VAULT // X-RAY MAGNIFIER (POP-OUT)'
        : 'THE VAULT // OPTICAL LASER TRANSMITTER (POP-OUT)';

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('vault_multi_window_sync');
      bc.onmessage = (ev) => {
        const data = ev.data as ScreenGeometryPayload;
        if (data && data.role === 'main') {
          mainStateRef.current = data;
        }
      };
    } catch {
      // Ignore if BroadcastChannel unsupported
    }

    let animId = 0;
    const render = (now: number) => {
      const chromeOffsetX = Math.max(0, (window.outerWidth - window.innerWidth) / 2);
      const chromeOffsetY = Math.max(0, window.outerHeight - window.innerHeight);

      const myPayload: ScreenGeometryPayload = {
        role,
        screenX: window.screenX,
        screenY: window.screenY,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        chromeOffsetX,
        chromeOffsetY,
        timestamp: now,
      };

      if (bc) {
        bc.postMessage(myPayload);
      }

      setCoords((prev) =>
        prev.x !== window.screenX || prev.y !== window.screenY
          ? { x: window.screenX, y: window.screenY }
          : prev
      );

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          if (role === 'lens') {
            ctx.fillStyle = '#141413';
            ctx.fillRect(0, 0, w, h);

            // Fine Cobalt inspection grid
            ctx.strokeStyle = 'rgba(0, 71, 255, 0.35)';
            ctx.lineWidth = 1;
            for (let x = 0; x < w; x += 20) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, h);
              ctx.stroke();
            }
            for (let y = 0; y < h; y += 20) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(w, y);
              ctx.stroke();
            }

            const main = mainStateRef.current;
            if (main && main.blueprintViewportRect && main.secretCoordLocal) {
              const bpScreenX =
                main.screenX + main.chromeOffsetX + main.blueprintViewportRect.x;
              const bpScreenY =
                main.screenY + main.chromeOffsetY + main.blueprintViewportRect.y;

              const myContentScreenX = window.screenX + chromeOffsetX;
              const myContentScreenY = window.screenY + chromeOffsetY;

              // Calculate where the main window's secret stamp projects into THIS popup's canvas
              const secretScreenX = bpScreenX + main.secretCoordLocal.x;
              const secretScreenY = bpScreenY + main.secretCoordLocal.y;

              const localStampX = secretScreenX - myContentScreenX;
              const localStampY = secretScreenY - myContentScreenY;

              const bpScreenRect: Rect = {
                x: bpScreenX,
                y: bpScreenY,
                width: main.blueprintViewportRect.width,
                height: main.blueprintViewportRect.height,
              };
              const myScreenRect: Rect = {
                x: myContentScreenX,
                y: myContentScreenY,
                width: window.innerWidth,
                height: window.innerHeight,
              };

              const overlap = computeOverlapRegion(
                bpScreenRect,
                myScreenRect,
                main.secretCoordLocal
              );

              setIsAligned(overlap.isTargetRevealed);
              setStatusText(
                overlap.isTargetRevealed
                  ? `TARGET STAMP LOCKED // PIN #02: [${main.secretDigit2 || '?'}]`
                  : overlap.hasOverlap
                  ? 'OVERLAPPING BLUEPRINT — PAN TO LOCATE STAMP'
                  : 'DRAG THIS CHROME WINDOW OVER 02 // BLUEPRINT'
              );

              // Render the projected blueprint & red-ink stamp at exact monitor offset!
              ctx.strokeStyle = '#FF4F00';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(localStampX - 60, localStampY - 46, 120, 84);

              ctx.fillStyle = '#FF4F00';
              ctx.font = '700 11px "JetBrains Mono", monospace';
              ctx.textAlign = 'center';
              ctx.fillText('RED INK STAMP // PIN #02', localStampX, localStampY - 26);

              ctx.fillStyle = '#FFFFFF';
              ctx.font = '700 58px "Space Grotesk", "JetBrains Mono", monospace';
              ctx.fillText(main.secretDigit2 || '?', localStampX, localStampY + 22);
            }
          } else {
            // ROLE: LASER TRANSMITTER POPUP WINDOW
            ctx.fillStyle = '#F4F1EA';
            ctx.fillRect(0, 0, w, h);

            const cy = h / 2;
            const main = mainStateRef.current;
            let connected = false;

            if (main && main.receiverPortViewportPos) {
              const receiverScreenX =
                main.screenX + main.chromeOffsetX + main.receiverPortViewportPos.x;
              const receiverScreenY =
                main.screenY + main.chromeOffsetY + main.receiverPortViewportPos.y;

              const myRightEdgeScreenX = window.screenX + window.outerWidth;
              const myCenterScreenY = window.screenY + window.outerHeight / 2;

              const hGap = receiverScreenX - myRightEdgeScreenX;
              const vDiff = Math.abs(receiverScreenY - myCenterScreenY);

              connected = hGap >= -60 && hGap <= 320 && vDiff <= 65;
              setIsAligned(connected);
              setStatusText(
                connected
                  ? 'OPTICAL BRIDGE LOCKED // POWERING TELETYPE'
                  : `ALIGN RIGHT EDGE TO MAIN PORT (ΔX:${Math.round(hGap)}px, ΔY:${Math.round(vDiff)}px)`
              );
            }

            // Draw Optical Diode Coils
            ctx.strokeStyle = '#141413';
            ctx.lineWidth = 2;
            for (let i = 0; i < 5; i++) {
              const x = 45 + i * 48;
              ctx.beginPath();
              ctx.ellipse(x, cy, 12, 34, 0, 0, Math.PI * 2);
              ctx.stroke();
            }

            // High-intensity International Orange / Forest Green Beam shooting out the right window frame
            ctx.strokeStyle = connected ? '#008A4B' : '#FF4F00';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(25, cy);
            ctx.lineTo(w, cy);
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      if (bc) bc.close();
    };
  }, [role]);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#F4F1EA] text-[#141413] border-4 border-[#141413] select-none overflow-hidden">
      <header
        className={`px-3 py-2 border-b-2 border-[#141413] flex items-center justify-between font-mono text-xs font-bold ${
          isAligned ? 'bg-[#008A4B] text-white' : 'bg-[#FF4F00] text-white'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {role === 'lens' ? <ScanEye className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          <span>
            {role === 'lens'
              ? 'POP-OUT // X-RAY MAGNIFIER'
              : 'POP-OUT // 635nm LASER EMITTER'}
          </span>
        </div>
        <span className="tabular-nums text-[11px]">
          POS: {coords.x}, {coords.y}
        </span>
      </header>

      <div className="relative flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          width={360}
          height={240}
          className="w-full h-full block"
        />
      </div>

      <footer className="px-3 py-1.5 bg-[#E6E2D8] border-t-2 border-[#141413] font-mono text-[10px] font-bold flex items-center justify-between">
        <span className="flex items-center gap-1 truncate">
          <Radio className="w-3.5 h-3.5 text-[#FF4F00] shrink-0" />
          <span className="truncate">{statusText}</span>
        </span>
      </footer>
    </div>
  );
};
