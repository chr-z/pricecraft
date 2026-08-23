// PriceCraft — business logic tests (node --test, zero deps)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCostPlus,
  computeValueBased,
  psychological,
  markupFromMargin,
  marginFromMarkup,
  breakEvenUnits,
  formatCurrency,
} from '../js/core.js';

// ---------- computeCostPlus ----------
test('cost-plus: materials+labor+overhead+margin compose correctly', () => {
  // 10 mat + (2h × 25) = 60 production; +20% overhead = 72; margin 50% → 144
  const r = computeCostPlus({ materials: 10, laborHours: 2, hourlyRate: 25, overheadPct: 20, marginPct: 50 });
  assert.equal(r.productionCost, 60);
  assert.equal(r.overhead, 12);
  assert.equal(r.totalCost, 72);
  assert.equal(r.suggestedPrice, 144); // 72 / (1-0.5)
  assert.equal(r.profit, 72);
});

test('cost-plus: zero overhead and margin yields pure cost recovery price', () => {
  const r = computeCostPlus({ materials: 40, laborHours: 1, hourlyRate: 20, overheadPct: 0, marginPct: 0 });
  assert.equal(r.suggestedPrice, 60);
  assert.equal(r.profit, 0);
});

test('cost-plus: negative inputs are rejected with null', () => {
  assert.equal(computeCostPlus({ materials: -1, laborHours: 2, hourlyRate: 25 }), null);
  assert.equal(computeCostPlus({ materials: 10, laborHours: NaN, hourlyRate: 25 }), null);
});

test('cost-plus: margin of 100% is impossible (price would be infinite) → null', () => {
  assert.equal(computeCostPlus({ materials: 10, laborHours: 0, hourlyRate: 0, overheadPct: 0, marginPct: 100 }), null);
});

test('cost-plus: profit equals suggestedPrice − totalCost', () => {
  const r = computeCostPlus({ materials: 7.3, laborHours: 1.5, hourlyRate: 18, overheadPct: 12, marginPct: 35 });
  assert.ok(Math.abs(r.suggestedPrice - r.totalCost - r.profit) < 0.01);
});

// ---------- computeValueBased ----------
test('value-based: median of even anchors is the mean of the middle two', () => {
  const r = computeValueBased([30, 10, 20, 40], 1);
  assert.equal(r.median, 25);
  assert.equal(r.min, 10);
  assert.equal(r.max, 40);
  assert.equal(r.referencePrice, 25);
});

test('value-based: multiplier scales the median reference', () => {
  const r = computeValueBased([20, 30, 40], 1.5);
  assert.equal(r.median, 30);
  assert.equal(r.referencePrice, 45);
});

test('value-based: empty anchors and bad multipliers return null', () => {
  assert.equal(computeValueBased([], 2), null);
  assert.equal(computeValueBased('nope', 2), null);
  assert.equal(computeValueBased([10, 20], 0), null);
  assert.equal(computeValueBased([10, 20], Infinity), null);
});

// ---------- psychological pricing ----------
test('psychological charm ending never exceeds the computed price', () => {
  assert.equal(psychological(48.62, 'charm'), 47.99); // largest .99/.95/.90 below 48.62
  assert.equal(psychological(49.05, 'charm'), 48.99); // 49.00 is not a charm ending
  assert.equal(psychological(0.5, 'charm'), null);    // no charm price fits below 0.5
});

test('psychological round rounds up to the next integer', () => {
  assert.equal(psychological(48.2, 'round'), 49);
  assert.equal(psychological(49, 'round'), 49);
});

test('psychological rejects negatives and unknown modes', () => {
  assert.equal(psychological(-5, 'round'), null);
  assert.equal(psychological(10, 'bogus'), null);
});

// ---------- margin ↔ markup ----------
test('margin 50% equals markup 100%', () => {
  assert.equal(markupFromMargin(50), 100);
  assert.equal(marginFromMarkup(100), 50);
});

test('margin↔markup conversions round-trip', () => {
  for (const m of [10, 25, 33.33, 75]) {
    const back = marginFromMarkup(markupFromMargin(m));
    assert.ok(Math.abs(back - m) < 0.01, `round-trip failed for ${m}`);
  }
});

// ---------- break-even ----------
test('break-even: ceil units cover fixed costs', () => {
  // contribution 15 → 1500/15 = 100 units
  const r = breakEvenUnits(1500, 45, 30);
  assert.deepEqual(r, { units: 100, revenue: 4500 });
});

test('break-even: partial unit rounds up', () => {
  const r = breakEvenUnits(100, 30, 10); // 100/20 = 5 exactly? no — 5 exact
  assert.equal(r.units, 5);
  const r2 = breakEvenUnits(101, 30, 10); // 5.05 → 6
  assert.equal(r2.units, 6);
});

test('break-even: price below variable cost can never break even → null units', () => {
  const r = breakEvenUnits(500, 10, 12);
  assert.equal(r.units, null);
});

// ---------- formatCurrency ----------
test('formatCurrency formats USD/en-US by default', () => {
  assert.equal(formatCurrency(1234.5), '$1,234.50');
});

test('formatCurrency respects code + locale (BRL/pt-BR)', () => {
  const s = formatCurrency(1234.5, { code: 'BRL', locale: 'pt-BR' });
  assert.match(s, /1\.234,50/);
  assert.match(s, /R\$/);
});

test('formatCurrency falls back gracefully on bogus locale', () => {
  const s = formatCurrency(5, { code: 'USD', locale: 'xx-YY' });
  assert.ok(/\$|USD/.test(s));
});
