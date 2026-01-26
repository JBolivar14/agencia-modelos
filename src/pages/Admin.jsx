import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import { csrfFetch } from '../utils/csrf';
import './Admin.css';

function Admin() {
  const [activeTab, setActiveTab] = useState('qr');
  const [user, setUser] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    username: '',
    email: '',
    nombre: '',
    password: ''
  });
  const [expandedAuditKey, setExpandedAuditKey] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [qrDataSorteo, setQrDataSorteo] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filtros/paginación de modelos
  const [selectedModeloIds, setSelectedModeloIds] = useState(new Set());
  const [modeloQuery, setModeloQuery] = useState('');
  const [modeloCiudad, setModeloCiudad] = useState('');
  // Permitir ver activas/inactivas como antes
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
  const [contactoOrigen, setContactoOrigen] = useState(''); // '' | 'contacto' | 'sorteo'
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

  const formatAuditDate = (value) => {
    try {
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) return '';
      return dt.toLocaleString();
    } catch (_) {
      return '';
    }
  };

  const shortText = (s, max = 42) => {
    const str = typeof s === 'string' ? s : '';
    if (str.length <= max) return str;
    return `${str.slice(0, Math.max(0, max - 1))}…`;
  };

  const prettyJson = (meta) => {
    if (!meta) return '';
    try {
      if (typeof meta === 'string') {
        // SQLite guarda meta como TEXT (a veces JSON)
        const trimmed = meta.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          return JSON.stringify(JSON.parse(trimmed), null, 2);
        }
        return trimmed;
      }
      return JSON.stringify(meta, null, 2);
    } catch (_) {
      try {
        return String(meta);
      } catch (__) {
        return '';
      }
    }
  };

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
    } else if (activeTab === 'usuarios') {
      setNuevoUsuario({ username: '', email: '', nombre: '', password: '' });
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
  }, [activeTab, contactoQuery, contactoFrom, contactoTo, contactoOrigen, contactoPage, contactoPageSize, contactoSortBy, contactoSortDir]);

  useEffect(() => {
    if (activeTab !== 'audit') return;
    const t = setTimeout(() => {
      cargarAuditLogs();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, auditQuery, auditEventType, auditSeverity, auditPage, auditPageSize]);

  useEffect(() => {
    if (activeTab !== 'usuarios') return;
    const t = setTimeout(() => {
      cargarUsuarios();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
          : `¿Eliminar DEFINITIVAMENTE ${ids.length} modelo(s)?\n\nEsta acción borra la información de la base de datos y no se puede deshacer.`;

    if (!window.confirm(confirmText)) return;

    try {
      setLoading(true);
      const response = await csrfFetch('/api/admin/modelos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (contactoOrigen) params.set('origen', contactoOrigen);
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

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/usuarios', { credentials: 'include' });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setUsuarios(data.usuarios || []);
      } else {
        toast.error(data.message || 'Error cargando usuarios');
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      toast.error(error.message || 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  const crearUsuarioAdmin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        username: nuevoUsuario.username,
        email: nuevoUsuario.email,
        nombre: nuevoUsuario.nombre,
        password: nuevoUsuario.password
      };

      const response = await csrfFetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Usuario admin creado');
        setNuevoUsuario({ username: '', email: '', nombre: '', password: '' });
        await cargarUsuarios();
      } else {
        toast.error(data.message || 'Error creando usuario admin');
      }
    } catch (error) {
      console.error('Error creando usuario admin:', error);
      toast.error(error.message || 'Error creando usuario admin');
    } finally {
      setLoading(false);
    }
  };

  const generarQR = async () => {
    try {
      const response = await csrfFetch('/api/admin/generar-qr', {
        method: 'POST',
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
          title: 'Agencia Modelos Argentinas - Comparte tus datos',
          text: 'Agencia Modelos Argentinas le gustaría conocerte más. Comparte tus datos con nosotros:',
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

  const descargarQR = () => {
    if (!qrData?.qr) {
      toast.error('Generá el QR primero');
      return;
    }
    const a = document.createElement('a');
    a.href = qrData.qr;
    a.download = 'qr-contacto.png';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('Descarga iniciada');
  };

  const descargarQRSorteo = () => {
    if (!qrDataSorteo?.qr) {
      toast.error('Generá el QR Sorteo primero');
      return;
    }
    const a = document.createElement('a');
    a.href = qrDataSorteo.qr;
    a.download = 'qr-sorteo.png';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('Descarga iniciada');
  };

  const compartirWhatsApp = async () => {
    if (!qrData?.url) {
      toast.error('No hay URL para compartir');
      return;
    }
    const shareText = 'Agencia Modelos Argentinas le gustaría conocerte más. Comparte tus datos con nosotros: ' + qrData.url;
    if (qrData.qr && typeof navigator.share === 'function') {
      try {
        const res = await fetch(qrData.qr);
        const blob = await res.blob();
        const file = new File([blob], 'qr-contacto.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'QR - Agencia Modelos Argentinas', text: shareText });
          toast.success('¡Compartido por WhatsApp!');
          return;
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('Share con imagen falló, usando link:', e);
      }
    }
    const text = encodeURIComponent('Agencia Modelos Argentinas le gustaría conocerte más. Comparte tus datos con nosotros: ' + qrData.url);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    toast.success('Abriendo WhatsApp...');
  };

  const generarQRSorteo = async () => {
    try {
      const response = await csrfFetch('/api/admin/generar-qr-sorteo', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setQrDataSorteo(data);
        toast.success('QR Sorteo generado');
      } else {
        toast.error(data.message || 'Error generando QR Sorteo');
      }
    } catch (error) {
      console.error('Error generando QR Sorteo:', error);
      toast.error(error.message || 'Error generando QR Sorteo');
    }
  };

  const copiarQRUrlSorteo = async () => {
    if (!qrDataSorteo?.url) {
      toast.error('No hay URL para copiar');
      return;
    }
    try {
      await navigator.clipboard.writeText(qrDataSorteo.url);
      toast.success('URL copiada al portapapeles');
    } catch (error) {
      toast.error('Error al copiar URL');
    }
  };

  const compartirQRSorteo = async () => {
    if (!qrDataSorteo?.url) {
      toast.error('No hay URL para compartir');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Sorteo - Agencia Modelos Argentinas',
          text: '¡Participá en el sorteo! Cena para 4 en Puerto Madero. Sorteo 28/01:',
          url: qrDataSorteo.url,
        });
        toast.success('¡Compartido!');
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      }
    } else {
      toast.info('Tu navegador no soporta compartir nativo');
    }
  };

  const compartirWhatsAppSorteo = async () => {
    if (!qrDataSorteo?.url) {
      toast.error('No hay URL para compartir');
      return;
    }
    const shareText = '¡Participá en el sorteo! Cena para 4 en Puerto Madero. Sorteo 28/01: ' + qrDataSorteo.url;
    if (qrDataSorteo.qr && typeof navigator.share === 'function') {
      try {
        const res = await fetch(qrDataSorteo.qr);
        const blob = await res.blob();
        const file = new File([blob], 'qr-sorteo.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'QR Sorteo - Agencia Modelos Argentinas', text: shareText });
          toast.success('¡Compartido por WhatsApp!');
          return;
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.warn(e);
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    toast.success('Abriendo WhatsApp...');
  };

  const toggleActivaModelo = async (id, nextActiva) => {
    const willDeactivate = nextActiva === false;
    const confirmMsg = willDeactivate
      ? '¿Desactivar esta modelo?\n\nNota: no se borra de la base. Quedará como "Inactiva" y no será pública.'
      : '¿Activar esta modelo?\n\nVolverá a estar visible públicamente.';

    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);

      // Usamos el endpoint bulk (más claro: activa true/false)
      const response = await csrfFetch('/api/admin/modelos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: nextActiva ? 'activate' : 'deactivate',
          ids: [id]
        })
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || `Error HTTP: ${response.status}`);
      }

      toast.success(nextActiva ? 'Modelo activada' : 'Modelo desactivada');

      // Si era el último de la página y no es la primera, retroceder
      if (modeloPage > 1 && modelos.length <= 1) {
        setModeloPage((prev) => Math.max(1, prev - 1));
      } else {
        cargarModelos();
      }
    } catch (error) {
      console.error('Error eliminando modelo:', error);
      toast.error(error.message || 'Error actualizando modelo');
    } finally {
      setLoading(false);
    }
  };

  const hardDeleteModelo = async (id) => {
    if (
      !window.confirm(
        '¿Eliminar DEFINITIVAMENTE esta modelo?\n\nEsta acción borra la información de la base de datos y no se puede deshacer.'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const response = await csrfFetch(`/api/admin/modelos/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || `Error HTTP: ${response.status}`);
      }

      toast.success(data.message || 'Modelo eliminada definitivamente');

      if (modeloPage > 1 && modelos.length <= 1) {
        setModeloPage((p) => Math.max(1, p - 1));
      } else {
        cargarModelos();
      }
    } catch (error) {
      console.error('Error eliminando modelo:', error);
      toast.error(error.message || 'Error eliminando modelo');
    } finally {
      setLoading(false);
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
            QR Contacto
          </button>
          <button
            className={`tab-button ${activeTab === 'qr-sorteo' ? 'active' : ''}`}
            onClick={() => setActiveTab('qr-sorteo')}
          >
            QR Sorteo
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
          <button
            className={`tab-button ${activeTab === 'usuarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('usuarios')}
          >
            Usuarios
          </button>
        </div>

        {/* Tab QR Contacto */}
        {activeTab === 'qr' && (
          <div className="tab-content active">
            <div className="card">
              <h2>Generar Código QR — Contacto</h2>
              <p className="subtitle">Formulario completo para futuras modelos</p>
              
              <div className="qr-admin-wrapper">
                <div id="qrAdminContainer" className="qr-admin-placeholder">
                  {qrData ? (
                    <img src={qrData.qr} alt="QR Code" style={{ maxWidth: '300px' }} />
                  ) : (
                    <p>Haz clic en "Generar QR Contacto" para crear el código</p>
                  )}
                </div>
              </div>
              
              <button onClick={generarQR} className="btn-primary">
                Generar QR Contacto
              </button>
              
              {qrData && (
                <div className="qr-url-display">
                  <p><strong>URL:</strong> <span>{qrData.url}</span></p>
                  <div className="qr-actions">
                    <button onClick={descargarQR} className="btn-download" type="button">⬇️ Descargar QR</button>
                    <button onClick={copiarQRUrl} className="btn-copy">📋 Copiar URL</button>
                    <button onClick={compartirWhatsApp} className="btn-share btn-whatsapp">💬 Compartir por WhatsApp</button>
                    <button onClick={compartirQR} className="btn-share">📤 Compartir (Nativo)</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab QR Sorteo */}
        {activeTab === 'qr-sorteo' && (
          <div className="tab-content active">
            <div className="card">
              <h2>Generar Código QR — Sorteo</h2>
              <p className="subtitle">Solo sorteos: nombre, email y teléfono (sin empresa ni mensaje)</p>
              
              <div className="qr-admin-wrapper">
                <div className="qr-admin-placeholder">
                  {qrDataSorteo ? (
                    <img src={qrDataSorteo.qr} alt="QR Sorteo" style={{ maxWidth: '300px' }} />
                  ) : (
                    <p>Haz clic en "Generar QR Sorteo" para crear el código</p>
                  )}
                </div>
              </div>
              
              <button onClick={generarQRSorteo} className="btn-primary">
                Generar QR Sorteo
              </button>
              
              {qrDataSorteo && (
                <div className="qr-url-display">
                  <p><strong>URL:</strong> <span>{qrDataSorteo.url}</span></p>
                  <div className="qr-actions">
                    <button onClick={descargarQRSorteo} className="btn-download" type="button">⬇️ Descargar QR</button>
                    <button onClick={copiarQRUrlSorteo} className="btn-copy">📋 Copiar URL</button>
                    <button onClick={compartirWhatsAppSorteo} className="btn-share btn-whatsapp">💬 Compartir por WhatsApp</button>
                    <button onClick={compartirQRSorteo} className="btn-share">📤 Compartir (Nativo)</button>
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
                role="search"
                aria-label="Filtros de modelos"
              >
                <label htmlFor="admin-modelo-buscar" className="visually-hidden">
                  Buscar por nombre, email, teléfono o ciudad
                </label>
                <input
                  id="admin-modelo-buscar"
                  type="search"
                  placeholder="Buscar (nombre, email, teléfono, ciudad...)"
                  value={modeloQuery}
                  onChange={(e) => {
                    setModeloQuery(e.target.value);
                    setModeloPage(1);
                    setSelectedModeloIds(new Set());
                  }}
                  style={{ flex: '1 1 280px' }}
                  aria-label="Buscar modelos"
                />

                <label htmlFor="admin-modelo-ciudad" className="visually-hidden">
                  Filtrar por ciudad
                </label>
                <input
                  id="admin-modelo-ciudad"
                  type="text"
                  placeholder="Filtrar por ciudad"
                  value={modeloCiudad}
                  onChange={(e) => {
                    setModeloCiudad(e.target.value);
                    setModeloPage(1);
                    setSelectedModeloIds(new Set());
                  }}
                  style={{ flex: '1 1 180px' }}
                  aria-label="Filtrar por ciudad"
                />

                <label htmlFor="admin-modelo-activa" className="visually-hidden">
                  Estado: todas, activas o inactivas
                </label>
                <select
                  id="admin-modelo-activa"
                  value={modeloActiva}
                  onChange={(e) => {
                    setModeloActiva(e.target.value);
                    setModeloPage(1);
                    setSelectedModeloIds(new Set());
                  }}
                  aria-label="Estado activa o inactiva"
                >
                  <option value="all">Todas</option>
                  <option value="true">Activas</option>
                  <option value="false">Inactivas</option>
                </select>

                <label htmlFor="admin-modelo-orden" className="visually-hidden">
                  Ordenar por
                </label>
                <select
                  id="admin-modelo-orden"
                  value={modeloSortBy}
                  onChange={(e) => {
                    setModeloSortBy(e.target.value);
                    setModeloPage(1);
                    setSelectedModeloIds(new Set());
                  }}
                  aria-label="Ordenar por"
                >
                  <option value="creado_en">Orden: más nuevas</option>
                  <option value="nombre">Orden: nombre</option>
                  <option value="ciudad">Orden: ciudad</option>
                  <option value="edad">Orden: edad</option>
                </select>

                <label htmlFor="admin-modelo-direccion" className="visually-hidden">
                  Dirección de orden
                </label>
                <select id="admin-modelo-direccion" value={modeloSortDir} onChange={(e) => setModeloSortDir(e.target.value)} aria-label="Ascendente o descendente">
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>

                <label htmlFor="admin-modelo-page-size" className="visually-hidden">
                  Cantidad por página
                </label>
                <select
                  id="admin-modelo-page-size"
                  value={modeloPageSize}
                  onChange={(e) => {
                    setModeloPageSize(parseInt(e.target.value, 10));
                    setModeloPage(1);
                    setSelectedModeloIds(new Set());
                  }}
                  aria-label="Cantidad por página"
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
                    Eliminar (definitivo)
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
                                onClick={() => toggleActivaModelo(modelo.id, !modelo.activa)}
                                className={modelo.activa ? 'btn-secondary' : 'btn-edit'}
                              >
                                {modelo.activa ? '⏸️ Desactivar' : '✅ Activar'}
                              </button>
                              <button
                                onClick={() => hardDeleteModelo(modelo.id)}
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
                  value={contactoOrigen}
                  onChange={(e) => {
                    setContactoOrigen(e.target.value);
                    setContactoPage(1);
                  }}
                  title="Origen"
                >
                  <option value="">Origen: todos</option>
                  <option value="contacto">Contacto</option>
                  <option value="sorteo">Sorteo</option>
                </select>

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
                        <th>Origen</th>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Confirmado</th>
                        <th>Teléfono</th>
                        <th>Empresa</th>
                        <th>Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactos.map(contacto => (
                        <tr key={contacto.id}>
                          <td>{new Date(contacto.fecha).toLocaleDateString('es-ES')}</td>
                          <td>{contacto.origen === 'sorteo' ? 'Sorteo' : 'Contacto'}</td>
                          <td>{contacto.nombre}</td>
                          <td>{contacto.email}</td>
                          <td>{contacto.confirmado ? '✅' : '⏳'}</td>
                          <td>{contacto.telefono || '-'}</td>
                          <td>{contacto.empresa || '-'}</td>
                          <td>{contacto.mensaje ? contacto.mensaje.substring(0, 50) + (contacto.mensaje.length > 50 ? '...' : '') : '-'}</td>
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
                  <option value="admin_user_create">admin_user_create</option>
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
                  <div className="audit-table-container">
                    <table className="audit-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Severidad</th>
                          <th>Evento</th>
                          <th>Usuario</th>
                          <th>IP</th>
                          <th>Ruta</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(auditLogs || []).map((log) => {
                          const createdAt = log.created_at || log.creado_en || null;
                          const key = String(log.id || `${log.event_type}-${createdAt || 'no-date'}-${log.ip || ''}`);
                          const isOpen = expandedAuditKey === key;

                          const sev = String(log.severity || '').toLowerCase();
                          const sevClass = sev === 'warn' ? 'warn' : sev === 'error' ? 'error' : 'info';

                          const actor =
                            log.actor_username ||
                            (log.actor_user_id ? `ID ${log.actor_user_id}` : '');

                          const metaText = prettyJson(log.meta);
                          const userAgent = log.user_agent || '';
                          const method = log.method || '';
                          const path = log.path || '';

                          return (
                            <React.Fragment key={key}>
                              <tr className={isOpen ? 'audit-row open' : 'audit-row'}>
                                <td className="audit-cell-date" title={formatAuditDate(createdAt)}>
                                  {formatAuditDate(createdAt)}
                                </td>
                                <td>
                                  <span className={`audit-badge audit-badge-${sevClass}`}>
                                    {sev || 'info'}
                                  </span>
                                </td>
                                <td title={log.event_type || ''}>
                                  <span className="audit-event">{log.event_type || ''}</span>
                                </td>
                                <td className="audit-cell-clip" title={actor}>
                                  {shortText(actor, 26)}
                                </td>
                                <td className="audit-cell-clip" title={log.ip || ''}>
                                  {shortText(log.ip || '', 20)}
                                </td>
                                <td className="audit-cell-clip" title={path}>
                                  {shortText(path, 48)}
                                </td>
                                <td className="audit-cell-action">
                                  <button
                                    type="button"
                                    className="btn-secondary audit-btn"
                                    onClick={() => setExpandedAuditKey((prev) => (prev === key ? null : key))}
                                  >
                                    {isOpen ? 'Ocultar' : 'Detalle'}
                                  </button>
                                </td>
                              </tr>

                              {isOpen && (
                                <tr className="audit-detail-row">
                                  <td colSpan={7}>
                                    <div className="audit-detail">
                                      <div className="audit-detail-grid">
                                        <div>
                                          <div className="audit-detail-label">Método</div>
                                          <div className="audit-detail-value">{method || '-'}</div>
                                        </div>
                                        <div>
                                          <div className="audit-detail-label">Ruta</div>
                                          <div className="audit-detail-value audit-detail-mono">{path || '-'}</div>
                                        </div>
                                        <div>
                                          <div className="audit-detail-label">IP</div>
                                          <div className="audit-detail-value audit-detail-mono">{log.ip || '-'}</div>
                                        </div>
                                        <div>
                                          <div className="audit-detail-label">User-Agent</div>
                                          <div className="audit-detail-value audit-detail-mono">
                                            {userAgent ? shortText(userAgent, 120) : '-'}
                                          </div>
                                        </div>
                                      </div>

                                      {metaText && (
                                        <div className="audit-meta">
                                          <div className="audit-detail-label">Meta</div>
                                          <pre className="audit-meta-pre">{metaText}</pre>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                        {(!auditLogs || auditLogs.length === 0) && (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', opacity: 0.8 }}>
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

        {/* Tab Usuarios (Admins) */}
        {activeTab === 'usuarios' && (
          <div className="tab-content active">
            <div className="card">
              <h2>Usuarios Admin</h2>
              <p className="subtitle">Crear y listar usuarios con acceso al panel</p>

              <form onSubmit={crearUsuarioAdmin} className="admin-user-form">
                <div className="admin-user-form-grid">
                  <div className="form-group">
                    <label>Username *</label>
                    <input
                      type="text"
                      required
                      value={nuevoUsuario.username}
                      onChange={(e) => setNuevoUsuario((p) => ({ ...p, username: e.target.value }))}
                      placeholder="admin1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      required
                      value={nuevoUsuario.email}
                      onChange={(e) => setNuevoUsuario((p) => ({ ...p, email: e.target.value }))}
                      placeholder="admin1@correo.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Nombre *</label>
                    <input
                      type="text"
                      required
                      value={nuevoUsuario.nombre}
                      onChange={(e) => setNuevoUsuario((p) => ({ ...p, nombre: e.target.value }))}
                      placeholder="Admin 1"
                    />
                  </div>

                  <div className="form-group">
                    <label>Contraseña *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={nuevoUsuario.password}
                      onChange={(e) => setNuevoUsuario((p) => ({ ...p, password: e.target.value }))}
                      placeholder="mínimo 8 caracteres"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    Crear usuario
                  </button>
                  <button type="button" className="btn-secondary" onClick={cargarUsuarios} disabled={loading}>
                    Recargar
                  </button>
                </div>
              </form>

              <div style={{ marginTop: '1rem' }}>
                {loading ? (
                  <p>Cargando...</p>
                ) : usuarios.length === 0 ? (
                  <p>No hay usuarios para mostrar</p>
                ) : (
                  <div className="admin-users-table-container">
                    <table className="admin-users-table">
                      <thead>
                        <tr>
                          <th>Creado</th>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Nombre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuarios.map((u) => (
                          <tr key={u.id || `${u.username}-${u.email}`}>
                            <td>{u.creado_en ? new Date(u.creado_en).toLocaleDateString('es-ES') : '-'}</td>
                            <td>{u.username}</td>
                            <td>{u.email || '-'}</td>
                            <td>{u.nombre}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
