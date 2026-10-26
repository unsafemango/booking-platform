import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import Input from '../components/Input.tsx';
import ProductImage from '../components/ProductImage.tsx';
import { ProductGridSkeleton } from '../components/Skeleton.tsx';
import { listProducts } from '../api/products.ts';
import { money } from '../lib/api.ts';
import { useCart } from '../lib/cart.tsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import { useFetch } from '../lib/useFetch.ts';
import type { Product } from '../types.ts';

const ALL = 'All';

/** The full, unfiltered catalog, loaded once to know which categories exist. */
const loadCatalog = (signal: AbortSignal) => listProducts({}, signal);

/** Distinct categories in alphabetical order. */
function categoriesOf(products: Product[]): string[] {
  return [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

const SORTS = {
  featured: 'Featured',
  name: 'Name (A–Z)',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
} as const;
type Sort = keyof typeof SORTS;

function toSort(value: string | null): Sort {
  return value && value in SORTS ? (value as Sort) : 'featured';
}

/** Sorts a copy of the list; 'featured' keeps the order the server sent. */
function sortProducts(products: Product[], sort: Sort): Product[] {
  if (sort === 'featured') return products;
  const sorted = [...products];
  if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  else sorted.sort((a, b) => b.price - a.price);
  return sorted;
}

/** Reads a price bound from the URL; blank, negative or non-numeric values mean "no limit". */
function toPrice(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** True when a key press is meant for a field the user is typing in. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function inPriceRange(product: Product, min: number | null, max: number | null): boolean {
  return (min === null || product.price >= min) && (max === null || product.price <= max);
}

export default function Products() {
  // Filters live in the query string so a search can be shared, bookmarked or restored with Back.
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  // Chips come from the catalog itself, so new categories show up without a code change.
  const { data: catalog } = useFetch(loadCatalog);
  const known = useMemo(() => (catalog ? categoriesOf(catalog) : null), [catalog]);
  const requested = params.get('category');
  // Until the catalog arrives, trust the URL; after that an unknown category means All.
  const category = requested && (!known || known.includes(requested)) ? requested : ALL;
  const chips = [ALL, ...(known ?? []), ...(!known && category !== ALL ? [category] : [])];
  const sort = toSort(params.get('sort'));
  const minPrice = toPrice(params.get('min'));
  const maxPrice = toPrice(params.get('max'));
  const setFilter = (key: 'q' | 'category' | 'sort' | 'min' | 'max', value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== ALL && value !== 'featured') next.set(key, value);
        else next.delete(key);
        return next;
      },
      // Typing replaces the entry so Back doesn't step through every keystroke.
      { replace: key === 'q' || key === 'min' || key === 'max' },
    );
  };
  const cart = useCart();
  useDocumentTitle();

  // "/" jumps to the search box, as on many sites, unless the user is already typing somewhere.
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (e.isComposing || isTypingTarget(e.target)) return;
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const load = useCallback(
    (signal: AbortSignal) =>
      listProducts({ q: query, category: category === ALL ? undefined : category }, signal),
    [query, category],
  );
  // Debounced so typing in the search box doesn't send a request per keystroke.
  const { data, error, reload } = useFetch(load, { delay: 200, keepPrevious: true });
  // The API has no price filter, so the range is applied to the loaded list.
  const products = useMemo(
    () =>
      sortProducts(
        (data ?? []).filter((p) => inPriceRange(p, minPrice, maxPrice)),
        sort,
      ),
    [data, sort, minPrice, maxPrice],
  );

  const inCart = (id: string): number => cart.lines.find((l) => l.product.id === id)?.quantity ?? 0;

  return (
    <>
      <section className="page-head">
        <h1>Find something to book</h1>
        <div className="filters">
          <Input
            ref={searchRef}
            type="search"
            aria-label="Search the catalog"
            aria-keyshortcuts="/"
            title="Press / to search"
            placeholder="Search stays, tours, events…"
            value={query}
            onChange={(e) => setFilter('q', e.target.value)}
          />
          <div className="filter-row">
            <div className="chips">
              {chips.map((c) => (
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
            <div className="price-range" role="group" aria-label="Price range">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                aria-label="Minimum price"
                placeholder="Min $"
                value={params.get('min') ?? ''}
                onChange={(e) => setFilter('min', e.target.value)}
              />
              <span aria-hidden="true">–</span>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                aria-label="Maximum price"
                placeholder="Max $"
                value={params.get('max') ?? ''}
                onChange={(e) => setFilter('max', e.target.value)}
              />
            </div>
            <label className="sort">
              Sort by
              <select
                className="input"
                value={sort}
                onChange={(e) => setFilter('sort', e.target.value)}
              >
                {Object.entries(SORTS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
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
              {p.imageUrl && <ProductImage src={p.imageUrl} lazy />}
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
