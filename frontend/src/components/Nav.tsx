import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.tsx';
import { useCart } from '../lib/cart.tsx';

export default function Nav() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <header className="nav">
      <div className="container nav-inner">
        <NavLink to="/" className="brand">Booking</NavLink>
        <nav className="nav-links">
          <NavLink to="/" end>Browse</NavLink>
          <NavLink to="/cart">
            Cart{count > 0 && <span className="pill">{count}</span>}
          </NavLink>
          {user && <NavLink to="/orders">My bookings</NavLink>}
        </nav>
        <div className="nav-user">
          {user ? (
            <>
              <span className="muted hide-sm">{user.name}</span>
              <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>Log out</button>
            </>
          ) : (
            <NavLink to="/login" className="btn btn-ghost">Log in</NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
