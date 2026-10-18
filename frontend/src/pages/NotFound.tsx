import { Link, useLocation } from 'react-router-dom';

export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <section className="empty">
      <h1>Page not found</h1>
      <p className="muted">
        There is nothing at <code>{pathname}</code>. The link may be old or mistyped.
      </p>
      <Link to="/" className="btn">
        Browse bookings
      </Link>
    </section>
  );
}
