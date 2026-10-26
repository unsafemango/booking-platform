import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductImage from './ProductImage.tsx';

describe('ProductImage', () => {
  it('renders the image', () => {
    const { container } = render(<ProductImage src="/a.jpg" lazy />);

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/a.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('swaps to a placeholder when the image fails to load', () => {
    const { container } = render(<ProductImage src="/broken.jpg" />);

    fireEvent.error(container.querySelector('img')!);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.product-image-fallback')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('tries again when the source changes', () => {
    const { container, rerender } = render(<ProductImage src="/broken.jpg" />);
    fireEvent.error(container.querySelector('img')!);

    rerender(<ProductImage src="/b.jpg" />);

    expect(container.querySelector('img')).toHaveAttribute('src', '/b.jpg');
  });
});
