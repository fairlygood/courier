import { describe, it, expect } from 'vitest';
import { haversineDistance, computeDeliveryDelay } from '../geo';

// ── haversineDistance ─────────────────────────────────────────────────

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance([51.5074, -0.1278], [51.5074, -0.1278])).toBe(0);
  });

  it('London → Paris (~343 km)', () => {
    const d = haversineDistance([51.5074, -0.1278], [48.8566, 2.3522]);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(360);
  });

  it('London → New York (~5,570 km)', () => {
    const d = haversineDistance([51.5074, -0.1278], [40.7128, -74.0060]);
    expect(d).toBeGreaterThan(5500);
    expect(d).toBeLessThan(5650);
  });

  it('London → Tokyo (~9,560 km)', () => {
    const d = haversineDistance([51.5074, -0.1278], [35.6762, 139.6503]);
    expect(d).toBeGreaterThan(9450);
    expect(d).toBeLessThan(9680);
  });

  it('London → Sydney (~17,000 km)', () => {
    const d = haversineDistance([51.5074, -0.1278], [-33.8688, 151.2093]);
    expect(d).toBeGreaterThan(16900);
    expect(d).toBeLessThan(17100);
  });

  it('antipodal points → ~20,000 km (half circumference)', () => {
    const d = haversineDistance([0, 0], [0, 180]);
    // Half the earth's circumference: π × 6371 ≈ 20015 km
    expect(d).toBeGreaterThan(19900);
    expect(d).toBeLessThan(20150);
  });

  it('north pole to south pole → ~20,000 km', () => {
    const d = haversineDistance([90, 0], [-90, 0]);
    expect(d).toBeGreaterThan(19900);
    expect(d).toBeLessThan(20150);
  });

  it('is symmetric (a→b === b→a)', () => {
    const a: [number, number] = [51.5074, -0.1278];
    const b: [number, number] = [-33.8688, 151.2093];
    expect(haversineDistance(a, b)).toBe(haversineDistance(b, a));
  });

  it('equator points separated by 90° → ~10,000 km', () => {
    const d = haversineDistance([0, -75], [0, 15]);
    // 90° along the equator = π/2 × 6371 ≈ 10007 km
    expect(d).toBeGreaterThan(9900);
    expect(d).toBeLessThan(10100);
  });
});

// ── computeDeliveryDelay ─────────────────────────────────────────────

describe('computeDeliveryDelay', () => {
  it('same country → 1 hour (minimum)', () => {
    expect(computeDeliveryDelay('GB', 'GB')).toBe(1);
    expect(computeDeliveryDelay('US', 'US')).toBe(1);
    expect(computeDeliveryDelay('JP', 'JP')).toBe(1);
  });

  it('London → Paris: ~343 km → 2 hours (343/200 = 1.7 → round 2)', () => {
    expect(computeDeliveryDelay('GB', 'FR')).toBe(2);
  });

  it('London → Washington DC: ~5,892 km → 29 hours', () => {
    expect(computeDeliveryDelay('GB', 'US')).toBe(29);
  });

  it('London → Tokyo: ~9,560 km → 48 hours', () => {
    expect(computeDeliveryDelay('GB', 'JP')).toBe(48);
  });

  it('London → Sydney: ~17,000 km → 85 hours', () => {
    expect(computeDeliveryDelay('GB', 'AU')).toBe(85);
  });

  it('is symmetric (a→b === b→a)', () => {
    expect(computeDeliveryDelay('GB', 'JP')).toBe(computeDeliveryDelay('JP', 'GB'));
    expect(computeDeliveryDelay('US', 'AU')).toBe(computeDeliveryDelay('AU', 'US'));
  });

  it('unknown sender country → falls back to 1 hour', () => {
    expect(computeDeliveryDelay('XX', 'US')).toBe(1);
  });

  it('unknown recipient country → falls back to 1 hour', () => {
    expect(computeDeliveryDelay('GB', 'XX')).toBe(1);
  });

  it('both unknown → falls back to 1 hour', () => {
    expect(computeDeliveryDelay('XX', 'YY')).toBe(1);
  });

  it('empty string sender → falls back to 1 hour', () => {
    expect(computeDeliveryDelay('', 'US')).toBe(1);
  });

  it('empty string recipient → falls back to 1 hour', () => {
    expect(computeDeliveryDelay('GB', '')).toBe(1);
  });

  it('case-insensitive country codes', () => {
    expect(computeDeliveryDelay('gb', 'fr')).toBe(2);
    expect(computeDeliveryDelay('Gb', 'Us')).toBe(29);
  });

  it('neighbouring countries: DE→FR ~878 km → 4 hours', () => {
    expect(computeDeliveryDelay('DE', 'FR')).toBe(4);
  });

  it('neighbouring countries: US→CA ~740 km → 4 hours', () => {
    expect(computeDeliveryDelay('US', 'CA')).toBe(4);
  });

  it('short distance: BE→NL ~174 km → 1 hour (minimum clamp)', () => {
    expect(computeDeliveryDelay('BE', 'NL')).toBe(1);
  });
});
