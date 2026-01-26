import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ModeloDetalle.css';

// Componente memoizado para miniaturas del lightbox
const LightboxThumbnail = React.memo(({ foto, index, isActive, onClick }) => (
  <div
    className={`lightbox-thumbnail ${isActive ? 'active' : ''}`}
    style={{ backgroundImage: `url('${foto}')` }}
    onClick={onClick}
    title={`Foto ${index + 1}`}
  />
));

LightboxThumbnail.displayName = 'LightboxThumbnail';

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
  const lightboxCloseRef = useRef(null);
  const lightboxPrevFocusRef = useRef(null);
  const preloadedImagesRef = useRef(new Set());

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
  
  const abrirLightboxDesdePrincipal = useCallback(() => {
    abrirLightbox(fotoPrincipalIndex);
  }, [abrirLightbox, fotoPrincipalIndex]);
  
  // Debug
  useEffect(() => {
    if (modelo) {
      console.log('Total fotos disponibles:', todasLasFotos.length);
      console.log('Foto principal index:', fotoPrincipalIndex);
      console.log('Foto principal URL:', fotoPrincipal);
    }
  }, [modelo, todasLasFotos, fotoPrincipalIndex, fotoPrincipal]);

  // Precargar imágenes adyacentes
  const precargarImagenes = useCallback((currentIndex, fotos) => {
    if (!fotos || fotos.length === 0) return;
    
    const indicesParaPrecargar = [
      (currentIndex - 1 + fotos.length) % fotos.length, // Anterior
      (currentIndex + 1) % fotos.length, // Siguiente
    ];
    
    indicesParaPrecargar.forEach((idx) => {
      const url = fotos[idx];
      if (url && !preloadedImagesRef.current.has(url)) {
        const img = new Image();
        img.src = url;
        preloadedImagesRef.current.add(url);
      }
    });
  }, []);

  // Precargar todas las imágenes cuando se abre el lightbox
  useEffect(() => {
    if (lightboxOpen && todasLasFotos.length > 0) {
      // Precargar todas las imágenes en segundo plano
      todasLasFotos.forEach((url) => {
        if (url && !preloadedImagesRef.current.has(url)) {
          const img = new Image();
          img.src = url;
          preloadedImagesRef.current.add(url);
        }
      });
    }
  }, [lightboxOpen, todasLasFotos]);

  // Precargar imágenes adyacentes cuando cambia el índice
  useEffect(() => {
    if (lightboxOpen && todasLasFotos.length > 0) {
      precargarImagenes(lightboxIndex, todasLasFotos);
    }
  }, [lightboxIndex, lightboxOpen, todasLasFotos, precargarImagenes]);

  const cambiarFotoPrincipal = useCallback((index) => {
    if (index >= 0 && index < todasLasFotos.length) {
      setFotoPrincipalIndex(index);
    }
  }, [todasLasFotos.length]);

  const abrirLightbox = useCallback((index = fotoPrincipalIndex) => {
    if (todasLasFotos.length === 0) {
      alert('No hay fotos disponibles para mostrar');
      return;
    }
    const validIndex = index >= 0 && index < todasLasFotos.length ? index : 0;
    lightboxPrevFocusRef.current = document.activeElement;
    
    // Usar startTransition para operaciones no críticas
    startTransition(() => {
      setLightboxIndex(validIndex);
      setLightboxOpen(true);
      setIsZoomed(false);
    });
    
    // Operaciones críticas inmediatas
    document.body.style.overflow = 'hidden';
  }, [fotoPrincipalIndex, todasLasFotos.length]);

  const cerrarLightbox = useCallback(() => {
    startTransition(() => {
      setLightboxOpen(false);
      setIsZoomed(false);
    });
    document.body.style.overflow = '';
    const prev = lightboxPrevFocusRef.current;
    if (prev && typeof prev.focus === 'function') {
      requestAnimationFrame(() => prev.focus());
    }
  }, []);

  const fotoAnterior = useCallback(() => {
    setLightboxIndex((prev) => {
      const newIndex = (prev - 1 + todasLasFotos.length) % todasLasFotos.length;
      setIsZoomed(false);
      return newIndex;
    });
  }, [todasLasFotos.length]);

  const fotoSiguiente = useCallback(() => {
    setLightboxIndex((prev) => {
      const newIndex = (prev + 1) % todasLasFotos.length;
      setIsZoomed(false);
      return newIndex;
    });
  }, [todasLasFotos.length]);

  const cambiarFotoLightbox = useCallback((index) => {
    if (index >= 0 && index < todasLasFotos.length) {
      setLightboxIndex(index);
      setIsZoomed(false);
    }
  }, [todasLasFotos.length]);

  const toggleZoom = useCallback(() => {
    setIsZoomed((prev) => !prev);
  }, []);

  const handleOverlayClick = useCallback((e) => {
    if (e.target.id === 'lightbox' || e.target.id === 'lightboxOverlay') {
      cerrarLightbox();
    }
  }, [cerrarLightbox]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const focusClose = () => { lightboxCloseRef.current?.focus(); };
    const id = requestAnimationFrame(focusClose);
    return () => cancelAnimationFrame(id);
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cerrarLightbox();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        fotoAnterior();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        fotoSiguiente();
        return;
      }
      if (e.key === 'Tab') {
        const dialog = document.getElementById('lightbox');
        if (!dialog) return;
        const btns = [lightboxCloseRef.current, document.getElementById('lightboxPrevBtn'), document.getElementById('lightboxNextBtn')].filter(Boolean);
        if (btns.length < 2) return;
        const idx = btns.indexOf(document.activeElement);
        if (idx < 0) return;
        if (e.shiftKey && idx === 0) {
          e.preventDefault();
          btns[btns.length - 1].focus();
        } else if (!e.shiftKey && idx === btns.length - 1) {
          e.preventDefault();
          btns[0].focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, cerrarLightbox, fotoAnterior, fotoSiguiente]);

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
            Volver al inicio
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
                onClick={abrirLightboxDesdePrincipal}
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
                  ← Volver al inicio
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
            onClick={handleOverlayClick}
          >
            <div className="lightbox-overlay" id="lightboxOverlay" />
            <button
              ref={lightboxCloseRef}
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
                loading="eager"
                style={{
                  cursor: isZoomed ? 'zoom-out' : 'zoom-in',
                  transform: isZoomed ? 'scale(2)' : 'scale(1)',
                  transition: 'transform 0.2s ease-out',
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
                  <LightboxThumbnail
                    key={i}
                    foto={foto}
                    index={i}
                    isActive={i === lightboxIndex}
                    onClick={() => cambiarFotoLightbox(i)}
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
