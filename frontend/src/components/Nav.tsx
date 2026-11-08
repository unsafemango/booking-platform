import { NavLink, useLocation, useNavigate, type Location } from 'react-router-dom';
import Button from './Button.tsx';
import CartSummary from './CartSummary.tsx';
import ThemeToggle from './ThemeToggle.tsx';
import { useAuth } from '../lib/auth.tsx';
import { useCart } from '../lib/cart.tsx';
import { useUnreadNotificationCount } from '../lib/useUnreadNotificationCount.ts';

/** The log in link, which brings the user back to this page. The auth pages pass on their own next. */
function loginLink({ pathname, search, hash }: Location): string {
  if (pathname === '/login' || pathname === '/register') return `/login${search}`;
  const here = pathname + search + hash;
  return here === '/' ? '/login' : `/login?next=${encodeURIComponent(here)}`;
}

export default function Nav() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const unread = useUnreadNotificationCount();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="nav">
      <div className="container nav-inner">
        <NavLink to="/" className="brand">
          Booking
        </NavLink>
        <nav className="nav-links">
          <NavLink to="/" end>
            Browse
          </NavLink>
          <span className="nav-cart">
            <NavLink to="/cart">Cart{count > 0 && <span className="pill">{count}</span>}</NavLink>
            <CartSummary />
          </span>
          {user && (
            <NavLink to="/orders">
              My bookings
              {unread > 0 && (
                <span className="pill">
                  {unread}
                  <span className="sr-only"> unread {unread === 1 ? 'email' : 'emails'}</span>
                </span>
              )}
            </NavLink>
          )}
          {user && <NavLink to="/profile">Profile</NavLink>}
          {user?.role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="nav-user">
          <ThemeToggle />
          {user ? (
            <>
              <span className="muted hide-sm">{user.name}</span>
              <Button
                variant="ghost"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Log out
              </Button>
            </>
          ) : (
            <NavLink to={loginLink(location)} className="btn btn-ghost">
              Log in
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
