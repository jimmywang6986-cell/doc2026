import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import App from './App'

afterEach(cleanup)

function sidebarLinkNames() {
  const nav = screen.getByRole('navigation', { name: /documentation navigation/i })
  return within(nav)
    .getAllByRole('button')
    .map((b) => b.textContent)
}

describe('doc2026 documentation app', () => {
  it('renders all pages in the sidebar by default', () => {
    render(<App />)
    const links = sidebarLinkNames()
    expect(links).toEqual(
      expect.arrayContaining(['Introduction', 'Installation', 'Configuration', 'Deployment']),
    )
  })

  it('navigates to a page when its sidebar link is clicked', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Installation' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Installation' })).toBeInTheDocument()
  })

  it('filters the sidebar as the user types and restores it when cleared', async () => {
    const user = userEvent.setup()
    render(<App />)
    const search = screen.getByRole('searchbox', { name: /search documentation/i })

    await user.type(search, 'deployment')
    let links = sidebarLinkNames()
    expect(links).toEqual(['Deployment'])

    await user.clear(search)
    links = sidebarLinkNames()
    expect(links).toEqual(
      expect.arrayContaining(['Introduction', 'Installation', 'Configuration', 'Deployment']),
    )
    expect(links).toHaveLength(4)
  })

  it('toggles between light and dark themes', async () => {
    const user = userEvent.setup()
    render(<App />)
    const initial = document.documentElement.dataset.theme
    await user.click(screen.getByRole('button', { name: /toggle color theme/i }))
    expect(document.documentElement.dataset.theme).not.toBe(initial)
  })
})
