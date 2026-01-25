import React, { useState, useEffect, useRef } from 'react';
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
  const [showContactButton, setShowContactButton] = useState(false);
  const [showAutoFillHint, setShowAutoFillHint] = useState(false);
  const nameInputRef = useRef(null);
  const pickerTriedRef = useRef(false);

  const isMobile = typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const vieneDeQR = typeof document !== 'undefined' &&
    (!document.referrer || document.referrer === '' || (window.location.hostname && document.referrer.includes(window.location.hostname)));

  const llenarDesdeContactos = async () => {
    if (typeof navigator === 'undefined' || !('contacts' in navigator) || !('ContactsManager' in window)) {
      toast.error('Tu navegador no permite elegir contactos. Completá los campos manualmente.');
      return;
    }
    try {
      const props = await navigator.contacts.getProperties();
      const ok = props.some((p) => ['name', 'email', 'tel'].includes(p));
      if (!ok) {
        toast.error('No se puede acceder a contactos en este navegador.');
        return;
      }
      const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: false });
      if (contacts && contacts.length > 0) {
        const c = contacts[0];
        setFormData((prev) => ({
          ...prev,
          nombre: (c.name && c.name[0]) ? c.name[0] : prev.nombre,
          email: (c.email && c.email[0]) ? c.email[0] : prev.email,
          telefono: (c.tel && c.tel[0]) ? c.tel[0] : prev.telefono,
        }));
        toast.success('Datos cargados desde tu contacto');
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('Contact Picker:', e);
        toast.error('No se pudo cargar el contacto. Completá los campos manualmente.');
      }
    }
  };

  useEffect(() => {
    if (pickerTriedRef.current) return;
    const hasValues = formData.nombre || formData.email || formData.telefono;
    if (hasValues) return;

    const hasPicker = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;
    if (isMobile) setShowAutoFillHint(true);

    if (hasPicker) {
      setShowContactButton(true);
      if (isMobile && vieneDeQR) {
        pickerTriedRef.current = true;
        const t = setTimeout(async () => {
          try {
            const props = await navigator.contacts.getProperties();
            const ok = props.some((p) => ['name', 'email', 'tel'].includes(p));
            if (!ok) return;
            const contacts = await navigator.contacts.select(['name', 'email', 'tel'], { multiple: false });
            if (contacts && contacts.length > 0) {
              const c = contacts[0];
              setFormData((prev) => ({
                ...prev,
                nombre: (c.name && c.name[0]) ? c.name[0] : prev.nombre,
                email: (c.email && c.email[0]) ? c.email[0] : prev.email,
                telefono: (c.tel && c.tel[0]) ? c.tel[0] : prev.telefono,
              }));
              toast.success('Datos cargados. Revisá y enviá.');
            }
          } catch (err) {
            if (err.name !== 'AbortError') console.warn('Contact Picker auto:', err);
          }
        }, 400);
        return () => clearTimeout(t);
      }
    }

    if (isMobile && nameInputRef.current) {
      const t = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isMobile, vieneDeQR]);

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
          <h1>Registrate para participar en el sorteo</h1>
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
          {showAutoFillHint && isMobile && (
            <div className="auto-fill-hint" style={{ display: 'block', marginBottom: '1rem' }}>
              💡 <strong>Tip:</strong> Tocá cualquier campo para que el navegador sugiera tus datos, o usá el botón de abajo.
            </div>
          )}
          {showContactButton && (
            <button
              type="button"
              className="btn-contacto-selector"
              onClick={llenarDesdeContactos}
              disabled={loading}
              style={{ marginBottom: '1rem' }}
            >
              📱 Llenar desde mis contactos
            </button>
          )}
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
                ref={nameInputRef}
                type="text"
                id="nombre"
                name="nombre"
                required
                placeholder="Tu nombre"
                autoComplete="name"
                autoFocus={!isMobile}
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
