import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import './Admin.css';

function Admin() {
  const [activeTab, setActiveTab] = useState('qr');
  const [user, setUser] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
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
      cargarModelos();
    } else if (activeTab === 'contactos') {
      cargarContactos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/session');
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
      const response = await fetch('/api/admin/modelos', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setModelos(data.modelos || []);
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

  const cargarContactos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/contactos', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setContactos(data.contactos || []);
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
        cargarModelos();
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
            <a href="/logout" className="btn-logout">Cerrar Sesión</a>
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
            </div>
          </div>
        )}

        {/* Tab Contactos */}
        {activeTab === 'contactos' && (
          <div className="tab-content active">
            <div className="card">
              <h2>Contactos Recibidos</h2>
              
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
