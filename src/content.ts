export type DocBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'list'; items: string[] }
  | { type: 'callout'; tone: 'info' | 'success' | 'warning'; text: string }

export interface DocPage {
  id: string
  title: string
  section: string
  summary: string
  blocks: DocBlock[]
}

export const pages: DocPage[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    section: 'Getting Started',
    summary: 'What doc2026 is and why it exists.',
    blocks: [
      {
        type: 'paragraph',
        text: 'doc2026 is a fast, modern documentation starter built with Vite and React. It ships with client-side search, light and dark themes, and a clean reading experience out of the box.',
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Everything on this site is rendered from plain data structures, so adding a page is as simple as editing an array.',
      },
      { type: 'heading', text: 'Highlights' },
      {
        type: 'list',
        items: [
          'Instant client-side search across every page',
          'Persisted light / dark theme',
          'Copy-to-clipboard on every code block',
          'Zero backend required — deploys as static files',
        ],
      },
    ],
  },
  {
    id: 'installation',
    title: 'Installation',
    section: 'Getting Started',
    summary: 'Install dependencies and run the dev server.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Clone the repository and install dependencies with npm. Node.js 20 or newer is recommended.',
      },
      {
        type: 'code',
        language: 'bash',
        code: 'git clone https://github.com/jimmywang6986-cell/doc2026.git\ncd doc2026\nnpm install',
      },
      { type: 'heading', text: 'Start developing' },
      {
        type: 'paragraph',
        text: 'Run the development server and open the printed URL in your browser. Changes hot-reload instantly.',
      },
      { type: 'code', language: 'bash', code: 'npm run dev' },
      {
        type: 'callout',
        tone: 'success',
        text: 'The dev server binds to all interfaces, so it works inside containers and Cloud Agents without extra flags.',
      },
    ],
  },
  {
    id: 'configuration',
    title: 'Configuration',
    section: 'Guides',
    summary: 'Tune the build and add your own content.',
    blocks: [
      {
        type: 'paragraph',
        text: 'The site is configured through standard Vite and TypeScript config files. Add or edit documentation pages in src/content.ts.',
      },
      {
        type: 'code',
        language: 'ts',
        code: "export const pages = [\n  {\n    id: 'my-page',\n    title: 'My Page',\n    section: 'Guides',\n    summary: 'A short description.',\n    blocks: [{ type: 'paragraph', text: 'Hello, world!' }],\n  },\n]",
      },
      {
        type: 'callout',
        tone: 'warning',
        text: 'Page ids must be unique — they are used for navigation and deep links.',
      },
    ],
  },
  {
    id: 'deployment',
    title: 'Deployment',
    section: 'Guides',
    summary: 'Build once, host anywhere.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Create an optimized production build. The output in dist/ is fully static and can be served by any web host or CDN.',
      },
      { type: 'code', language: 'bash', code: 'npm run build\nnpm run preview' },
      {
        type: 'list',
        items: [
          'Netlify, Vercel, and Cloudflare Pages work with zero config',
          'GitHub Pages works by publishing the dist/ folder',
          'Any static file server (nginx, Caddy) can host the build',
        ],
      },
    ],
  },
]
