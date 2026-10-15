import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import ProductForm from '../components/ProductForm.tsx';
import { api } from '../lib/api.ts';
import { serverFieldErrors, type ProductFormErrors } from '../lib/productForm.ts';
import { useToast } from '../lib/toast.tsx';
import type { Product, ProductInput } from '../types.ts';

export default function AdminNewProduct() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProductFormErrors>();

  async function create(input: ProductInput) {
    setBusy(true);
    setError(null);
    setFieldErrors(undefined);
    try {
      const product = await api<Product>('/api/products', { method: 'POST', body: input });
      show(`Added ${product.name} to the catalog`, { tone: 'success' });
      navigate('/admin');
    } catch (e: unknown) {
      const fields = serverFieldErrors(e);
      setFieldErrors(fields);
      setError(
        Object.keys(fields).length
          ? 'Check the highlighted fields.'
          : e instanceof Error
            ? e.message
            : String(e),
      );
      setBusy(false);
    }
  }

  return (
    <>
      <section className="page-head">
        <p>
          <Link to="/admin">← Back to the catalog</Link>
        </p>
        <h1>New product</h1>
      </section>
      {error && <Alert>{error}</Alert>}
      <ProductForm
        submitLabel={busy ? 'Saving…' : 'Create product'}
        busy={busy}
        serverErrors={fieldErrors}
        onSubmit={create}
      />
    </>
  );
}
