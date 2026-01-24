import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import './Layout.css';
import { clearCsrfToken } from '../utils/csrf';

function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
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

  const handleLogout = async () => {
    try {
      // Esta ruta limpia cookie/sesión y redirige en el backend.
      await fetch('/api/logout', { credentials: 'include' });
    } catch (_) {
      // Si falla igual intentamos dejar el frontend en estado "deslogueado".
    } finally {
      clearCsrfToken();
      setPerfilOpen(false);
      setSession({ authenticated: false, rol: null });
      navigate('/login', { replace: true });
    }
  };

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
              <>
                <button
                  type="button"
                  className={`nav-link nav-link-btn ${perfilOpen ? 'active' : ''}`}
                  onClick={() => setPerfilOpen(true)}
                >
                  Perfil
                </button>
                <button type="button" className="nav-link nav-link-btn" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </>
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
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setPerfilOpen(false)}>
                Cerrar
              </button>
              <button type="button" className="btn-secondary" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
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
            <p className="footer-vuelo">
              <a
                href="https://www.instagram.com/vuelo.producciones/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-instagram-link"
                aria-label="Instagram de Vuelo Producciones"
              >
                <span className="footer-vuelo-text">Vuelo Producciones</span>
                <svg className="footer-instagram-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </p>
            <p>&copy; 2026 Agencia Modelos Argentinas. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
