import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../components/Alert.tsx';
import Button from '../components/Button.tsx';
import { ApiError, api, money } from '../lib/api.ts';
import { useCart } from '../lib/cart.tsx';
import type { Product } from '../types.ts';

export default function ProductDetail() {
  const { id = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const cart = useCart();

  useEffect(() => {
    let active = true;
    setProduct(null);
    setError(null);
    setNotFound(false);
    api<Product>(`/api/products/${encodeURIComponent(id)}`)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
    };
  }, [id]);

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
        <Alert>Couldn't load this listing: {error}</Alert>
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

  return (
    <>
      {back}
      <article className="card product product-detail">
        {product.imageUrl && <img src={product.imageUrl} alt="" />}
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
    </>
  );
}
