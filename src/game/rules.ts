export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  cleared: boolean;
}

export interface ScreenGeometryPayload {
  role: 'main' | 'lens' | 'laser';
  screenX: number;
  screenY: number;
  outerWidth: number;
  outerHeight: number;
  innerWidth: number;
  innerHeight: number;
  chromeOffsetX: number;
  chromeOffsetY: number;
  blueprintViewportRect?: Rect;
  receiverPortViewportPos?: { x: number; y: number };
  secretDigit2?: string;
  secretCoordLocal?: { x: number; y: number };
  timestamp: number;
}

/**
 * Generates a 5-digit secret code.
 * If deterministicSeed is provided, generates deterministic digits for reproducible testing.
 */
export function generatePasscode(deterministicSeed?: string): string[] {
  if (deterministicSeed && /^\d{5}$/.test(deterministicSeed)) {
    return deterministicSeed.split('');
  }
  const digits: string[] = [];
  for (let i = 0; i < 5; i++) {
    digits.push(String(Math.floor(Math.random() * 10)));
  }
  return digits;
}

/**
 * Gimmick 1: Kinetic Browser / Window Shake Physics
 * Calculates iron filings / sand particle displacement and clearance ratio based on
 * either real browser window movement (deltaScreenX, deltaScreenY) or module drag delta.
 */
export function stepDustPhysics(
  particles: DustParticle[],
  deltaX: number,
  deltaY: number,
  canvasWidth: number,
  canvasHeight: number,
  dt: number
): { clearedRatio: number; isCleared: boolean } {
  const shakeImpulse = Math.hypot(deltaX, deltaY);
  const floorThreshold = canvasHeight - 24;
  let clearedCount = 0;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.cleared) {
      clearedCount++;
      continue;
    }

    if (shakeImpulse > 2.5) {
      p.vx += -deltaX * 0.48 + (Math.random() - 0.5) * shakeImpulse * 0.7;
      p.vy += Math.abs(deltaX) * 0.28 + Math.abs(deltaY) * 0.48 + Math.random() * 2.8;
    }

    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 1.1 || p.y > canvasHeight * 0.58) {
      p.vy += 310 * dt; // Gravity acceleration
    }

    p.x += p.vx * dt * 15;
    p.y += p.vy * dt * 15;

    // Damping
    p.vx *= 0.91;
    p.vy *= 0.94;

    if (p.x < 6) {
      p.x = 6;
      p.vx = Math.abs(p.vx) * 0.6;
    } else if (p.x > canvasWidth - 6) {
      p.x = canvasWidth - 6;
      p.vx = -Math.abs(p.vx) * 0.6;
    }

    if (p.y < 6) {
      p.y = 6;
      p.vy = Math.abs(p.vy) * 0.5;
    }

    if (p.y >= floorThreshold) {
      p.y = floorThreshold + (i % 5);
      p.vx = 0;
      p.vy = 0;
      p.cleared = true;
      clearedCount++;
    }
  }

  const clearedRatio = particles.length > 0 ? clearedCount / particles.length : 1;
  return {
    clearedRatio,
    isCleared: clearedRatio >= 0.85,
  };
}

/**
 * Gimmick 2: Multi-Window / Multi-Browser X-Ray Magnifier Overlap
 * Works in both local viewport coordinates (in-page lens) AND OS monitor screen coordinates
 * (`main.screenX + blueprintRect.left` vs `lens.screenX`).
 */
export function computeOverlapRegion(
  blueprintRect: Rect,
  lensRect: Rect,
  targetLocalPos: { x: number; y: number }
): {
  hasOverlap: boolean;
  intersectionLocal: Rect | null;
  isTargetRevealed: boolean;
} {
  const left = Math.max(blueprintRect.x, lensRect.x);
  const top = Math.max(blueprintRect.y, lensRect.y);
  const right = Math.min(blueprintRect.x + blueprintRect.width, lensRect.x + lensRect.width);
  const bottom = Math.min(blueprintRect.y + blueprintRect.height, lensRect.y + lensRect.height);

  if (right <= left || bottom <= top) {
    return {
      hasOverlap: false,
      intersectionLocal: null,
      isTargetRevealed: false,
    };
  }

  const intersectionLocal: Rect = {
    x: left - blueprintRect.x,
    y: top - blueprintRect.y,
    width: right - left,
    height: bottom - top,
  };

  const margin = 16;
  const isTargetRevealed =
    targetLocalPos.x >= intersectionLocal.x + margin &&
    targetLocalPos.x <= intersectionLocal.x + intersectionLocal.width - margin &&
    targetLocalPos.y >= intersectionLocal.y + margin &&
    targetLocalPos.y <= intersectionLocal.y + intersectionLocal.height - margin;

  return {
    hasOverlap: true,
    intersectionLocal,
    isTargetRevealed,
  };
}

/**
 * Computes monitor-space Rect of a DOM element inside a browser window.
 */
export function toScreenRect(
  winScreenX: number,
  winScreenY: number,
  chromeOffsetX: number,
  chromeOffsetY: number,
  viewportRect: Rect
): Rect {
  return {
    x: winScreenX + chromeOffsetX + viewportRect.x,
    y: winScreenY + chromeOffsetY + viewportRect.y,
    width: viewportRect.width,
    height: viewportRect.height,
  };
}

/**
 * Gimmick 3: Thermal Lock Acoustic Anemometer & Bellows Cooling (100.0°C -> 0.0°C)
 */
export function stepCoreCooling(
  currentTemp: number,
  micVolumeNormalized: number, // 0.0 to 1.0
  manualPumpTriggered: boolean,
  dt: number
): { nextTemp: number; isCleared: boolean; fanSpeedRpm: number } {
  if (currentTemp <= 0) {
    return { nextTemp: 0, isCleared: true, fanSpeedRpm: 1200 };
  }

  let deltaTemp = 0;

  if (micVolumeNormalized > 0.08) {
    deltaTemp -= micVolumeNormalized * 42 * dt;
  } else {
    // Slight thermal recovery when idle above 0
    deltaTemp += 1.5 * dt;
  }

  if (manualPumpTriggered) {
    deltaTemp -= 16.5;
  }

  const rawNext = Math.max(0, Math.min(100, currentTemp + deltaTemp));
  const nextTemp = Math.round(rawNext * 10) / 10;
  const fanSpeedRpm = Math.round(
    240 + micVolumeNormalized * 3600 + (manualPumpTriggered ? 1600 : 0)
  );

  return {
    nextTemp,
    isCleared: nextTemp === 0,
    fanSpeedRpm,
  };
}

/**
 * Gimmick 4: Mechanical Caliper / Browser Resize Calibration (550px × 250px ±15px)
 */
export function evaluateResizeSync(
  currentWidth: number,
  currentHeight: number,
  targetWidth: number = 550,
  targetHeight: number = 250,
  tolerance: number = 15
): {
  widthDiff: number;
  heightDiff: number;
  inSync: boolean;
  syncAccuracy: number; // 0.0 to 1.0
} {
  const widthDiff = Math.abs(Math.round(currentWidth) - targetWidth);
  const heightDiff = Math.abs(Math.round(currentHeight) - targetHeight);
  const inSync = widthDiff <= tolerance && heightDiff <= tolerance;

  const maxError = 220;
  const totalError = Math.hypot(widthDiff, heightDiff);
  const syncAccuracy = Math.max(0, Math.min(1, 1 - totalError / maxError));

  return {
    widthDiff,
    heightDiff,
    inSync,
    syncAccuracy,
  };
}

/**
 * Gimmick 5: Cross-Window Optical Laser Alignment & Teletype Terminal
 */
export function evaluateLaserAlignment(
  emitterRect: Rect,
  terminalRect: Rect,
  emitterPortOffsetYRatio: number = 0.5,
  terminalPortOffsetYRatio: number = 0.5
): {
  isConnected: boolean;
  emitterPortPos: { x: number; y: number };
  terminalPortPos: { x: number; y: number };
  horizontalGap: number;
  verticalOffset: number;
} {
  const emitterPortPos = {
    x: emitterRect.x + emitterRect.width,
    y: emitterRect.y + emitterRect.height * emitterPortOffsetYRatio,
  };

  const terminalPortPos = {
    x: terminalRect.x,
    y: terminalRect.y + terminalRect.height * terminalPortOffsetYRatio,
  };

  const horizontalGap = terminalPortPos.x - emitterPortPos.x;
  const verticalOffset = Math.abs(terminalPortPos.y - emitterPortPos.y);

  const isConnected =
    horizontalGap >= -45 &&
    horizontalGap <= 280 &&
    verticalOffset <= 52;

  return {
    isConnected,
    emitterPortPos,
    terminalPortPos,
    horizontalGap,
    verticalOffset,
  };
}

/**
 * Evaluates Teletype Terminal commands when optical laser power is connected.
 */
export function executeTerminalCommand(
  rawCommand: string,
  isPowered: boolean,
  fifthDigit: string
): {
  outputLines: string[];
  unlockedDigit: boolean;
  easterEggLog?: string;
} {
  const cmd = rawCommand.trim().toLowerCase();

  if (!isPowered) {
    return {
      outputLines: ['[FAULT] OPTICAL RECEIVER OFFLINE. ALIGN LASER EMITTER TO LEFT PORT.'],
      unlockedDigit: false,
    };
  }

  if (cmd === 'help' || cmd === '?') {
    return {
      outputLines: [
        '=== TELETYPE ARCHIVE UNIT // MODEL TP-05 ===',
        'COMMANDS: help | status | decrypt | clear',
      ],
      unlockedDigit: false,
    };
  }

  if (cmd === 'status') {
    return {
      outputLines: [
        'OPTICAL LINK : LOCKED (635nm COHERENT BEAM)',
        'VAULT PIN #05: SEALED — RUN "decrypt" TO PUNCH TAPE',
      ],
      unlockedDigit: false,
    };
  }

  if (cmd === 'decrypt' || cmd === 'print' || cmd === 'unlock') {
    return {
      outputLines: [
        'FEEDING PUNCHED PAPER TAPE...',
        'ESCAPEMENT RELAY ENGAGED... OK',
        `TAPE OUTPUT // PIN #05 = [ ${fifthDigit} ]`,
      ],
      unlockedDigit: true,
      easterEggLog: `[THE VAULT] Mechanical Teletype Tape Punched! 5th Vault Digit: ${fifthDigit}`,
    };
  }

  return {
    outputLines: [`UNKNOWN DIRECTIVE "${rawCommand}". TYPE "decrypt".`],
    unlockedDigit: false,
  };
}

/**
 * Verifies the 5-digit master vault passcode.
 */
export function verifyMasterPasscode(inputCode: string, targetDigits: string[]): boolean {
  const normalized = inputCode.replace(/\s+/g, '');
  return normalized.length === 5 && normalized === targetDigits.join('');
}
