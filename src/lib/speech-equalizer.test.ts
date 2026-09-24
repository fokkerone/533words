import { describe, expect, it, vi, afterEach } from "vitest";
import { generateFakeFrequencies, restingFrequencies, RESTING_FREQUENCIES } from "./speech-equalizer";

/**
 * These tests deliberately do NOT pin the exact default anchor count or
 * intensity range -- those are visual-tuning constants at the top of
 * speech-equalizer.ts, actively adjusted by hand to get the blob looking
 * right, and a test hardcoding "128" (or whatever the value happens to be
 * today) breaks every time that constant changes for purely cosmetic
 * reasons. Assert structure/invariants instead: whatever the tuned
 * defaults are, they must stay internally consistent and in-bounds.
 */
describe("generateFakeFrequencies", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to the same anchor count as restingFrequencies()'s default", () => {
    expect(generateFakeFrequencies("hallo")).toHaveLength(restingFrequencies().length);
  });

  it("returns the requested number of anchors", () => {
    expect(generateFakeFrequencies("hallo", 12)).toHaveLength(12);
  });

  it("never returns a value above 255 (within floating-point tolerance)", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const values = generateFakeFrequencies("a".repeat(50));
    // Interpolating between two values already clamped to <=255 is a convex
    // combination and can't algebraically exceed 255, but floating-point
    // rounding in that weighted sum can push a result a hair over --
    // allow a tiny epsilon rather than asserting exact float equality.
    expect(values.every((v) => v <= 255 + 1e-9)).toBe(true);
  });

  it("never returns a negative value", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const values = generateFakeFrequencies("");
    expect(values.every((v) => v >= 0)).toBe(true);
  });

  it("produces larger values on average for longer words than shorter ones", () => {
    // A low, fixed random draw so the underlying length-bias effect isn't
    // masked by both cases saturating at the 255 clamp (the randomized
    // intensity range can comfortably exceed 255 on its own by design, so
    // a mid/high mock value like 0.5 clamps both to the same ceiling).
    vi.spyOn(Math, "random").mockReturnValue(0.1);
    const short = generateFakeFrequencies("a");
    const long = generateFakeFrequencies("aaaaaaaaaa");
    const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    expect(avg(long)).toBeGreaterThan(avg(short));
  });

  it("varies between calls even for the same word, so the blob keeps moving while a word is sustained", () => {
    const first = generateFakeFrequencies("hallo");
    const second = generateFakeFrequencies("hallo");
    expect(first).not.toEqual(second);
  });
});

describe("restingFrequencies", () => {
  it("returns the requested number of zeros", () => {
    expect(restingFrequencies(6)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("defaults to a positive anchor count", () => {
    expect(restingFrequencies().length).toBeGreaterThan(0);
  });
});

describe("RESTING_FREQUENCIES", () => {
  it("is all zeros, matching restingFrequencies()'s default length", () => {
    expect(RESTING_FREQUENCIES).toHaveLength(restingFrequencies().length);
    expect(RESTING_FREQUENCIES.every((v) => v === 0)).toBe(true);
  });
});
