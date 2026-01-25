import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { csrfFetch } from '../utils/csrf';
import { toast } from '../utils/toast';
import './ModalPerfilModelo.css';

function getFocusables(container) {
  if (!container) return [];
  const sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(sel)).filter(
    (el) => !el.disabled && el.offsetParent != null
  );
}

const FIELD_LABELS = {
  nombre: 'Nombre',
  apellido: 'Apellido',
  email: 'Email',
  telefono: 'Teléfono',
  edad: 'Edad',
  altura: 'Altura',
  medidas: 'Medidas',
  ciudad: 'Ciudad',
  descripcion: 'Descripción',
  foto: 'Foto (URL)'
};

export default function ModalPerfilModelo({ open, onClose, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [modelo, setModelo] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const cardRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setModelo(null);
    setEditing(false);
    setLoading(true);

    fetch('/api/perfil-modelo', { credentials: 'include' })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (!data.success || !data.modelo) {
          setError(data.message || 'No se pudo cargar tu perfil.');
          setModelo(null);
          return;
        }
        setModelo(data.modelo);
        setForm({
          nombre: data.modelo.nombre || '',
          apellido: data.modelo.apellido || '',
          email: data.modelo.email || '',
          telefono: data.modelo.telefono || '',
          edad: data.modelo.edad ?? '',
          altura: data.modelo.altura || '',
          medidas: data.modelo.medidas || '',
          ciudad: data.modelo.ciudad || '',
          descripcion: data.modelo.descripcion || '',
          foto: data.modelo.foto || ''
        });
      })
      .catch(() => {
        setError('Error de conexión. Intentá de nuevo.');
        setModelo(null);
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusCard = () => { cardRef.current?.focus(); };
    const id = requestAnimationFrame(focusCard);
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      let list = getFocusables(cardRef.current);
      if (list.length === 0 && cardRef.current.tabIndex === -1) list = [cardRef.current];
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await csrfFetch('/api/perfil-modelo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          edad: form.edad === '' ? null : form.edad
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Error al guardar');
      }
      if (data.success && data.modelo) {
        setModelo(data.modelo);
        setEditing(false);
        toast.success('Perfil actualizado');
      } else {
        throw new Error(data.message || 'Error al guardar');
      }
    } catch (err) {
      toast.error(err.message || 'Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perfil-modal-title"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="modal-card modal-perfil"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="perfil-modal-title" className="perfil-title">
          Mi perfil
        </h2>

        {loading && (
          <div className="perfil-loading">
            <div className="loader" aria-hidden="true" />
            <p>Cargando perfil…</p>
          </div>
        )}

        {!loading && error && (
          <div className="perfil-error">
            <p>{error}</p>
            <div className="perfil-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cerrar
              </button>
              <button type="button" className="btn-secondary" onClick={onLogout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {!loading && !error && modelo && !editing && (
          <div className="perfil-view">
            <div className="perfil-foto-wrap">
              {modelo.foto ? (
                <img src={modelo.foto} alt="" className="perfil-foto" />
              ) : (
                <div className="perfil-foto-placeholder">Sin foto</div>
              )}
            </div>
            <dl className="perfil-dl">
              {['nombre', 'apellido', 'email', 'telefono', 'edad', 'altura', 'medidas', 'ciudad'].map((k) => {
                const v = modelo[k];
                if (v == null || v === '') return null;
                return (
                  <div key={k} className="perfil-row">
                    <dt>{FIELD_LABELS[k]}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                );
              })}
              {modelo.descripcion && (
                <div className="perfil-row perfil-desc">
                  <dt>Descripción</dt>
                  <dd>{modelo.descripcion}</dd>
                </div>
              )}
            </dl>
            {modelo.id && (
              <p className="perfil-link-wrap">
                <Link to={`/modelo/${modelo.id}`} className="perfil-link" target="_blank" rel="noopener noreferrer">
                  Ver mi perfil público →
                </Link>
              </p>
            )}
            <div className="perfil-actions">
              <button type="button" className="btn-primary" onClick={() => setEditing(true)}>
                Editar
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cerrar
              </button>
              <button type="button" className="btn-secondary" onClick={onLogout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {!loading && !error && modelo && editing && (
          <form onSubmit={handleSubmit} className="perfil-form">
            {['nombre', 'apellido', 'email', 'telefono', 'edad', 'altura', 'medidas', 'ciudad'].map((k) => (
              <div key={k} className="perfil-form-group">
                <label htmlFor={`perfil-${k}`}>{FIELD_LABELS[k]}</label>
                <input
                  id={`perfil-${k}`}
                  name={k}
                  type={k === 'email' ? 'email' : 'text'}
                  value={form[k] ?? ''}
                  onChange={handleChange}
                  className="perfil-input"
                />
              </div>
            ))}
            <div className="perfil-form-group">
              <label htmlFor="perfil-descripcion">Descripción</label>
              <textarea
                id="perfil-descripcion"
                name="descripcion"
                value={form.descripcion ?? ''}
                onChange={handleChange}
                rows={3}
                className="perfil-input perfil-textarea"
              />
            </div>
            <div className="perfil-form-group">
              <label htmlFor="perfil-foto">Foto (URL)</label>
              <input
                id="perfil-foto"
                name="foto"
                type="url"
                value={form.foto ?? ''}
                onChange={handleChange}
                placeholder="https://..."
                className="perfil-input"
              />
            </div>
            <div className="perfil-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={saving}
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
