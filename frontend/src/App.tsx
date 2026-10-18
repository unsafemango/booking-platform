import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Alert from './components/Alert.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import Nav from './components/Nav.tsx';
import SessionExpiryWarning from './components/SessionExpiryWarning.tsx';
import { useAuth } from './lib/auth.tsx';
import Admin from './pages/Admin.tsx';
import AdminEditProduct from './pages/AdminEditProduct.tsx';
import AdminNewProduct from './pages/AdminNewProduct.tsx';
import Cart from './pages/Cart.tsx';
import Login from './pages/Login.tsx';
import NotFound from './pages/NotFound.tsx';
import OrderDetail from './pages/OrderDetail.tsx';
import Orders from './pages/Orders.tsx';
import ProductDetail from './pages/ProductDetail.tsx';
import Products from './pages/Products.tsx';
import Profile from './pages/Profile.tsx';
import Register from './pages/Register.tsx';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user)
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN')
    return <Alert>You need an administrator account to view this page.</Alert>;
  return children;
}

export default function App() {
  const { pathname } = useLocation();

  return (
    <>
      <Nav />
      <main className="container">
        <SessionExpiryWarning />
        <ErrorBoundary resetKey={pathname}>
          <Routes>
            <Route path="/" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route
              path="/orders"
              element={
                <RequireAuth>
                  <Orders />
                </RequireAuth>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <RequireAuth>
                  <OrderDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <Admin />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/products/new"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminNewProduct />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route
              path="/admin/products/:id/edit"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminEditProduct />
                  </RequireAdmin>
                </RequireAuth>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </>
  );
}
