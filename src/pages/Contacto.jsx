import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '../utils/toast';
import './Contacto.css';

function Contacto() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    empresa: '',
    mensaje: '',
    website: '', // honeypot anti-bots (debe quedar vacío)
  });
  const [loading, setLoading] = useState(false);
  const prefillDoneRef = useRef(false);

  useEffect(() => {
    if (prefillDoneRef.current) return;

    const modelo = (searchParams.get('modelo') || '').trim();
    const modeloId = (searchParams.get('modeloId') || '').trim();
    if (!modelo && !modeloId) return;

    prefillDoneRef.current = true;

    setFormData((prev) => {
      // Si el usuario ya escribió mensaje, no lo pisamos
      if (prev.mensaje && prev.mensaje.trim()) return prev;

      const ref = [modelo, modeloId ? `ID ${modeloId}` : null].filter(Boolean).join(' · ');
      const mensaje = `Hola, me interesa la modelo ${ref}.`;
      return { ...prev, mensaje };
    });
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contacto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success('¡Gracias! Tu información ha sido recibida.');
        // Limpiar formulario
        setFormData({
          nombre: '',
          email: '',
          telefono: '',
          empresa: '',
          mensaje: '',
          website: '',
        });
      } else {
        toast.error(data.message || 'Error al enviar el formulario');
      }
    } catch (error) {
      console.error('Error en contacto:', error);
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
          <h1>📝 Comparte tus Datos</h1>
          <p className="subtitle">
            Completa el formulario para compartir tu información de contacto
          </p>
          
          <form onSubmit={handleSubmit}>
            {/* Honeypot anti-bots (oculto) */}
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
                placeholder="+1 234 567 8900"
                autoComplete="tel"
                value={formData.telefono}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="empresa">Empresa</label>
              <input
                type="text"
                id="empresa"
                name="empresa"
                placeholder="Nombre de tu empresa"
                autoComplete="organization"
                value={formData.empresa}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="mensaje">Mensaje adicional (opcional)</label>
              <textarea
                id="mensaje"
                name="mensaje"
                rows="4"
                placeholder="Escribe un mensaje si lo deseas..."
                value={formData.mensaje}
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
                'Enviar Información'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Contacto;
