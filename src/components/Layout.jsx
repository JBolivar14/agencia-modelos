import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './Layout.css';

function Layout() {
  const location = useLocation();

  return (
    <div className="app-layout">
      <header className="header" role="banner">
        <div className="container">
          <Link to="/" className="logo" aria-label="Agencia Modelos">
            Agencia Modelos
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
              to="/login"
              className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
            >
              Admin
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
              <h3 className="footer-logo">Agencia Modelos</h3>
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
            <p>&copy; 2025 Agencia Modelos. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
