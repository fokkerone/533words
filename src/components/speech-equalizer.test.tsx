import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SpeechEqualizer } from "./speech-equalizer";
import { restingFrequencies, RESTING_FREQUENCIES } from "@/lib/speech-equalizer";

/** Extracts the {x,y} control points from an "M ... Q x y x y Q ..." path string. */
function extractQPoints(d: string): { x: number; y: number }[] {
  const matches = [...d.matchAll(/Q ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)/g)];
  return matches.map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
}

describe("SpeechEqualizer", () => {
  it("renders the blob as filled path(s), not discrete dots", () => {
    // Two layered paths (a glow effect) is a deliberate visual choice, not
    // a fixed count -- assert "at least one path, no dots" rather than
    // pinning the exact number of layers.
    const { container } = render(
      <SpeechEqualizer amplitudes={restingFrequencies(48)} />,
    );
    expect(container.querySelectorAll("path").length).toBeGreaterThanOrEqual(1);
    expect(container.querySelectorAll("circle")).toHaveLength(0);
  });

  it("builds a path with one control point per amplitude value", () => {
    const amplitudes = restingFrequencies(12);
    const { container } = render(<SpeechEqualizer amplitudes={amplitudes} />);
    const d = container.querySelector("path")!.getAttribute("d")!;
    expect(extractQPoints(d)).toHaveLength(12);
  });

  it("renders all control points at the same distance from center when every amplitude is 0 (a smooth resting circle)", () => {
    const { container } = render(
      <SpeechEqualizer amplitudes={restingFrequencies(48)} />,
    );
    const d = container.querySelector("path")!.getAttribute("d")!;
    const distances = extractQPoints(d).map((p) => Math.hypot(p.x - 50, p.y - 50));
    expect(new Set(distances.map((dist) => dist.toFixed(3))).size).toBe(1);
  });

  it("moves a control point further from center as its amplitude increases", () => {
    const low = restingFrequencies(48);
    low[0] = 10;
    const high = restingFrequencies(48);
    high[0] = 250;

    const distanceOfFirstPoint = (amplitudes: number[]) => {
      const { container } = render(<SpeechEqualizer amplitudes={amplitudes} />);
      const d = container.querySelector("path")!.getAttribute("d")!;
      const p = extractQPoints(d)[0];
      return Math.hypot(p.x - 50, p.y - 50);
    };

    expect(distanceOfFirstPoint(high)).toBeGreaterThan(distanceOfFirstPoint(low));
  });

  it("is filled with the accent color", () => {
    const { container } = render(
      <SpeechEqualizer amplitudes={restingFrequencies(48)} />,
    );
    expect(container.querySelector("path")).toHaveAttribute("fill", "var(--accent)");
  });

  it("is decorative and hidden from assistive tech", () => {
    const { container } = render(
      <SpeechEqualizer amplitudes={restingFrequencies(48)} />,
    );
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("falls back to a resting blob when given fewer than 3 amplitudes (not enough to build a closed shape)", () => {
    const { container } = render(<SpeechEqualizer amplitudes={[10, 20]} />);
    const d = container.querySelector("path")!.getAttribute("d")!;
    expect(extractQPoints(d)).toHaveLength(RESTING_FREQUENCIES.length);
  });
});
