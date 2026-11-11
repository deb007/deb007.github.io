// Privacy scan of dist/. Exits non-zero on any finding.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = 'dist';
if (!existsSync(DIST)) { console.error('dist/ missing: run npm run build first'); process.exit(1); }

const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const files = walk(DIST).filter((f) => ['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg', '.map'].includes(extname(f)));
const read = (f) => readFileSync(f, 'utf8');
const findings = [];
// Banned copy and unverified claims (visible HTML only).
const BANNED = [
  /A Passion for Building/i, /Turning Technology into Business Value/i, /Explore the possibilities together/i,
  /Journey of Innovation/i, /Architecting for the Next Generation/i, /\bBusiness Value\b/i, /\bImpact\b/,
  /ChatGPT/, /Your Apps/, /Enterprise Data/, /Enterprise Systems/, /APIs, APIs/, /Open Source/i,
  /\b\d+\+? (MCP )?tools\b/i, /Professional experience/i,
];

// Plain contact values are rebuilt from the shards at scan time, so this file
// never holds them. Joined and decoded values, and their base64 forms, must not appear.
const shards = JSON.parse(readFileSync('content/profile/profile.json', 'utf8')).contact;
const plain = Object.values(shards).map((s) => Buffer.from(s.join(''), 'base64').toString('utf8'));
const needles = [];
for (const v of plain) {
  needles.push(v, v.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
  needles.push(Buffer.from(v).toString('base64'));
}

// Repo URLs: only repos whose own content record has repoPublic may be linked.
const allowedRepos = new Set();
for (const f of readdirSync('content/projects').filter((n) => n.endsWith('.json'))) {
  const p = JSON.parse(readFileSync(join('content/projects', f), 'utf8'));
  if (p.repoPublic) allowedRepos.add(p.repoPublic.toLowerCase());
}
const legacy = JSON.parse(readFileSync('data/portfolio.legacy.json', 'utf8'));
const publicLegacy = new Set(legacy.repos.filter((r) => !r._githubMeta.private).map((r) => (r.links.github || '').toLowerCase()));
const privateNames = legacy.repos.filter((r) => r._githubMeta.private).map((r) => r._githubMeta.fullName.toLowerCase());

// Hidden text: records for off flags and unapproved projects must leave no trace.
const hidden = [];
for (const f of readdirSync('content/projects').filter((n) => n.endsWith('.json'))) {
  const p = JSON.parse(readFileSync(join('content/projects', f), 'utf8'));
  if (!p.approved) hidden.push({ what: `unapproved project ${p.slug}`, s: [p.name, p.oneLine, p.problem, p.built] });
}
for (const [col, label] of [['experience', 'experience'], ['insights', 'insights']]) {
  for (const f of readdirSync(join('content', col)).filter((n) => n.endsWith('.json'))) {
    const r = JSON.parse(readFileSync(join('content', col, f), 'utf8'));
    hidden.push({ what: `${label}/${f}`, s: Object.values(r).filter((x) => typeof x === 'string' && x.length > 8) });
  }
}

const flagsSrc = readFileSync('src/config/flags.ts', 'utf8');
const on = (k) => new RegExp(`${k}:\\s*true`).test(flagsSrc);
const flagHidden = [];
if (!on('experience')) flagHidden.push({ route: 'experience', text: ['>Experience<'] });
if (!on('insights')) flagHidden.push({ route: 'insights', text: ['>Insights<'] });
if (!on('cv')) flagHidden.push({ route: 'cv', text: ['Download CV', '.pdf'] });
if (!on('headshot')) flagHidden.push({ route: 'headshot', text: ['headshot', 'profile.jpg'] });
for (const h of flagHidden) {
  if (existsSync(join(DIST, h.route))) findings.push(`flag off but dist/${h.route} exists`);
}

for (const f of files) {
  const t = read(f);
  for (const n of needles) if (n && t.includes(n)) findings.push(`${f}: contains contact value (${n.length} chars)`);
  for (const m of t.matchAll(/github\.com\/deb007\/([A-Za-z0-9._-]+)/gi)) {
    const url = m[0].toLowerCase();
    const full = `deb007/${m[1]}`.toLowerCase();
    const okPublic = [...allowedRepos].some((u) => u.includes(url)) || [...publicLegacy].some((u) => u.includes(url));
    if (privateNames.includes(full) || !okPublic) findings.push(`${f}: repo URL ${m[0]}`);
  }
  for (const h of hidden) for (const s of h.s) if (s && t.includes(s)) findings.push(`${f}: text from ${h.what}`);
  if (extname(f) === '.html' || f.endsWith('sitemap-0.xml')) for (const h of flagHidden) for (const s of h.text) if (t.includes(s)) findings.push(`${f}: "${s}" present but ${h.route} flag is off`);
  if (/lorem ipsum|coming soon/i.test(t)) findings.push(`${f}: placeholder text`);
  if (/fonts\.googleapis|fonts\.gstatic/i.test(t)) findings.push(`${f}: third-party font request`);
  if (extname(f) === '.html') {
    const vis = t.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    for (const re of BANNED) if (re.test(vis)) findings.push(`${f}: banned phrase ${re}`);
    if (/\/(index\.html)$/.test(f) && (f === 'dist/index.html' || f.includes('projects/athena'))) {
      if (/ChatGPT|Gemini/.test(vis)) findings.push(`${f}: Athena diagram names a client that is not documented`);
    }
  }
}
// Approval gate, restated on the output.
for (const f of readdirSync('content/projects').filter((n) => n.endsWith('.json'))) {
  const p = JSON.parse(readFileSync(join('content/projects', f), 'utf8'));
  if (!p.approved && existsSync(join(DIST, 'projects', p.slug))) findings.push(`dist/projects/${p.slug}/ exists but approved is false`);
}

if (findings.length) {
  console.error(`privacy scan FAILED (${findings.length} finding${findings.length === 1 ? '' : 's'}):`);
  for (const x of findings) console.error(' - ' + x);
  process.exit(1);
}
console.log(`privacy scan OK: ${files.length} files scanned; no private repo URLs, no plain contact values, no hidden-section text, no placeholders`);
