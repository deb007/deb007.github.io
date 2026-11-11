// Build-time approval gate. Runs after the static build and fails it when:
//  - a project with approved:false has a page under dist/projects/<slug>/
//  - any page for a private project contains a github.com/deb007/ URL
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export function approvalGate() {
  return {
    name: 'approval-gate',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const dist = fileURLToPath(dir);
        const contentDir = join(process.cwd(), 'content', 'projects');
        const errors = [];
        for (const f of readdirSync(contentDir).filter((n) => n.endsWith('.json'))) {
          const p = JSON.parse(readFileSync(join(contentDir, f), 'utf8'));
          const pageDir = join(dist, 'projects', p.slug);
          if (!p.approved && existsSync(pageDir)) {
            errors.push(`approval gate: "${p.slug}" has approved:false but dist/projects/${p.slug}/ exists`);
          }
          if (p.visibility === 'private' && existsSync(pageDir)) {
            const html = readFileSync(join(pageDir, 'index.html'), 'utf8');
            if (/github\.com\/deb007\//i.test(html)) {
              errors.push(`approval gate: private project "${p.slug}" page contains a github.com/deb007/ URL`);
            }
          }
        }
        if (errors.length) throw new Error(errors.join('\n'));
      },
    },
  };
}
