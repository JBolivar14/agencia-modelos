import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar si ya está autenticado
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/session');
      const data = await response.json();
      if (data.authenticated) {
        navigate('/admin', { replace: true });
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
    }
  };

  const handleSubmit = async (e) => {
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

  return (
    <div className="login-page">
      <div className="container">
        <div className="card login-card">
          <h1>🔐 Acceso Administrativo</h1>
          <p className="subtitle">Ingresa tus credenciales para acceder al panel</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                type="text"
                id="username"
                name="username"
                required
                placeholder="Ingresa tu usuario"
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
          
          <div className="login-footer">
            <a href="/" className="back-link">← Volver al inicio</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
