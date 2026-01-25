import React, { useState } from 'react';
import { toast } from '../utils/toast';
import './Contacto.css';

function Sorteo() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    website: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/sorteo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || '¡Gracias! Revisá tu email para confirmar tu participación.');
        setFormData({ nombre: '', email: '', telefono: '', website: '' });
      } else {
        toast.error(data.message || 'Error al enviar el formulario');
      }
    } catch (error) {
      console.error('Error en sorteo:', error);
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
    <div className="contacto-page">
      <div className="container">
        <div className="card contact-form">
          <h1>🎉 Sorteo — Cena en Puerto Madero</h1>
          <p className="subtitle">
            Completá tus datos para participar. Sorteo el <strong>28 de enero</strong>.
          </p>
          <div className="contacto-promo">
            <p className="contacto-promo-title">¡Participá por una cena para 4 personas!</p>
            <p className="contacto-promo-text">
              Al registrarte participás por una <strong>cena para 4 personas</strong> en Puerto Madero.
            </p>
            <p className="contacto-promo-auspician">
              Auspician: <strong>Vuelo Producciones</strong> y <strong>Menjunje TV</strong>.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              name="website"
              tabIndex="-1"
              autoComplete="off"
              value={formData.website}
              onChange={handleChange}
              style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
              aria-hidden="true"
            />
            <div className="form-group">
              <label htmlFor="nombre">Nombre completo *</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                required
                placeholder="Tu nombre"
                autoComplete="name"
                autoFocus
                value={formData.nombre}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="tu@email.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="telefono">Teléfono</label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                placeholder="+54 11 1234-5678"
                autoComplete="tel"
                value={formData.telefono}
                onChange={handleChange}
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
                'Participar en el sorteo'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Sorteo;
