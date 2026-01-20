import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home() {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCiudad, setFilterCiudad] = useState('');
  const [filterEdad, setFilterEdad] = useState('');
  const [sortBy, setSortBy] = useState('nombre');
  const navigate = useNavigate();

  // Cargar modelos
  useEffect(() => {
    cargarModelos();
  }, []);

  const cargarModelos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/modelos');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Error al obtener modelos');
      }
      
      if (data.modelos && data.modelos.length > 0) {
        setModelos(data.modelos);
      } else {
        setModelos([]);
      }
    } catch (err) {
      console.error('Error cargando modelos:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Error de conexión. Verifica tu conexión a internet.');
      } else {
        setError(err.message || 'Error cargando modelos. Por favor, intenta más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Obtener ciudades únicas
  const ciudades = useMemo(() => {
    return [...new Set(modelos
      .map(m => m.ciudad)
      .filter(c => c && c.trim())
      .sort()
    )];
  }, [modelos]);

  // Filtrar y ordenar modelos
  const modelosFiltrados = useMemo(() => {
    let filtrados = modelos.filter(modelo => {
      // Filtro por búsqueda
      if (searchTerm) {
        const nombreCompleto = `${modelo.nombre || ''} ${modelo.apellido || ''}`.toLowerCase();
        if (!nombreCompleto.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }
      
      // Filtro por ciudad
      if (filterCiudad && modelo.ciudad !== filterCiudad) {
        return false;
      }
      
      // Filtro por edad
      if (filterEdad && modelo.edad) {
        const edadNum = parseInt(modelo.edad);
        if (filterEdad === '18-25' && (edadNum < 18 || edadNum > 25)) return false;
        if (filterEdad === '26-30' && (edadNum < 26 || edadNum > 30)) return false;
        if (filterEdad === '31-35' && (edadNum < 31 || edadNum > 35)) return false;
        if (filterEdad === '36+' && edadNum < 36) return false;
      }
      
      return true;
    });
    
    // Ordenar
    filtrados.sort((a, b) => {
      switch(sortBy) {
        case 'nombre':
          return `${a.nombre || ''} ${a.apellido || ''}`.localeCompare(`${b.nombre || ''} ${b.apellido || ''}`);
        case 'nombre-desc':
          return `${b.nombre || ''} ${b.apellido || ''}`.localeCompare(`${a.nombre || ''} ${a.apellido || ''}`);
        case 'fecha':
          return new Date(b.creado_en || 0) - new Date(a.creado_en || 0);
        case 'fecha-desc':
          return new Date(a.creado_en || 0) - new Date(b.creado_en || 0);
        case 'edad':
          return (a.edad || 0) - (b.edad || 0);
        case 'edad-desc':
          return (b.edad || 0) - (a.edad || 0);
        default:
          return 0;
      }
    });
    
    return filtrados;
  }, [modelos, searchTerm, filterCiudad, filterEdad, sortBy]);

  const resetearFiltros = () => {
    setSearchTerm('');
    setFilterCiudad('');
    setFilterEdad('');
    setSortBy('nombre');
  };

  const limpiarBusqueda = () => {
    setSearchTerm('');
  };

  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return (
    <div className="home-page">
      <section className="hero">
        <h2>Nuestras Modelos</h2>
        <p>Descubre nuestro talento y profesionalismo</p>
      </section>

      {/* Grid de Modelos */}
      {loading && (
        <section className="modelos-grid loading-state" aria-live="polite">
          <div className="loading-models" role="status" aria-label="Cargando modelos">
            <span className="loading"></span>
            Cargando modelos...
          </div>
        </section>
      )}

      {error && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={cargarModelos} className="btn-retry">
            Intentar de nuevo
          </button>
        </div>
      )}

      {!loading && !error && modelosFiltrados.length === 0 && (
        <div className="no-modelos">
          <p>
            {modelos.length === 0
              ? 'No hay modelos disponibles en este momento.'
              : 'No se encontraron modelos con los filtros seleccionados.'}
          </p>
        </div>
      )}

      {!loading && !error && modelosFiltrados.length > 0 && (
        <section className="modelos-grid" aria-live="polite" aria-label="Galería de modelos">
          {modelosFiltrados.map(modelo => {
            const primeraFoto = (modelo.fotos && modelo.fotos.length > 0 && modelo.fotos[0].url)
              ? modelo.fotos[0].url
              : modelo.foto;
            
            return (
              <div
                key={modelo.id}
                className="modelo-card"
                onClick={() => navigate(`/modelo/${modelo.id}`)}
                style={{ cursor: 'pointer' }}
              >
                {primeraFoto ? (
                  <div
                    className="modelo-foto"
                    style={{ backgroundImage: `url('${primeraFoto}')` }}
                  />
                ) : (
                  <div className="modelo-foto placeholder">
                    <span>📷</span>
                  </div>
                )}
                <div className="modelo-info">
                  <h3>
                    {modelo.nombre} {modelo.apellido || ''}
                  </h3>
                  {modelo.altura && (
                    <p className="modelo-detail">
                      <strong>Altura:</strong> {modelo.altura}
                    </p>
                  )}
                  {modelo.medidas && (
                    <p className="modelo-detail">
                      <strong>Medidas:</strong> {modelo.medidas}
                    </p>
                  )}
                  {modelo.edad && (
                    <p className="modelo-detail">
                      <strong>Edad:</strong> {modelo.edad} años
                    </p>
                  )}
                  {modelo.ciudad && (
                    <p className="modelo-detail">📍 {modelo.ciudad}</p>
                  )}
                  {modelo.descripcion && (
                    <p className="modelo-descripcion">
                      {modelo.descripcion.substring(0, 100)}
                      {modelo.descripcion.length > 100 ? '...' : ''}
                    </p>
                  )}
                  <div className="modelo-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-contacto-primary"
                      onClick={() => navigate(`/modelo/${modelo.id}`)}
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Búsqueda y Filtros (al final) */}
      <section className="search-filters-section">
        <div className="search-container">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nombre..."
              aria-label="Buscar modelos"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="clear-search-btn"
                aria-label="Limpiar búsqueda"
                onClick={limpiarBusqueda}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="filterCiudad">Ciudad:</label>
            <select
              id="filterCiudad"
              className="filter-select"
              aria-label="Filtrar por ciudad"
              value={filterCiudad}
              onChange={(e) => setFilterCiudad(e.target.value)}
            >
              <option value="">Todas las ciudades</option>
              {ciudades.map(ciudad => (
                <option key={ciudad} value={ciudad}>{ciudad}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filterEdad">Edad:</label>
            <select
              id="filterEdad"
              className="filter-select"
              aria-label="Filtrar por edad"
              value={filterEdad}
              onChange={(e) => setFilterEdad(e.target.value)}
            >
              <option value="">Todas las edades</option>
              <option value="18-25">18-25 años</option>
              <option value="26-30">26-30 años</option>
              <option value="31-35">31-35 años</option>
              <option value="36+">36+ años</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sortBy">Ordenar por:</label>
            <select
              id="sortBy"
              className="filter-select"
              aria-label="Ordenar modelos"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="nombre">Nombre (A-Z)</option>
              <option value="nombre-desc">Nombre (Z-A)</option>
              <option value="fecha">Más recientes</option>
              <option value="fecha-desc">Más antiguos</option>
              <option value="edad">Edad (menor a mayor)</option>
              <option value="edad-desc">Edad (mayor a menor)</option>
            </select>
          </div>

          <button
            className="btn-reset-filters"
            aria-label="Restablecer filtros"
            onClick={resetearFiltros}
          >
            🔄 Limpiar Filtros
          </button>
        </div>

        {modelosFiltrados.length < modelos.length && modelosFiltrados.length > 0 && (
          <div className="results-count">
            <span>Mostrando {modelosFiltrados.length} de {modelos.length} modelos</span>
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
