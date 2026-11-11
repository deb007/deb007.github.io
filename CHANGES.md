# CHANGES.md: how each fix was handled

Maps every row of the fixes table in the Mockup Revision prompt (v2) to what the site now does. "Where" points at the file.

| Area | What was wrong | What was done and why | Where |
| --- | --- | --- | --- |
| Athena label | Tagged "Professional Experience" | Labelled **Personal project**, read straight from the content record; no repo evidence of employer work. Every project label comes from its content file. | `content/projects/athena.json`, `SelectedWork.astro` |
| Unverified claims in diagrams | ChatGPT, Gemini, "Your Apps", "Enterprise Data/Systems" | Athena diagram shows only Claude Desktop, VS Code (GitHub Copilot), n8n workflows, "any MCP client" and the ten documented integrations. No vendor logos, text only. The privacy scan now fails on those phrases. | `src/lib/diagrams.ts`, `scripts/privacy.mjs` |
| Architecture section | Athena diagram reused, typo "APIs, APIs" | New broader diagram that does not name Athena: AI clients, orchestration, governance and guardrails, tools and data, observability. Typo gone (scan fails if it returns). Four reference architectures on `/architecture/`. | `ArchTeaser.astro`, `architecture.astro`, `content/architecture/*` |
| Diagram labelling | No "Illustrative architecture" label | Every diagram carries a label in 13px+ mono text, and a text alternative. Measured by `npm run measure`. | `Flow.astro`, `Chart.astro` |
| Private repo tag | None | Non-interactive "Private repository" tag (a `span`, not a link or button) on every private project. | `SelectedWork.astro`, `projects/*` |
| Featured count | Three shown | Lead (Athena) plus six in a compact list on Home; the same set featured on `/projects/` with a filterable library of all seven. | `SelectedWork.astro`, `projects/index.astro` |
| "Learn more" and chevrons | Went nowhere | Links go to internal project pages only, and only for `approved: true` projects. Unapproved ones would render name and label with no link. | `projects/index.astro`, `[slug].astro` |
| About | Glass-building image, four-icon list | No image. Typographic layout and an original CSS three-layer visual (Strategic, Architectural, Technical), labelled Illustrative. Icon list removed. | `AboutTeaser.astro`, `Layers.astro` |
| Expertise | Icon tiles, "Open Source" | Four domains in editorial type, one row open at a time (hover, focus or click, `aria-expanded`). Thin lines connect the open row to projects that exercise it. "Open Source" removed everywhere (scan fails if it returns). | `Expertise.astro`, `scripts/expertise.ts` |
| Copy | Clichés | Plain rewrites; two alternatives per heading in `COPY.md`. Banned phrases are checked in the built HTML. | `COPY.md`, `scripts/privacy.mjs` |
| Hero emphasis | Three blue phrases | Accent only on "into Production." | `Hero.astro` |
| Hero actions | LinkedIn dropped | Quiet LinkedIn text link next to the single primary action. Decoded from shards on click; with no JavaScript it is a plain "LinkedIn" link to `/contact/`. Builder signal line added. | `Hero.astro` |
| Contact | Icon-only buttons, no email | Text-labelled buttons. LinkedIn is the primary action, email revealed on click, GitHub profile link. Both values stay base64 shards. | `contact.astro` |
| Bottom Earth | Faint arc | Wider halo, thin bright rim, denser night-side lights, visible orbit line. Scroll parallax, drifting clouds, one satellite per 25 s, static under reduced motion all kept. | `src/globe/earth.ts` |
| Legibility | 10-11px captions | Body 16px, labels 13px minimum, AA contrast both themes. Measured by `npm run measure` and `npm run contrast`. | `global.css`, `scripts/` |
| Footer | None | Copyright, GitHub profile link, "Views are my own." | `Base.astro` |

## Deviations
- **Default theme is dark for everyone** (Deb's ruling). The OS preference is ignored on a first visit; the toggle works.
- Fonts: Fraunces, Inter and JetBrains Mono (regular weight only) are vendored as WOFF2, Latin subset, from the fontsource packages.
- Work-type label is shown beside the status; where they are identical (Prototype) the status is dropped.
- "Open Source" removal and the Athena tool-count omission are enforced in `scripts/privacy.mjs`.
