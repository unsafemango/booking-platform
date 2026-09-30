import { useEffect, useState } from 'react';
import { api, money } from '../lib/api.ts';
import { useCart } from '../lib/cart.tsx';

const CATEGORIES = ['All', 'Stays', 'Experiences', 'Events'];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const cart = useCart();

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category !== 'All') params.set('category', category);
    const timer = setTimeout(() => {
      api(`/api/products?${params}`)
        .then((data) => { setProducts(data); setError(null); })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, category]);

  const inCart = (id) => cart.lines.find((l) => l.product.id === id)?.quantity ?? 0;

  return (
    <>
      <section className="page-head">
        <h1>Find something to book</h1>
        <div className="filters">
          <input
            className="input"
            type="search"
            placeholder="Search stays, tours, events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button key={c} className={`chip ${c === category ? 'active' : ''}`} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="alert">Couldn't load the catalog: {error}</p>}
      {!loading && !error && products.length === 0 && <p className="muted">Nothing matches that search.</p>}

      <div className="grid">
        {products.map((p) => {
          const remaining = p.stock - inCart(p.id);
          return (
            <article key={p.id} className="card product">
              {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" />}
              <div className="product-body">
                <span className="eyebrow">{p.category}</span>
                <h3>{p.name}</h3>
                <p className="muted">{p.description}</p>
                <div className="product-foot">
                  <div>
                    <strong>{money(p.price)}</strong>
                    <div className={`stock ${p.stock < 5 ? 'low' : ''}`}>
                      {p.stock === 0 ? 'Sold out' : `${p.stock} available`}
                    </div>
                  </div>
                  <button className="btn" disabled={remaining <= 0} onClick={() => cart.add(p)}>
                    {inCart(p.id) ? `Add another (${inCart(p.id)})` : 'Add to cart'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
