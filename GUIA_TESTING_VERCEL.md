# 🧪 Guía de Testing en Vercel

Esta guía te ayudará a probar tu aplicación directamente en Vercel, sin necesidad de ejecutarla localmente.

## 📋 Checklist Pre-Deploy

Antes de hacer el deploy, verifica:

- [ ] Variables de entorno configuradas en Vercel (ver `VARIABLES_ENTORNO_VERCEL.md`)
- [ ] Código pusheado a GitHub
- [ ] Base de datos Supabase configurada y tablas creadas
- [ ] Script de modelos de prueba listo (opcional)

---

## 🚀 Paso 1: Generar Modelos de Prueba

### Opción A: Desde tu máquina local (antes del deploy)

1. **Configura variables de entorno localmente** (solo para el script):
   ```bash
   # Crea un .env temporal o usa las variables directamente
   USE_SUPABASE=true
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   ```

2. **Ejecuta el script**:
   ```bash
   node scripts/generar-modelos-prueba.js
   ```

3. **Verifica en Supabase**:
   - Ve a tu proyecto en Supabase
   - Tabla Editor → `modelos`
   - Deberías ver 8 modelos de prueba creados

### Opción B: Desde Supabase Dashboard (SQL Editor)

**⚠️ IMPORTANTE**: Esta opción usa SQL puro, NO copies el código JavaScript.

1. Ve a **SQL Editor** en Supabase
2. Abre el archivo `scripts/insertar-modelos-prueba.sql` o copia su contenido
3. Ejecuta el SQL en el editor
4. Los modelos se crearán y verás los IDs retornados
5. Opcionalmente, puedes insertar fotos usando los IDs retornados

**Nota**: El archivo SQL está en `scripts/insertar-modelos-prueba.sql` - úsalo directamente en el SQL Editor de Supabase.

---

## 🧪 Paso 2: Hacer Deploy en Vercel

1. **Push a GitHub** (si aún no lo has hecho):
   ```bash
   git add .
   git commit -m "Mejoras en manejo de errores y script de modelos de prueba"
   git push origin main
   ```

2. **En Vercel Dashboard**:
   - Si el proyecto ya está conectado, Vercel detectará el push automáticamente
   - Si no, importa el repositorio desde GitHub
   - Verifica que las variables de entorno estén configuradas

3. **Espera el deploy**:
   - Vercel construirá la aplicación
   - Revisa los logs de build para asegurarte de que no hay errores

---

## ✅ Paso 3: Testing en Vercel

### 3.1 Testing de la Página Principal

1. **Abre la URL de Vercel** (ej: `https://tu-proyecto.vercel.app`)
2. **Verifica**:
   - ✅ La página carga sin errores
   - ✅ Se muestran los modelos de prueba
   - ✅ Las imágenes se cargan correctamente
   - ✅ No hay errores en la consola del navegador (F12)

### 3.2 Testing de Búsqueda y Filtros

1. **Búsqueda por nombre**:
   - Escribe "Sofia" en el buscador
   - ✅ Debe mostrar solo el modelo de Sofia

2. **Filtro por ciudad**:
   - Selecciona "Madrid" en el filtro de ciudad
   - ✅ Debe mostrar solo modelos de Madrid

3. **Filtro por edad**:
   - Selecciona "18-25 años"
   - ✅ Debe mostrar solo modelos en ese rango

4. **Ordenar**:
   - Prueba diferentes opciones de ordenamiento
   - ✅ Los modelos deben ordenarse correctamente

### 3.3 Testing de Página de Detalle

1. **Haz click en un modelo**:
   - ✅ Debe navegar a `/modelo/:id`
   - ✅ Debe mostrar toda la información del modelo
   - ✅ Las fotos deben cargarse

2. **Galería de fotos**:
   - Haz click en las miniaturas
   - ✅ Debe cambiar la foto principal
   - ✅ Haz click en la foto principal para abrir lightbox
   - ✅ Navega entre fotos en el lightbox
   - ✅ Cierra el lightbox

### 3.4 Testing de Formulario de Contacto

1. **Navega a `/contacto`**
2. **Completa el formulario**:
   - Nombre: "Test User"
   - Email: "test@example.com"
   - Teléfono: "+1 234 567 8900"
   - Empresa: "Test Company"
   - Mensaje: "Este es un mensaje de prueba"

3. **Envía el formulario**:
   - ✅ Debe mostrar mensaje de éxito
   - ✅ El formulario debe limpiarse
   - ✅ Verifica en Supabase que el contacto se guardó

### 3.5 Testing de Login y Admin

1. **Navega a `/login`**
2. **Intenta login con credenciales incorrectas**:
   - Usuario: "wrong"
   - Contraseña: "wrong"
   - ✅ Debe mostrar error apropiado

3. **Login con credenciales correctas**:
   - Usuario: `admin`
   - Contraseña: `admin123`
   - ✅ Debe redirigir a `/admin`
   - ✅ Debe mostrar el panel de administración

4. **Panel Admin - Tab QR**:
   - ✅ Debe mostrar botón para generar QR
   - ✅ Genera QR y verifica que se muestre
   - ✅ Copia la URL del QR
   - ✅ Verifica que la URL sea correcta

5. **Panel Admin - Tab Modelos**:
   - ✅ Debe mostrar lista de modelos
   - ✅ Prueba eliminar un modelo (si quieres)
   - ✅ Verifica que se actualice la lista

6. **Panel Admin - Tab Contactos**:
   - ✅ Debe mostrar lista de contactos
   - ✅ Debe incluir el contacto de prueba que creaste

### 3.6 Testing de Manejo de Errores

1. **Desconecta internet temporalmente**:
   - Intenta cargar la página
   - ✅ Debe mostrar mensaje de error apropiado

2. **Navega a un modelo inexistente**:
   - Ve a `/modelo/99999`
   - ✅ Debe mostrar error 404 o mensaje apropiado

3. **Intenta acceder a `/admin` sin login**:
   - ✅ Debe redirigir a `/login`

---

## 🔍 Verificación de Logs

### En Vercel Dashboard:

1. **Ve a tu proyecto** → **Deployments** → **Último deploy**
2. **Click en "Functions"** → **api/index.js**
3. **Revisa los logs**:
   - ✅ No debe haber errores críticos
   - ✅ Las requests deben aparecer en los logs

### En el Navegador:

1. **Abre DevTools** (F12)
2. **Tab Console**:
   - ✅ No debe haber errores en rojo
   - ✅ Solo warnings menores (si los hay)

3. **Tab Network**:
   - ✅ Las requests a `/api/*` deben responder con 200
   - ✅ Los archivos estáticos (JS, CSS) deben cargarse

---

## 🐛 Troubleshooting

### Problema: Página en blanco

**Solución**:
1. Revisa los logs de build en Vercel
2. Verifica que `dist/` se generó correctamente
3. Revisa la consola del navegador para errores JS
4. Verifica que las variables de entorno estén configuradas

### Problema: APIs no funcionan (Error 500)

**Solución**:
1. Verifica variables de entorno en Vercel:
   - `USE_SUPABASE=true`
   - `SUPABASE_URL` correcto
   - `SUPABASE_SERVICE_ROLE_KEY` correcto
2. Revisa logs de funciones serverless en Vercel
3. Verifica que las tablas existan en Supabase

### Problema: Login no funciona

**Solución**:
1. Verifica que `SESSION_SECRET` esté configurado
2. Verifica que el usuario admin exista en Supabase
3. Revisa logs de la función `/api/login`

### Problema: Modelos no se muestran

**Solución**:
1. Verifica que hay modelos en Supabase (tabla `modelos`)
2. Verifica que los modelos tengan `activa = true`
3. Revisa logs de `/api/modelos` en Vercel
4. Revisa la consola del navegador para errores

---

## 📝 Checklist de Testing Completo

- [ ] Página principal carga correctamente
- [ ] Modelos se muestran en la galería
- [ ] Búsqueda funciona
- [ ] Filtros funcionan (ciudad, edad)
- [ ] Ordenamiento funciona
- [ ] Página de detalle muestra información completa
- [ ] Galería de fotos funciona
- [ ] Lightbox funciona
- [ ] Formulario de contacto envía datos
- [ ] Login funciona con credenciales correctas
- [ ] Login muestra error con credenciales incorrectas
- [ ] Panel admin carga correctamente
- [ ] QR se genera correctamente
- [ ] Lista de modelos en admin funciona
- [ ] Lista de contactos en admin funciona
- [ ] Eliminar modelo funciona (si se prueba)
- [ ] Manejo de errores muestra mensajes apropiados
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en logs de Vercel

---

## 🎯 Próximos Pasos

Una vez que todo funcione correctamente:

1. **Personaliza los modelos de prueba** con datos reales
2. **Agrega más modelos** desde el panel admin (cuando esté implementado)
3. **Configura dominio personalizado** en Vercel (opcional)
4. **Revisa seguridad**: Cambia contraseña por defecto del admin
5. **Optimiza imágenes**: Usa imágenes optimizadas para producción

---

**¡Listo para testear!** 🚀

Si encuentras algún problema, revisa los logs en Vercel y la consola del navegador para más detalles.
