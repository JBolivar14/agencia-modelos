import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import './Admin.css';

function Admin() {
  const [activeTab, setActiveTab] = useState('qr');
  const [user, setUser] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filtros/paginación de modelos
  const [selectedModeloIds, setSelectedModeloIds] = useState(new Set());
  const [modeloQuery, setModeloQuery] = useState('');
  const [modeloCiudad, setModeloCiudad] = useState('');
  const [modeloActiva, setModeloActiva] = useState('all'); // all | true | false
  const [modeloPage, setModeloPage] = useState(1);
  const [modeloPageSize, setModeloPageSize] = useState(20);
  const [modeloSortBy, setModeloSortBy] = useState('creado_en');
  const [modeloSortDir, setModeloSortDir] = useState('desc');
  const [modelosPagination, setModelosPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });

  // Filtros/paginación de contactos
  const [contactoQuery, setContactoQuery] = useState('');
  const [contactoFrom, setContactoFrom] = useState(''); // YYYY-MM-DD
  const [contactoTo, setContactoTo] = useState(''); // YYYY-MM-DD
  const [contactoPage, setContactoPage] = useState(1);
  const [contactoPageSize, setContactoPageSize] = useState(20);
  const [contactoSortBy, setContactoSortBy] = useState('fecha');
  const [contactoSortDir, setContactoSortDir] = useState('desc');
  const [contactosPagination, setContactosPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });

  // Logs/auditoría
  const [auditQuery, setAuditQuery] = useState('');
  const [auditEventType, setAuditEventType] = useState('');
  const [auditSeverity, setAuditSeverity] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(50);
  const [auditPagination, setAuditPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    
    // Si hay un estado de navegación con activeTab, activarlo
    const state = window.history.state?.usr;
    if (state?.activeTab) {
      setActiveTab(state.activeTab);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'modelos') {
      // Al entrar al tab, arrancar desde la primera página
      setModeloPage(1);
      setSelectedModeloIds(new Set());
    } else if (activeTab === 'contactos') {
      setContactoPage(1);
    } else if (activeTab === 'audit') {
      setAuditPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Si cambia el set de resultados, limpiar selección de ids que ya no existen
  useEffect(() => {
    if (activeTab !== 'modelos') return;
    setSelectedModeloIds((prev) => {
      const validIds = new Set(modelos.map((m) => m.id).filter(Boolean));
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next;
    });
  }, [activeTab, modelos]);

  useEffect(() => {
    if (activeTab !== 'modelos') return;
    const t = setTimeout(() => {
      cargarModelos();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, modeloQuery, modeloCiudad, modeloActiva, modeloPage, modeloPageSize, modeloSortBy, modeloSortDir]);

  useEffect(() => {
    if (activeTab !== 'contactos') return;
    const t = setTimeout(() => {
      cargarContactos();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, contactoQuery, contactoFrom, contactoTo, contactoPage, contactoPageSize, contactoSortBy, contactoSortDir]);

  useEffect(() => {
    if (activeTab !== 'audit') return;
    const t = setTimeout(() => {
      cargarAuditLogs();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, auditQuery, auditEventType, auditSeverity, auditPage, auditPageSize]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/session', { credentials: 'include' });
      const data = await response.json();
      if (!data.authenticated) {
        navigate('/login', { replace: true });
        return;
      }
      setUser(data.user);
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      navigate('/login', { replace: true });
    }
  };

  const cargarModelos = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (modeloQuery.trim()) params.set('q', modeloQuery.trim());
      if (modeloCiudad.trim()) params.set('ciudad', modeloCiudad.trim());
      if (modeloActiva === 'true') params.set('activa', 'true');
      if (modeloActiva === 'false') params.set('activa', 'false');
      params.set('page', String(modeloPage));
      params.set('pageSize', String(modeloPageSize));
      params.set('sortBy', modeloSortBy);
      params.set('sortDir', modeloSortDir);

      const url = `/api/admin/modelos?${params.toString()}`;

      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setModelos(data.modelos || []);
        setModelosPagination({
          page: data.pagination?.page || modeloPage,
          pageSize: data.pagination?.pageSize || modeloPageSize,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1
        });
      } else {
        toast.error(data.message || 'Error cargando modelos');
      }
    } catch (error) {
      console.error('Error cargando modelos:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Error de conexión. Verifica tu conexión a internet.');
      } else {
        toast.error(error.message || 'Error cargando modelos');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectModelo = (id) => {
    setSelectedModeloIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllModelosOnPage = (checked) => {
    const pageIds = modelos.map((m) => m.id).filter(Boolean);
    setSelectedModeloIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        pageIds.forEach((id) => next.add(id));
      } else {
        pageIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  const bulkModelos = async (action) => {
    const ids = Array.from(selectedModeloIds);
    if (ids.length === 0) {
      toast.info('No hay modelos seleccionadas');
      return;
    }

    const confirmText =
      action === 'activate'
        ? `¿Activar ${ids.length} modelo(s)?`
        : action === 'deactivate'
          ? `¿Desactivar ${ids.length} modelo(s)?`
          : `¿Eliminar (desactivar) ${ids.length} modelo(s)?`;

    if (!window.confirm(confirmText)) return;

    try {
      setLoading(true);
      const response = await fetch('/api/admin/modelos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, ids })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || `Error HTTP: ${response.status}`);
      }

      toast.success(data.message || 'Acción masiva completada');
      setSelectedModeloIds(new Set());

      const selectedOnPageCount = modelos.filter((m) => selectedModeloIds.has(m.id)).length;
      if (modeloPage > 1 && modelos.length > 0 && selectedOnPageCount === modelos.length) {
        setModeloPage((p) => Math.max(1, p - 1));
      } else {
        cargarModelos();
      }
    } catch (error) {
      console.error('Error en acción masiva:', error);
      toast.error(error.message || 'Error ejecutando acción masiva');
    } finally {
      setLoading(false);
    }
  };

  const cargarContactos = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (contactoQuery.trim()) params.set('q', contactoQuery.trim());
      if (contactoFrom) params.set('from', contactoFrom);
      if (contactoTo) params.set('to', contactoTo);
      params.set('page', String(contactoPage));
      params.set('pageSize', String(contactoPageSize));
      params.set('sortBy', contactoSortBy);
      params.set('sortDir', contactoSortDir);

      const url = `/api/admin/contactos?${params.toString()}`;

      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setContactos(data.contactos || []);
        setContactosPagination({
          page: data.pagination?.page || contactoPage,
          pageSize: data.pagination?.pageSize || contactoPageSize,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1
        });
      } else {
        toast.error(data.message || 'Error cargando contactos');
      }
    } catch (error) {
      console.error('Error cargando contactos:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Error de conexión. Verifica tu conexión a internet.');
      } else {
        toast.error(error.message || 'Error cargando contactos');
      }
    } finally {
      setLoading(false);
    }
  };

  const cargarAuditLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (auditQuery.trim()) params.set('q', auditQuery.trim());
      if (auditEventType.trim()) params.set('eventType', auditEventType.trim());
      if (auditSeverity.trim()) params.set('severity', auditSeverity.trim());
      params.set('page', String(auditPage));
      params.set('pageSize', String(auditPageSize));

      const url = `/api/admin/audit?${params.toString()}`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
        setAuditPagination({
          page: data.pagination?.page || auditPage,
          pageSize: data.pagination?.pageSize || auditPageSize,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 1
        });
      } else {
        toast.error(data.message || 'Error obteniendo auditoría');
      }
    } catch (error) {
      console.error('Error obteniendo auditoría:', error);
      toast.error(error.message || 'Error obteniendo auditoría');
    } finally {
      setLoading(false);
    }
  };

  const generarQR = async () => {
    try {
      const response = await fetch('/api/admin/generar-qr', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setQrData(data);
        toast.success('QR generado exitosamente');
      } else {
        toast.error(data.message || 'Error generando QR');
      }
    } catch (error) {
      console.error('Error generando QR:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Error de conexión. Verifica tu conexión a internet.');
      } else {
        toast.error(error.message || 'Error generando QR');
      }
    }
  };

  const copiarQRUrl = async () => {
    if (!qrData?.url) {
      toast.error('No hay URL para copiar');
      return;
    }
    try {
      await navigator.clipboard.writeText(qrData.url);
      toast.success('URL copiada al portapapeles');
    } catch (error) {
      console.error('Error copiando:', error);
      toast.error('Error al copiar URL');
    }
  };

  const compartirQR = async () => {
    if (!qrData?.url) {
      toast.error('No hay URL para compartir');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Agencia Modelos - Comparte tus datos',
          text: 'Agencia Modelos le gustaría conocerte más. Comparte tus datos con nosotros:',
          url: qrData.url,
        });
        toast.success('¡Compartido exitosamente!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error compartiendo:', error);
        }
      }
    } else {
      toast.info('Tu navegador no soporta compartir nativo');
    }
  };

  const eliminarModelo = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este modelo?')) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/modelos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Modelo eliminado exitosamente');

        // Si era el último de la página y no es la primera, retroceder
        if (modeloPage > 1 && modelos.length <= 1) {
          setModeloPage(prev => Math.max(1, prev - 1));
        } else {
          cargarModelos();
        }
      } else {
        toast.error(data.message || 'Error eliminando modelo');
      }
    } catch (error) {
      console.error('Error eliminando modelo:', error);
      toast.error('Error eliminando modelo');
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="container">
          <h1>Panel de Administración</h1>
          <div className="admin-actions">
            {user && <span>{user.nombre || user.username}</span>}
            <a href="/api/logout" className="btn-logout">Cerrar Sesión</a>
          </div>
        </div>
      </header>

      <div className="container admin-container">
        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === 'qr' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr')}
          >
            Generar QR
          </button>
          <button
            className={`tab-button ${activeTab === 'modelos' ? 'active' : ''}`}
            onClick={() => setActiveTab('modelos')}
          >
            Modelos
          </button>
          <button
            className={`tab-button ${activeTab === 'contactos' ? 'active' : ''}`}
            onClick={() => setActiveTab('contactos')}
          >
            Contactos
          </button>
          <button
            className={`tab-button ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Logs
          </button>
        </div>

        {/* Tab QR */}
        {activeTab === 'qr' && (
          <div className="tab-content active">
            <div className="card">
              <h2>Generar Código QR</h2>
              <p className="subtitle">Genera un código QR para compartir con futuras modelos</p>
              
              <div className="qr-admin-wrapper">
                <div id="qrAdminContainer" className="qr-admin-placeholder">
                  {qrData ? (
                    <img src={qrData.qr} alt="QR Code" style={{ maxWidth: '300px' }} />
                  ) : (
                    <p>Haz clic en "Generar QR" para crear el código</p>
                  )}
                </div>
              </div>
              
              <button onClick={generarQR} className="btn-primary">
                Generar QR
              </button>
              
              {qrData && (
                <div className="qr-url-display">
                  <p><strong>URL:</strong> <span>{qrData.url}</span></p>
                  <div className="qr-actions">
                    <button onClick={copiarQRUrl} className="btn-copy">
                      📋 Copiar URL
                    </button>
                    <button onClick={compartirQR} className="btn-share">
                      📤 Compartir (Nativo)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Modelos */}
        {activeTab === 'modelos' && (
          <div className="tab-content active">
            <div className="card">
              <h2>Gestión de Modelos</h2>
              <button
                onClick={() => navigate('/admin/modelos/nuevo')}
                className="btn-primary"
                style={{ marginBottom: '1rem' }}
              >
                ➕ Agregar Nuevo Modelo
              </button>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  alignItems: 'center'
                }}
              >
                <input
                  type="text"
                  placeholder="Buscar (nombre, email, teléfono, ciudad...)"
                  value={modeloQuery}
                  onChange={(e) => {
                    setModeloQuery(e.target.value);
                    setModeloPage(1);
                    setSelectedModeloIds(new Set());
                  }}
                  style={{ flex: '1 1 280px' }}
                />

                <input
                  type="text"
                  placeholder="Filtrar por ciudad"
                  value={modeloCiudad}
                  onChange={(e) => {
                    setModeloCiudad(e.target.value);
                    setModeloPage(1);
                    setSelectedModeloIds(new Set());
                  }}
                  style={{ flex: '1 1 180px' }}
                />

                <select
                  value={modeloActiva}
                  onChange={(e) => {
                    setModeloActiva(e.target.value);
                    setModeloPage(1);
                    setSelectedModeloIds(new Set());
                  }}
                >
                  <option value="all">Todas</option>
                  <option value="true">Activas</option>
                  <option value="false">Inactivas</option>
                </select>

                <select
                  value={modeloSortBy}
                  onChange={(e) => {
                    setModeloSortBy(e.target.value);
                    setModeloPage(1);
                    setSelectedModeloIds(new Set());
                  }}
                >
                  <option value="creado_en">Orden: más nuevas</option>
                  <option value="nombre">Orden: nombre</option>
                  <option value="ciudad">Orden: ciudad</option>
                  <option value="edad">Orden: edad</option>
                </select>

                <select value={modeloSortDir} onChange={(e) => setModeloSortDir(e.target.value)}>
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>

                <select
                  value={modeloPageSize}
                  onChange={(e) => {
                    setModeloPageSize(parseInt(e.target.value, 10));
                    setModeloPage(1);
                    setSelectedModeloIds(new Set());
                  }}
                >
                  <option value={10}>10 / pág</option>
                  <option value={20}>20 / pág</option>
                  <option value={50}>50 / pág</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <div style={{ color: 'var(--text-secondary, #666)' }}>
                  Seleccionadas: <strong>{selectedModeloIds.size}</strong>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn-secondary" disabled={selectedModeloIds.size === 0 || loading} onClick={() => bulkModelos('activate')}>
                    Activar
                  </button>
                  <button className="btn-secondary" disabled={selectedModeloIds.size === 0 || loading} onClick={() => bulkModelos('deactivate')}>
                    Desactivar
                  </button>
                  <button className="btn-delete" disabled={selectedModeloIds.size === 0 || loading} onClick={() => bulkModelos('delete')}>
                    Eliminar
                  </button>
                </div>
              </div>
              
              {loading ? (
                <div className="loading-container">
                  <div className="loading"></div>
                  <p>Cargando modelos...</p>
                </div>
              ) : modelos.length === 0 ? (
                <p>No hay modelos registrados</p>
              ) : (
                <div className="modelos-table-container">
                  <table className="modelos-table">
                    <thead>
                      <tr>
                        <th style={{ width: '42px' }}>
                          <input
                            type="checkbox"
                            checked={modelos.length > 0 && modelos.every((m) => selectedModeloIds.has(m.id))}
                            onChange={(e) => toggleSelectAllModelosOnPage(e.target.checked)}
                            aria-label="Seleccionar todas en la página"
                          />
                        </th>
                        <th>Foto</th>
                        <th>Nombre</th>
                        <th>Ciudad</th>
                        <th>Edad</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelos.map(modelo => {
                        const primeraFoto = (modelo.fotos && modelo.fotos.length > 0 && modelo.fotos[0].url)
                          ? modelo.fotos[0].url
                          : modelo.foto;
                        return (
                          <tr key={modelo.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedModeloIds.has(modelo.id)}
                                onChange={() => toggleSelectModelo(modelo.id)}
                                aria-label={`Seleccionar modelo ${modelo.nombre}`}
                              />
                            </td>
                            <td>
                              {primeraFoto ? (
                                <img
                                  src={primeraFoto}
                                  alt={modelo.nombre}
                                  className="modelo-thumb"
                                />
                              ) : (
                                <span>📷</span>
                              )}
                            </td>
                            <td>{modelo.nombre} {modelo.apellido || ''}</td>
                            <td>{modelo.ciudad || '-'}</td>
                            <td>{modelo.edad || '-'}</td>
                            <td>
                              <span className={`status-badge ${modelo.activa ? 'active' : 'inactive'}`}>
                                {modelo.activa ? 'Activa' : 'Inactiva'}
                              </span>
                            </td>
                            <td>
                              <button
                                onClick={() => navigate(`/admin/modelos/${modelo.id}`)}
                                className="btn-edit"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                onClick={() => eliminarModelo(modelo.id)}
                                className="btn-delete"
                              >
                                🗑️ Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ color: 'var(--text-secondary, #666)' }}>
                    Total: <strong>{modelosPagination.total}</strong> — Página <strong>{modelosPagination.page}</strong> de <strong>{modelosPagination.totalPages}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setModeloPage(p => Math.max(1, p - 1))}
                      disabled={modelosPagination.page <= 1}
                    >
                      ← Anterior
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setModeloPage(p => Math.min(modelosPagination.totalPages || p + 1, p + 1))}
                      disabled={modelosPagination.page >= modelosPagination.totalPages}
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Contactos */}
        {activeTab === 'contactos' && (
          <div className="tab-content active">
            <div className="card">
              <h2>Contactos Recibidos</h2>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  alignItems: 'center'
                }}
              >
                <input
                  type="text"
                  placeholder="Buscar (nombre, email, teléfono, empresa, mensaje...)"
                  value={contactoQuery}
                  onChange={(e) => {
                    setContactoQuery(e.target.value);
                    setContactoPage(1);
                  }}
                  style={{ flex: '1 1 320px' }}
                />

                <input
                  type="date"
                  value={contactoFrom}
                  onChange={(e) => {
                    setContactoFrom(e.target.value);
                    setContactoPage(1);
                  }}
                  title="Desde"
                />

                <input
                  type="date"
                  value={contactoTo}
                  onChange={(e) => {
                    setContactoTo(e.target.value);
                    setContactoPage(1);
                  }}
                  title="Hasta"
                />

                <select
                  value={contactoSortBy}
                  onChange={(e) => {
                    setContactoSortBy(e.target.value);
                    setContactoPage(1);
                  }}
                >
                  <option value="fecha">Orden: fecha</option>
                  <option value="nombre">Orden: nombre</option>
                  <option value="email">Orden: email</option>
                </select>

                <select value={contactoSortDir} onChange={(e) => setContactoSortDir(e.target.value)}>
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>

                <select
                  value={contactoPageSize}
                  onChange={(e) => {
                    setContactoPageSize(parseInt(e.target.value, 10));
                    setContactoPage(1);
                  }}
                >
                  <option value={10}>10 / pág</option>
                  <option value={20}>20 / pág</option>
                  <option value={50}>50 / pág</option>
                </select>
              </div>
              
              {loading ? (
                <div className="loading-container">
                  <div className="loading"></div>
                  <p>Cargando contactos...</p>
                </div>
              ) : contactos.length === 0 ? (
                <p>No hay contactos registrados</p>
              ) : (
                <div className="contactos-table-container">
                  <table className="contactos-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Empresa</th>
                        <th>Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactos.map(contacto => (
                        <tr key={contacto.id}>
                          <td>{new Date(contacto.fecha).toLocaleDateString('es-ES')}</td>
                          <td>{contacto.nombre}</td>
                          <td>{contacto.email}</td>
                          <td>{contacto.telefono || '-'}</td>
                          <td>{contacto.empresa || '-'}</td>
                          <td>{contacto.mensaje ? contacto.mensaje.substring(0, 50) + '...' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ color: 'var(--text-secondary, #666)' }}>
                    Total: <strong>{contactosPagination.total}</strong> — Página <strong>{contactosPagination.page}</strong> de <strong>{contactosPagination.totalPages}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setContactoPage(p => Math.max(1, p - 1))}
                      disabled={contactosPagination.page <= 1}
                    >
                      ← Anterior
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setContactoPage(p => Math.min(contactosPagination.totalPages || p + 1, p + 1))}
                      disabled={contactosPagination.page >= contactosPagination.totalPages}
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Logs / Auditoría */}
        {activeTab === 'audit' && (
          <div className="tab-content active">
            <div className="card">
              <h2>Logs / Auditoría</h2>
              <p className="subtitle">Eventos de login, contacto y acciones admin</p>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  alignItems: 'center'
                }}
              >
                <input
                  type="text"
                  placeholder="Buscar (tipo, usuario, ip, ruta...)"
                  value={auditQuery}
                  onChange={(e) => {
                    setAuditQuery(e.target.value);
                    setAuditPage(1);
                  }}
                  style={{ flex: '1 1 280px' }}
                />

                <select
                  value={auditEventType}
                  onChange={(e) => {
                    setAuditEventType(e.target.value);
                    setAuditPage(1);
                  }}
                >
                  <option value="">Todos los tipos</option>
                  <option value="login_attempt">login_attempt</option>
                  <option value="login_success">login_success</option>
                  <option value="login_failure">login_failure</option>
                  <option value="logout">logout</option>
                  <option value="contact_submit">contact_submit</option>
                  <option value="admin_modelo_create">admin_modelo_create</option>
                  <option value="admin_modelo_update">admin_modelo_update</option>
                  <option value="admin_modelo_delete">admin_modelo_delete</option>
                  <option value="admin_modelos_bulk">admin_modelos_bulk</option>
                  <option value="admin_storage_signed_urls">admin_storage_signed_urls</option>
                  <option value="admin_qr_generate">admin_qr_generate</option>
                </select>

                <select
                  value={auditSeverity}
                  onChange={(e) => {
                    setAuditSeverity(e.target.value);
                    setAuditPage(1);
                  }}
                >
                  <option value="">Todas las severidades</option>
                  <option value="info">info</option>
                  <option value="warn">warn</option>
                  <option value="error">error</option>
                </select>

                <select
                  value={auditPageSize}
                  onChange={(e) => {
                    setAuditPageSize(parseInt(e.target.value, 10));
                    setAuditPage(1);
                  }}
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {loading ? (
                <p>Cargando...</p>
              ) : (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Severidad</th>
                          <th>Evento</th>
                          <th>Usuario</th>
                          <th>IP</th>
                          <th>Ruta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(auditLogs || []).map((log) => (
                          <tr key={log.id || `${log.event_type}-${log.creado_en || log.created_at}`}>
                            <td>{new Date(log.created_at || log.creado_en || Date.now()).toLocaleString()}</td>
                            <td>{log.severity || ''}</td>
                            <td>{log.event_type || ''}</td>
                            <td>{log.actor_username || (log.actor_user_id ? `ID ${log.actor_user_id}` : '')}</td>
                            <td>{log.ip || ''}</td>
                            <td>{log.path || ''}</td>
                          </tr>
                        ))}
                        {(!auditLogs || auditLogs.length === 0) && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', opacity: 0.8 }}>
                              No hay logs para mostrar
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination-controls" style={{ marginTop: '1rem' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                      disabled={auditPage <= 1}
                    >
                      ← Anterior
                    </button>
                    <span>
                      Página {auditPage} de {auditPagination.totalPages || 1} (Total: {auditPagination.total || 0})
                    </span>
                    <button
                      className="btn-secondary"
                      onClick={() => setAuditPage((p) => Math.min(auditPagination.totalPages || p + 1, p + 1))}
                      disabled={auditPage >= (auditPagination.totalPages || 1)}
                    >
                      Siguiente →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
