import React from 'react';
import { ScanEye, Move } from 'lucide-react';

interface XRayLensModuleProps {
  isOverlapping: boolean;
  isTargetRevealed: boolean;
  secondDigit: string;
}

export const XRayLensModule: React.FC<XRayLensModuleProps> = ({
  isOverlapping,
  isTargetRevealed,
  secondDigit,
}) => {
  return (
    <div className="relative flex-1 flex flex-col justify-between p-2.5 text-xs pointer-events-none select-none overflow-hidden">
      {/* Precision Optical Reticle */}
      <div className="absolute inset-2 border-[1.5px] border-dashed border-[#FF4F00] flex items-center justify-center">
        <div className="w-8 h-8 border-[1.5px] border-[#141413] rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-[#FF4F00]" />
        </div>
      </div>

      {/* Top Spec Readout */}
      <div className="relative z-10 flex items-center justify-between bg-[#FFFFFF] px-2 py-1 border-[1.5px] border-[#141413] font-mono text-[10px]">
        <span className="text-[#141413] font-bold flex items-center gap-1">
          <ScanEye className="w-3 h-3 text-[#FF4F00]" /> OPTIC LENS
        </span>
        <span className={isOverlapping ? 'text-[#008A4B] font-bold' : 'text-[#78756E]'}>
          {isTargetRevealed
            ? `PIN #02: [${secondDigit}]`
            : isOverlapping
            ? 'INSPECTING...'
            : 'STANDBY'}
        </span>
      </div>

      {/* Bottom Guide */}
      <div className="relative z-10 bg-[#F4F1EA] px-2 py-1 border border-[#141413] text-[10px] font-mono text-[#141413] flex items-center justify-between">
        <span className="flex items-center gap-1 font-semibold">
          <Move className="w-3 h-3 text-[#FF4F00]" /> DRAG OVER 02 // BLUEPRINT
        </span>
      </div>
    </div>
  );
};
