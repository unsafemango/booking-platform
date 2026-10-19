import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api.ts';
import { serverFieldErrors, toFormValues, validateProduct } from '../lib/productForm.ts';
import ProductForm from './ProductForm.tsx';

const valid = {
  name: ' Desk lamp ',
  description: '',
  category: 'Home',
  price: '19.99',
  stock: '3',
  imageUrl: '',
};

describe('validateProduct', () => {
  it('trims the values and turns blanks into null', () => {
    expect(validateProduct(valid)).toEqual({
      errors: {},
      input: {
        name: 'Desk lamp',
        description: null,
        category: 'Home',
        price: 19.99,
        stock: 3,
        imageUrl: null,
      },
    });
  });

  it('requires a name and a category', () => {
    const { errors, input } = validateProduct({ ...valid, name: '  ', category: '' });
    expect(input).toBeNull();
    expect(errors).toEqual({ name: 'Name is required.', category: 'Category is required.' });
  });

  it.each([
    ['', 'Enter a price.'],
    ['abc', 'Enter a price.'],
    ['-1', 'Price cannot be negative.'],
    ['1.999', 'Use at most two decimals.'],
  ])('rejects the price %j', (price, message) => {
    expect(validateProduct({ ...valid, price }).errors.price).toBe(message);
  });

  it.each([
    ['', 'Enter a whole number.'],
    ['2.5', 'Enter a whole number.'],
    ['-3', 'Stock cannot be negative.'],
  ])('rejects the stock %j', (stock, message) => {
    expect(validateProduct({ ...valid, stock }).errors.stock).toBe(message);
  });

  it('accepts zero price and stock', () => {
    expect(validateProduct({ ...valid, price: '0', stock: '0' }).input).toMatchObject({
      price: 0,
      stock: 0,
    });
  });

  it('enforces the server length limits', () => {
    const { errors } = validateProduct({ ...valid, category: 'x'.repeat(51) });
    expect(errors.category).toMatch(/at most 50/);
  });
});

describe('ProductForm', () => {
  it('shows field errors instead of submitting an invalid product', () => {
    const onSubmit = vi.fn();
    render(<ProductForm submitLabel="Save" onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Name is required.');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Lamp' } });
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  });

  it('moves focus to the first invalid field when a submit is rejected', () => {
    render(<ProductForm submitLabel="Save" onSubmit={() => {}} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Lamp' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByLabelText('Category')).toHaveFocus();
  });

  it('starts from the initial product and submits the edited values', () => {
    const onSubmit = vi.fn();
    const product = {
      name: 'Lamp',
      description: 'Warm light',
      category: 'Home',
      price: 12.5,
      stock: 4,
      imageUrl: null,
    };
    render(<ProductForm initial={product} submitLabel="Save" onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Price')).toHaveValue('12.5');
    fireEvent.change(screen.getByLabelText('Stock'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({ ...product, stock: 10 });
  });

  it('disables the submit button while busy', () => {
    render(<ProductForm submitLabel="Save" busy onSubmit={() => {}} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('keeps an empty form for a new product', () => {
    expect(toFormValues()).toEqual({
      name: '',
      description: '',
      category: '',
      price: '',
      stock: '',
      imageUrl: '',
    });
  });
});

describe('serverFieldErrors', () => {
  it('keeps only the product form fields from an API error', () => {
    const e = new ApiError(400, 'Validation failed', { price: 'must be >= 0', id: 'ignored' });
    expect(serverFieldErrors(e)).toEqual({ price: 'must be >= 0' });
  });

  it('returns no errors for other failures', () => {
    expect(serverFieldErrors(new ApiError(500, 'Server error'))).toEqual({});
    expect(serverFieldErrors(new Error('offline'))).toEqual({});
  });
});

describe('ProductForm server errors', () => {
  it('marks the fields the API rejected', () => {
    const { rerender } = render(<ProductForm submitLabel="Save" onSubmit={() => {}} />);
    rerender(
      <ProductForm
        submitLabel="Save"
        serverErrors={{ imageUrl: 'must be a valid URL' }}
        onSubmit={() => {}}
      />,
    );

    const image = screen.getByLabelText('Image URL');
    expect(image).toHaveAttribute('aria-invalid', 'true');
    expect(image).toHaveFocus();
    expect(image).toHaveAccessibleDescription('must be a valid URL');

    fireEvent.change(image, { target: { value: 'https://example.com/a.png' } });
    expect(image).not.toHaveAttribute('aria-invalid');
  });
});

describe('ProductForm image preview', () => {
  const preview = () => screen.queryByRole('img', { name: 'Preview of the product image' });

  it('previews an http(s) image URL as the admin types it', () => {
    render(<ProductForm submitLabel="Save" onSubmit={() => {}} />);
    expect(preview()).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Image URL'), { target: { value: 'not a url' } });
    expect(preview()).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Image URL'), {
      target: { value: ' https://img.example.com/loft.jpg ' },
    });
    expect(preview()).toHaveAttribute('src', 'https://img.example.com/loft.jpg');
  });

  it('shows the existing image when editing', () => {
    const product = {
      name: 'Lamp',
      description: null,
      category: 'Home',
      price: 12.5,
      stock: 4,
      imageUrl: 'https://img.example.com/lamp.png',
    };
    render(<ProductForm initial={product} submitLabel="Save" onSubmit={() => {}} />);
    expect(preview()).toHaveAttribute('src', 'https://img.example.com/lamp.png');
  });

  it('says so when the image fails to load and retries a new URL', () => {
    render(<ProductForm submitLabel="Save" onSubmit={() => {}} />);
    const field = screen.getByLabelText('Image URL');

    fireEvent.change(field, { target: { value: 'https://img.example.com/missing.jpg' } });
    fireEvent.error(preview()!);
    expect(preview()).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent("Couldn't load an image from this URL.");

    fireEvent.change(field, { target: { value: 'https://img.example.com/loft.jpg' } });
    expect(preview()).toHaveAttribute('src', 'https://img.example.com/loft.jpg');
  });

  it('hides the preview while the field has an error', () => {
    render(
      <ProductForm
        initial={{
          name: 'Lamp',
          description: null,
          category: 'Home',
          price: 1,
          stock: 1,
          imageUrl: 'https://img.example.com/lamp.png',
        }}
        serverErrors={{ imageUrl: 'must be a valid URL' }}
        submitLabel="Save"
        onSubmit={() => {}}
      />,
    );
    expect(preview()).not.toBeInTheDocument();
  });
});
