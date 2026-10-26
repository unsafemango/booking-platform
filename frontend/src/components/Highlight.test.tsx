import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Highlight from './Highlight.tsx';

const marks = (container: HTMLElement) =>
  [...container.querySelectorAll('mark')].map((m) => m.textContent);

describe('Highlight', () => {
  it('wraps every case-insensitive match in a mark', () => {
    const { container } = render(<Highlight text="Lake house by the lake" query="LAKE" />);

    expect(container).toHaveTextContent('Lake house by the lake');
    expect(marks(container)).toEqual(['Lake', 'lake']);
  });

  it('leaves the text alone for a blank query', () => {
    const { container } = render(<Highlight text="City tour" query="   " />);

    expect(container).toHaveTextContent('City tour');
    expect(marks(container)).toEqual([]);
  });

  it('trims the query and treats regex characters literally', () => {
    const { container } = render(
      <Highlight text="Jazz night (late) + drinks" query=" (late) + " />,
    );

    expect(marks(container)).toEqual(['(late) +']);
  });

  it('marks nothing when there is no match', () => {
    const { container } = render(<Highlight text="Wine tasting" query="kayak" />);

    expect(container).toHaveTextContent('Wine tasting');
    expect(marks(container)).toEqual([]);
  });
});
