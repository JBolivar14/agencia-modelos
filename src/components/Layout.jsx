import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './Layout.css';

function Layout() {
  const location = useLocation();
  const [session, setSession] = useState({ authenticated: false, rol: null });
  const [perfilOpen, setPerfilOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/session', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setSession({
          authenticated: !!data?.authenticated,
          rol: data?.user?.rol || (data?.authenticated ? 'admin' : null)
        });
      } catch (_) {
        if (cancelled) return;
        setSession({ authenticated: false, rol: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const isAdmin = session.authenticated && session.rol === 'admin';
  const isModelo = session.authenticated && session.rol === 'modelo';
  const adminLinkTo = isAdmin ? '/admin' : '/login';
  const adminLinkLabel = isAdmin ? 'Admin Panel' : 'Logueate!';
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
              Inicio
            </Link>
            <Link
              to="/contacto"
              className={`nav-link ${location.pathname === '/contacto' ? 'active' : ''}`}
            >
              Contacto
            </Link>
            {isModelo ? (
              <button
                type="button"
                className={`nav-link nav-link-btn ${perfilOpen ? 'active' : ''}`}
                onClick={() => setPerfilOpen(true)}
              >
                Perfil
              </button>
            ) : (
              <Link
                to={adminLinkTo}
                className={`nav-link ${isAdminActive ? 'active' : ''}`}
              >
                {adminLinkLabel}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      {isModelo && perfilOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setPerfilOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Perfil</h3>
            <p style={{ marginBottom: '1rem' }}>
              Estamos trabajando en esta función.
            </p>
            <button type="button" className="btn-secondary" onClick={() => setPerfilOpen(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

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
            <p>&copy; 2026 Agencia Modelos Argentinas. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
