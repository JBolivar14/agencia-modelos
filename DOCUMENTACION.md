# 📘 Documentación — Agencia Modelos Argentinas

Documento de referencia con todo lo relativo a la aplicación: funcionalidades, rutas, API, base de datos, tests, configuración y estado actual.

---

## 1. Descripción general

**Agencia Modelos Argentinas** es un portal web para gestionar y mostrar un catálogo de modelos profesionales. Incluye:

- **Galería pública** de modelos con búsqueda y filtros.
- **Formularios de contacto** (completo y simplificado para sorteos) enlazados por QR.
- **Panel de administración** (modelos, contactos, usuarios, auditoría, generación de QR).
- **Rol modelo**: perfiles vinculados a usuarios que pueden ver y editar su propia ficha.
- **Autenticación** por sesión (Express + JWT en cookie) con roles **admin** y **modelo**.

### Versión y nombre del paquete

- **package.json**: `qr-contact-app` v2.0.0.
- **Entrada principal**: `server.js` (local) / `api/index.js` (Vercel serverless).

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18, Vite 7, React Router DOM 6 |
| **Backend** | Node.js, Express 4 |
| **Base de datos** | SQLite3 (local) o **Supabase** (producción/Vercel) |
| **Auth** | express-session, bcrypt, JWT (cookie `adminToken`) |
| **QR** | `qrcode` |
| **Email** | nodemailer (confirmaciones, reset contraseña) |
| **Tests** | Jest, Supertest |

---

## 3. Estructura del proyecto

```
.
├── api/
│   └── index.js              # Punto de entrada Vercel (serverless) — réplica de rutas API
├── middleware/
│   └── validation.js         # validateContacto, validateSorteo, validateModelo, validatePerfilModelo, validateLogin
├── public/                   # HTML estático legacy (admin, contacto, etc.) + favicon, styles
├── scripts/
│   ├── generar-modelos-prueba.js
│   └── insertar-modelos-prueba.sql
├── src/
│   ├── components/           # Layout, ModalPerfilModelo, ProtectedRoute
│   ├── pages/                # Home, ModeloDetalle, Contacto, Sorteo, Login, Admin, etc.
│   ├── utils/                # csrf, toast
│   ├── App.jsx               # Rutas React
│   ├── main.jsx
│   └── index.css
├── tests/
│   ├── database.test.js
│   ├── server.test.js
│   └── utils.test.js
├── database.js               # SQLite
├── database-supabase.js      # Supabase
├── email.js                  # sendEmail, getEmailConfig
├── server.js                 # Express + API + SPA
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## 4. Rutas frontend (React SPA)

Todas bajo `Layout` (header, nav, footer). Rutas protegidas usan `ProtectedRoute` (requiere sesión).

| Ruta | Componente | Acceso | Descripción |
|------|------------|--------|-------------|
| `/` | `Home` | Público | Galería de modelos, búsqueda, filtros |
| `/modelo/:id` | `ModeloDetalle` | Público | Detalle de modelo, galería, lightbox |
| `/contacto` | `Contacto` | Público | Formulario contacto (nombre, email, teléfono, empresa, mensaje) |
| `/sorteo` | `Sorteo` | Público | Formulario simplificado (nombre, email, teléfono) para sorteos |
| `/confirmar` | `ConfirmarEmail` | Público | Confirmación de email (usuario o contacto) vía `?type=...&token=...` |
| `/reset-password` | `ResetPassword` | Público | Cambio de contraseña con token |
| `/login` | `Login` | Público | Login, registro modelo, olvidé contraseña |
| `/admin` | `Admin` | Protegido (auth) | Panel: Modelos, Contactos, Usuarios, Auditoría, QR Contacto, QR Sorteo |
| `/admin/modelos/nuevo` | `FormularioModelo` | Protegido | Crear modelo |
| `/admin/modelos/:id` | `FormularioModelo` | Protegido | Editar modelo |

**Nav / Footer**: Inicio, Contacto, Sorteo. Si **modelo**: Perfil (modal), Cerrar sesión. Si no: enlace a Admin o Login.

---

## 5. API REST

Base: `/api`. Autenticación vía cookie `adminToken` (JWT) o sesión. CSRF en mutaciones: header `X-CSRF-Token` + cookie `csrfToken`.

### Públicas (sin auth)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/modelos` | Lista de modelos activos (con fotos) |
| `GET` | `/api/modelos/:id` | Detalle de un modelo; 404 si inactivo |
| `POST` | `/api/contacto` | Crear contacto (validateContacto). Rate limit. |
| `POST` | `/api/sorteo` | Crear inscripción sorteo (validateSorteo). Rate limit. |
| `GET` | `/api/contacto/confirm` | Confirmar email de contacto (`?token=...`) |
| `POST` | `/api/usuarios/register` | Registro usuario modelo (nombre, email, contraseña) |
| `GET` | `/api/usuarios/confirm` | Confirmar email usuario (`?type=usuario&token=...`) |
| `POST` | `/api/usuarios/password/forgot` | Solicitar reset contraseña |
| `POST` | `/api/usuarios/password/reset` | Resetear contraseña con token |
| `POST` | `/api/login` | Login (username o email + password) |
| `GET` | `/api/session` | Estado de sesión (`authenticated`, `user`) |
| `GET` | `/api/logout` | Cerrar sesión y redirigir |

### Solo modelo (requireAnyAuth + requireModelo)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/csrf` | Obtener token CSRF (cualquier autenticado) |
| `GET` | `/api/perfil-modelo` | Obtener perfil del modelo logueado |
| `PATCH` | `/api/perfil-modelo` | Actualizar perfil (validatePerfilModelo, CSRF) |

### Solo admin (requireAuth)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/admin/csrf` | CSRF para admin |
| `GET` | `/api/admin/usuarios` | Listar usuarios admin |
| `POST` | `/api/admin/usuarios` | Crear usuario admin (requireCsrf) |
| `GET` | `/api/admin/modelos` | Listar modelos (filtros, paginación) |
| `GET` | `/api/admin/modelos/:id` | Detalle modelo (admin) |
| `POST` | `/api/admin/modelos` | Crear modelo (validateModelo, CSRF) |
| `PUT` | `/api/admin/modelos/:id` | Actualizar modelo (validateModelo, CSRF) |
| `DELETE` | `/api/admin/modelos/:id` | Borrar modelo (hard delete, CSRF) |
| `POST` | `/api/admin/modelos/bulk` | Acciones masivas (activar/desactivar/eliminar) |
| `POST` | `/api/admin/storage/modelo-fotos/signed-urls` | URLs firmadas Supabase para subir fotos |
| `GET` | `/api/admin/contactos` | Listar contactos (filtros: q, from, to, **origen** contacto\|sorteo, paginación) |
| `GET` | `/api/admin/audit` | Logs de auditoría |
| `POST` | `/api/admin/generar-qr` | Generar QR formulario contacto (CSRF) |
| `POST` | `/api/admin/generar-qr-sorteo` | Generar QR formulario sorteo (CSRF) |

### Rate limits

- Login, registro, forgot/reset password, contacto, sorteo: limitados por IP.

---

## 6. Base de datos

### Tablas (SQLite / Supabase)

| Tabla | Uso |
|-------|-----|
| **usuarios** | Admins y usuarios modelo. `rol` (`admin` \| `modelo`), `modelo_id` para link con `modelos`. |
| **modelos** | Perfiles: nombre, apellido, email, teléfono, edad, altura, medidas, ciudad, foto, descripcion, activa. |
| **modelo_fotos** | Fotos por modelo (`modelo_id`, `url`, `orden`). |
| **contactos** | Datos de formulario contacto/sorteo: nombre, email, teléfono, empresa, mensaje, confirmación, **origen** (`contacto` \| `sorteo`). |
| **audit_logs** | Eventos (login, errores, etc.). |

### Uso

- **Local**: SQLite (`agencia.db`). Creada/al migrada al arrancar.
- **Producción (Vercel)**: Supabase. `USE_SUPABASE=true` y credenciales en env.
- Migraciones SQL: `supabase-migration.sql`, `supabase-usuarios-*.sql`, `supabase-contactos-origen.sql` (origen contacto/sorteo), etc.
- Migrar datos: `node migrate-to-supabase.js`.

---

## 7. Funcionalidades por rol

### Público

- **Home**: Ver modelos activas, buscar, filtrar (ciudad, etc.), reset filtros. Links a detalle y contacto.
- **Modelo detalle**: Galería, lightbox (Escape, flechas, Tab trap), zoom.
- **Contacto**: Formulario + promo sorteo (cena Puerto Madero, 28/01, Vuelo Producciones, Menjunje TV). Placeholder teléfono +54 11 1234-5678. Honeypot antispam. Confirmación por email si SMTP configurado.
- **Sorteo**: Formulario reducido (nombre, email, teléfono). Misma promo. Autocompletado desde contactos (Contact Picker) en móvil cuando se entra por QR.
- **Login**: Pestañas Login / Registro / Olvidé contraseña. Registro modelo exige confirmación de email.
- **Confirmar / Reset password**: Páginas para tokens de confirmación y reset.

### Admin

- **Modelos**: Listado con búsqueda, filtros (ciudad, activa), orden, paginación. Crear, editar, activar/desactivar, eliminar. Subida de fotos vía Supabase signed URLs.
- **Contactos**: Listado con búsqueda, filtros (fechas, **origen**: Contacto / Sorteo) y columna Origen en la tabla.
- **Usuarios**: Solo admins. Crear usuario admin (username, email, nombre, contraseña).
- **Auditoría**: Consulta de logs.
- **QR Contacto**: Generar QR → `/contacto`. Copiar URL, compartir (nativo, WhatsApp), **descargar PNG**.
- **QR Sorteo**: Generar QR → `/sorteo`. Mismas acciones.

### Modelo

- **Perfil (modal)**: Ver datos propios, enlace “Ver mi perfil público”. Editar: nombre, apellido, email, teléfono, edad, altura, medidas, ciudad, descripción, foto (URL). Guardar vía `PATCH /api/perfil-modelo`.
- **Cerrar sesión**: En nav.

Requisito: usuario con `rol=modelo` y `modelo_id` asociado. Si no, se muestra error en perfil.

---

## 8. Autenticación y sesión

- **Login**: `POST /api/login`. Devuelve `user` (id, username, nombre, email, rol). Si `rol === 'modelo'`, se guarda `modeloId` en sesión y en JWT.
- **Sesión**: Cookie `adminToken` (JWT) y/o `express-session`. `GET /api/session` devuelve `{ authenticated, user }`; en modelo, `user.modeloId`.
- **Protección**: `requireAuth` (solo admin), `requireAnyAuth` (cualquier autenticado), `requireModelo` (solo modelo con `modeloId`).
- **CSRF**: `GET /api/csrf` o `GET /api/admin/csrf`. En mutaciones, `X-CSRF-Token` + cookie.

---

## 9. Formularios y validación

- **Contacto** (`validateContacto`): nombre, email obligatorios; teléfono, empresa, mensaje opcionales. Honeypot `website`.
- **Sorteo** (`validateSorteo`): nombre, email obligatorios; teléfono opcional. Sin empresa ni mensaje. Honeypot.
- **Modelo** (`validateModelo`): nombre obligatorio; email, teléfono, edad, foto, fotos (array) validados.
- **Perfil modelo** (`validatePerfilModelo`): mismos campos editables, sin `activa` ni galería.

Validación y sanitización en `middleware/validation.js`.

---

## 10. QR y compartir

- **Generar**: `POST /api/admin/generar-qr` y `POST /api/admin/generar-qr-sorteo`. Respuesta: `{ success, url, qr }` (`qr` = data URL PNG).
- **Descargar**: Botón “Descargar QR” en tabs QR Contacto y QR Sorteo. Descarga PNG desde el data URL.
- **Compartir**: Web Share API (cuando existe), WhatsApp con imagen o enlace, “Compartir (Nativo)”. En HTML estático admin también “Compartir en Redes” (Facebook, Twitter, etc.).

---

## 11. Email

- **Config**: `SMTP_*`, `EMAIL_FROM` (ver `VARIABLES_ENTORNO_VERCEL.md` y `email.js`).
- **Uso**: Confirmación de usuario modelo, confirmación de contacto, “olvidé contraseña” y “reset password”. Si SMTP no está configurado, se omiten envíos y se loguea.

---

## 12. Tests

### Comandos

```bash
npm test           # Jest con coverage
npm run test:watch # Modo watch
```

### Cobertura

- **database.test.js**: SQLite de prueba. Modelos CRUD, contactos, usuarios (crear, verify password, getByUsername).
- **server.test.js**: Supertest contra Express. Mock de DB. Pruebas de:
  - `GET /`, `GET /contacto`, `GET /login`
  - `GET /api/modelos`, `GET /api/modelos/:id`
  - `POST /api/contacto` (válido, sin nombre, sin email, email inválido)
  - `POST /api/login` (válido, sin credenciales, usuario incorrecto, contraseña incorrecta)
  - `GET /api/session`
  - Rutas admin: requieren auth, crear modelo con auth, validación nombre, `POST /api/admin/generar-qr`.
- **utils.test.js**: `escapeHtml`, `validateEmail`, `validatePhone`, `formatDate` (mocks locales).

Coverage actual: ~26% statements (server + database). Los tests pasan de forma estable.

---

## 13. Variables de entorno

Resumen. Detalle en `VARIABLES_ENTORNO_VERCEL.md`.

| Variable | Uso |
|----------|-----|
| `NODE_ENV` | `development` \| `production` \| `test` |
| `PORT` | Puerto del servidor (default 3000) |
| `SESSION_SECRET` | JWT y sesión; **obligatoria en producción** |
| `USE_SUPABASE` | `true` para Supabase |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase (obligatorios si `USE_SUPABASE=true`) |
| `SUPABASE_ANON_KEY`, `SUPABASE_STORAGE_BUCKET` | Opcionales |
| `APP_BASE_URL` | Base URL para links en emails |
| `SMTP_*`, `EMAIL_FROM` | Email (confirmaciones, reset) |

---

## 14. Scripts npm

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `vite` | Frontend en desarrollo (proxy /api → backend) |
| `build` | `vite build` | Build React → `dist/` |
| `preview` | `vite preview` | Preview del build |
| `server` | `node server.js` | Backend solo |
| `start` | `node server.js` | Idem (producción) |
| `seed` | `node seed-data.js` | Seed inicial |
| `add-fotos` | `node agregar-fotos-modelos.js` | Agregar fotos a modelos |
| `generar-modelos` | `node scripts/generar-modelos-prueba.js` | Modelos de prueba |
| `test` | `jest --coverage` | Tests |
| `test:watch` | `jest --watch` | Tests en watch |

### Desarrollo típico

```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

Frontend: `http://localhost:5173`. API: `http://localhost:3000`. Vite hace proxy de `/api` al backend.

### Producción local

```bash
npm run build
npm start
```

App en `http://localhost:3000`. SPA servida desde `dist/`.

---

## 15. Despliegue (Vercel)

- **Build**: `npm run build`, output `dist`.
- **API**: `api/index.js` como serverless. Rewrite `/api/*` → `/api/index.js`.
- **SPA**: Rewrite `/((?!api/).*)` → `/index.html`.
- **DB**: Supabase. SQLite no en Vercel.
- Variables: ver `VARIABLES_ENTORNO_VERCEL.md` y sección 13.

---

## 16. Seguridad

- Contraseñas con bcrypt.
- Sesión + JWT en cookie `adminToken` (httpOnly, secure en prod, sameSite lax).
- CSRF en mutaciones admin y perfil modelo.
- Validación y sanitización en middleware.
- Rate limits en login, registro, contacto, sorteo, reset password.
- Helmet, CORS según configuración.
- IDs y parámetros validados; no se exponen datos sensibles innecesarios.

---

## 17. Accesibilidad y SEO

- **Focus**: Modales (Perfil, lightbox) cerrrables con Escape, focus trap con Tab.
- **Labels**: Inputs con `label` / `aria-label`; filtros admin con `visually-hidden` donde aplica.
- **Focus visible**: `*:focus-visible` con outline; en formularios `:focus:not(:focus-visible)` para no duplicar.
- **Meta**: `index.html` con descripción, Open Graph y Twitter Card para compartir.

---

## 18. Estado actual y chequeo

### Build y tests (última verificación)

- `npm run build`: ✅ OK.
- `npm test`: ✅ 43 tests pasando (utils, database, server).
- Coverage: ~26% (server + database). Cobertura suficiente para regresiones básicas.

### Funcionalidades verificadas

- Rutas React y API alineadas con esta doc.
- Admin: modelos, contactos, usuarios, auditoría, QR contacto, QR sorteo, descarga QR.
- Perfil modelo: GET/PATCH perfil, modal con vista y edición.
- Formularios contacto y sorteo, validaciones, honeypot.
- Login, registro modelo, confirmación email, reset password.
- Layout: nav (Inicio, Contacto, Sorteo), footer, Perfil/Cerrar sesión para modelo.

### Archivos de referencia

- **README.md**: Instalación, uso, despliegue.
- **GUIA_FLUJO_REGISTRO.md**: Flujos contacto / modelos / admin.
- **GUIA_TESTING_VERCEL.md**: Cómo probar en Vercel.
- **VARIABLES_ENTORNO_VERCEL.md**: Variables y ejemplos.

---

## 19. Credenciales por defecto

- **Admin**: usuario `admin`, contraseña `admin123`.  
- Cambiar en producción.

---

*Documentación generada para el proyecto Agencia Modelos Argentinas. Actualizar este archivo cuando se agreguen rutas, APIs o funcionalidades relevantes.*
