import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { toast } from '../utils/toast';

function ConfirmarEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = (searchParams.get('token') || '').trim();
    if (!token) {
      setStatus('error');
      setMessage('Token inválido');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/contacto/confirm?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          const msg = data?.message || 'No se pudo confirmar el email';
          setStatus('error');
          setMessage(msg);
          toast.error(msg);
          return;
        }
        setStatus('success');
        setMessage('Email confirmado. ¡Gracias!');
        toast.success('Email confirmado');
      } catch (e) {
        setStatus('error');
        setMessage('Error de conexión');
        toast.error('Error de conexión');
      }
    })();
  }, [searchParams]);

  return (
    <div className="contacto-page">
      <div className="container">
        <div className="card contact-form">
          <h1>Confirmación de email</h1>
          {status === 'loading' && <p>Confirmando...</p>}
          {status !== 'loading' && <p className="subtitle">{message}</p>}
          <div style={{ marginTop: '1rem' }}>
            <Link to="/" className="btn-secondary">Volver al inicio</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmarEmail;

