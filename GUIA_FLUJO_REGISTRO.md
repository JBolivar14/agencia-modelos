## Flujo de registro (Modelos / Contactos / Admin)

### 1) Registro de “personas” (contacto / futuras modelos)

- **Dónde**: página pública `"/contacto"` (también desde el QR que genera Admin).
- **Qué se pide**: nombre + **email obligatorio** (teléfono/empresa/mensaje opcionales).
- **Qué API usa**: `POST /api/contacto`.
- **Dónde queda guardado**: tabla `contactos`.
- **Dónde se ve**: panel Admin → tab **Contactos**.

### 2) Registro de modelos que se muestran en el sitio

- **Quién lo hace**: un usuario admin (no es público).
- **Dónde**: panel Admin → tab **Modelos** → “Agregar modelo” (`/admin/modelos/nuevo`).
- **Qué API usa**: `POST /api/admin/modelos` (y `PUT /api/admin/modelos/:id` al editar).
- **Dónde queda guardado**:
  - datos del perfil: tabla `modelos`
  - fotos: tabla `modelo_fotos`
  - archivos de imagen: Supabase Storage (bucket configurado)
- **Dónde se ve**: Home / listados (`GET /api/modelos` devuelve solo modelos **activos**).

### 3) Usuarios admin

- **Quién lo crea**: un admin existente.
- **Dónde**: panel Admin → tab **Usuarios**.
- **Qué se pide**: username + **email obligatorio** + nombre + contraseña.
- **Login**: se puede iniciar sesión con **username o email** + contraseña.

