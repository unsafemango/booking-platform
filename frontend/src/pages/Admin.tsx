import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import { api, money } from '../lib/api.ts';
import type { Product } from '../types.ts';

const LOW_STOCK = 5;

function byCategoryThenName(a: Product, b: Product) {
  return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
}

export default function Admin() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Product[]>('/api/products')
      .then((list) => setProducts([...list].sort(byCategoryThenName)))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

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
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <th scope="row">
                    <Link to={`/products/${p.id}`}>{p.name}</Link>
                  </th>
                  <td>{p.category}</td>
                  <td className="num">{money(p.price)}</td>
                  <td className={`num stock ${p.stock < LOW_STOCK ? 'low' : ''}`}>
                    {p.stock === 0 ? 'Sold out' : p.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
