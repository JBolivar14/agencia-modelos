// Middleware de validación y sanitización

/**
 * Valida y sanitiza strings
 */
function sanitizeString(str, maxLength = 500) {
  if (!str || typeof str !== 'string') return null;
  return str.trim().substring(0, maxLength);
}

/**
 * Valida formato de email
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida formato de teléfono
 */
function validatePhone(phone) {
  if (!phone) return true; // Opcional
  if (typeof phone !== 'string') return false;
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone.trim()) && phone.trim().length >= 7;
}

/**
 * Valida URL
 */
function validateURL(url) {
  if (!url) return true; // Opcional
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida edad
 */
function validateAge(age) {
  if (!age) return true; // Opcional
  const ageNum = parseInt(age);
  return !isNaN(ageNum) && ageNum >= 0 && ageNum <= 150;
}

/**
 * Middleware para validar datos de contacto
 */
function validateContacto(req, res, next) {
  const { nombre, email, telefono, empresa, mensaje, website } = req.body;

  // Honeypot anti-bots: si viene este campo completo, lo tratamos como spam
  // Responder "ok" para no dar señales al bot.
  if (website && String(website).trim()) {
    return res.json({ success: true, message: 'OK' });
  }
  
  // Validar nombre
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({
      success: false,
      message: 'El nombre es requerido'
    });
  }
  
  const sanitizedNombre = sanitizeString(nombre, 100);
  if (!sanitizedNombre) {
    return res.status(400).json({
      success: false,
      message: 'El nombre no es válido'
    });
  }
  
  // Validar email
  if (!email || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: 'El email es requerido'
    });
  }
  
  if (!validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del email no es válido'
    });
  }
  
  // Validar teléfono si está presente
  if (telefono && !validatePhone(telefono)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del teléfono no es válido'
    });
  }
  
  // Sanitizar datos
  req.body.nombre = sanitizedNombre;
  req.body.email = email.trim().toLowerCase();
  req.body.telefono = telefono ? sanitizeString(telefono, 20) : null;
  req.body.empresa = empresa ? sanitizeString(empresa, 100) : null;
  req.body.mensaje = mensaje ? sanitizeString(mensaje, 1000) : null;
  // No persistir honeypot
  if (req.body.website !== undefined) delete req.body.website;
  
  next();
}

/**
 * Middleware para validar datos de sorteo (solo nombre, email, teléfono)
 */
function validateSorteo(req, res, next) {
  const { nombre, email, telefono, website } = req.body;

  if (website && String(website).trim()) {
    return res.json({ success: true, message: 'OK' });
  }

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ success: false, message: 'El nombre es requerido' });
  }

  const sanitizedNombre = sanitizeString(nombre, 100);
  if (!sanitizedNombre) {
    return res.status(400).json({ success: false, message: 'El nombre no es válido' });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'El email es requerido' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ success: false, message: 'El formato del email no es válido' });
  }

  if (telefono && !validatePhone(telefono)) {
    return res.status(400).json({ success: false, message: 'El formato del teléfono no es válido' });
  }

  req.body.nombre = sanitizedNombre;
  req.body.email = email.trim().toLowerCase();
  req.body.telefono = telefono ? sanitizeString(telefono, 20) : null;
  if (req.body.website !== undefined) delete req.body.website;

  next();
}

const MAX_FOTOS_MODELO = 20;

/**
 * Middleware para validar datos de modelo
 */
function validateModelo(req, res, next) {
  const { nombre, email, telefono, edad, foto, fotos } = req.body;
  
  // Validar nombre (requerido)
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({
      success: false,
      message: 'El nombre es requerido'
    });
  }
  
  const sanitizedNombre = sanitizeString(nombre, 100);
  if (!sanitizedNombre) {
    return res.status(400).json({
      success: false,
      message: 'El nombre no es válido'
    });
  }
  
  // Validar email si está presente
  if (email && !validateEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del email no es válido'
    });
  }
  
  // Validar teléfono si está presente
  if (telefono && !validatePhone(telefono)) {
    return res.status(400).json({
      success: false,
      message: 'El formato del teléfono no es válido'
    });
  }
  
  // Validar edad si está presente
  if (edad !== undefined && edad !== null && !validateAge(edad)) {
    return res.status(400).json({
      success: false,
      message: 'La edad debe ser un número entre 0 y 150'
    });
  }
  
  // Validar URL de foto si está presente
  if (foto && !validateURL(foto)) {
    return res.status(400).json({
      success: false,
      message: 'La URL de la foto no es válida'
    });
  }

  // Validar array de fotos: máximo MAX_FOTOS_MODELO
  if (fotos !== undefined && fotos !== null) {
    if (!Array.isArray(fotos)) {
      return res.status(400).json({
        success: false,
        message: 'El campo fotos debe ser un array'
      });
    }
    if (fotos.length > MAX_FOTOS_MODELO) {
      return res.status(400).json({
        success: false,
        message: `Máximo ${MAX_FOTOS_MODELO} fotos por modelo`
      });
    }
    const fotosValidas = fotos.filter((u) => u && typeof u === 'string' && u.trim());
    for (const url of fotosValidas) {
      if (!validateURL(url.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Una o más URLs de fotos no son válidas'
        });
      }
    }
  }

  // Sanitizar datos
  req.body.nombre = sanitizedNombre;
  req.body.apellido = req.body.apellido ? sanitizeString(req.body.apellido, 100) : null;
  req.body.email = email ? email.trim().toLowerCase() : null;
  req.body.telefono = telefono ? sanitizeString(telefono, 20) : null;
  req.body.edad = edad ? parseInt(edad) : null;
  req.body.altura = req.body.altura ? sanitizeString(req.body.altura, 20) : null;
  req.body.medidas = req.body.medidas ? sanitizeString(req.body.medidas, 50) : null;
  req.body.ciudad = req.body.ciudad ? sanitizeString(req.body.ciudad, 100) : null;
  req.body.descripcion = req.body.descripcion ? sanitizeString(req.body.descripcion, 2000) : null;
  
  next();
}

/**
 * Middleware para validar datos de perfil modelo (edición por el propio modelo).
 * Solo permite: nombre, apellido, email, telefono, edad, altura, medidas, ciudad, descripcion, foto (URL).
 */
function validatePerfilModelo(req, res, next) {
  const { nombre, apellido, email, telefono, edad, altura, medidas, ciudad, descripcion, foto } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ success: false, message: 'El nombre es requerido' });
  }

  const sanitizedNombre = sanitizeString(nombre, 100);
  if (!sanitizedNombre) {
    return res.status(400).json({ success: false, message: 'El nombre no es válido' });
  }

  if (email && !validateEmail(email)) {
    return res.status(400).json({ success: false, message: 'El formato del email no es válido' });
  }

  if (telefono && !validatePhone(telefono)) {
    return res.status(400).json({ success: false, message: 'El formato del teléfono no es válido' });
  }

  if (edad !== undefined && edad !== null && !validateAge(edad)) {
    return res.status(400).json({
      success: false,
      message: 'La edad debe ser un número entre 0 y 150'
    });
  }

  if (foto && !validateURL(foto)) {
    return res.status(400).json({ success: false, message: 'La URL de la foto no es válida' });
  }

  req.body.nombre = sanitizedNombre;
  req.body.apellido = apellido ? sanitizeString(apellido, 100) : null;
  req.body.email = email ? email.trim().toLowerCase() : null;
  req.body.telefono = telefono ? sanitizeString(telefono, 20) : null;
  req.body.edad = edad != null ? parseInt(edad, 10) : null;
  req.body.altura = altura ? sanitizeString(altura, 20) : null;
  req.body.medidas = medidas ? sanitizeString(medidas, 50) : null;
  req.body.ciudad = ciudad ? sanitizeString(ciudad, 100) : null;
  req.body.descripcion = descripcion ? sanitizeString(descripcion, 2000) : null;
  req.body.foto = foto ? sanitizeString(foto, 1000) : null;

  next();
}

/**
 * Middleware para validar login
 */
function validateLogin(req, res, next) {
  const { username, password } = req.body;
  
  if (!username || !username.trim()) {
    return res.status(400).json({
      success: false,
      message: 'El usuario es requerido'
    });
  }
  
  if (!password || !password.trim()) {
    return res.status(400).json({
      success: false,
      message: 'La contraseña es requerida'
    });
  }
  
  // Sanitizar
  req.body.username = username.trim();
  req.body.password = password;
  
  next();
}

module.exports = {
  validateContacto,
  validateSorteo,
  validateModelo,
  validatePerfilModelo,
  validateLogin,
  sanitizeString,
  validateEmail,
  validatePhone,
  validateURL,
  validateAge
};
