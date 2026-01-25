import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { csrfFetch } from '../utils/csrf';
import { toast } from '../utils/toast';
import './ModalPerfilModelo.css';

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
      <div className="modal-card modal-perfil" onClick={(e) => e.stopPropagation()}>
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
