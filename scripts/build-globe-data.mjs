// Builds src/globe/points.json from Natural Earth public-domain data.
// Run manually (npm run build:globe-data); the generated file is committed, the raw download is not.
// Land: ne_110m_land polygons -> bitset over a fixed Fibonacci sphere (no outlines are stored).
// City lights: ne_50m_populated_places_simple -> lon/lat/weight only; names are discarded.
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const LAND = BASE + 'ne_110m_land.geojson';
const PLACES = BASE + 'ne_50m_populated_places_simple.geojson';
const N = 24000; // sphere sample count, about 1.3 degrees spacing

const get = async (u) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${u} -> HTTP ${r.status}`);
  return r.json();
};
const [land, places] = await Promise.all([get(LAND), get(PLACES)]);

const polys = [];
for (const f of land.features) {
  const g = f.geometry;
  if (g.type === 'Polygon') polys.push(g.coordinates);
  else if (g.type === 'MultiPolygon') polys.push(...g.coordinates);
}
function inRing(x, y, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const bbox = polys.map((p) => {
  const r = p[0]; let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (const [x, y] of r) { a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }
  return [a, b, c, d];
});
const inLand = (x, y) => polys.some((p, k) => {
  const b = bbox[k];
  return x >= b[0] && x <= b[1] && y >= b[2] && y <= b[3] && inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h));
});

const bytes = new Uint8Array(Math.ceil(N / 8));
const GA = Math.PI * (3 - Math.sqrt(5));
let landCount = 0;
for (let i = 0; i < N; i++) {
  const lat = (Math.asin(1 - (2 * (i + 0.5)) / N) * 180) / Math.PI;
  let lon = (((i * GA * 180) / Math.PI) % 360 + 540) % 360 - 180;
  if (inLand(lon, lat)) { bytes[i >> 3] |= 1 << (i & 7); landCount++; }
}

// City lights: every populated place with 400k+ people, thinned so no two are within 0.5 degrees.
const picked = [];
const feats = places.features
  .map((f) => ({ lon: f.properties.longitude, lat: f.properties.latitude, pop: f.properties.pop_max }))
  .filter((c) => c.pop >= 400000)
  .sort((a, b) => b.pop - a.pop);
for (const c of feats) {
  if (picked.some((p) => Math.abs(p.lon - c.lon) < 0.5 && Math.abs(p.lat - c.lat) < 0.5)) continue;
  picked.push(c);
}
const cities = [];
for (const c of picked) cities.push(Math.round(c.lon * 10), Math.round(c.lat * 10), c.pop > 5e6 ? 3 : c.pop > 1.5e6 ? 2 : 1);

const out = { n: N, land: Buffer.from(bytes).toString('base64'), cities };
mkdirSync('src/globe', { recursive: true });
writeFileSync('src/globe/points.json', JSON.stringify(out));
console.log(`polygons=${polys.length} landPoints=${landCount}/${N} cities=${picked.length}`);
