// Generates public/portfolio.json from data/portfolio.legacy.json.
// Every key is kept. Rule A1: links.github is blanked for private repos and
// visibility.showSourceLink is forced to false for them.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = JSON.parse(readFileSync('data/portfolio.legacy.json', 'utf8'));
let blanked = 0;
for (const r of src.repos) {
  if (r._githubMeta?.private === true) {
    if (r.links.github !== '') blanked++;
    r.links.github = '';
    r.visibility.showSourceLink = false;
  }
}
mkdirSync('public', { recursive: true });
writeFileSync('public/portfolio.json', JSON.stringify(src, null, 2) + '\n');
console.log(`portfolio.json generated: ${src.repos.length} repos, ${blanked} private github links blanked`);
