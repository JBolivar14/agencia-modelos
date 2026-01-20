import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './Layout.css';

function Layout() {
  const location = useLocation();
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/session', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setIsAuthed(!!data?.authenticated);
      } catch (_) {
        if (cancelled) return;
        setIsAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const adminLinkTo = isAuthed ? '/admin' : '/login';
  const adminLinkLabel = isAuthed ? 'Admin Panel' : 'Login';
  const isAdminActive = location.pathname === '/login' || location.pathname.startsWith('/admin');

  return (
    <div className="app-layout">
      <header className="header" role="banner">
        <div className="container">
          <Link to="/" className="logo" aria-label="Agencia Modelos Argentinas">
            Agencia Modelos Argentinas
          </Link>
          <nav role="navigation" aria-label="Navegación principal">
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              aria-current={location.pathname === '/' ? 'page' : undefined}
            >
              Home
            </Link>
            <Link
              to="/contacto"
              className={`nav-link ${location.pathname === '/contacto' ? 'active' : ''}`}
            >
              Contacto
            </Link>
            <Link
              to={adminLinkTo}
              className={`nav-link ${isAdminActive ? 'active' : ''}`}
            >
              {adminLinkLabel}
            </Link>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="footer-modern">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3 className="footer-logo">Agencia Modelos Argentinas</h3>
              <p className="footer-tagline">Descubre el talento y profesionalismo</p>
            </div>
            <div className="footer-links">
              <div className="footer-section">
                <h4>Navegación</h4>
                <Link to="/">Inicio</Link>
                <Link to="/contacto">Contacto</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Agencia Modelos Argentinas. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
