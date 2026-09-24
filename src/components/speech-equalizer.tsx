import { RESTING_FREQUENCIES } from "@/lib/speech-equalizer";

/**
 * Resting distance of each anchor from center, in viewBox units (0-100,
 * center at 50,50). The Play button fills ~66.7% of this component's
 * container at every breakpoint (see the `h-*`/`w-*` ratio between the
 * wrapping `relative` div and the `Button` inside it in `page.tsx`), i.e.
 * the button's edge sits at viewBox radius ~33.3. `BASE_RADIUS` must stay
 * above that so the blob rests just outside the button, not hidden
 * underneath it.
 */
const BASE_RADIUS = 32;
/** How much further out an anchor moves at maximum amplitude (255). Kept small enough that BASE_RADIUS + this stays under 50 (the viewBox edge), so the blob never clips out of the container. */
const MAX_EXTRA_RADIUS = 15;

/**
 * Builds a smooth, closed blob path through `n` points arranged around a
 * circle. Uses quadratic Béziers through the midpoint of each consecutive
 * pair of points (a standard cheap "blob" smoothing technique): each
 * original point becomes a Bézier control point rather than an on-path
 * point, so the curve passes near every point without the sharp corners a
 * plain polygon (straight `L` segments) would have.
 */
function buildBlobPath(points: { x: number; y: number }[]): string {
  const n = points.length;
  const midpoint = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const start = midpoint(points[0], points[n - 1]);
  let d = `M ${start.x} ${start.y} `;
  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    const mid = midpoint(current, next);
    d += `Q ${current.x} ${current.y} ${mid.x} ${mid.y} `;
  }
  return d + "Z";
}

function buildBlobPath2(points: { x: number; y: number }[]): string {
  const n = points.length;
  const midpoint = (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const start = midpoint(points[0], points[n - 1]);
  let d = `M ${start.x} ${start.y} `;
  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    const mid = midpoint(current, next);
    d += `Q ${current.x} ${current.y} ${mid.x} ${mid.y} `;
  }
  return d + "Z";
}

/**
 * A filled blob (built from N bezier anchor points around a circle) that
 * morphs behind/around the Play button, each anchor's radius driven by a
 * fake per-anchor amplitude (0-255) — refreshed on a fixed timer while
 * speaking via `speak()`'s `onTick` callback (see
 * `src/lib/speech-equalizer.ts`'s `generateFakeFrequencies`), not by word
 * boundaries (unreliable across voices — see that module's doc comment).
 * Purely decorative: the Web Speech API exposes no real audio data to
 * visualize, so this approximates a "talking" equalizer.
 *
 * Renders behind/around its parent's other content (e.g. the Play button)
 * — position it inside a `relative` wrapper sized larger than the button,
 * with this component as `absolute inset-0`.
 */
export function SpeechEqualizer({ amplitudes }: { amplitudes: number[] }) {
  const bands = amplitudes.length >= 3 ? amplitudes : RESTING_FREQUENCIES;
  const n = bands.length;

  const points = bands.map((value, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const clamped = Math.min(255, Math.max(0, value));
    const radius = BASE_RADIUS + (clamped / 255) * MAX_EXTRA_RADIUS;
    return {
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
    };
  });

  return (
    <svg
      viewBox='0 0 100 100'
      aria-hidden='true'
      className='pointer-events-none absolute inset-0 h-full w-full opacity-90'
    >
      <path
        d={buildBlobPath(points)}
        fill='var(--accent)'
        style={{ transition: "d 0.1s ease-out", opacity: 0.5 }}
      />

      <path
        d={buildBlobPath(points)}
        fill='var(--accent)'
        style={{ transition: "d 0.12s ease-in", opacity: 0.5 }}
      />
    </svg>
  );
}
