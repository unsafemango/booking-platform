import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import ProductImage from '../components/ProductImage.tsx';
import { getProduct } from '../api/products.ts';
import { money } from '../lib/api.ts';
import { useCart } from '../lib/cart.tsx';
import { loadRecentlyViewed, recordView } from '../lib/recentlyViewed.ts';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import { useFetch } from '../lib/useFetch.ts';

export default function ProductDetail() {
  const { id = '' } = useParams();
  const load = useCallback((signal: AbortSignal) => getProduct(id, signal), [id]);
  const { data: product, error, errorStatus, reload } = useFetch(load);
  const notFound = errorStatus === 404;
  const cart = useCart();
  useDocumentTitle(product?.name ?? (notFound ? 'Listing not found' : null));
  const [recent, setRecent] = useState(loadRecentlyViewed);

  useEffect(() => {
    if (product) setRecent(recordView(product));
  }, [product]);

  const back = (
    <Link to="/" className="back-link">
      ← All listings
    </Link>
  );

  if (notFound) {
    return (
      <>
        {back}
        <div className="empty">
          <h1>Listing not found</h1>
          <p className="muted">It may have been removed from the catalog.</p>
        </div>
      </>
    );
  }
  if (error) {
    return (
      <>
        {back}
        <Alert onRetry={reload}>Couldn't load this listing: {error}</Alert>
      </>
    );
  }
  if (!product) {
    return (
      <>
        {back}
        <p role="status" className="muted">
          Loading listing…
        </p>
      </>
    );
  }

  const inCart = cart.lines.find((l) => l.product.id === product.id)?.quantity ?? 0;
  const remaining = product.stock - inCart;
  const others = recent.filter((p) => p.id !== product.id).slice(0, 4);

  return (
    <>
      {back}
      <article className="card product product-detail">
        {product.imageUrl && <ProductImage src={product.imageUrl} />}
        <div className="product-body">
          <span className="eyebrow">{product.category}</span>
          <h1>{product.name}</h1>
          {product.description && <p>{product.description}</p>}
          <div className="product-foot">
            <div>
              <strong>{money(product.price)}</strong>
              <div className={`stock ${product.stock < 5 ? 'low' : ''}`}>
                {product.stock === 0 ? 'Sold out' : `${product.stock} available`}
              </div>
            </div>
            <Button disabled={remaining <= 0} onClick={() => cart.add(product)}>
              {inCart ? `Add another (${inCart})` : 'Add to cart'}
            </Button>
          </div>
        </div>
      </article>
      {others.length > 0 && (
        <section className="recently-viewed" aria-labelledby="recently-viewed-heading">
          <h2 id="recently-viewed-heading">Recently viewed</h2>
          <ul>
            {others.map((p) => (
              <li key={p.id}>
                <Link to={`/products/${p.id}`}>{p.name}</Link>
                <span className="muted">
                  {p.category} · {money(p.price)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
