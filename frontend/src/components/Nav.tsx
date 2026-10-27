import { NavLink, useNavigate } from 'react-router-dom';
import Button from './Button.tsx';
import CartSummary from './CartSummary.tsx';
import ThemeToggle from './ThemeToggle.tsx';
import { useAuth } from '../lib/auth.tsx';
import { useCart } from '../lib/cart.tsx';

export default function Nav() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

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
          {user && <NavLink to="/orders">My bookings</NavLink>}
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
            <NavLink to="/login" className="btn btn-ghost">
              Log in
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
