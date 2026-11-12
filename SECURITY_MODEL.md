# doc2026 threat model

> Draft written by Devin from the code on 2026-11-12. Nothing below has been confirmed by the repository owner yet. Every attacker, asset and scope statement is inferred from the code. Edit freely.

## Scope of this scan
- Scanned: `jimmywang6986-cell/doc2026`, default branch `main` (commit `70e8783`), as submitted in the scan setup.
- `main` contains only `README.md` ("# doc2026"). There is no executable code, configuration or dependency manifest on `main`.
- Unmerged branches, not covered by this scan, for context:
  - `cursor/setup-dev-environment-ef38`: Vite + React 19 + TypeScript static docs site (`src/App.tsx`, `src/content.ts`), plus Vitest tests and `.cursor/environment.json`.
  - `cursor/3d-pc-building-simulator-a2b3`: single-file offline WebGL game (`pc-build-simulator-3d.html`, built from `sim3d/src/*.js` by `sim3d/build.mjs`).
  - `cursor/hunan-digital-skills-competition-plan-55df`: competition-plan docs (Chinese markdown) and Python algorithm prototypes (`prototype/learning_core.py`, `rehab_core.py`, MediaPipe pose scripts `bench_pose.py`, `e2e_pose.py`). Committed `__pycache__` files.

## System overview and trust boundaries
- There is no server, no authentication and no persistence beyond the browser. All code runs in the visitor's browser or on a developer's machine.
- Trust boundaries (on the branches):
  1. Browser page ↔ page content: all content is static and bundled at build time (`src/content.ts`, strings in `sim3d/src/*`).
  2. Developer machine ↔ npm / PyPI supply chain: `package-lock.json` (React, Vite, Vitest, oxlint), and `cv2`/`mediapipe` for Python.
  3. Repository ↔ contributors / automated agents: branches are written by Cursor cloud agents. `.cursor/environment.json` runs `npm ci` and `npm run dev` (`vite --host`, exposed on the network).

## Components
| Name | Covers |
|---|---|
| Repo meta | `README.md`, repository configuration, `.cursor/`, `.gitignore`; everything on `main` |
| Docs web app | `index.html`, `src/**`, `public/**`, `vite.config.ts`, `package*.json` (branch `setup-dev-environment`) |
| 3D simulator | `pc-build-simulator-3d.html`, `sim3d/**` (branch `3d-pc-building-simulator`) |
| Python prototypes | `prototype/**` (branch `hunan-digital-skills-competition-plan`) |
| Docs & templates | `docs/**`, `templates/**` markdown |

## Entry points and who can reach them
- `main`: none.
- Docs web app: search box (`query` state, filtered in-memory, rendered via React text nodes, so it is escaped); `localStorage['doc2026-theme']` (validated against `light`/`dark`); clipboard write of static code samples. Dev server bound to all interfaces via `--host`.
- 3D simulator: keyboard/mouse input; `?dev=1` query flag (`sim3d/src/16-game.js`); UI uses `innerHTML` with strings built from internal game data (`sim3d/src/15-ui.js`).
- Python prototypes: local CLI scripts reading local camera/video/model files.

## Assets and data sensitivity
- Inferred: no user data, credentials or secrets in the code. The main asset is repository integrity: code that others download and open, such as the double-click HTML game.
- Unconfirmed: whether any of this is deployed publicly or handles real user data (the rehab and learning prototypes suggest it could in future).

## Attacker profiles (inferred, unconfirmed)
- Malicious content or link author: would need a way to get attacker-controlled data into the `innerHTML` sinks or the docs content. None exists today, because all inputs are static.
- Supply-chain attacker: compromised npm or PyPI dependency.
- Network-adjacent attacker: reaches a dev server started with `--host`.

## Existing controls
- React escaping for all rendered docs content. The theme value is allow-listed.
- No `eval`/`new Function`/network calls found in the simulator sources.

## Out of scope / accepted risk
- Nothing stated by the owner yet.

## Open questions for the owner
1. Should a branch (or all three) be scanned instead of `main`?
2. Is any of this deployed (e.g. GitHub Pages), and does any part handle real user data?
3. Are dev tooling, tests and benchmark scripts out of scope? Is client-side DoS accepted risk?
