import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '../utils/toast';
import './Login.css';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!token) throw new Error('Token inválido');
      if (!password || password.trim().length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
      if (password !== password2) throw new Error('Las contraseñas no coinciden');

      const res = await fetch('/api/usuarios/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'No se pudo restablecer la contraseña');
      }

      toast.success(data.message || 'Contraseña actualizada');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        <div className="card login-card">
          <h1>🔐 Restablecer contraseña</h1>
          <p className="subtitle">
            Elegí una nueva contraseña. El link vence en 1 hora.
          </p>

          {!token ? (
            <>
              <p className="subtitle">Token inválido o faltante.</p>
              <div className="login-footer">
                <Link to="/login" className="back-link">← Volver al login</Link>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="newPassword">Nueva contraseña</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  required
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword2">Repetir contraseña</label>
                <input
                  type="password"
                  id="newPassword2"
                  name="newPassword2"
                  required
                  placeholder="Repetí tu contraseña"
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <span className="loader"></span>
                    Guardando...
                  </>
                ) : (
                  'Guardar nueva contraseña'
                )}
              </button>

              <div className="login-footer" style={{ marginTop: '1rem' }}>
                <Link to="/login" className="back-link">← Volver al login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;

