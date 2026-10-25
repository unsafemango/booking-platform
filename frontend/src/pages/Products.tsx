import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import Input from '../components/Input.tsx';
import { ProductGridSkeleton } from '../components/Skeleton.tsx';
import { listProducts } from '../api/products.ts';
import { money } from '../lib/api.ts';
import { useCart } from '../lib/cart.tsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import { useFetch } from '../lib/useFetch.ts';
import type { Product } from '../types.ts';

const CATEGORIES = ['All', 'Stays', 'Experiences', 'Events'] as const;
type Category = (typeof CATEGORIES)[number];

function toCategory(value: string | null): Category {
  return CATEGORIES.find((c) => c === value) ?? 'All';
}

export default function Products() {
  // Filters live in the query string so a search can be shared, bookmarked or restored with Back.
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const category = toCategory(params.get('category'));
  const setFilter = (key: 'q' | 'category', value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== 'All') next.set(key, value);
        else next.delete(key);
        return next;
      },
      // Typing replaces the entry so Back doesn't step through every keystroke.
      { replace: key === 'q' },
    );
  };
  const cart = useCart();
  useDocumentTitle();

  const load = useCallback(
    (signal: AbortSignal) =>
      listProducts({ q: query, category: category === 'All' ? undefined : category }, signal),
    [query, category],
  );
  // Debounced so typing in the search box doesn't send a request per keystroke.
  const { data, error, reload } = useFetch(load, { delay: 200, keepPrevious: true });
  const products: Product[] = data ?? [];

  const inCart = (id: string): number => cart.lines.find((l) => l.product.id === id)?.quantity ?? 0;

  return (
    <>
      <section className="page-head">
        <h1>Find something to book</h1>
        <div className="filters">
          <Input
            type="search"
            aria-label="Search the catalog"
            placeholder="Search stays, tours, events…"
            value={query}
            onChange={(e) => setFilter('q', e.target.value)}
          />
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`chip ${c === category ? 'active' : ''}`}
                aria-pressed={c === category}
                onClick={() => setFilter('category', c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <Alert onRetry={reload}>Couldn't load the catalog: {error}</Alert>}
      {!data && !error && <ProductGridSkeleton />}
      {data && !error && products.length === 0 && (
        <p className="muted">Nothing matches that search.</p>
      )}

      <div className="grid">
        {products.map((p) => {
          const remaining = p.stock - inCart(p.id);
          return (
            <article key={p.id} className="card product">
              {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" />}
              <div className="product-body">
                <span className="eyebrow">{p.category}</span>
                <h3>
                  <Link to={`/products/${p.id}`}>{p.name}</Link>
                </h3>
                <p className="muted">{p.description}</p>
                <div className="product-foot">
                  <div>
                    <strong>{money(p.price)}</strong>
                    <div className={`stock ${p.stock < 5 ? 'low' : ''}`}>
                      {p.stock === 0 ? 'Sold out' : `${p.stock} available`}
                    </div>
                  </div>
                  <Button disabled={remaining <= 0} onClick={() => cart.add(p)}>
                    {inCart(p.id) ? `Add another (${inCart(p.id)})` : 'Add to cart'}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
