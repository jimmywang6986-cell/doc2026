# doc2026

A fast, modern documentation site starter built with [Vite](https://vite.dev) and [React](https://react.dev) + TypeScript. It ships with client-side search, persisted light/dark themes, copy-to-clipboard code blocks, and a clean reading layout — with no backend required.

## Requirements

- Node.js 20+ (developed against Node 22)
- npm 10+

## Getting started

```bash
npm install      # install dependencies
npm run dev      # start the dev server (binds to all interfaces)
```

Then open the URL printed by Vite (defaults to http://localhost:5173).

## Scripts

| Script            | Description                                        |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Start the Vite dev server with HMR                 |
| `npm run build`   | Type-check and create a production build in `dist/`|
| `npm run preview` | Preview the production build locally               |
| `npm run lint`    | Lint the codebase with oxlint                      |
| `npm run typecheck` | Run the TypeScript compiler without emitting     |

## Adding documentation pages

Documentation content lives in [`src/content.ts`](src/content.ts) as plain data. Add an entry to the `pages` array with a unique `id`, a `section`, and a list of content `blocks` (paragraphs, headings, code, lists, or callouts). The sidebar navigation and client-side search update automatically.

## Deployment

`npm run build` produces static files in `dist/` that can be hosted by any static file server or CDN (Netlify, Vercel, Cloudflare Pages, GitHub Pages, nginx, etc.).

## Cloud Agent environment

This repository includes a [`.cursor/environment.json`](.cursor/environment.json) so Cursor Cloud Agents install dependencies automatically and run the dev server in a visible terminal.
