// Hero globe: canvas 2D, dots and lights only. Land is a dot texture, cities are unnamed lights.
// Nothing here strokes land or country data; the only strokes are the great-circle arcs between
// fixed, unlabeled points (and the faint orbit line in earth.ts).
import { basis, cityPoints, D2R, INDIA, landPoints, rgb, rgba, run, vec, type Pal } from './shared';
import { still } from '../scripts/motion';

const DEST: [number, number][] = [
  [8, 48], [28, -26], [52, 25], [103, 2], [121, 31], [151, -33], [-74, 41], [-46, -23], [37, -1],
];
const SLOTS = 6, PERIOD = 7.2, STATIC_ARCS = [0, 4, 5];
const SETTLE = 4; // seconds from the wide view to the India-centred pose
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => x * x * (3 - 2 * x);

export function startGlobe(canvas: HTMLCanvasElement, host: HTMLElement): boolean {
  const small = matchMedia('(max-width: 640px), (pointer: coarse)').matches;
  const land = landPoints(small ? 2 : 1);
  const city = cityPoints();
  const origin = new Float32Array(3); vec(INDIA.lon, INDIA.lat, origin, 0);

  // Great-circle samples from India to each destination, lifted slightly above the surface.
  const arcs = DEST.map(([lo, la]) => {
    const b = new Float32Array(3); vec(lo, la, b, 0);
    const dot = clamp(origin[0] * b[0] + origin[1] * b[1] + origin[2] * b[2], -1, 1);
    const om = Math.acos(dot), so = Math.sin(om), n = 44, pts = new Float32Array((n + 1) * 3);
    for (let i = 0; i <= n; i++) {
      const s = i / n, k0 = Math.sin((1 - s) * om) / so, k1 = Math.sin(s * om) / so, r = 1 + 0.17 * Math.sin(Math.PI * s);
      for (let a = 0; a < 3; a++) pts[i * 3 + a] = (k0 * origin[a] + k1 * b[a]) * r;
    }
    return pts;
  });

  const r = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const stars = Array.from({ length: small ? 36 : 80 }, () => ({ x: r(), y: r(), s: 0.6 + r() * 1.1, ph: r() * 6.28, sp: 0.4 + r() * 1.4 }));

  // Pointer parallax (desktop pointer only), spring back to the India pose.
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let tx = 0, ty = 0, cx0 = 0, cy0 = 0;
  if (fine) {
    host.addEventListener('pointermove', (e) => {
      if (still() || e.pointerType !== 'mouse') return;
      const b = host.getBoundingClientRect();
      tx = clamp(((e.clientX - b.left) / b.width - 0.5) * 2, -1, 1);
      ty = clamp(((e.clientY - b.top) / b.height - 0.5) * 2, -1, 1);
    });
    host.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
  }

  let frame = 0;
  const ok = run(canvas, {
    small,
    step(dt) {
      const k = 1 - Math.exp(-dt * 5);
      cx0 += (tx * 6 - cx0) * k; cy0 += (ty * 6 - cy0) * k;
    },
    render(ctx, W, H, t, stat, P: Pal) {
      ctx.fillStyle = rgb(P.bg); ctx.fillRect(0, 0, W, H);
      // Pose: wide view eases to India in SETTLE seconds, then a small drift (within 8 degrees).
      let lon = INDIA.lon, lat = INDIA.lat, zoom = 1;
      if (!stat) {
        const k = clamp(t / SETTLE), e = 1 - Math.pow(1 - k, 3), ramp = smooth(clamp((t - 3) / 3));
        lon += (1 - e) * 75 + ramp * 6.5 * Math.sin(t * 0.21);
        lat += (1 - e) * 10 + ramp * 3.5 * Math.sin(t * 0.16 + 1);
        zoom = 0.74 + 0.26 * e;
      }
      const tl = stat ? 0 : cx0, tp = stat ? 0 : cy0;
      const B = basis((lon + tl) * D2R, (lat - tp) * D2R);
      const cx = W * 0.5, cy = H * 0.5, R = H * 0.43 * zoom;
      if (!(++frame % 12) || stat) {
        canvas.dataset.pose = `${lon.toFixed(1)},${lat.toFixed(1)}`;
        canvas.dataset.tilt = `${cx0.toFixed(2)},${cy0.toFixed(2)}`;
        canvas.dataset.t = t.toFixed(2);
      }

      // Starfield outside the disc.
      for (const s of stars) {
        const px = s.x * W, py = s.y * H;
        if (Math.hypot(px - cx, py - cy) < R * 1.04) continue;
        const a = P.starA * (stat ? 0.75 : 0.45 + 0.55 * Math.sin(t * s.sp + s.ph) ** 2);
        ctx.fillStyle = rgba(P.star, a); ctx.fillRect(px, py, s.s, s.s);
      }
      // Planet body.
      const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.4, R * 0.1, cx, cy, R);
      g.addColorStop(0, rgb(P.disc1)); g.addColorStop(1, rgb(P.disc0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();

      // Land dots, bucketed by depth and warmth so each bucket is one fill.
      const NB = 5, tints = [0, 0.5, 1], paths: Path2D[] = [];
      for (let i = 0; i < NB * 3; i++) paths.push(new Path2D());
      const sz = 1.6 * (R / (H * 0.43)), xyz = land.xyz;
      for (let i = 0; i < land.n; i++) {
        const x = xyz[i * 3], y = xyz[i * 3 + 1], z = xyz[i * 3 + 2];
        const Z = x * B[6] + y * B[7] + z * B[8];
        if (Z < 0.03) continue;
        const sx = cx + R * (x * B[0] + y * B[1]), sy = cy - R * (x * B[3] + y * B[4] + z * B[5]);
        if (sx < -2 || sx > W + 2 || sy < -2 || sy > H + 2) continue;
        const l = Math.min(NB - 1, (Math.pow(Z, 0.6) * NB) | 0), tt = land.tint[i];
        paths[l * 3 + (tt < 0.12 ? 0 : tt < 0.55 ? 1 : 2)].rect(sx - sz / 2, sy - sz / 2, sz, sz);
      }
      for (let l = 0; l < NB; l++) for (let ti = 0; ti < 3; ti++) {
        const m = tints[ti], c: [number, number, number] = [0, 1, 2].map((q) => P.land[q] + (P.india[q] - P.land[q]) * m) as any;
        ctx.fillStyle = rgba(c, P.landA * ((l + 1) / NB) * (1 + 0.35 * m));
        ctx.fill(paths[l * 3 + ti]);
      }

      // Atmosphere: thin rim glow with a faint shimmer.
      const shimmer = stat ? 1 : 1 + 0.12 * Math.sin(t * 0.9) + 0.06 * Math.sin(t * 2.3);
      const rg = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.12);
      rg.addColorStop(0, rgba(P.rim, 0)); rg.addColorStop(0.45, rgba(P.rim, P.rimA * 0.35 * shimmer));
      rg.addColorStop(0.55, rgba(P.rim, P.rimA * shimmer)); rg.addColorStop(1, rgba(P.rim, 0));
      const light = P.bg[0] > 128;
      ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

      // India highlight: soft warm glow, slow 7 s pulse.
      const iz = origin[0] * B[6] + origin[1] * B[7] + origin[2] * B[8];
      if (iz > 0.05) {
        const ix = cx + R * (origin[0] * B[0] + origin[1] * B[1]), iy = cy - R * (origin[0] * B[3] + origin[1] * B[4] + origin[2] * B[5]);
        const pulse = stat ? 0.5 : 0.5 + 0.5 * Math.sin((t / 7) * 6.2832);
        const gr = R * 0.3, gg = ctx.createRadialGradient(ix, iy, 0, ix, iy, gr), a = P.glowA * (0.7 + 0.5 * pulse) * Math.min(1, iz * 1.6);
        gg.addColorStop(0, rgba(P.india, a)); gg.addColorStop(1, rgba(P.india, 0));
        ctx.fillStyle = gg; ctx.fillRect(ix - gr, iy - gr, gr * 2, gr * 2);
      }

      // City lights, twinkling at random phases (steady in the static frame).
      const cp: Path2D[] = []; for (let i = 0; i < 12; i++) cp.push(new Path2D());
      for (let i = 0; i < city.n; i++) {
        const x = city.xyz[i * 3], y = city.xyz[i * 3 + 1], z = city.xyz[i * 3 + 2];
        const Z = x * B[6] + y * B[7] + z * B[8];
        if (Z < 0.05) continue;
        const sx = cx + R * (x * B[0] + y * B[1]), sy = cy - R * (x * B[3] + y * B[4] + z * B[5]);
        if (sx < 0 || sx > W || sy < 0 || sy > H) continue;
        const tw = stat ? 0.8 : 0.5 + 0.5 * Math.sin(t * city.sp[i] + city.ph[i]);
        const l = Math.min(3, (tw * Math.min(1, Z * 1.5) * 4) | 0), s = 1.2 + city.w[i] * 0.55;
        cp[(city.w[i] - 1) * 4 + l].rect(sx - s / 2, sy - s / 2, s, s);
      }
      for (let w = 0; w < 3; w++) for (let l = 0; l < 4; l++) {
        ctx.fillStyle = rgba(P.city, P.cityA * ((l + 1) / 4)); ctx.fill(cp[w * 4 + l]);
      }
      ctx.globalCompositeOperation = 'source-over';

      // Surface arcs: a rotating set drawn on, then a light pulse travels along each.
      ctx.lineWidth = 1; ctx.lineCap = 'round';
      let active = 0;
      const drawArc = (pts: Float32Array, prog: number, alpha: number, pulseAt: number) => {
        const n = pts.length / 3 - 1, upto = Math.floor(prog * n);
        ctx.strokeStyle = rgba(P.arc, alpha); ctx.beginPath();
        let pen = false, px = 0, py = 0, pv = false;
        for (let i = 0; i <= upto; i++) {
          const x = pts[i * 3], y = pts[i * 3 + 1], z = pts[i * 3 + 2];
          const X = x * B[0] + y * B[1], Z = x * B[6] + y * B[7] + z * B[8];
          const vis = Z > 0 || X * X + (x * B[3] + y * B[4] + z * B[5]) ** 2 > 1;
          const sx = cx + R * X, sy = cy - R * (x * B[3] + y * B[4] + z * B[5]);
          if (vis) { if (pen) ctx.lineTo(sx, sy); else { ctx.moveTo(sx, sy); pen = true; } } else pen = false;
          if (i === Math.floor(pulseAt * n)) { px = sx; py = sy; pv = vis; }
        }
        ctx.stroke();
        if (pulseAt >= 0 && pv) {
          const pg = ctx.createRadialGradient(px, py, 0, px, py, 7);
          pg.addColorStop(0, rgba(P.city, 0.95)); pg.addColorStop(1, rgba(P.city, 0));
          ctx.fillStyle = pg; ctx.fillRect(px - 7, py - 7, 14, 14);
        }
      };
      if (stat) { for (const i of STATIC_ARCS) drawArc(arcs[i], 1, 0.5, -1); active = STATIC_ARCS.length; }
      else {
        for (let k = 0; k < SLOTS; k++) {
          const off = (k * PERIOD) / SLOTS, c = Math.floor((t + off) / PERIOD), u = ((t + off) % PERIOD) / PERIOD;
          const dest = arcs[(((c * SLOTS + k) % arcs.length) + arcs.length) % arcs.length];
          const prog = clamp(u / 0.35), alpha = 0.55 * (u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1);
          const pulseAt = u > 0.35 && u < 0.7 ? (u - 0.35) / 0.35 : -1;
          if (alpha > 0.02) { drawArc(dest, prog, alpha, pulseAt); active++; }
        }
      }
      canvas.dataset.arcs = String(active);
    },
  });
  return ok;
}
