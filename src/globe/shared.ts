// Shared by the hero globe and the bottom Earth: point data, palettes and the frame runner.
import data from './points.json';
import { still, isLight, onMotionChange, onThemeChange } from '../scripts/motion';

export const D2R = Math.PI / 180;
export type RGB = [number, number, number];

export function rng(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function vec(lon: number, lat: number, out: Float32Array, i: number): void {
  const p = lat * D2R, l = lon * D2R, c = Math.cos(p);
  out[i] = c * Math.cos(l); out[i + 1] = c * Math.sin(l); out[i + 2] = Math.sin(p);
}

// Camera basis for a view centred on (lon0, lat0), both in radians: right, up, towards-viewer.
export function basis(l0: number, p0: number): number[] {
  const cl = Math.cos(l0), sl = Math.sin(l0), cp = Math.cos(p0), sp = Math.sin(p0);
  return [-sl, cl, 0, -sp * cl, -sp * sl, cp, cp * cl, cp * sl, sp];
}

export const INDIA = { lon: 78, lat: 22 };

// Land dots: the committed bitset indexes a fixed Fibonacci sphere. `tint` is a soft 0..1 weight
// around the subcontinent used only to warm nearby dots; it draws no outline.
export function landPoints(step: number) {
  const N: number = (data as any).n;
  const bin = atob((data as any).land);
  const GA = Math.PI * (3 - Math.sqrt(5));
  const xyz: number[] = [], tint: number[] = [];
  const v = new Float32Array(3);
  for (let i = 0; i < N; i += step) {
    if (!((bin.charCodeAt(i >> 3) >> (i & 7)) & 1)) continue;
    const lat = (Math.asin(1 - (2 * (i + 0.5)) / N) * 180) / Math.PI;
    const lon = ((((i * GA * 180) / Math.PI) % 360) + 540) % 360 - 180;
    vec(lon, lat, v, 0);
    xyz.push(v[0], v[1], v[2]);
    const dx = (lon - 79) / 14, dy = (lat - 22) / 15;
    tint.push(Math.pow(Math.max(0, 1 - Math.hypot(dx, dy)), 0.8));
  }
  return { n: tint.length, xyz: Float32Array.from(xyz), tint: Float32Array.from(tint) };
}

// City lights: lon/lat/weight triples only. No names exist in the shipped data.
export function cityPoints(jitter = 0, seed = 7) {
  const c: number[] = (data as any).cities, r = rng(seed);
  const xyz: number[] = [], w: number[] = [], ph: number[] = [], sp: number[] = [];
  const v = new Float32Array(3);
  for (let i = 0; i < c.length; i += 3) {
    const reps = jitter ? 1 + c[i + 2] : 1;
    for (let k = 0; k < reps; k++) {
      const j = k ? jitter : 0;
      vec(c[i] / 10 + (r() - 0.5) * 2 * j, c[i + 1] / 10 + (r() - 0.5) * 2 * j, v, 0);
      xyz.push(v[0], v[1], v[2]);
      w.push(k ? 1 : c[i + 2]); ph.push(r() * 6.283); sp.push(0.6 + r() * 1.8);
    }
  }
  return { n: w.length, xyz: Float32Array.from(xyz), w: Float32Array.from(w), ph: Float32Array.from(ph), sp: Float32Array.from(sp) };
}

export interface Pal {
  bg: RGB; disc0: RGB; disc1: RGB; land: RGB; india: RGB; city: RGB; arc: RGB; rim: RGB; cloud: RGB; star: RGB;
  landA: number; cityA: number; starA: number; rimA: number; glowA: number; cloudA: number;
}
// Dark: bright dots on navy. Light: ink dots on paper, darker amber for India (design-direction 4).
const DARK: Pal = {
  bg: [0, 9, 23], disc0: [2, 14, 32], disc1: [8, 28, 56], land: [96, 150, 215], india: [232, 170, 90],
  city: [255, 205, 130], arc: [140, 190, 255], rim: [90, 160, 255], cloud: [150, 180, 220], star: [200, 220, 255],
  landA: 0.78, cityA: 0.95, starA: 0.7, rimA: 0.7, glowA: 0.36, cloudA: 0.07,
};
const LIGHT: Pal = {
  bg: [246, 243, 236], disc0: [236, 231, 219], disc1: [243, 239, 229], land: [12, 26, 43], india: [168, 106, 32],
  city: [168, 106, 32], arc: [31, 95, 168], rim: [31, 95, 168], cloud: [31, 95, 168], star: [12, 26, 43],
  landA: 0.62, cityA: 0.8, starA: 0.22, rimA: 0.22, glowA: 0.2, cloudA: 0.04,
};
const lerp = (a: number, b: number, m: number) => a + (b - a) * m;
const lerpC = (a: RGB, b: RGB, m: number): RGB => [lerp(a[0], b[0], m), lerp(a[1], b[1], m), lerp(a[2], b[2], m)];
export function pal(m: number): Pal {
  const o: any = {};
  for (const k of Object.keys(DARK) as (keyof Pal)[]) {
    const a: any = DARK[k], b: any = LIGHT[k];
    o[k] = Array.isArray(a) ? lerpC(a, b, m) : lerp(a, b, m);
  }
  return o as Pal;
}
export const rgb = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export const rgba = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

export interface Scene {
  small: boolean;
  render(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, stat: boolean, P: Pal): void;
  step?(dt: number): void;
}

// requestAnimationFrame runner shared by both canvases. It runs only when motion is allowed, the
// canvas is on screen and the tab is visible. In still mode it draws one frame synchronously.
export function run(canvas: HTMLCanvasElement, sc: Scene): boolean {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return false;
  let W = 0, H = 0, t = 0, ran = false, raf = 0, last = 0, acc = 0, onScreen = true;
  let mix = isLight() ? 1 : 0, target = mix;
  const canRun = () => !still() && onScreen && !document.hidden;

  function draw() {
    if (!W) return;
    ctx!.globalCompositeOperation = 'source-over';
    sc.render(ctx!, W, H, t, !ran, pal(mix));
    canvas.dataset.mode = !ran ? 'static' : still() ? 'frozen' : 'live';
    canvas.dataset.mix = mix.toFixed(2);
    canvas.dataset.ready = '1';
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, sc.small ? 1.5 : 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function loop(now: number) {
    raf = 0;
    if (!canRun()) return;
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;
    acc += dt;
    if (sc.small && acc < 1 / 30 - 0.002) { raf = requestAnimationFrame(loop); return; }
    const d = acc; acc = 0;
    ran = true; t += d; sc.step?.(d);
    if (mix !== target) mix = Math.abs(target - mix) < d / 0.25 ? target : mix + Math.sign(target - mix) * (d / 0.25);
    draw();
    raf = requestAnimationFrame(loop);
  }
  function kick() {
    if (canRun() && !raf) { last = performance.now(); acc = 0; raf = requestAnimationFrame(loop); }
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver((e) => { onScreen = e[e.length - 1].isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  onMotionChange(() => { if (still() && raf) { cancelAnimationFrame(raf); raf = 0; } draw(); kick(); });
  onThemeChange(() => {
    target = isLight() ? 1 : 0;
    if (!canRun()) { mix = target; draw(); } else kick();
  });
  resize();
  kick();
  return true;
}
