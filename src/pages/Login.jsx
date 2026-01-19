import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import './Login.css';

function Login() {
  const [mode, setMode] = useState('login'); // login | register
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regNombre, setRegNombre] = useState('');
  const [regCode, setRegCode] = useState('');
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          email: regEmail,
          nombre: regNombre,
          password,
          code: regCode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        toast.error(data.message || 'No se pudo registrar');
        return;
      }

      // Auto-login luego del registro
      const loginRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const loginData = await loginRes.json().catch(() => ({}));
      if (loginRes.ok && loginData?.success) {
        toast.success('Registro exitoso. Entrando al panel...');
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 800);
      } else {
        toast.success('Registro exitoso. Ahora podés loguearte.');
        setMode('login');
      }
    } catch (error) {
      console.error('Error en registro:', error);
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
            {mode === 'register' && (
              <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.95rem', opacity: 0.9 }}>
                (El registro requiere un código provisto por la agencia)
              </span>
            )}
          </p>

          <div className="login-switch" role="tablist" aria-label="Login o registro">
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
          
          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
            <div className="form-group">
              <label htmlFor="username">{mode === 'login' ? 'Usuario o email' : 'Username'}</label>
              <input
                type="text"
                id="username"
                name="username"
                required
                placeholder={mode === 'login' ? 'Ingresa tu usuario o email' : 'Ej: admin1'}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>

            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label htmlFor="regEmail">Email</label>
                  <input
                    type="email"
                    id="regEmail"
                    name="regEmail"
                    required
                    placeholder="tuemail@ejemplo.com"
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="regNombre">Nombre</label>
                  <input
                    type="text"
                    id="regNombre"
                    name="regNombre"
                    required
                    placeholder="Tu nombre"
                    autoComplete="name"
                    value={regNombre}
                    onChange={(e) => setRegNombre(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </>
            )}
            
            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <input
                type="password"
                id="password"
                name="password"
                required
                placeholder="Ingresa tu contraseña"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="regCode">Código de registro</label>
                <input
                  type="password"
                  id="regCode"
                  name="regCode"
                  required
                  placeholder="Código provisto por la agencia"
                  autoComplete="one-time-code"
                  value={regCode}
                  onChange={(e) => setRegCode(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
            
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="loader"></span>
                  {mode === 'login' ? 'Iniciando sesión...' : 'Registrando...'}
                </>
              ) : (
                mode === 'login' ? 'Iniciar Sesión' : 'Registrarme'
              )}
            </button>
          </form>
          
          <div className="login-footer">
            <a href="/" className="back-link">← Volver al inicio</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
