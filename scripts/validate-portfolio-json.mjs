// Validates dist/portfolio.json against the original key/type schema
// (documented in discovery.md section 7) and the A1 privacy rule.
import { readFileSync } from 'node:fs';

const t = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const fail = [];
const need = (obj, path, spec) => {
  for (const [k, ty] of Object.entries(spec)) {
    if (!(k in obj)) { fail.push(`${path}.${k} missing`); continue; }
    const types = ty.split('|');
    if (!types.includes(t(obj[k]))) fail.push(`${path}.${k}: expected ${ty}, got ${t(obj[k])}`);
  }
  for (const k of Object.keys(obj)) if (!(k in spec) && !k.startsWith('x-')) fail.push(`${path}.${k}: unexpected key (additions must be prefixed x-)`);
};

let d;
try { d = JSON.parse(readFileSync('dist/portfolio.json', 'utf8')); }
catch (e) { console.error('cannot read dist/portfolio.json: ' + e.message); process.exit(1); }

need(d, '$', { lastUpdated: 'string', repos: 'array' });
(d.repos ?? []).forEach((r, i) => {
  const p = `repos[${i}]`;
  need(r, p, {
    id: 'string', name: 'string', slug: 'string', description: 'string', status: 'string',
    techStack: 'array', category: 'string', tags: 'array', links: 'object', metrics: 'object',
    timeline: 'object', _githubMeta: 'object', featured: 'boolean', displayOrder: 'null|number',
    longDescription: 'string', highlights: 'array', media: 'object', visibility: 'object',
  });
  if (r.links) need(r.links, p + '.links', { github: 'string' });
  if (r.metrics) need(r.metrics, p + '.metrics', { starsCount: 'number', customMetrics: 'array' });
  if (r.timeline) need(r.timeline, p + '.timeline', { startDate: 'string|null', endDate: 'string|null', lastCommit: 'string|null' });
  if (r._githubMeta) need(r._githubMeta, p + '._githubMeta', { fullName: 'string', defaultBranch: 'string', language: 'string|null', fork: 'boolean', private: 'boolean', syncedAt: 'string' });
  if (r.media) need(r.media, p + '.media', { thumbnail: 'string', screenshots: 'array', demoGif: 'string' });
  if (r.visibility) need(r.visibility, p + '.visibility', { showOnPortfolio: 'boolean', showSourceLink: 'boolean', showMetrics: 'boolean' });
  if (r._githubMeta?.private === true) {
    if (r.links?.github !== '') fail.push(`${p}: private repo ${r.slug} still has links.github`);
    if (r.visibility?.showSourceLink !== false) fail.push(`${p}: private repo ${r.slug} has showSourceLink != false`);
  }
});

if (fail.length) { console.error('portfolio.json validation FAILED:\n' + fail.map((f) => ' - ' + f).join('\n')); process.exit(1); }
const priv = d.repos.filter((r) => r._githubMeta.private).length;
console.log(`portfolio.json OK: ${d.repos.length} repos, ${priv} private (links blanked, showSourceLink false), all keys and types match`);
