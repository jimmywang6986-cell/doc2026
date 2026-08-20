import { useEffect, useMemo, useState } from 'react'
import { pages, type DocBlock, type DocPage } from './content'
import './App.css'

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('doc2026-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      const area = document.createElement('textarea')
      area.value = code
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="code-block">
      <div className="code-block__bar">
        <span className="code-block__lang">{language}</span>
        <button className="code-block__copy" onClick={copy} aria-label="Copy code">
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case 'paragraph':
      return <p className="doc-paragraph">{block.text}</p>
    case 'heading':
      return <h2 className="doc-heading">{block.text}</h2>
    case 'code':
      return <CodeBlock code={block.code} language={block.language} />
    case 'list':
      return (
        <ul className="doc-list">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )
    case 'callout':
      return <div className={`callout callout--${block.tone}`}>{block.text}</div>
  }
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string>(pages[0].id)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('doc2026-theme', theme)
  }, [theme])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return pages
    return pages.filter((page) => {
      const haystack = [page.title, page.summary, page.section, JSON.stringify(page.blocks)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [query])

  const sections = useMemo(() => {
    const map = new Map<string, DocPage[]>()
    for (const page of filtered) {
      const list = map.get(page.section) ?? []
      list.push(page)
      map.set(page.section, list)
    }
    return [...map.entries()]
  }, [filtered])

  const active = pages.find((p) => p.id === activeId) ?? pages[0]

  return (
    <div className="layout">
      <header className="topbar">
        <div className="brand">
          <span className="brand__logo" aria-hidden>
            ◆
          </span>
          <span className="brand__name">doc2026</span>
          <span className="brand__tag">docs</span>
        </div>
        <div className="topbar__actions">
          <input
            className="search"
            type="search"
            placeholder="Search the docs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search documentation"
          />
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
        </div>
      </header>

      <div className="body">
        <nav className="sidebar" aria-label="Documentation navigation">
          {sections.length === 0 && <p className="sidebar__empty">No results for “{query}”.</p>}
          {sections.map(([section, sectionPages]) => (
            <div className="sidebar__group" key={section}>
              <p className="sidebar__title">{section}</p>
              <ul>
                {sectionPages.map((page) => (
                  <li key={page.id}>
                    <button
                      className={
                        'sidebar__link' + (page.id === activeId ? ' sidebar__link--active' : '')
                      }
                      onClick={() => setActiveId(page.id)}
                    >
                      {page.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <main className="content">
          <p className="content__eyebrow">{active.section}</p>
          <h1 className="content__title">{active.title}</h1>
          <p className="content__summary">{active.summary}</p>
          <article>
            {active.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </article>
        </main>
      </div>
    </div>
  )
}
