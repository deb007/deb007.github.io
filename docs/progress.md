# Progress

## Stage: Foundation (branch `redesign-v2`)

Status: foundation built and checked. Not pushed, not merged, not deployed.

### Done
- Astro 6.4.8, static output, TypeScript, Tailwind 4, `trailingSlash: 'always'`, directory output.
- Content collections with Zod schemas: profile, projects, expertise, architecture, experience, insights. A bad entry fails the build.
- Flags in `src/config/flags.ts`. Experience, insights, cv and headshot are off; email and linkedin are on.
- Approval gate: the project route only generates pages for `approved: true`; an Astro integration fails the build if an unapproved project has a page or a private project page contains `github.com/deb007/`. The schema also rejects such URLs in private project records.
- Design tokens (dark and light) in `src/styles/tokens.css`; fonts are fallbacks only (`docs/fonts-todo.md`).
- Shared layout: nav from visible routes, theme toggle and pause-animation control (localStorage in try/catch), footer, closing band to `/contact/`.
- Contact values are base64 shards in `content/profile/profile.json`, decoded in the browser on click.
- `npm run privacy` and `npm run validate:portfolio-json`; `portfolio.json` is generated from `data/portfolio.legacy.json` with the 10 private repo links blanked (decision A1).
- Legacy demo pages redirect to `/` via the Astro `redirects` config.

### Decisions and deviations
- **Astro 6, not 7.** Astro 7 refuses to run on this host's Node 22.22.2 (it requires >=22.23.4). I did not change the system Node. Astro 6.4.8 supports >=22.12. `overrides.vite` pins Vite 7 so the Tailwind plugin and Astro share one Vite.
- `portfolio.json` moved to `data/portfolio.legacy.json` (generator input); the served file is generated at build into `public/` (git-ignored).
- The private-repo URLs in the legacy input were blanked in a commit, then my own unpushed local commits were rewritten so no commit on this branch contains them. `master` still has the original file.
- The validator allows `null` for `timeline.startDate` and `lastCommit` because the current data has nulls (3 repos).
- Redirect stubs for old demo pages are not in the sitemap.
- Project copy is written from the summaries in `decisions.md`/`discovery.md` only. `aiAssisted` is set from the audit's co-author findings. Hero text is "multiple LLM projects built", no number.
- Footer includes the optional "Views are my own." line.

### Blockers / open
- Fonts not vendored. No `facts.md`, CV or headshot. Open items stay in `portfolio-rebuild/docs/needs-approval.md`.
- Nothing visual has been checked in a browser.

### Next step
Hero and motion stage (poster, canvas globe, bottom Earth, pause wiring and reduced-motion paths), after Deb has seen the foundation. Then page content, diagrams, screenshots, Lighthouse and axe. Vendor the fonts alongside.
