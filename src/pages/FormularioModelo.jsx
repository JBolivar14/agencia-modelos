import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import { csrfFetch } from '../utils/csrf';
import { getOptimizedImageUrl } from '../utils/images';
import './FormularioModelo.css';

const MAX_FOTOS_MODELO = 20;
const MAX_IMAGE_SIZE_MB = 0.1;
const MAX_IMAGE_DIMENSION = 1600;

function FormularioModelo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(false);
  const [loadingModelo, setLoadingModelo] = useState(isEdit);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [dragMain, setDragMain] = useState(false);
  const [dragGallery, setDragGallery] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    edad: '',
    altura: '',
    medidas: '',
    ciudad: '',
    foto: '',
    descripcion: '',
    activa: true
  });
  const [fotos, setFotos] = useState([]);
  const [nuevaFoto, setNuevaFoto] = useState('');

  useEffect(() => {
    if (isEdit) {
      cargarModelo();
    }
  }, [id]);

  const cargarModelo = async () => {
    try {
      setLoadingModelo(true);
      const response = await fetch(`/api/admin/modelos/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.modelo) {
        throw new Error(data.message || 'Error al obtener modelo');
      }

      const modelo = data.modelo;
      setFormData({
        nombre: modelo.nombre || '',
        apellido: modelo.apellido || '',
        email: modelo.email || '',
        telefono: modelo.telefono || '',
        edad: modelo.edad || '',
        altura: modelo.altura || '',
        medidas: modelo.medidas || '',
        ciudad: modelo.ciudad || '',
        foto: modelo.foto || '',
        descripcion: modelo.descripcion || '',
        activa: modelo.activa !== false
      });

      // Cargar fotos
      if (modelo.fotos && Array.isArray(modelo.fotos)) {
        setFotos(modelo.fotos.map(f => (typeof f === 'string' ? f : f.url)).filter(Boolean));
      }
    } catch (error) {
      console.error('Error cargando modelo:', error);
      toast.error(error.message || 'Error cargando modelo');
      navigate('/admin');
    } finally {
      setLoadingModelo(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const agregarFoto = () => {
    if (!nuevaFoto.trim()) return;
    if (fotos.length >= MAX_FOTOS_MODELO) {
      toast.error(`Máximo ${MAX_FOTOS_MODELO} fotos por modelo`);
      return;
    }
    setFotos(prev => [...prev, nuevaFoto.trim()]);
    setNuevaFoto('');
  };

  const eliminarFoto = (index) => {
    setFotos(prev => {
      const removed = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (removed && formData.foto === removed) {
        setFormData((fd) => ({ ...fd, foto: next[0] || '' }));
      }
      return next;
    });
  };

  const moverFoto = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const nuevasFotos = [...fotos];
      [nuevasFotos[index - 1], nuevasFotos[index]] = [nuevasFotos[index], nuevasFotos[index - 1]];
      setFotos(nuevasFotos);
    } else if (direction === 'down' && index < fotos.length - 1) {
      const nuevasFotos = [...fotos];
      [nuevasFotos[index], nuevasFotos[index + 1]] = [nuevasFotos[index + 1], nuevasFotos[index]];
      setFotos(nuevasFotos);
    }
  };

  const requestSignedUploadUrls = async (files) => {
    const response = await csrfFetch('/api/admin/storage/modelo-fotos/signed-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: files.map((f) => ({ name: f.name, type: f.type }))
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.message || `Error HTTP: ${response.status}`);
    }

    if (!Array.isArray(data.items) || data.items.length !== files.length) {
      throw new Error('Respuesta inválida del servidor (signed URLs)');
    }

    return data.items;
  };

  const normalizeCompressedName = (fileName, type) => {
    const base = String(fileName || 'imagen').replace(/\.[^.]+$/, '');
    if (type === 'image/webp') return `${base}.webp`;
    if (type === 'image/png') return `${base}.png`;
    return `${base}.jpg`;
  };

  const compressImageFile = async (file) => {
    if (!file || !file.type || !file.type.startsWith('image/')) return file;
    if (file.type === 'image/gif') return file; // preservar GIFs animados

    const options = {
      maxSizeMB: MAX_IMAGE_SIZE_MB,
      maxWidthOrHeight: MAX_IMAGE_DIMENSION,
      useWebWorker: true,
      fileType: 'image/webp'
    };

    try {
      const compressed = await imageCompression(file, options);
      const blob = compressed instanceof Blob ? compressed : file;
      const newType = blob.type || 'image/webp';
      const newName = normalizeCompressedName(file.name, newType);
      return new File([blob], newName, { type: newType, lastModified: Date.now() });
    } catch (err) {
      console.warn('Compresión falló, usando original:', err);
      return file;
    }
  };

  const compressImagesForUpload = async (files) => {
    if (!files || files.length === 0) return [];
    const results = [];
    for (const file of files) {
      results.push(await compressImageFile(file));
    }
    return results;
  };

  const uploadFilesToSupabaseStorage = async (files) => {
    if (!files || files.length === 0) return [];

    // Filtrar imágenes
    const imageFiles = files.filter((f) => f && f.type && f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('Selecciona archivos de imagen (JPG/PNG/WebP/GIF)');
      return [];
    }

    const preparedFiles = await compressImagesForUpload(imageFiles);
    const signedItems = await requestSignedUploadUrls(preparedFiles);

    const uploadedUrls = [];
    for (let i = 0; i < preparedFiles.length; i++) {
      const file = preparedFiles[i];
      const item = signedItems[i];

      const putRes = await fetch(item.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });

      if (!putRes.ok) {
        const txt = await putRes.text().catch(() => '');
        throw new Error(`Error subiendo archivo (${file.name}): ${putRes.status} ${txt}`);
      }

      if (!item.publicUrl) {
        throw new Error('No se pudo obtener publicUrl (revisa que el bucket sea público)');
      }

      uploadedUrls.push(item.publicUrl);
    }

    return uploadedUrls;
  };

  const handleUploadMain = async (fileList) => {
    try {
      const files = Array.from(fileList || []).slice(0, 1);
      if (files.length === 0) return;
      setUploadingMain(true);
      const urls = await uploadFilesToSupabaseStorage(files);
      if (urls[0]) {
        setFormData((prev) => ({ ...prev, foto: urls[0] }));
        toast.success('Foto principal subida');
      }
    } catch (error) {
      console.error('Error subiendo foto principal:', error);
      toast.error(error.message || 'Error subiendo foto principal');
    } finally {
      setUploadingMain(false);
      setDragMain(false);
    }
  };

  const handleUploadGallery = async (fileList) => {
    try {
      const files = Array.from(fileList || []);
      if (files.length === 0) return;
      if (fotos.length >= MAX_FOTOS_MODELO) {
        toast.error(`Máximo ${MAX_FOTOS_MODELO} fotos por modelo`);
        return;
      }
      const restante = MAX_FOTOS_MODELO - fotos.length;
      const toUpload = files.slice(0, restante);
      if (toUpload.length < files.length) {
        toast.info(`Solo se subirán ${restante} foto(s) (máximo ${MAX_FOTOS_MODELO} por modelo).`);
      }
      setUploadingGallery(true);
      const urls = await uploadFilesToSupabaseStorage(toUpload);
      if (urls.length > 0) {
        setFotos((prev) => [...prev, ...urls]);
        setFormData((prev) => {
          if (prev.foto) return prev;
          return { ...prev, foto: urls[0] };
        });
        toast.success(`${urls.length} foto(s) subida(s)`);
      }
    } catch (error) {
      console.error('Error subiendo fotos:', error);
      toast.error(error.message || 'Error subiendo fotos');
    } finally {
      setUploadingGallery(false);
      setDragGallery(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit 
        ? `/api/admin/modelos/${id}`
        : '/api/admin/modelos';
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await csrfFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          fotos: fotos
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success(isEdit ? 'Modelo actualizado exitosamente' : 'Modelo creado exitosamente');
        navigate('/admin', { state: { activeTab: 'modelos' } });
      } else {
        toast.error(data.message || 'Error al guardar modelo');
      }
    } catch (error) {
      console.error('Error guardando modelo:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Error de conexión. Verifica tu conexión a internet.');
      } else {
        toast.error(error.message || 'Error al guardar modelo');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingModelo) {
    return (
      <div className="formulario-modelo-page">
        <div className="loading-container">
          <div className="loading"></div>
          <p>Cargando modelo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="formulario-modelo-page">
      <div className="container">
        <div className="card formulario-card">
          <div className="formulario-header">
            <h1>{isEdit ? '✏️ Editar Modelo' : '➕ Nuevo Modelo'}</h1>
            <button
              onClick={() => navigate('/admin', { state: { activeTab: 'modelos' } })}
              className="btn-back"
            >
              ← Volver al Admin
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* Información Básica */}
              <div className="form-section">
                <h2>Información Básica</h2>
                
                <div className="form-group">
                  <label htmlFor="nombre">Nombre *</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="apellido">Apellido</label>
                  <input
                    type="text"
                    id="apellido"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
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
                    value={formData.telefono}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Características Físicas */}
              <div className="form-section">
                <h2>Características Físicas</h2>
                
                <div className="form-group">
                  <label htmlFor="edad">Edad</label>
                  <input
                    type="number"
                    id="edad"
                    name="edad"
                    min="16"
                    max="99"
                    value={formData.edad}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="altura">Altura</label>
                  <input
                    type="text"
                    id="altura"
                    name="altura"
                    placeholder="Ej: 175 cm"
                    value={formData.altura}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="medidas">Medidas</label>
                  <input
                    type="text"
                    id="medidas"
                    name="medidas"
                    placeholder="Ej: 90-60-90"
                    value={formData.medidas}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ciudad">Ciudad</label>
                  <input
                    type="text"
                    id="ciudad"
                    name="ciudad"
                    value={formData.ciudad}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Foto Principal */}
            <div className="form-section">
              <h2>Foto Principal</h2>
              <div
                className={`upload-dropzone ${dragMain ? 'dragover' : ''} ${uploadingMain || loading ? 'disabled' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploadingMain && !loading) setDragMain(true);
                }}
                onDragLeave={() => setDragMain(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (uploadingMain || loading) return;
                  setDragMain(false);
                  handleUploadMain(e.dataTransfer.files);
                }}
              >
                <div className="upload-dropzone-content">
                  <div className="upload-title">Arrastrá una foto aquí</div>
                  <div className="upload-subtitle">o seleccioná un archivo</div>
                  <label className="btn-upload">
                    {uploadingMain ? 'Subiendo...' : 'Seleccionar foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadMain(e.target.files)}
                      disabled={uploadingMain || loading}
                    />
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="foto">URL de Foto Principal</label>
                <input
                  type="url"
                  id="foto"
                  name="foto"
                  placeholder="https://ejemplo.com/foto.jpg"
                  value={formData.foto}
                  onChange={handleChange}
                  disabled={loading}
                />
                {formData.foto && (
                  <div className="foto-preview">
                    <img
                      src={getOptimizedImageUrl(formData.foto, { width: 600, quality: 70 })}
                      alt="Preview"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        if (!formData.foto) {
                          e.target.style.display = 'none';
                          return;
                        }
                        if (e.currentTarget.dataset.fallbackApplied) {
                          e.target.style.display = 'none';
                          return;
                        }
                        e.currentTarget.dataset.fallbackApplied = 'true';
                        e.currentTarget.src = formData.foto;
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Galería de Fotos */}
            <div className="form-section">
              <h2>Galería de Fotos</h2>

              <div
                className={`upload-dropzone ${dragGallery ? 'dragover' : ''} ${uploadingGallery || loading || fotos.length >= MAX_FOTOS_MODELO ? 'disabled' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploadingGallery && !loading && fotos.length < MAX_FOTOS_MODELO) setDragGallery(true);
                }}
                onDragLeave={() => setDragGallery(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (uploadingGallery || loading || fotos.length >= MAX_FOTOS_MODELO) return;
                  setDragGallery(false);
                  handleUploadGallery(e.dataTransfer.files);
                }}
              >
                <div className="upload-dropzone-content">
                  <div className="upload-title">Arrastrá fotos aquí</div>
                  <div className="upload-subtitle">o seleccioná múltiples archivos (máx. {MAX_FOTOS_MODELO})</div>
                  <label className="btn-upload">
                    {uploadingGallery ? 'Subiendo...' : fotos.length >= MAX_FOTOS_MODELO ? 'Máximo alcanzado' : 'Seleccionar fotos'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleUploadGallery(e.target.files)}
                      disabled={uploadingGallery || loading || fotos.length >= MAX_FOTOS_MODELO}
                    />
                  </label>
                </div>
              </div>
              
              <div className="fotos-input-group">
                <input
                  type="url"
                  placeholder="URL de foto (https://ejemplo.com/foto.jpg)"
                  value={nuevaFoto}
                  onChange={(e) => setNuevaFoto(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), agregarFoto())}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={agregarFoto}
                  className="btn-add-foto"
                  disabled={loading || !nuevaFoto.trim() || fotos.length >= MAX_FOTOS_MODELO}
                >
                  ➕ Agregar
                </button>
              </div>

              {fotos.length > 0 && (
                <div className="fotos-list">
                  {fotos.map((foto, index) => (
                    <div key={index} className="foto-item">
                      <div className="foto-preview-small">
                        <img
                          src={getOptimizedImageUrl(foto, { width: 300, quality: 60 })}
                          alt={`Foto ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            if (!foto) {
                              e.target.style.display = 'none';
                              return;
                            }
                            if (e.currentTarget.dataset.fallbackApplied) {
                              e.target.style.display = 'none';
                              return;
                            }
                            e.currentTarget.dataset.fallbackApplied = 'true';
                            e.currentTarget.src = foto;
                          }}
                        />
                      </div>
                      <div className="foto-url">{foto}</div>
                      <div className="foto-actions">
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, foto }))}
                          disabled={loading}
                          className="btn-move"
                          title="Usar como foto principal"
                        >
                          ⭐
                        </button>
                        <button
                          type="button"
                          onClick={() => moverFoto(index, 'up')}
                          disabled={index === 0 || loading}
                          className="btn-move"
                          title="Mover arriba"
                        >
                          ⬆️
                        </button>
                        <button
                          type="button"
                          onClick={() => moverFoto(index, 'down')}
                          disabled={index === fotos.length - 1 || loading}
                          className="btn-move"
                          title="Mover abajo"
                        >
                          ⬇️
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarFoto(index)}
                          disabled={loading}
                          className="btn-delete-foto"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Descripción y Estado */}
            <div className="form-section">
              <h2>Información Adicional</h2>
              
              <div className="form-group">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  rows="4"
                  placeholder="Descripción del modelo..."
                  value={formData.descripcion}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="activa"
                    checked={formData.activa}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <span>Modelo activa (visible en la galería pública)</span>
                </label>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/admin', { state: { activeTab: 'modelos' } })}
                className="btn-cancel"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loader"></span>
                    {isEdit ? 'Guardando...' : 'Creando...'}
                  </>
                ) : (
                  isEdit ? '💾 Guardar Cambios' : '✨ Crear Modelo'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FormularioModelo;
