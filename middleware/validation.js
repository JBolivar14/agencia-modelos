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
  const { nombre, email, telefono, empresa, mensaje } = req.body;
  
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
  
  next();
}

/**
 * Middleware para validar datos de modelo
 */
function validateModelo(req, res, next) {
  const { nombre, email, telefono, edad, foto } = req.body;
  
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
  validateModelo,
  validateLogin,
  sanitizeString,
  validateEmail,
  validatePhone,
  validateURL,
  validateAge
};
