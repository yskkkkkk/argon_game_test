import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePasscode,
  stepDustPhysics,
  computeOverlapRegion,
  toScreenRect,
  stepCoreCooling,
  evaluateResizeSync,
  evaluateLaserAlignment,
  executeTerminalCommand,
  verifyMasterPasscode,
  type DustParticle,
} from './rules.ts';

test('generatePasscode returns 5 valid single-digit strings', () => {
  const code = generatePasscode();
  assert.equal(code.length, 5);
  for (const digit of code) {
    assert.match(digit, /^\d$/);
  }
  const seeded = generatePasscode('73942');
  assert.deepEqual(seeded, ['7', '3', '9', '4', '2']);
});

test('Gimmick 1: stepDustPhysics settles filings when shaken and clears at 85%', () => {
  const particles: DustParticle[] = Array.from({ length: 10 }, (_, i) => ({
    x: 100,
    y: 80 + i * 5,
    vx: 0,
    vy: 0,
    size: 4,
    color: '#141413',
    cleared: i < 8,
  }));

  let res = stepDustPhysics(particles, 0, 0, 300, 200, 0.016);
  assert.equal(res.isCleared, false);

  for (let frame = 0; frame < 30; frame++) {
    res = stepDustPhysics(particles, frame % 2 === 0 ? 45 : -45, 30, 300, 200, 0.05);
  }
  assert.equal(res.isCleared, true);
  assert.ok(res.clearedRatio >= 0.85);
});

test('Gimmick 2: computeOverlapRegion and toScreenRect detect cross-browser overlap', () => {
  const mainBlueprintScreen = toScreenRect(100, 100, 0, 80, {
    x: 300,
    y: 60,
    width: 420,
    height: 280,
  });
  const targetLocalPos = { x: 200, y: 150 }; // Screen pos: (400+200=600, 240+150=390)

  const farPopupScreen = { x: 950, y: 200, width: 320, height: 260 };
  assert.equal(
    computeOverlapRegion(mainBlueprintScreen, farPopupScreen, targetLocalPos).isTargetRevealed,
    false
  );

  const overlappingPopupScreen = { x: 500, y: 300, width: 320, height: 260 };
  const resCover = computeOverlapRegion(
    mainBlueprintScreen,
    overlappingPopupScreen,
    targetLocalPos
  );
  assert.equal(resCover.hasOverlap, true);
  assert.equal(resCover.isTargetRevealed, true);
});

test('Gimmick 3: stepCoreCooling reduces temperature from 100.0°C down to 0.0°C', () => {
  let state = stepCoreCooling(100.0, 0.85, false, 0.5);
  assert.ok(state.nextTemp < 100.0);
  assert.equal(state.isCleared, false);

  let temp = 45.0;
  for (let i = 0; i < 4; i++) {
    state = stepCoreCooling(temp, 0, true, 0.016);
    temp = state.nextTemp;
  }
  assert.equal(temp, 0);
  assert.equal(state.isCleared, true);
});

test('Gimmick 4: evaluateResizeSync checks ±15px tolerance around 550x250', () => {
  assert.equal(evaluateResizeSync(420, 310, 550, 250, 15).inSync, false);
  assert.equal(evaluateResizeSync(550, 250, 550, 250, 15).inSync, true);
  assert.equal(evaluateResizeSync(564, 236, 550, 250, 15).inSync, true);
});

test('Gimmick 5: evaluateLaserAlignment and executeTerminalCommand unlock 5th digit', () => {
  const emitter = { x: 80, y: 400, width: 250, height: 180 };
  const terminalAligned = { x: 350, y: 390, width: 380, height: 200 };
  const terminalFar = { x: 750, y: 100, width: 380, height: 200 };

  assert.equal(evaluateLaserAlignment(emitter, terminalFar).isConnected, false);
  assert.equal(evaluateLaserAlignment(emitter, terminalAligned).isConnected, true);

  assert.equal(executeTerminalCommand('decrypt', false, '9').unlockedDigit, false);
  const decryptRes = executeTerminalCommand('decrypt', true, '9');
  assert.equal(decryptRes.unlockedDigit, true);
  assert.ok(decryptRes.outputLines.some((line) => line.includes('9')));
});

test('verifyMasterPasscode validates 5-digit code accurately', () => {
  const target = ['7', '3', '9', '4', '2'];
  assert.equal(verifyMasterPasscode('73942', target), true);
  assert.equal(verifyMasterPasscode('73940', target), false);
});
