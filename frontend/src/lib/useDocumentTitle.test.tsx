import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDocumentTitle } from './useDocumentTitle.ts';

describe('useDocumentTitle', () => {
  it('prefixes the page title to the app name', () => {
    renderHook(() => useDocumentTitle('Cart'));
    expect(document.title).toBe('Cart · Booking Platform');
  });

  it('falls back to the app name while the title is unknown', () => {
    renderHook(() => useDocumentTitle(null));
    expect(document.title).toBe('Booking Platform');
  });

  it('follows title changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Loading' },
    });
    rerender({ title: 'Harbour Loft' });
    expect(document.title).toBe('Harbour Loft · Booking Platform');
  });
});
