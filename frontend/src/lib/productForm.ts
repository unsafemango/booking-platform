import type { ProductInput } from '../types.ts';
import { ApiError } from './api.ts';

/** Product form state: every field is the raw text the admin typed. */
export interface ProductFormValues {
  name: string;
  description: string;
  category: string;
  price: string;
  stock: string;
  imageUrl: string;
}

export type ProductFormErrors = Partial<Record<keyof ProductFormValues, string>>;

const FIELDS: (keyof ProductFormValues)[] = [
  'name',
  'description',
  'category',
  'price',
  'stock',
  'imageUrl',
];

// Mirrors the limits on the catalog service's ProductRequest.
const NAME_MAX = 200;
const DESCRIPTION_MAX = 2000;
const CATEGORY_MAX = 50;

export function toFormValues(product?: ProductInput): ProductFormValues {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? '',
    price: product ? String(product.price) : '',
    stock: product ? String(product.stock) : '',
    imageUrl: product?.imageUrl ?? '',
  };
}

/** Picks the product form's fields out of a 400 response's `fields` map. */
export function serverFieldErrors(e: unknown): ProductFormErrors {
  const errors: ProductFormErrors = {};
  if (!(e instanceof ApiError) || !e.fields) return errors;
  for (const key of FIELDS) {
    if (e.fields[key]) errors[key] = e.fields[key];
  }
  return errors;
}

/** Checks the form and, when it is valid, returns the request body for the API. */
export function validateProduct(values: ProductFormValues): {
  errors: ProductFormErrors;
  input: ProductInput | null;
} {
  const errors: ProductFormErrors = {};
  const name = values.name.trim();
  const description = values.description.trim();
  const category = values.category.trim();
  const imageUrl = values.imageUrl.trim();
  const price = Number(values.price);
  const stock = Number(values.stock);

  if (!name) errors.name = 'Name is required.';
  else if (name.length > NAME_MAX) errors.name = `Name must be at most ${NAME_MAX} characters.`;

  if (description.length > DESCRIPTION_MAX)
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters.`;

  if (!category) errors.category = 'Category is required.';
  else if (category.length > CATEGORY_MAX)
    errors.category = `Category must be at most ${CATEGORY_MAX} characters.`;

  if (!/^-?\d+(\.\d+)?$/.test(values.price.trim())) errors.price = 'Enter a price.';
  else if (price < 0) errors.price = 'Price cannot be negative.';
  else if (!/^\d+(\.\d{1,2})?$/.test(values.price.trim()))
    errors.price = 'Use at most two decimals.';

  if (!/^-?\d+$/.test(values.stock.trim())) errors.stock = 'Enter a whole number.';
  else if (stock < 0) errors.stock = 'Stock cannot be negative.';

  if (Object.keys(errors).length) return { errors, input: null };
  return {
    errors,
    input: {
      name,
      description: description || null,
      category,
      price,
      stock,
      imageUrl: imageUrl || null,
    },
  };
}
