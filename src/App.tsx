import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Terminal,
  ScanEye,
  Zap,
  FileText,
  Activity,
  Flame,
  Maximize2,
  RotateCcw,
  Check,
  Award,
  LayoutGrid,
  ExternalLink,
} from 'lucide-react';
import {
  generatePasscode,
  evaluateLaserAlignment,
  computeOverlapRegion,
  verifyMasterPasscode,
  Rect,
  ScreenGeometryPayload,
} from './game/rules';
import { cyberAudio } from './game/audio';
import { CyberWindow, WindowState } from './components/CyberWindow';
import { CyberDesktopCanvas } from './components/CyberDesktopCanvas';
import { DustySensorModule } from './components/modules/DustySensorModule';
import { BlueprintModule } from './components/modules/BlueprintModule';
import { XRayLensModule } from './components/modules/XRayLensModule';
import { OverheatedCoreModule } from './components/modules/OverheatedCoreModule';
import { DimensionalTunerModule } from './components/modules/DimensionalTunerModule';
import { PowerEmitterModule } from './components/modules/PowerEmitterModule';
import { SecurityTerminalModule } from './components/modules/SecurityTerminalModule';
import { MissionBriefingModule } from './components/modules/MissionBriefingModule';
import { PopoutRoleView } from './components/PopoutRoleView';

const createInitialWindows = (vw: number, vh: number): Record<string, WindowState> => {
  const isCompact = vw < 1100;
  return {
    briefing: {
      id: 'briefing',
      title: '00 // TECHNICAL MANUAL',
      x: isCompact ? 16 : 24,
      y: 62,
      width: 355,
      height: 295,
      minWidth: 300,
      minHeight: 240,
      zIndex: 11,
      isOpen: false,
      accentColor: 'ink',
    },
    module1: {
      id: 'module1',
      title: '01 // KINETIC DUST FILTER',
      x: isCompact ? 16 : 24,
      y: 58,
      width: 360,
      height: 280,
      minWidth: 310,
      minHeight: 240,
      zIndex: 12,
      isOpen: true,
      isCleared: false,
      accentColor: 'ink',
    },
    module2: {
      id: 'module2',
      title: '02 // SEALED BLUEPRINT',
      x: isCompact ? 200 : 405,
      y: 58,
      width: 450,
      height: 285,
      minWidth: 360,
      minHeight: 250,
      zIndex: 13,
      isOpen: true,
      isCleared: false,
      accentColor: 'blue',
    },
    lens: {
      id: 'lens',
      title: 'OPTIC LENS // X-RAY MAGNIFIER',
      x: isCompact ? 230 : 635,
      y: 235,
      width: 215,
      height: 155,
      minWidth: 180,
      minHeight: 140,
      zIndex: 25,
      isOpen: true,
      accentColor: 'orange',
      isTranslucentLens: true,
    },
    module3: {
      id: 'module3',
      title: '03 // THERMAL LOCK',
      x: isCompact ? 380 : Math.max(875, vw - 445),
      y: 58,
      width: 420,
      height: 300,
      minWidth: 350,
      minHeight: 275,
      zIndex: 14,
      isOpen: true,
      isCleared: false,
      accentColor: 'orange',
    },
    module4: {
      id: 'module4',
      title: '04 // MECHANICAL CALIPER',
      x: isCompact ? 16 : 24,
      y: Math.min(395, vh - 315),
      width: 440,
      height: 225,
      minWidth: 360,
      minHeight: 195,
      zIndex: 15,
      isOpen: true,
      isCleared: false,
      accentColor: 'blue',
    },
    module5_emitter: {
      id: 'module5_emitter',
      title: 'OPTICAL LASER EMITTER',
      x: isCompact ? 240 : 495,
      y: Math.min(460, vh - 255),
      width: 270,
      height: 235,
      minWidth: 240,
      minHeight: 210,
      zIndex: 16,
      isOpen: true,
      accentColor: 'orange',
    },
    module5_terminal: {
      id: 'module5_terminal',
      title: '05 // OPTICAL RECEIVER',
      x: isCompact ? 530 : Math.max(825, vw - 475),
      y: Math.min(390, vh - 320),
      width: 450,
      height: 265,
      minWidth: 360,
      minHeight: 230,
      zIndex: 17,
      isOpen: true,
      isCleared: false,
      accentColor: 'ink',
    },
  };
};

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const roleParam = urlParams.get('role');

  // If opened as a Pop-out Chrome Sub-Window (?role=lens or ?role=laser), render dedicated full-window tool!
  if (roleParam === 'lens' || roleParam === 'laser') {
    return <PopoutRoleView role={roleParam} />;
  }

  return <MainVaultWorkspace />;
}

function MainVaultWorkspace() {
  const [passcodeDigits, setPasscodeDigits] = useState<string[]>(() => {
    const params = new URLSearchParams(window.location.search);
    const seed = params.get('code') || undefined;
    return generatePasscode(seed);
  });

  const [clearedModules, setClearedModules] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);
  const [keypadDigits, setKeypadDigits] = useState<string[]>(['', '', '', '', '']);
  const [unlockError, setUnlockError] = useState<boolean>(false);
  const [isSystemUnlocked, setIsSystemUnlocked] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [gameSessionId, setGameSessionId] = useState<number>(0);

  const [windows, setWindows] = useState<Record<string, WindowState>>(() =>
    createInitialWindows(window.innerWidth, window.innerHeight)
  );

  // Remote pop-out Chrome window geometry received via BroadcastChannel('vault_multi_window_sync')
  const [remoteLensPopupRect, setRemoteLensPopupRect] = useState<Rect | null>(null);
  const [remoteLaserPopupState, setRemoteLaserPopupState] =
    useState<ScreenGeometryPayload | null>(null);

  const topZRef = useRef<number>(30);
  const shakeImpulseRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const blueprintGeoRef = useRef<{
    viewportRect: Rect;
    secretCoord: { x: number; y: number };
  }>({
    viewportRect: { x: 405, y: 92, width: 450, height: 250 },
    secretCoord: { x: 170, y: 110 },
  });
  const passcodeDigitsRef = useRef<string[]>(passcodeDigits);
  const terminalWinRef = useRef<WindowState>(windows.module5_terminal);
  const lastLensSyncTimeRef = useRef<number>(0);
  const lastLaserSyncTimeRef = useRef<number>(0);

  useEffect(() => {
    passcodeDigitsRef.current = passcodeDigits;
  }, [passcodeDigits]);

  useEffect(() => {
    terminalWinRef.current = windows.module5_terminal;
  }, [windows.module5_terminal]);

  useEffect(() => {
    document.body.dataset.state = isSystemUnlocked ? 'gameover' : 'playing';
  }, [isSystemUnlocked]);

  const markModuleCleared = useCallback(
    (moduleIndex: number) => {
      setClearedModules((prev) => {
        if (prev[moduleIndex]) return prev;
        const next = [...prev];
        next[moduleIndex] = true;
        cyberAudio.playModuleClear();
        return next;
      });

      setKeypadDigits((prev) => {
        const next = [...prev];
        if (!next[moduleIndex]) {
          next[moduleIndex] = passcodeDigits[moduleIndex];
        }
        return next;
      });
    },
    [passcodeDigits]
  );

  // REAL MULTI-WINDOW SYNC ENGINE: BroadcastChannel('vault_multi_window_sync') + window.screenX/Y 60Hz loop
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('vault_multi_window_sync');
      bc.onmessage = (ev) => {
        const payload = ev.data as ScreenGeometryPayload;
        if (!payload) return;

        if (payload.role === 'lens') {
          if (payload.innerWidth <= 0 || payload.innerHeight <= 0) {
            lastLensSyncTimeRef.current = 0;
            setRemoteLensPopupRect(null);
          } else {
            lastLensSyncTimeRef.current = performance.now();
            setRemoteLensPopupRect({
              x: payload.screenX + payload.chromeOffsetX,
              y: payload.screenY + payload.chromeOffsetY,
              width: payload.innerWidth,
              height: payload.innerHeight,
            });
          }
        } else if (payload.role === 'laser') {
          if (payload.outerWidth <= 0 || payload.outerHeight <= 0) {
            lastLaserSyncTimeRef.current = 0;
            setRemoteLaserPopupState(null);
          } else {
            lastLaserSyncTimeRef.current = performance.now();
            setRemoteLaserPopupState(payload);
          }
        }
      };
    } catch {
      // Ignore if unsupported
    }

    let lastScreenX = window.screenX;
    let lastScreenY = window.screenY;
    let animId = 0;

    const tickMultiWindowSync = (now: number) => {
      // 1. Detect real OS browser window movement (deltaScreenX, deltaScreenY) for Gimmick 1 Shake!
      const deltaScreenX = window.screenX - lastScreenX;
      const deltaScreenY = window.screenY - lastScreenY;
      lastScreenX = window.screenX;
      lastScreenY = window.screenY;

      if (Math.hypot(deltaScreenX, deltaScreenY) > 2) {
        shakeImpulseRef.current.dx += deltaScreenX * 1.35;
        shakeImpulseRef.current.dy += deltaScreenY * 1.35;
      }

      // Expire stale pop-out windows if closed unexpectedly
      if (lastLensSyncTimeRef.current > 0 && now - lastLensSyncTimeRef.current > 800) {
        lastLensSyncTimeRef.current = 0;
        setRemoteLensPopupRect(null);
      }
      if (lastLaserSyncTimeRef.current > 0 && now - lastLaserSyncTimeRef.current > 800) {
        lastLaserSyncTimeRef.current = 0;
        setRemoteLaserPopupState(null);
      }

      // 2. Broadcast Main Window screen coordinates & Blueprint / Receiver coordinates at 60Hz
      if (bc) {
        const chromeOffsetX = Math.max(0, (window.outerWidth - window.innerWidth) / 2);
        const chromeOffsetY = Math.max(0, window.outerHeight - window.innerHeight);

        const termWin = terminalWinRef.current;
        const mainPayload: ScreenGeometryPayload = {
          role: 'main',
          screenX: window.screenX,
          screenY: window.screenY,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          chromeOffsetX,
          chromeOffsetY,
          blueprintViewportRect: blueprintGeoRef.current.viewportRect,
          receiverPortViewportPos: {
            x: termWin.x,
            y: termWin.y + termWin.height * 0.5,
          },
          secretDigit2: passcodeDigitsRef.current[1],
          secretCoordLocal: blueprintGeoRef.current.secretCoord,
          timestamp: now,
        };
        bc.postMessage(mainPayload);
      }

      animId = requestAnimationFrame(tickMultiWindowSync);
    };

    animId = requestAnimationFrame(tickMultiWindowSync);
    return () => {
      cancelAnimationFrame(animId);
      if (bc) bc.close();
    };
  }, []);

  // Sync window cleared badges
  useEffect(() => {
    setWindows((prev) => ({
      ...prev,
      module1: {
        ...prev.module1,
        isCleared: clearedModules[0],
        clearedDigit: passcodeDigits[0],
      },
      module2: {
        ...prev.module2,
        isCleared: clearedModules[1],
        clearedDigit: passcodeDigits[1],
      },
      module3: {
        ...prev.module3,
        isCleared: clearedModules[2],
        clearedDigit: passcodeDigits[2],
      },
      module4: {
        ...prev.module4,
        isCleared: clearedModules[3],
        clearedDigit: passcodeDigits[3],
      },
      module5_terminal: {
        ...prev.module5_terminal,
        isCleared: clearedModules[4],
        clearedDigit: passcodeDigits[4],
      },
    }));
  }, [clearedModules, passcodeDigits]);

  const focusWindow = useCallback((id: string) => {
    topZRef.current += 1;
    const nextZ = topZRef.current;
    setWindows((prev) => {
      const target = prev[id];
      if (!target) return prev;
      return {
        ...prev,
        [id]: {
          ...target,
          isOpen: true,
          zIndex: nextZ,
        },
      };
    });
  }, []);

  const moveWindow = useCallback(
    (id: string, x: number, y: number, deltaX: number, deltaY: number) => {
      if (id === 'module1') {
        shakeImpulseRef.current.dx += deltaX;
        shakeImpulseRef.current.dy += deltaY;
      }
      setWindows((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          x,
          y,
        },
      }));
    },
    []
  );

  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    setWindows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        width,
        height,
      },
    }));
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isOpen: false,
      },
    }));
  }, []);

  const handlePopOutWindow = useCallback(
    (role: 'lens' | 'laser') => {
      const url = new URL(window.location.href);
      url.searchParams.set('role', role);

      const features =
        role === 'lens'
          ? 'width=360,height=320,left=150,top=150'
          : 'width=340,height=260,left=100,top=400';
      const targetName = role === 'lens' ? 'VaultLens' : 'VaultLaser';

      let popup: Window | null = null;
      try {
        popup = window.open(url.toString(), targetName, features);
      } catch {
        popup = null;
      }

      // Always ensure the in-page window is also focused/accessible if popup is blocked by sandbox
      if (!popup) {
        focusWindow(role === 'lens' ? 'lens' : 'module5_emitter');
      }
    },
    [focusWindow]
  );

  const resetDesktopLayout = () => {
    cyberAudio.playClick();
    setWindows(createInitialWindows(window.innerWidth, window.innerHeight));
  };

  const handleRestartGame = () => {
    cyberAudio.playClick(1.2);
    const newDigits = generatePasscode();
    shakeImpulseRef.current = { dx: 0, dy: 0 };
    setGameSessionId((prev) => prev + 1);
    setPasscodeDigits(newDigits);
    setClearedModules([false, false, false, false, false]);
    setKeypadDigits(['', '', '', '', '']);
    setIsSystemUnlocked(false);
    setUnlockError(false);
    setWindows(createInitialWindows(window.innerWidth, window.innerHeight));
  };

  // Gimmick 2 In-Page Lens Overlap
  const lensWin = windows.lens;
  const blueprintWin = windows.module2;
  const inPageLensViewportRect: Rect | null = lensWin.isOpen
    ? {
        x: lensWin.x,
        y: lensWin.y + 32,
        width: lensWin.width,
        height: lensWin.height - 32,
      }
    : null;

  const blueprintViewportRect: Rect = {
    x: blueprintWin.x,
    y: blueprintWin.y + 32,
    width: blueprintWin.width,
    height: blueprintWin.height - 32,
  };

  const lensOverlapState =
    inPageLensViewportRect && blueprintWin.isOpen
      ? computeOverlapRegion(blueprintViewportRect, inPageLensViewportRect, {
          x: blueprintViewportRect.width * 0.45,
          y: blueprintViewportRect.height * 0.45,
        })
      : { hasOverlap: false, intersectionLocal: null, isTargetRevealed: false };

  // Gimmick 5 Laser Alignment (Supports both In-Page Emitter and Real Pop-out Laser Window!)
  const emitterWin = windows.module5_emitter;
  const terminalWin = windows.module5_terminal;
  const inPageLaserState =
    emitterWin.isOpen && terminalWin.isOpen
      ? evaluateLaserAlignment(
          {
            x: emitterWin.x,
            y: emitterWin.y,
            width: emitterWin.width,
            height: emitterWin.height,
          },
          {
            x: terminalWin.x,
            y: terminalWin.y,
            width: terminalWin.width,
            height: terminalWin.height,
          }
        )
      : {
          isConnected: false,
          emitterPortPos: { x: 0, y: 0 },
          terminalPortPos: { x: 0, y: 0 },
          horizontalGap: 999,
          verticalOffset: 999,
        };

  let popupLaserConnected = false;
  let popupEmitterViewportPos: { x: number; y: number } | null = null;
  if (remoteLaserPopupState && terminalWin.isOpen) {
    const chromeOffsetX = Math.max(0, (window.outerWidth - window.innerWidth) / 2);
    const chromeOffsetY = Math.max(0, window.outerHeight - window.innerHeight);

    const popupRightScreenX =
      remoteLaserPopupState.screenX + remoteLaserPopupState.outerWidth;
    const popupCenterScreenY =
      remoteLaserPopupState.screenY + remoteLaserPopupState.outerHeight / 2;

    const localEmitterX = popupRightScreenX - (window.screenX + chromeOffsetX);
    const localEmitterY = popupCenterScreenY - (window.screenY + chromeOffsetY);

    const terminalPortX = terminalWin.x;
    const terminalPortY = terminalWin.y + terminalWin.height * 0.5;

    const hGap = terminalPortX - localEmitterX;
    const vDiff = Math.abs(terminalPortY - localEmitterY);
    popupLaserConnected = hGap >= -60 && hGap <= 320 && vDiff <= 65;
    popupEmitterViewportPos = { x: Math.max(0, localEmitterX), y: localEmitterY };
  }

  const isLaserConnected = inPageLaserState.isConnected || popupLaserConnected;

  const handleKeypadChange = (idx: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    setUnlockError(false);
    cyberAudio.playClick(1 + idx * 0.08);

    setKeypadDigits((prev) => {
      const next = [...prev];
      next[idx] = clean;
      return next;
    });

    if (clean && idx < 4) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeypadKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !keypadDigits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'Enter') {
      handleUnlockSubmit();
    }
  };

  const handleUnlockSubmit = () => {
    const joined = keypadDigits.join('');
    if (verifyMasterPasscode(joined, passcodeDigits)) {
      setUnlockError(false);
      setIsSystemUnlocked(true);
      cyberAudio.playSystemUnlockFanfare();
    } else {
      setUnlockError(true);
      cyberAudio.playErrorBuzz();
    }
  };

  const toggleAudioMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    cyberAudio.setMuted(nextMuted);
    if (!nextMuted) {
      cyberAudio.playClick();
    }
  };

  const clearedCount = clearedModules.filter(Boolean).length;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-drafting-grid text-[#141413] select-none">
      {/* Optical Laser Bridge & Paper Confetti Canvas */}
      <CyberDesktopCanvas
        laserConnection={{
          active: isLaserConnected,
          emitterPos: popupLaserConnected
            ? popupEmitterViewportPos
            : emitterWin.isOpen
            ? inPageLaserState.emitterPortPos
            : null,
          terminalPos: terminalWin.isOpen ? inPageLaserState.terminalPortPos : null,
        }}
        isSystemUnlocked={isSystemUnlocked}
      />

      {/* TOP INSTRUMENT BAR (Teenage Engineering / Braun Swiss Style) */}
      <header className="fixed top-0 left-0 right-0 h-13 z-[200] bg-[#FFFFFF] border-b-[1.5px] border-[#141413] px-2.5 sm:px-4 flex items-center justify-between gap-2">
        {/* Left: Brand & Vault Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="hidden sm:flex items-center gap-2 font-display font-bold text-sm tracking-tight text-[#141413] whitespace-nowrap">
            <span className="px-1.5 py-0.5 bg-[#141413] text-[#F4F1EA] font-mono text-xs">
              TE-05
            </span>
            <span>THE VAULT : PHYSICAL WINDOW PUZZLE</span>
          </div>

          <div
            data-testid="system-status-badge"
            className={`flex items-center gap-1 px-2 py-1 border-[1.5px] border-[#141413] font-mono text-[11px] font-bold whitespace-nowrap ${
              isSystemUnlocked
                ? 'bg-[#008A4B] text-white'
                : 'bg-[#FF4F00] text-white'
            }`}
          >
            {isSystemUnlocked ? (
              <>
                <Unlock className="w-3 h-3" />
                <span>VAULT OPEN</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3" />
                <span>VAULT SEALED</span>
              </>
            )}
          </div>

          <div
            data-testid="hack-progress"
            className="hidden md:flex items-center gap-1.5 font-mono text-xs text-[#141413] whitespace-nowrap"
          >
            <span className="text-[#78756E] font-bold">PINS:</span>
            <span className="font-bold tabular-nums">{clearedCount}/5</span>
          </div>
        </div>

        {/* Right: 5-Digit Mechanical Tumbler Keypad & UNLOCK Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="hidden lg:inline font-mono text-[11px] text-[#141413] font-bold">
            MASTER COMBINATION:
          </span>

          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                aria-label={`Master Code Digit ${idx + 1}`}
                value={keypadDigits[idx]}
                onChange={(e) => handleKeypadChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeypadKeyDown(idx, e)}
                placeholder={clearedModules[idx] ? passcodeDigits[idx] : '-'}
                className={`w-7 h-7 sm:w-8 sm:h-8 text-center font-mono text-xs sm:text-sm font-bold rounded-none border-[1.5px] border-[#141413] focus:outline-none transition-colors ${
                  unlockError
                    ? 'bg-[#FF4F00] text-white'
                    : clearedModules[idx]
                    ? 'bg-[#008A4B] text-white'
                    : 'bg-[#F4F1EA] text-[#141413] focus:bg-[#FFFFFF]'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleUnlockSubmit}
            className="px-2.5 sm:px-3.5 py-1.5 bg-[#141413] hover:bg-[#FF4F00] text-white border-[1.5px] border-[#141413] shadow-mechanical-sm font-mono text-xs font-bold tracking-tight transition-colors cursor-pointer whitespace-nowrap"
          >
            [UNLOCK]
          </button>

          <button
            type="button"
            onClick={toggleAudioMute}
            aria-label={isMuted ? '오디오 켜기' : '오디오 끄기'}
            className={`px-2 sm:px-2.5 py-1.5 border-[1.5px] border-[#141413] font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              isMuted
                ? 'bg-[#E6E2D8] text-[#78756E]'
                : 'bg-[#F4F1EA] text-[#141413]'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden xl:inline">{isMuted ? 'MUTE' : 'AUDIO'}</span>
          </button>
        </div>
      </header>

      {/* WORKSPACE CANVAS */}
      <main className="relative w-full h-full pt-14 pb-14">
        {/* Technical Manual Window */}
        <CyberWindow
          win={windows.briefing}
          onFocus={focusWindow}
          onMove={moveWindow}
          onResize={resizeWindow}
          onClose={closeWindow}
        >
          <MissionBriefingModule
            clearedStatus={clearedModules}
            passcodeDigits={passcodeDigits}
            onFocusModule={focusWindow}
          />
        </CyberWindow>

        {/* Module 01: Kinetic Dust Filter */}
        <CyberWindow
          win={windows.module1}
          onFocus={focusWindow}
          onMove={moveWindow}
          onResize={resizeWindow}
          onClose={closeWindow}
        >
          <DustySensorModule
            key={`module1-${gameSessionId}`}
            digit={passcodeDigits[0]}
            shakeImpulseRef={shakeImpulseRef}
            isCleared={clearedModules[0]}
            onCleared={() => markModuleCleared(0)}
          />
        </CyberWindow>

        {/* Module 02: Sealed Blueprint */}
        <CyberWindow
          win={windows.module2}
          onFocus={focusWindow}
          onMove={moveWindow}
          onResize={resizeWindow}
          onClose={closeWindow}
        >
          <BlueprintModule
            key={`module2-${gameSessionId}`}
            digit={passcodeDigits[1]}
            inPageLensRect={inPageLensViewportRect}
            remotePopupScreenRect={remoteLensPopupRect}
            isCleared={clearedModules[1]}
            onCleared={() => markModuleCleared(1)}
            onPopOutLensWindow={() => handlePopOutWindow('lens')}
            onReportBlueprintGeometry={(rect, secret) => {
              blueprintGeoRef.current = { viewportRect: rect, secretCoord: secret };
            }}
            onAlignInPageLens={(screenX, screenY) => {
              focusWindow('lens');
              setWindows((prev) => ({
                ...prev,
                lens: {
                  ...prev.lens,
                  isOpen: true,
                  x: screenX,
                  y: screenY,
                  zIndex: topZRef.current + 1,
                },
              }));
            }}
          />
        </CyberWindow>

        {/* In-Page Optic Lens Window */}
        <CyberWindow
          win={windows.lens}
          onFocus={focusWindow}
          onMove={moveWindow}
          onResize={resizeWindow}
          onClose={closeWindow}
        >
          <XRayLensModule
            isOverlapping={lensOverlapState.hasOverlap}
            isTargetRevealed={clearedModules[1]}
            secondDigit={passcodeDigits[1]}
          />
        </CyberWindow>

        {/* Module 03: Thermal Lock */}
        <CyberWindow
          win={windows.module3}
          onFocus={focusWindow}
          onMove={moveWindow}
          onResize={resizeWindow}
          onClose={closeWindow}
        >
          <OverheatedCoreModule
            key={`module3-${gameSessionId}`}
            digit={passcodeDigits[2]}
            isCleared={clearedModules[2]}
            onCleared={() => markModuleCleared(2)}
          />
        </CyberWindow>

        {/* Module 04: Mechanical Caliper */}
        <CyberWindow
          win={windows.module4}
          onFocus={focusWindow}
          onMove={moveWindow}
          onResize={resizeWindow}
          onClose={closeWindow}
        >
          <DimensionalTunerModule
            key={`module4-${gameSessionId}`}
            digit={passcodeDigits[3]}
            windowWidth={windows.module4.width}
            windowHeight={windows.module4.height}
            isCleared={clearedModules[3]}
            onCleared={() => markModuleCleared(3)}
            onAutoCalibrateResize={(targetW, targetH) => {
              focusWindow('module4');
              resizeWindow('module4', targetW, targetH);
            }}
          />
        </CyberWindow>

        {/* Module 05-A: Optical Laser Emitter */}
        <CyberWindow
          win={windows.module5_emitter}
          onFocus={focusWindow}
          onMove={moveWindow}
          onResize={resizeWindow}
          onClose={closeWindow}
          rightPortLabel="635nm Laser Output Port"
          rightPortActive={isLaserConnected}
        >
          <PowerEmitterModule
            isConnected={isLaserConnected}
            onPopOutLaserWindow={() => handlePopOutWindow('laser')}
            onAutoAlignToTerminal={() => {
              focusWindow('module5_terminal');
              focusWindow('module5_emitter');
              setWindows((prev) => {
                const term = prev.module5_terminal;
                const emit = prev.module5_emitter;
                const targetX = Math.max(12, term.x - emit.width - 24);
                const targetY = term.y + (term.height - emit.height) / 2;
                return {
                  ...prev,
                  module5_terminal: { ...term, isOpen: true },
                  module5_emitter: {
                    ...emit,
                    isOpen: true,
                    x: targetX,
                    y: targetY,
                  },
                };
              });
            }}
          />
        </CyberWindow>

        {/* Module 05-B: Optical Receiver & Teletype */}
        <CyberWindow
          win={windows.module5_terminal}
          onFocus={focusWindow}
          onMove={moveWindow}
          onResize={resizeWindow}
          onClose={closeWindow}
          leftPortLabel="Optical Receiver Port (OPT-IN)"
          leftPortActive={isLaserConnected}
        >
          <SecurityTerminalModule
            key={`module5-${gameSessionId}`}
            digit={passcodeDigits[4]}
            isPowered={isLaserConnected}
            isCleared={clearedModules[4]}
            onCleared={() => markModuleCleared(4)}
            onOpenEmitter={() => focusWindow('module5_emitter')}
            onPopOutLaserWindow={() => handlePopOutWindow('laser')}
          />
        </CyberWindow>
      </main>

      {/* BOTTOM INSTRUMENT DOCK */}
      <footer className="fixed bottom-0 left-0 right-0 h-12 z-[200] bg-[#FFFFFF] border-t-[1.5px] border-[#141413] px-3 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick();
              focusWindow('briefing');
            }}
            className={`px-2.5 py-1 font-mono text-xs font-bold flex items-center gap-1.5 border-[1.5px] border-[#141413] transition-colors cursor-pointer whitespace-nowrap ${
              windows.briefing.isOpen
                ? 'bg-[#141413] text-white'
                : 'bg-[#F4F1EA] text-[#141413] hover:bg-[#E6E2D8]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>[매뉴얼 브리핑]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick();
              handlePopOutWindow('lens');
            }}
            className="px-2.5 py-1 bg-[#FF4F00] hover:bg-[#e04500] text-white border-[1.5px] border-[#141413] font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>[팝업: 투시 렌즈]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick();
              handlePopOutWindow('laser');
            }}
            className="px-2.5 py-1 bg-[#FF4F00] hover:bg-[#e04500] text-white border-[1.5px] border-[#141413] font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>[팝업: 레이저 송신기]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick();
              focusWindow('lens');
            }}
            className={`px-2.5 py-1 font-mono text-xs font-bold flex items-center gap-1 border-[1.5px] border-[#141413] transition-colors cursor-pointer whitespace-nowrap ${
              windows.lens.isOpen
                ? 'bg-[#141413] text-white'
                : 'bg-[#F4F1EA] text-[#141413]'
            }`}
          >
            <ScanEye className="w-3.5 h-3.5" />
            <span>[인페이지 렌즈]</span>
          </button>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick();
              focusWindow('module5_terminal');
            }}
            className={`px-2.5 py-1 font-mono text-xs font-bold flex items-center gap-1 border-[1.5px] border-[#141413] transition-colors cursor-pointer whitespace-nowrap ${
              windows.module5_terminal.isOpen
                ? 'bg-[#141413] text-white'
                : 'bg-[#F4F1EA] text-[#141413]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>[텔레프린터]</span>
          </button>

          <span className="text-[#141413]/30 mx-1">|</span>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick();
              focusWindow('module1');
            }}
            className="px-2 py-1 bg-[#F4F1EA] hover:bg-[#E6E2D8] border border-[#141413] text-[11px] font-mono font-bold text-[#141413] flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Activity className="w-3 h-3 text-[#FF4F00]" />
            <span>01:DUST</span>
            {clearedModules[0] && <Check className="w-3 h-3 text-[#008A4B]" />}
          </button>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick();
              focusWindow('module2');
            }}
            className="px-2 py-1 bg-[#F4F1EA] hover:bg-[#E6E2D8] border border-[#141413] text-[11px] font-mono font-bold text-[#141413] flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <ScanEye className="w-3 h-3 text-[#0047FF]" />
            <span>02:BLUEPRINT</span>
            {clearedModules[1] && <Check className="w-3 h-3 text-[#008A4B]" />}
          </button>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick();
              focusWindow('module3');
            }}
            className="px-2 py-1 bg-[#F4F1EA] hover:bg-[#E6E2D8] border border-[#141413] text-[11px] font-mono font-bold text-[#141413] flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Flame className="w-3 h-3 text-[#FF4F00]" />
            <span>03:THERMAL</span>
            {clearedModules[2] && <Check className="w-3 h-3 text-[#008A4B]" />}
          </button>

          <button
            type="button"
            onClick={() => {
              cyberAudio.playClick();
              focusWindow('module4');
            }}
            className="px-2 py-1 bg-[#F4F1EA] hover:bg-[#E6E2D8] border border-[#141413] text-[11px] font-mono font-bold text-[#141413] flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Maximize2 className="w-3 h-3 text-[#0047FF]" />
            <span>04:CALIPER</span>
            {clearedModules[3] && <Check className="w-3 h-3 text-[#008A4B]" />}
          </button>
        </div>

        <button
          type="button"
          onClick={resetDesktopLayout}
          className="px-2.5 py-1 bg-[#E6E2D8] hover:bg-[#141413] hover:text-white border-[1.5px] border-[#141413] font-mono text-[11px] font-bold text-[#141413] flex items-center gap-1 cursor-pointer whitespace-nowrap"
        >
          <LayoutGrid className="w-3 h-3" />
          <span>레이아웃 초기화</span>
        </button>
      </footer>

      {/* CERTIFICATE OF UNLOCK MODAL (Swiss International Typography Style) */}
      {isSystemUnlocked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="victory-modal-title"
          className="fixed inset-0 z-[500] flex items-center justify-center bg-[#141413]/65 p-4"
        >
          <div className="max-w-md w-full bg-[#F4F1EA] border-2 border-[#141413] shadow-mechanical-lg p-6 text-left space-y-5">
            <div className="flex items-center justify-between border-b-2 border-[#141413] pb-3">
              <div>
                <div className="font-mono text-[10px] font-bold text-[#FF4F00] tracking-widest">
                  DOCUMENT // CERT-TE05-UNLOCKED
                </div>
                <h1
                  id="victory-modal-title"
                  className="text-2xl font-display font-bold tracking-tight text-[#141413] mt-0.5"
                >
                  CERTIFICATE OF UNLOCK
                </h1>
              </div>
              <div className="w-11 h-11 bg-[#008A4B] text-white border-[1.5px] border-[#141413] flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
            </div>

            <p className="text-xs text-[#141413] leading-relaxed font-medium">
              5가지 물리/센서/멀티윈도우 계측 기믹을 모두 정밀 해독하여 마스터 금고 잠금장치를
              성공적으로 개방했습니다.
            </p>

            <div className="p-3 bg-[#FFFFFF] border-[1.5px] border-[#141413] font-mono space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-[#78756E]">
                <span>VERIFIED VAULT COMBINATION</span>
                <span className="text-[#008A4B]">STATUS: AUTHENTICATED</span>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                {passcodeDigits.map((digit, i) => (
                  <span
                    key={i}
                    className="w-11 h-12 bg-[#008A4B] text-white border-[1.5px] border-[#141413] shadow-mechanical-sm text-xl font-bold flex items-center justify-center"
                  >
                    {digit}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                data-start="true"
                onClick={handleRestartGame}
                className="flex-1 py-2.5 px-4 bg-[#FF4F00] hover:bg-[#e04500] text-white border-[1.5px] border-[#141413] shadow-mechanical-sm font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>새 금고 암호로 재도전</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSystemUnlocked(false)}
                className="py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#E6E2D8] text-[#141413] border-[1.5px] border-[#141413] shadow-mechanical-sm font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                패널 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
