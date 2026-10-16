import React, { useEffect, useRef } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import { cyberAudio } from '../../game/audio';

interface PowerEmitterModuleProps {
  isConnected: boolean;
  onPopOutLaserWindow: () => void;
  onAutoAlignToTerminal: () => void;
}

export const PowerEmitterModule: React.FC<PowerEmitterModuleProps> = ({
  isConnected,
  onPopOutLaserWindow,
  onAutoAlignToTerminal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const render = (now: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#F4F1EA';
      ctx.fillRect(0, 0, w, h);

      // Optical Prism Lenses
      const cy = h / 2;
      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const x = 35 + i * 38;
        const pulse = Math.sin(now * 0.008 - i * 0.7) * 3;
        ctx.beginPath();
        ctx.ellipse(x, cy, 8, 22 + pulse, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // International Orange (#FF4F00) or Forest Green (#008A4B) Optical Laser Beam
      ctx.strokeStyle = isConnected ? '#008A4B' : '#FF4F00';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(22, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isConnected]);

  return (
    <div className="flex flex-col flex-1 p-3 gap-2 text-xs select-none bg-[#FFFFFF]">
      <div className="flex items-center justify-between border-b border-[#141413] pb-1.5 font-mono text-[10px]">
        <span className="font-bold text-[#141413]">ACTION: ALIGN LEFT OF 05 // RECEIVER</span>
        <span className={isConnected ? 'text-[#008A4B] font-bold' : 'text-[#FF4F00] font-bold'}>
          {isConnected ? 'COHERENT LOCK' : '635nm BEAM'}
        </span>
      </div>

      <div className="relative flex-1 min-h-[70px] border-[1.5px] border-[#141413] overflow-hidden bg-[#F4F1EA]">
        <canvas
          ref={canvasRef}
          width={240}
          height={80}
          className="w-full h-full block"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => {
            cyberAudio.playClick();
            onPopOutLaserWindow();
          }}
          className="w-full px-2 py-1.5 bg-[#FF4F00] hover:bg-[#e04500] text-white border-[1.5px] border-[#141413] shadow-mechanical-sm font-mono text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span>새 크롬 창으로 레이저 송신기 열기 (Pop-out)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            cyberAudio.playClick(1.1);
            onAutoAlignToTerminal();
          }}
          className="w-full px-2 py-1 bg-[#F4F1EA] hover:bg-[#141413] hover:text-white text-[#141413] border-[1.5px] border-[#141413] font-mono text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Link2 className="w-3 h-3 text-[#008A4B]" />
          <span>터미널 수신 포트로 레이저 정렬</span>
        </button>
      </div>
    </div>
  );
};
