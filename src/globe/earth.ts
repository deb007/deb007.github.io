// Bottom Earth: a wide horizon arc, dots and lights only. Rises with scroll, night-side lights and
// clouds drift slowly, and a faint orbit line carries one satellite dot every 25 s.
import { basis, cityPoints, D2R, landPoints, rgb, rgba, run, type Pal } from './shared';

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const SAT_PERIOD = 25;

export function startEarth(canvas: HTMLCanvasElement): boolean {
  const small = matchMedia('(max-width: 640px), (pointer: coarse)').matches;
  const land = landPoints(small ? 3 : 2);
  const city = cityPoints(3.2, 21);
  const clouds = Array.from({ length: 7 }, (_, i) => ({ x: i / 7, y: 0.05 + ((i * 37) % 10) / 40, w: 0.18 + ((i * 13) % 7) / 40, s: 0.004 + (i % 3) * 0.002 }));

  return run(canvas, {
    small,
    render(ctx, W, H, t, stat, P: Pal) {
      ctx.fillStyle = rgb(P.bg); ctx.fillRect(0, 0, W, H);
      const rect = canvas.getBoundingClientRect(), vh = innerHeight || 800;
      const prog = stat ? 0.5 : clamp((vh - rect.top) / (vh + rect.height));
      const R = Math.max(W * 1.25, 600), cx = W / 2, rise = 0.55 + 0.45 * prog;
      const apex = H * (0.98 - 0.62 * rise);
      const ccy = apex + R;
      const lon = 20 + (stat ? 0 : t * 0.9), B = basis(lon * D2R, 8 * D2R);

      // Planet body and atmosphere along the limb.
      const g = ctx.createLinearGradient(0, apex, 0, apex + H * 0.9);
      g.addColorStop(0, rgb(P.disc1)); g.addColorStop(1, rgb(P.disc0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, ccy, R, 0, 6.2832); ctx.fill();
      const dark = P.bg[0] < 128;
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      const sh = stat ? 1 : 1 + 0.1 * Math.sin(t * 0.8);
      const halo = ctx.createRadialGradient(cx, ccy, R * 0.9, cx, ccy, R * 1.12);
      halo.addColorStop(0, rgba(P.rim, 0)); halo.addColorStop(0.3, rgba(P.rim, P.rimA * 0.12)); halo.addColorStop(0.45, rgba(P.rim, P.rimA * 0.34 * sh)); halo.addColorStop(0.6, rgba(P.rim, P.rimA * 0.12)); halo.addColorStop(1, rgba(P.rim, 0));
      ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
      const rg = ctx.createRadialGradient(cx, ccy, R * 0.99, cx, ccy, R * 1.012);
      rg.addColorStop(0, rgba(P.rim, 0)); rg.addColorStop(0.45, rgba(P.rim, Math.min(1, P.rimA * 1.7 * sh))); rg.addColorStop(1, rgba(P.rim, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

      // Land dots and night-side city lights, rotating slowly about the pole.
      const sz = 2, lp = new Path2D(), lp2 = new Path2D();
      for (let i = 0; i < land.n; i++) {
        const x = land.xyz[i * 3], y = land.xyz[i * 3 + 1], z = land.xyz[i * 3 + 2];
        if (x * B[6] + y * B[7] + z * B[8] < 0.2) continue;
        const sx = cx + R * (x * B[0] + y * B[1]), sy = ccy - R * (x * B[3] + y * B[4] + z * B[5]);
        if (sy < apex - 4 || sy > H + 4 || sx < -2 || sx > W + 2) continue;
        (i & 1 ? lp : lp2).rect(sx - sz / 2, sy - sz / 2, sz, sz);
      }
      ctx.fillStyle = rgba(P.land, P.landA * 0.55); ctx.fill(lp);
      ctx.fillStyle = rgba(P.land, P.landA * 0.3); ctx.fill(lp2);
      const cps: Path2D[] = [new Path2D(), new Path2D(), new Path2D()];
      for (let i = 0; i < city.n; i++) {
        const x = city.xyz[i * 3], y = city.xyz[i * 3 + 1], z = city.xyz[i * 3 + 2];
        if (x * B[6] + y * B[7] + z * B[8] < 0.05) continue;
        const sx = cx + R * (x * B[0] + y * B[1]), sy = ccy - R * (x * B[3] + y * B[4] + z * B[5]);
        if (sy < apex - 4 || sy > H + 4 || sx < 0 || sx > W) continue;
        const tw = stat ? 0.8 : 0.5 + 0.5 * Math.sin(t * city.sp[i] * 0.7 + city.ph[i]);
        cps[Math.min(2, (tw * 3) | 0)].rect(sx - 1.1, sy - 1.1, 2.4, 2.4);
      }
      for (let l = 0; l < 3; l++) { ctx.fillStyle = rgba(P.city, P.cityA * (0.4 + l * 0.3)); ctx.fill(cps[l]); }
      ctx.globalCompositeOperation = 'source-over';

      // Slow clouds: soft translucent bands clipped to the disc.
      ctx.save(); ctx.beginPath(); ctx.arc(cx, ccy, R * 0.998, 0, 6.2832); ctx.clip();
      for (const c of clouds) {
        const x = ((c.x + (stat ? 0 : t * c.s)) % 1.3 - 0.15) * W, y = apex + 6 + c.y * H * 0.7, w = c.w * W;
        const cg = ctx.createRadialGradient(x, y, 0, x, y, w);
        cg.addColorStop(0, rgba(P.cloud, P.cloudA * 1.6)); cg.addColorStop(1, rgba(P.cloud, 0));
        ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.12); ctx.translate(-x, -y);
        ctx.fillStyle = cg; ctx.fillRect(x - w, y - w, w * 2, w * 2); ctx.restore();
      }
      ctx.restore();

      // Orbit line and one satellite dot. The satellite only exists while motion runs.
      const ox = cx, oy = ccy, orx = R * 1.045, ory = R * 1.045;
      ctx.strokeStyle = rgba(P.arc, 0.32); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ox, oy, orx, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      if (!stat) {
        const u = (t % SAT_PERIOD) / SAT_PERIOD, a = Math.PI * (1.08 + 0.84 * u);
        const sx = ox + Math.cos(a) * orx, sy = oy + Math.sin(a) * ory, f = Math.sin(Math.PI * u);
        const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 6);
        sg.addColorStop(0, rgba(P.city, 0.95 * f)); sg.addColorStop(1, rgba(P.city, 0));
        ctx.fillStyle = sg; ctx.fillRect(sx - 6, sy - 6, 12, 12);
        canvas.dataset.sat = u.toFixed(3);
      }
      canvas.dataset.apex = apex.toFixed(1);
    },
  });
}
