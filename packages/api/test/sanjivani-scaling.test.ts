import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('AI Sanjivani v2 — Proportional Recipe Scaling & Debounce (B2)', () => {
  function computeSanjivaniRecipe(capacityKg: number, ph: number) {
    const scale = Math.max(0.2, Math.min(20, capacityKg / 1000));
    const dryLeavesKg = Math.round(15 * scale);
    const jaggeryKg = Number((3 * scale).toFixed(1));
    const warmWaterL = Math.round(10 * scale);
    const woodAshKg = ph < 4.8 ? Math.round(5 * scale) : 0;
    const turningMins = Math.min(45, Math.max(15, Math.round(15 * Math.sqrt(scale))));

    return {
      capacityKg,
      dryLeavesKg,
      jaggeryKg,
      warmWaterL,
      woodAshKg,
      turningMins,
    };
  }

  it('calculates baseline recipe for standard 1000 kg pit', () => {
    const recipe = computeSanjivaniRecipe(1000, 5.0);
    assert.strictEqual(recipe.dryLeavesKg, 15);
    assert.strictEqual(recipe.jaggeryKg, 3.0);
    assert.strictEqual(recipe.warmWaterL, 10);
    assert.strictEqual(recipe.woodAshKg, 0); // No ash buffer above 4.8
    assert.strictEqual(recipe.turningMins, 15);
  });

  it('scales proportionally for a large 5000 kg hospital pit', () => {
    const recipe = computeSanjivaniRecipe(5000, 5.0);
    assert.strictEqual(recipe.dryLeavesKg, 75); // 5x
    assert.strictEqual(recipe.jaggeryKg, 15.0); // 5x
    assert.strictEqual(recipe.warmWaterL, 50); // 5x
    assert.ok(recipe.turningMins > 15);
  });

  it('adds alkaline wood ash buffer when acidity crashes critically below 4.8', () => {
    const recipe = computeSanjivaniRecipe(2000, 4.4); // Severe acid crash
    assert.strictEqual(recipe.woodAshKg, 10); // 5kg * 2 = 10kg
    assert.strictEqual(recipe.dryLeavesKg, 30);
  });
});
