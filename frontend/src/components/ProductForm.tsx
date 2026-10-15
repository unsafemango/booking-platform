import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  toFormValues,
  validateProduct,
  type ProductFormErrors,
  type ProductFormValues,
} from '../lib/productForm.ts';
import type { ProductInput } from '../types.ts';
import Button from './Button.tsx';
import Input from './Input.tsx';

interface ProductFormProps {
  /** Values to start from when editing; empty for a new product. */
  initial?: ProductInput;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: ProductInput) => void;
}

// Shared by the admin create and edit pages. Validates on submit, then clears
// a field's error as soon as the admin edits that field.
export default function ProductForm({ initial, submitLabel, busy, onSubmit }: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(() => toFormValues(initial));
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const descriptionId = useId();

  const set =
    (key: keyof ProductFormValues) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues({ ...values, [key]: e.target.value });
      if (errors[key]) setErrors({ ...errors, [key]: undefined });
    };

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = validateProduct(values);
    setErrors(result.errors);
    if (result.input) onSubmit(result.input);
  }

  return (
    <form className="card product-form" onSubmit={submit} noValidate>
      <Input label="Name" value={values.name} onChange={set('name')} error={errors.name} />
      <Input
        label="Category"
        value={values.category}
        onChange={set('category')}
        error={errors.category}
      />
      <label htmlFor={descriptionId}>Description</label>
      <textarea
        id={descriptionId}
        className="input"
        rows={4}
        value={values.description}
        onChange={set('description')}
        aria-invalid={errors.description ? true : undefined}
        aria-describedby={errors.description ? `${descriptionId}-error` : undefined}
      />
      {errors.description && (
        <span id={`${descriptionId}-error`} className="field-error">
          {errors.description}
        </span>
      )}
      <div className="product-form-row">
        <div>
          <Input
            label="Price"
            inputMode="decimal"
            value={values.price}
            onChange={set('price')}
            error={errors.price}
          />
        </div>
        <div>
          <Input
            label="Stock"
            inputMode="numeric"
            value={values.stock}
            onChange={set('stock')}
            error={errors.stock}
          />
        </div>
      </div>
      <Input
        label="Image URL"
        type="url"
        value={values.imageUrl}
        onChange={set('imageUrl')}
        placeholder="https://…"
      />
      <Button type="submit" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
