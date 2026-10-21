import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import Input from '../components/Input.tsx';
import { deleteProduct, listProducts, updateProduct } from '../api/products.ts';
import { money } from '../lib/api.ts';
import { useToast } from '../lib/toast.tsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import type { Product } from '../types.ts';

const LOW_STOCK = 5;

function byCategoryThenName(a: Product, b: Product) {
  return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
}

export default function Admin() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const { show } = useToast();
  useDocumentTitle('Admin');

  useEffect(() => {
    listProducts()
      .then((list) => setProducts([...list].sort(byCategoryThenName)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const confirming = products?.find((p) => p.id === deletingId) ?? null;
  const categories = ['All', ...new Set(products?.map((p) => p.category))];
  // Fall back to All if the selected category's last product was deleted.
  const activeCategory = categories.includes(category) ? category : 'All';
  const needle = query.trim().toLowerCase();
  const visible =
    products?.filter(
      (p) =>
        (activeCategory === 'All' || p.category === activeCategory) &&
        (needle === '' || p.name.toLowerCase().includes(needle)),
    ) ?? [];

  async function adjustStock(product: Product, delta: number) {
    setAdjustingId(product.id);
    setError(null);
    const { id, ...input } = product;
    try {
      const saved = await updateProduct(id, { ...input, stock: product.stock + delta });
      setProducts((current) => current?.map((p) => (p.id === id ? saved : p)) ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdjustingId(null);
    }
  }

  async function remove(product: Product) {
    setDeleting(true);
    setError(null);
    try {
      await deleteProduct(product.id);
      setProducts((current) => current?.filter((p) => p.id !== product.id) ?? null);
      show(`${product.name} deleted`, { id: `product-${product.id}-deleted` });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
      setDeletingId(null);
    }
  }

  return (
    <>
      <section className="page-head row">
        <div>
          <h1>Admin</h1>
          <p className="muted">Manage the product catalog.</p>
        </div>
        <Link to="/admin/products/new" className="btn">
          New product
        </Link>
      </section>
      {error && <Alert>{error}</Alert>}
      {products === null && !error && (
        <p role="status" className="muted">
          Loading catalog…
        </p>
      )}
      {products?.length === 0 && <p className="muted">The catalog is empty.</p>}
      {products && products.length > 0 && (
        <div className="filters admin-filters">
          <Input
            type="search"
            aria-label="Search products by name"
            placeholder="Search by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chips" role="group" aria-label="Filter by category">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${c === activeCategory ? 'active' : ''}`}
                aria-pressed={c === activeCategory}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
      {products && products.length > 0 && visible.length === 0 && (
        <p className="muted">No products match these filters.</p>
      )}
      {visible.length > 0 && (
        <div className="card table-wrap">
          <table className="table">
            <caption className="sr-only">Products in the catalog</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Category</th>
                <th scope="col" className="num">
                  Price
                </th>
                <th scope="col" className="num">
                  Stock
                </th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <th scope="row">
                    <Link to={`/products/${p.id}`}>{p.name}</Link>
                  </th>
                  <td>{p.category}</td>
                  <td className="num">{money(p.price)}</td>
                  <td className="num">
                    <div className="qty stock-adjust">
                      <Button
                        variant="ghost"
                        aria-label={`Remove one from ${p.name} stock`}
                        disabled={p.stock === 0 || adjustingId === p.id}
                        onClick={() => adjustStock(p, -1)}
                      >
                        −
                      </Button>
                      <span className={`stock ${p.stock < LOW_STOCK ? 'low' : ''}`}>
                        {p.stock === 0 ? 'Sold out' : p.stock}
                      </span>
                      <Button
                        variant="ghost"
                        aria-label={`Add one to ${p.name} stock`}
                        disabled={adjustingId === p.id}
                        onClick={() => adjustStock(p, 1)}
                      >
                        +
                      </Button>
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/admin/products/${p.id}/edit`} aria-label={`Edit ${p.name}`}>
                        Edit
                      </Link>
                      <Button
                        variant="danger"
                        aria-label={`Delete ${p.name}`}
                        onClick={() => setDeletingId(p.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog
        open={confirming !== null}
        title="Delete this product?"
        confirmLabel={deleting ? 'Deleting…' : 'Yes, delete product'}
        cancelLabel="Keep product"
        busy={deleting}
        onConfirm={() => confirming && remove(confirming)}
        onCancel={() => setDeletingId(null)}
      >
        {confirming && (
          <p>
            <strong>{confirming.name}</strong> will be removed from the catalog. Existing bookings
            keep their details. This can't be undone.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
