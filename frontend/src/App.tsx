import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Alert from './components/Alert.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import Nav from './components/Nav.tsx';
import SessionExpiryWarning from './components/SessionExpiryWarning.tsx';
import { PageLoading } from './components/Skeleton.tsx';
import { useAuth } from './lib/auth.tsx';
import Login from './pages/Login.tsx';
import NotFound from './pages/NotFound.tsx';
import Products from './pages/Products.tsx';

// The catalog, login and 404 pages stay in the main bundle; the rest load on first visit.
const Admin = lazy(() => import('./pages/Admin.tsx'));
const AdminEditProduct = lazy(() => import('./pages/AdminEditProduct.tsx'));
const AdminNewProduct = lazy(() => import('./pages/AdminNewProduct.tsx'));
const Cart = lazy(() => import('./pages/Cart.tsx'));
const OrderDetail = lazy(() => import('./pages/OrderDetail.tsx'));
const Orders = lazy(() => import('./pages/Orders.tsx'));
const ProductDetail = lazy(() => import('./pages/ProductDetail.tsx'));
const Profile = lazy(() => import('./pages/Profile.tsx'));
const Register = lazy(() => import('./pages/Register.tsx'));

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
          <Suspense fallback={<PageLoading />}>
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
          </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}
