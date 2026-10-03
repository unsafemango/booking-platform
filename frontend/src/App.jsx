import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Nav from './components/Nav.tsx';
import { useAuth } from './lib/auth.tsx';
import Cart from './pages/Cart.tsx';
import Login from './pages/Login.tsx';
import Orders from './pages/Orders.tsx';
import Products from './pages/Products.tsx';
import Register from './pages/Register.tsx';

function RequireAuth({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Nav />
      <main className="container">
        <Routes>
          <Route path="/" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
