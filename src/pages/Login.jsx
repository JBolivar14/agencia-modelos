import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import './Login.css';

function Login() {
  const [mode, setMode] = useState('admin'); // admin | modelo
  const [username, setUsername] = useState(''); // admin: username/email
  const [password, setPassword] = useState(''); // admin password

  // Registro de modelo (público)
  const [modeloNombre, setModeloNombre] = useState('');
  const [modeloEmail, setModeloEmail] = useState('');
  const [modeloTelefono, setModeloTelefono] = useState('');
  const [modeloMensaje, setModeloMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar si ya está autenticado
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/session', { credentials: 'include' });
      const data = await response.json();
      if (data.authenticated) {
        navigate('/admin', { replace: true });
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success('Login exitoso. Redirigiendo...');
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 1000);
      } else {
        toast.error(data.message || 'Usuario o contraseña incorrectos');
      }
    } catch (error) {
      console.error('Error en login:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Error de conexión. Verifica tu conexión a internet.');
      } else {
        toast.error(error.message || 'Error de conexión. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModeloRegistro = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        nombre: modeloNombre,
        email: modeloEmail,
        telefono: modeloTelefono,
        empresa: null,
        mensaje: modeloMensaje || 'Registro de modelo'
      };

      const response = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || '¡Listo! Revisá tu email para confirmar.');
        setModeloNombre('');
        setModeloEmail('');
        setModeloTelefono('');
        setModeloMensaje('');
      } else {
        toast.error(data.message || 'No se pudo enviar tu información');
      }
    } catch (error) {
      console.error('Error en registro de modelo:', error);
      toast.error(error.message || 'Error de conexión. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        <div className="card login-card">
          <h1>🔐 Loguearte</h1>
          <p className="subtitle">
            Si ya estás registrado, logueate acá. Si no, creá tu cuenta.
            {mode === 'modelo' && (
              <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.95rem', opacity: 0.9 }}>
                (Te vamos a enviar un email para confirmar tu dirección)
              </span>
            )}
          </p>

          <div className="login-switch" role="tablist" aria-label="Login o registro">
            <button
              type="button"
              className={`login-switch-btn ${mode === 'admin' ? 'active' : ''}`}
              onClick={() => setMode('admin')}
              disabled={loading}
            >
              Admin
            </button>
            <button
              type="button"
              className={`login-switch-btn ${mode === 'modelo' ? 'active' : ''}`}
              onClick={() => setMode('modelo')}
              disabled={loading}
            >
              Modelo
            </button>
          </div>
          
          {mode === 'admin' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="username">Usuario o email</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                  placeholder="Ingresa tu usuario o email"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="loader"></span>
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleModeloRegistro}>
              <div className="form-group">
                <label htmlFor="modeloNombre">Nombre completo</label>
                <input
                  type="text"
                  id="modeloNombre"
                  name="modeloNombre"
                  required
                  placeholder="Tu nombre"
                  autoComplete="name"
                  value={modeloNombre}
                  onChange={(e) => setModeloNombre(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="modeloEmail">Email</label>
                <input
                  type="email"
                  id="modeloEmail"
                  name="modeloEmail"
                  required
                  placeholder="tuemail@ejemplo.com"
                  autoComplete="email"
                  value={modeloEmail}
                  onChange={(e) => setModeloEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="modeloTelefono">Teléfono</label>
                <input
                  type="tel"
                  id="modeloTelefono"
                  name="modeloTelefono"
                  placeholder="Opcional"
                  autoComplete="tel"
                  value={modeloTelefono}
                  onChange={(e) => setModeloTelefono(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="modeloMensaje">Mensaje</label>
                <input
                  type="text"
                  id="modeloMensaje"
                  name="modeloMensaje"
                  placeholder="Opcional"
                  value={modeloMensaje}
                  onChange={(e) => setModeloMensaje(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="loader"></span>
                    Enviando...
                  </>
                ) : (
                  'Crear mi cuenta'
                )}
              </button>
            </form>
          )}
          
          <div className="login-footer">
            <a href="/" className="back-link">← Volver al inicio</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
