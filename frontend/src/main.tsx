import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './lib/auth.tsx';
import { CartProvider } from './lib/cart.tsx';
import { ToastProvider } from './lib/toast.tsx';
import { applyTheme, loadTheme } from './lib/theme.ts';
import './styles.css';

// Apply the saved theme before the first render so the page doesn't flash the wrong colours.
applyTheme(loadTheme());

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
