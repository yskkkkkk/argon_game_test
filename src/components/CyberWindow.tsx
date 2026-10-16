import React, { useRef, useState } from 'react';
import { Move, Check, Lock, Minimize2 } from 'lucide-react';
import { cyberAudio } from '../game/audio';

export interface WindowState {
  id: string;
  title: string;
  subtitle?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  zIndex: number;
  isOpen: boolean;
  isCleared?: boolean;
  clearedDigit?: string;
  accentColor?: 'orange' | 'green' | 'blue' | 'ink';
  isTranslucentLens?: boolean;
}

interface CyberWindowProps {
  win: WindowState;
  onFocus: (id: string) => void;
  onMove: (id: string, x: number, y: number, deltaX: number, deltaY: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  onClose: (id: string) => void;
  children: React.ReactNode;
  leftPortLabel?: string;
  leftPortActive?: boolean;
  rightPortLabel?: string;
  rightPortActive?: boolean;
}

export const CyberWindow: React.FC<CyberWindowProps> = ({
  win,
  onFocus,
  onMove,
  onResize,
  onClose,
  children,
  leftPortLabel,
  leftPortActive,
  rightPortLabel,
  rightPortActive,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    lastX: number;
    lastY: number;
  } | null>(null);

  const resizeRef = useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  if (!win.isOpen) return null;

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.stopPropagation();
    onFocus(win.id);
    cyberAudio.playClick(1.05);
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragRef.current) return;
    const dxTotal = e.clientX - dragRef.current.startX;
    const dyTotal = e.clientY - dragRef.current.startY;
    const deltaX = e.clientX - dragRef.current.lastX;
    const deltaY = e.clientY - dragRef.current.lastY;

    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;

    const nextX = Math.max(8, Math.min(window.innerWidth - 120, dragRef.current.origX + dxTotal));
    const nextY = Math.max(52, Math.min(window.innerHeight - 90, dragRef.current.origY + dyTotal));

    onMove(win.id, nextX, nextY, deltaX, deltaY);
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onFocus(win.id);
    cyberAudio.playClick(0.9);
    setIsResizing(true);
    e.currentTarget.setPointerCapture(e.pointerId);

    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: win.width,
      origH: win.height,
    };
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing || !resizeRef.current) return;
    const dx = e.clientX - resizeRef.current.startX;
    const dy = e.clientY - resizeRef.current.startY;

    const nextW = Math.max(win.minWidth, Math.min(900, Math.round(resizeRef.current.origW + dx)));
    const nextH = Math.max(win.minHeight, Math.min(680, Math.round(resizeRef.current.origH + dy)));

    onResize(win.id, nextW, nextH);
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    setIsResizing(false);
    resizeRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  const headerStyle = win.isCleared
    ? 'bg-[#008A4B] text-white border-b-[1.5px] border-[#141413]'
    : win.accentColor === 'orange'
    ? 'bg-[#FF4F00] text-white border-b-[1.5px] border-[#141413]'
    : win.accentColor === 'blue'
    ? 'bg-[#0047FF] text-white border-b-[1.5px] border-[#141413]'
    : 'bg-[#E6E2D8] text-[#141413] border-b-[1.5px] border-[#141413]';

  const surfaceBg = win.isTranslucentLens
    ? 'bg-[#FFFFFF]/25'
    : 'bg-[#FFFFFF]';

  return (
    <section
      aria-label={win.title}
      data-window-id={win.id}
      onMouseDown={() => onFocus(win.id)}
      style={{
        transform: `translate3d(${Math.round(win.x)}px, ${Math.round(win.y)}px, 0)`,
        width: `${Math.round(win.width)}px`,
        height: `${Math.round(win.height)}px`,
        zIndex: win.zIndex,
      }}
      className={`fixed top-0 left-0 flex flex-col rounded-none border-[1.5px] border-[#141413] shadow-mechanical ${surfaceBg} select-none`}
    >
      {/* Left Hardware Optical Port Indicator */}
      {leftPortLabel && (
        <div
          className={`absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 px-1.5 py-2 border-[1.5px] border-[#141413] text-[10px] font-mono font-bold tracking-tighter ${
            leftPortActive
              ? 'bg-[#008A4B] text-white'
              : 'bg-[#FF4F00] text-white'
          }`}
          title={leftPortLabel}
        >
          <span>OPT-IN</span>
        </div>
      )}

      {/* Right Hardware Laser Port Indicator */}
      {rightPortLabel && (
        <div
          className={`absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 px-1.5 py-2 border-[1.5px] border-[#141413] text-[10px] font-mono font-bold tracking-tighter ${
            rightPortActive
              ? 'bg-[#008A4B] text-white'
              : 'bg-[#FF4F00] text-white'
          }`}
          title={rightPortLabel}
        >
          <span>BEAM▶</span>
        </div>
      )}

      {/* Tactile Instrument Header Bar */}
      <div
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
        className={`flex items-center justify-between px-3 py-1.5 cursor-grab active:cursor-grabbing ${headerStyle} shrink-0`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Move className="w-3.5 h-3.5 shrink-0" />
          <h2 className="text-xs font-mono font-bold tracking-tight uppercase truncate">
            {win.title}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {win.isCleared !== undefined && (
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border border-[#141413] flex items-center gap-1 ${
                win.isCleared
                  ? 'bg-[#FFFFFF] text-[#008A4B]'
                  : 'bg-[#F4F1EA] text-[#141413]'
              }`}
            >
              {win.isCleared ? (
                <>
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>
                    CLEARED {win.clearedDigit !== undefined ? `[${win.clearedDigit}]` : ''}
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-2.5 h-2.5" />
                  <span>SEALED</span>
                </>
              )}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cyberAudio.playClick(0.75);
              onClose(win.id);
            }}
            aria-label={`Close ${win.title}`}
            className="p-0.5 border border-transparent hover:border-[#141413] hover:bg-black/10 transition-colors cursor-pointer"
            title="패널 접기 (하단 독에서 다시 열기)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Instrument Body */}
      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>

      {/* Bottom-Right Mechanical Resize Grip */}
      <div
        role="separator"
        aria-label={`Resize ${win.title}`}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        onPointerCancel={handleResizePointerUp}
        title="드래그하여 모듈 규격 조절"
        className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 bg-[#E6E2D8] border-t border-l border-[#141413] hover:bg-[#FF4F00] hover:text-white transition-colors"
      >
        <svg viewBox="0 0 10 10" className="w-3 h-3 text-current">
          <path
            d="M9 1v8H1M9 5v4H5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </section>
  );
};
