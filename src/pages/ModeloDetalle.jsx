import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ModeloDetalle.css';

function ModeloDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [modelo, setModelo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fotoPrincipalIndex, setFotoPrincipalIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (id) {
      cargarModelo();
    }
  }, [id]);

  const cargarModelo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/modelos/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          throw new Error(errorData.message || 'Modelo no encontrada');
        }
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.modelo) {
        throw new Error(data.message || 'Error al obtener modelo');
      }
      
      // Debug: verificar que las fotos se reciben correctamente
      console.log('Modelo recibido:', data.modelo);
      console.log('Fotos recibidas:', data.modelo.fotos);
      
      setModelo(data.modelo);
    } catch (err) {
      console.error('Error cargando modelo:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Error de conexión. Verifica tu conexión a internet.');
      } else {
        setError(err.message || 'Error cargando información de la modelo. Por favor, intenta más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Obtener todas las fotos: primero de modelo_fotos, luego foto principal como fallback
  const todasLasFotos = useMemo(() => {
    if (!modelo) return [];
    
    // Si hay fotos en el array de fotos
    if (modelo.fotos && Array.isArray(modelo.fotos) && modelo.fotos.length > 0) {
      return modelo.fotos.map(f => (typeof f === 'string' ? f : f.url)).filter(Boolean);
    }
    
    // Si no hay fotos pero hay foto principal
    if (modelo.foto) {
      return [modelo.foto];
    }
    
    return [];
  }, [modelo]);
  
  const fotoPrincipal = todasLasFotos[fotoPrincipalIndex] || null;
  
  // Debug
  useEffect(() => {
    if (modelo) {
      console.log('Total fotos disponibles:', todasLasFotos.length);
      console.log('Foto principal index:', fotoPrincipalIndex);
      console.log('Foto principal URL:', fotoPrincipal);
    }
  }, [modelo, todasLasFotos, fotoPrincipalIndex, fotoPrincipal]);

  const cambiarFotoPrincipal = (index) => {
    if (index >= 0 && index < todasLasFotos.length) {
      setFotoPrincipalIndex(index);
    }
  };

  const abrirLightbox = (index = fotoPrincipalIndex) => {
    if (todasLasFotos.length === 0) {
      alert('No hay fotos disponibles para mostrar');
      return;
    }
    setLightboxIndex(index >= 0 && index < todasLasFotos.length ? index : 0);
    setLightboxOpen(true);
    setIsZoomed(false);
    document.body.style.overflow = 'hidden';
  };

  const cerrarLightbox = () => {
    setLightboxOpen(false);
    setIsZoomed(false);
    document.body.style.overflow = '';
  };

  const fotoAnterior = () => {
    setLightboxIndex((prev) => (prev - 1 + todasLasFotos.length) % todasLasFotos.length);
    setIsZoomed(false);
  };

  const fotoSiguiente = () => {
    setLightboxIndex((prev) => (prev + 1) % todasLasFotos.length);
    setIsZoomed(false);
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxOpen) {
        if (e.key === 'Escape') {
          cerrarLightbox();
        } else if (e.key === 'ArrowLeft') {
          fotoAnterior();
        } else if (e.key === 'ArrowRight') {
          fotoSiguiente();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  if (loading) {
    return (
      <div className="modelo-detalle-page">
        <div className="loading-container">
          <div className="loading"></div>
          <p>Cargando información de la modelo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modelo-detalle-page">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={cargarModelo} className="btn-retry">
            Intentar de nuevo
          </button>
          <button onClick={() => navigate('/')} className="btn-back">
            Volver al Home
          </button>
        </div>
      </div>
    );
  }

  if (!modelo) {
    return null;
  }

  return (
    <div className="modelo-detalle-page">
      <div className="modelo-detalle-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content-wrapper">
            {fotoPrincipal ? (
              <div
                className="hero-photo-large"
                style={{ backgroundImage: `url('${fotoPrincipal}')` }}
                onClick={() => abrirLightbox(fotoPrincipalIndex)}
              />
            ) : (
              <div className="hero-photo-large placeholder">
                <span>📷</span>
              </div>
            )}

            <div className="hero-info-wrapper">
              <h1 className="hero-name-title">
                {modelo.nombre} {modelo.apellido || ''}
              </h1>

              <div className="hero-stats-container">
                {modelo.edad && (
                  <div className="hero-stat-box">
                    <strong>Edad:</strong> {modelo.edad} años
                  </div>
                )}
                {modelo.altura && (
                  <div className="hero-stat-box">
                    <strong>Altura:</strong> {modelo.altura}
                  </div>
                )}
                {modelo.medidas && (
                  <div className="hero-stat-box">
                    <strong>Medidas:</strong> {modelo.medidas}
                  </div>
                )}
                {modelo.ciudad && (
                  <div className="hero-stat-box">
                    <strong>Ciudad:</strong> {modelo.ciudad}
                  </div>
                )}
              </div>

              {modelo.descripcion && (
                <p className="hero-description">{modelo.descripcion}</p>
              )}

              <div className="contact-info-container">
                <div className="contact-buttons">
                  {modelo.email && (
                    <a
                      href={`mailto:${modelo.email}`}
                      className="btn-hero-contact"
                    >
                      📧 Email
                    </a>
                  )}
                  <button
                    onClick={() => {
                      const nombreCompleto = `${modelo.nombre || ''} ${modelo.apellido || ''}`.trim();
                      const params = new URLSearchParams();
                      if (nombreCompleto) params.set('modelo', nombreCompleto);
                      if (modelo?.id) params.set('modeloId', String(modelo.id));
                      const qs = params.toString();
                      navigate(qs ? `/contacto?${qs}` : '/contacto');
                    }}
                    className="btn-hero-action"
                  >
                    💬 Contactar
                  </button>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="btn-back-hero"
                >
                  ← Volver al Home
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Galería de Fotos */}
        {todasLasFotos.length > 1 && (
          <section className="fotos-section">
            <h2>Galería de Fotos</h2>
            <div className="fotos-grid">
              {todasLasFotos.map((foto, index) => (
                <div
                  key={index}
                  className={`foto-miniatura ${index === fotoPrincipalIndex ? 'active' : ''}`}
                  style={{ backgroundImage: `url('${foto}')` }}
                  onClick={() => cambiarFotoPrincipal(index)}
                  onDoubleClick={() => abrirLightbox(index)}
                  title="Click para cambiar foto principal, doble click para ver en grande"
                />
              ))}
            </div>
          </section>
        )}

        {/* Lightbox */}
        {lightboxOpen && (
          <div
            className="lightbox"
            id="lightbox"
            role="dialog"
            aria-label="Galería de fotos"
            aria-modal="true"
            tabIndex="-1"
            onClick={(e) => {
              if (e.target.id === 'lightbox' || e.target.id === 'lightboxOverlay') {
                cerrarLightbox();
              }
            }}
          >
            <div className="lightbox-overlay" id="lightboxOverlay" />
            <button
              type="button"
              className="lightbox-close"
              id="lightboxCloseBtn"
              aria-label="Cerrar galería"
              onClick={cerrarLightbox}
            >
              ✕
            </button>
            <button
              type="button"
              className="lightbox-prev"
              id="lightboxPrevBtn"
              aria-label="Foto anterior"
              onClick={fotoAnterior}
            >
              ‹
            </button>
            <button
              type="button"
              className="lightbox-next"
              id="lightboxNextBtn"
              aria-label="Foto siguiente"
              onClick={fotoSiguiente}
            >
              ›
            </button>
            <div className="lightbox-content">
              <img
                id="lightboxImage"
                src={todasLasFotos[lightboxIndex]}
                alt="Foto del modelo"
                className={`lightbox-img ${isZoomed ? 'zoomed' : ''}`}
                onClick={toggleZoom}
                style={{
                  cursor: isZoomed ? 'zoom-out' : 'zoom-in',
                  transform: isZoomed ? 'scale(2)' : 'scale(1)',
                }}
              />
              <div className="lightbox-info">
                <span className="lightbox-counter">
                  {lightboxIndex + 1} / {todasLasFotos.length}
                </span>
              </div>
            </div>
            {todasLasFotos.length > 1 && (
              <div className="lightbox-thumbnails" id="lightboxThumbnails">
                {todasLasFotos.map((foto, i) => (
                  <div
                    key={i}
                    className={`lightbox-thumbnail ${i === lightboxIndex ? 'active' : ''}`}
                    style={{ backgroundImage: `url('${foto}')` }}
                    onClick={() => {
                      setLightboxIndex(i);
                      setIsZoomed(false);
                    }}
                    title={`Foto ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModeloDetalle;
