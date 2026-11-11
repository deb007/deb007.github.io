# Fonts TODO

Fonts are not vendored in the foundation stage. `src/styles/tokens.css` names the target stacks and falls back to system fonts. Nothing is fetched from Google Fonts or any third party.

| Role | Target face | Licence | Fallback now |
| --- | --- | --- | --- |
| Display | Fraunces (variable) | SIL OFL | `ui-serif, Georgia, serif` |
| Body / UI | Inter | SIL OFL | `ui-sans-serif, system-ui, sans-serif` |
| Labels | JetBrains Mono | SIL OFL | `ui-monospace, Menlo, Consolas, monospace` |

Next step: add the woff2 files under `public/fonts/`, add `@font-face` rules (`font-display: swap`) in `src/styles/fonts.css`, import it from `global.css`, and preload the display and body files.
