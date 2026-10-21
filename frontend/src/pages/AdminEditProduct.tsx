import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import ProductForm from '../components/ProductForm.tsx';
import { getProduct, updateProduct } from '../api/products.ts';
import { ApiError } from '../lib/api.ts';
import { serverFieldErrors, type ProductFormErrors } from '../lib/productForm.ts';
import { useToast } from '../lib/toast.tsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import type { Product, ProductInput } from '../types.ts';

export default function AdminEditProduct() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { show } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProductFormErrors>();
  useDocumentTitle(
    product ? `Edit ${product.name}` : notFound ? 'Product not found' : 'Edit product',
  );

  useEffect(() => {
    let active = true;
    setProduct(null);
    setLoadError(null);
    setNotFound(false);
    getProduct(id)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setLoadError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
    };
  }, [id]);

  async function save(input: ProductInput) {
    setBusy(true);
    setError(null);
    setFieldErrors(undefined);
    try {
      const saved = await updateProduct(id, input);
      show(`Saved changes to ${saved.name}`, { tone: 'success' });
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

  const back = (
    <p>
      <Link to="/admin">← Back to the catalog</Link>
    </p>
  );

  if (notFound) {
    return (
      <>
        {back}
        <div className="empty">
          <h1>Product not found</h1>
          <p className="muted">It may have been removed from the catalog.</p>
        </div>
      </>
    );
  }
  if (loadError) {
    return (
      <>
        {back}
        <Alert>Couldn't load this product: {loadError}</Alert>
      </>
    );
  }
  if (!product) {
    return (
      <>
        {back}
        <p role="status" className="muted">
          Loading product…
        </p>
      </>
    );
  }

  return (
    <>
      <section className="page-head">
        {back}
        <h1>Edit {product.name}</h1>
      </section>
      {error && <Alert>{error}</Alert>}
      <ProductForm
        key={product.id}
        initial={product}
        submitLabel={busy ? 'Saving…' : 'Save changes'}
        busy={busy}
        serverErrors={fieldErrors}
        onSubmit={save}
      />
    </>
  );
}
