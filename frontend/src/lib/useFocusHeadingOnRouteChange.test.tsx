import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { MemoryRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useFocusHeadingOnRouteChange } from './useFocusHeadingOnRouteChange.ts';

function Late() {
  const [ready, setReady] = useState(false);
  return ready ? (
    <h1>Loaded page</h1>
  ) : (
    <button onClick={() => setReady(true)}>Finish loading</button>
  );
}

function Shell() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useFocusHeadingOnRouteChange(mainRef, pathname);
  return (
    <>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/other">Other</Link>
        <Link to="/late">Late</Link>
        <Link to="/form">Form</Link>
      </nav>
      <main ref={mainRef}>
        <Routes>
          <Route path="/" element={<h1>Home page</h1>} />
          <Route path="/other" element={<h1>Other page</h1>} />
          <Route path="/late" element={<Late />} />
          <Route path="/form" element={<input aria-label="Email" autoFocus />} />
        </Routes>
      </main>
    </>
  );
}

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Shell />
    </MemoryRouter>,
  );
}

describe('useFocusHeadingOnRouteChange', () => {
  it('leaves focus alone on the first render', () => {
    renderShell();
    expect(document.body).toHaveFocus();
  });

  it('focuses the new page heading after navigating', () => {
    renderShell();
    fireEvent.click(screen.getByRole('link', { name: 'Other' }));
    const heading = screen.getByRole('heading', { name: 'Other page' });
    expect(heading).toHaveFocus();
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('waits for a heading that renders later', async () => {
    renderShell();
    fireEvent.click(screen.getByRole('link', { name: 'Late' }));
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();

    // Simulate the data arriving without moving focus into the page.
    await act(async () => {
      screen.getByRole('button', { name: 'Finish loading' }).click();
    });
    expect(screen.getByRole('heading', { name: 'Loaded page' })).toHaveFocus();
  });

  it('does not steal focus from an autofocused field', () => {
    renderShell();
    fireEvent.click(screen.getByRole('link', { name: 'Form' }));
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
  });
});
