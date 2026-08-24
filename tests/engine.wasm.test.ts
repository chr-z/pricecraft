// PriceCraft v2 — Vitest suite against the REAL Rust/WASM engine bundle
// (src/pkg), mirroring the known-answer vectors of v1's tests/core.test.js.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import init, {
  computeCostPlus,
  computeValueBased,
  psychological,
  markupFromMargin,
  marginFromMarkup,
  breakEvenUnits,
} from '../src/pkg/pricecraft_engine.js';

let engineReady = false;
beforeAll(async () => {
  const wasmBytes = readFileSync(new URL('../src/pkg/pricecraft_engine_bg.wasm', import.meta.url));
  await init({ module_or_path: wasmBytes });
  engineReady = true;
});

function assertWasm(): void {
  if (!engineReady) throw new Error('wasm engine not initialized');
}

describe('computeCostPlus (Rust/WASM)', () => {
  it('cost-plus: materials+labor+overhead+margin compose correctly', async () => {
    assertWasm();
    // 10 mat + (2h x 25) = 60 production; +20% overhead = 72; margin 50% -> 144
    const r = computeCostPlus(10, 2, 25, 20, 50);
    expect(r).not.toBeUndefined();
    expect(r!.productionCost).toBe(60);
    expect(r!.overhead).toBe(12);
    expect(r!.totalCost).toBe(72);
    expect(r!.suggestedPrice).toBe(144); // 72 / (1-0.5)
    expect(r!.profit).toBe(72);
  });

  it('cost-plus: zero overhead and margin yields pure cost recovery price', () => {
    const r = computeCostPlus(40, 1, 20, 0, 0);
    expect(r!.suggestedPrice).toBe(60);
    expect(r!.profit).toBe(0);
  });

  it('cost-plus: negative inputs are rejected with undefined (null-ish)', () => {
    expect(computeCostPlus(-1, 2, 25, 0, 0)).toBeUndefined();
    expect(computeCostPlus(NaN, 2, 25, 0, 0)).toBeUndefined();
  });

  it('cost-plus: margin of 100% is impossible -> undefined', () => {
    expect(computeCostPlus(10, 0, 0, 0, 100)).toBeUndefined();
  });

  it('cost-plus: profit equals suggestedPrice - totalCost', () => {
    const r = computeCostPlus(7.3, 1.5, 18, 12, 35)!;
    expect(Math.abs(r.suggestedPrice - r.totalCost - r.profit)).toBeLessThan(0.01);
  });
});

describe('computeValueBased (Rust/WASM)', () => {
  it('value-based: median of even anchors is the mean of the middle two', () => {
    const r = computeValueBased(new Float64Array([30, 10, 20, 40]), 1)!;
    expect(r.median).toBe(25);
    expect(r.min).toBe(10);
    expect(r.max).toBe(40);
    expect(r.referencePrice).toBe(25);
  });

  it('value-based: multiplier scales the median reference', () => {
    const r = computeValueBased(new Float64Array([20, 30, 40]), 1.5)!;
    expect(r.median).toBe(30);
    expect(r.referencePrice).toBe(45);
  });

  it('value-based: empty anchors and bad multipliers return undefined', () => {
    expect(computeValueBased(new Float64Array([]), 2)).toBeUndefined();
    expect(computeValueBased(new Float64Array([Number.NaN, Infinity, -5]), 2)).toBeUndefined();
    expect(computeValueBased(new Float64Array([10, 20]), 0)).toBeUndefined();
    expect(computeValueBased(new Float64Array([10, 20]), Infinity)).toBeUndefined();
  });
});

describe('psychological (Rust/WASM)', () => {
  it('charm ending never exceeds the computed price', () => {
    expect(psychological(48.62, 'charm')).toBeCloseTo(47.99, 9);
    expect(psychological(49.05, 'charm')).toBeCloseTo(48.99, 9);
    expect(psychological(0.5, 'charm')).toBeUndefined(); // no charm price fits below 0.5
  });

  it('round rounds up to the next integer', () => {
    expect(psychological(48.2, 'round')).toBe(49);
    expect(psychological(49, 'round')).toBe(49);
  });

  it('rejects negatives and unknown modes', () => {
    expect(psychological(-5, 'round')).toBeUndefined();
    expect(psychological(10, 'bogus')).toBeUndefined();
  });
});

describe('margin <-> markup (Rust/WASM)', () => {
  it('margin 50% equals markup 100%', () => {
    expect(markupFromMargin(50)).toBeCloseTo(100, 9);
    expect(marginFromMarkup(100)).toBeCloseTo(50, 9);
  });

  it('margin<->markup conversions round-trip', () => {
    for (const m of [10, 25, 33.33, 75]) {
      const back = marginFromMarkup(markupFromMargin(m)!)!;
      expect(Math.abs(back - m)).toBeLessThan(0.01);
    }
  });
});

describe('breakEvenUnits (Rust/WASM)', () => {
  it('ceil units cover fixed costs', () => {
    // contribution 15 -> 1500/15 = 100 units
    const r = breakEvenUnits(1500, 45, 30)!;
    expect(r.units).toBe(100);
    expect(r.revenue).toBe(4500);
  });

  it('partial unit rounds up', () => {
    expect(breakEvenUnits(100, 30, 10)!.units).toBe(5);
    expect(breakEvenUnits(101, 30, 10)!.units).toBe(6); // 5.05 -> 6
  });

  it('price below variable cost can never break even -> nullish units', () => {
    const r = breakEvenUnits(500, 10, 12)!;
    expect(r.units ?? null).toBeNull();
  });

  it('negative inputs are rejected outright', () => {
    expect(breakEvenUnits(-500, 10, 12)).toBeUndefined();
    expect(breakEvenUnits(Number.NaN, 10, 12)).toBeUndefined();
  });
});
