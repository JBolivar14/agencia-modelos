import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import './Login.css';

function Login() {
  const [mode, setMode] = useState('login'); // login | register
  const [username, setUsername] = useState(''); // login: username/email
  const [password, setPassword] = useState(''); // login password

  // Registro público (modelo / postulante)
  const [registroNombre, setRegistroNombre] = useState('');
  const [registroEmail, setRegistroEmail] = useState('');
  const [registroPassword, setRegistroPassword] = useState('');
  const [registroPassword2, setRegistroPassword2] = useState('');
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
        const rol = data?.user?.rol || 'admin';
        if (rol === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
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
        const rol = data?.user?.rol || 'admin';
        toast.success('Login exitoso. Redirigiendo...');
        setTimeout(() => {
          navigate(rol === 'admin' ? '/admin' : '/', { replace: true });
        }, 700);
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

  const handleRegistro = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!registroPassword || registroPassword.trim().length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres');
      }
      if (registroPassword !== registroPassword2) {
        throw new Error('Las contraseñas no coinciden');
      }

      const payload = {
        nombre: registroNombre,
        email: registroEmail,
        password: registroPassword
      };

      const response = await fetch('/api/usuarios/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || '¡Listo! Revisá tu email para confirmar tu cuenta.');
        setRegistroNombre('');
        setRegistroEmail('');
        setRegistroPassword('');
        setRegistroPassword2('');
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
          <h1>🔐 Logueate!</h1>
          <p className="subtitle">
            Si ya estás registrado, iniciá sesión. Si no, registrate para crear tu cuenta.
            {mode === 'register' && (
              <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.95rem', opacity: 0.9 }}>
                Te vamos a enviar un email para confirmar tu dirección.
              </span>
            )}
          </p>

          <div className="login-switch" role="tablist" aria-label="Logueate o registro">
            <button
              type="button"
              className={`login-switch-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
              disabled={loading}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={`login-switch-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
              disabled={loading}
            >
              Registrarse
            </button>
          </div>
          
          {mode === 'login' ? (
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
            <form onSubmit={handleRegistro}>
              <div className="form-group">
                <label htmlFor="registroNombre">Nombre completo</label>
                <input
                  type="text"
                  id="registroNombre"
                  name="registroNombre"
                  required
                  placeholder="Tu nombre"
                  autoComplete="name"
                  value={registroNombre}
                  onChange={(e) => setRegistroNombre(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="registroEmail">Email</label>
                <input
                  type="email"
                  id="registroEmail"
                  name="registroEmail"
                  required
                  placeholder="tuemail@ejemplo.com"
                  autoComplete="email"
                  value={registroEmail}
                  onChange={(e) => setRegistroEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="registroPassword">Contraseña</label>
                <input
                  type="password"
                  id="registroPassword"
                  name="registroPassword"
                  required
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  value={registroPassword}
                  onChange={(e) => setRegistroPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="registroPassword2">Repetir contraseña</label>
                <input
                  type="password"
                  id="registroPassword2"
                  name="registroPassword2"
                  required
                  placeholder="Repetí tu contraseña"
                  autoComplete="new-password"
                  value={registroPassword2}
                  onChange={(e) => setRegistroPassword2(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="loader"></span>
                    Creando cuenta...
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
