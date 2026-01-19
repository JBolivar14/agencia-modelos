# 👗 Agencia Modelos Argentinas - Portal Web

Aplicación web completa desarrollada con **React + Vite** y **Node.js + Express** para gestionar y mostrar un catálogo de modelos profesionales. Incluye panel de administración, galería pública, páginas de detalle y sistema de contacto mediante QR.

## 📚 Documentación Adicional

- **`VARIABLES_ENTORNO_VERCEL.md`** - Guía completa de variables de entorno para Vercel
- **`GUIA_TESTING_VERCEL.md`** - Guía paso a paso para testear la aplicación en Vercel
- **`scripts/generar-modelos-prueba.js`** - Script Node.js para generar modelos de prueba (ejecutar desde terminal)
- **`scripts/insertar-modelos-prueba.sql`** - Script SQL para insertar modelos directamente en Supabase SQL Editor

## 🚀 Características

### Público
- **Home**: Galería de modelos activas con búsqueda, filtros y diseño moderno
- **Páginas de Detalle**: Información completa de cada modelo con galería de fotos y lightbox
- **Formulario de Contacto**: Sistema para que futuras modelos compartan sus datos
- **QR Code**: Generación de códigos QR para compartir el formulario de contacto

### Administración
- **Panel Admin**: Gestión completa de modelos (crear, editar, eliminar)
- **Gestión de Contactos**: Ver todos los contactos recibidos
- **Generación de QR**: Crear y compartir códigos QR en múltiples redes sociales
- **Autenticación**: Sistema de login seguro con sesiones

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** - Framework UI
- **Vite** - Build tool y dev server
- **React Router DOM** - Navegación
- **CSS3** - Estilos personalizados con gradientes y animaciones

### Backend
- **Node.js + Express** - Servidor API
- **Base de Datos**: SQLite3 (local) o **Supabase** (nube)
- **Autenticación**: Express Session + bcrypt
- **QR Codes**: qrcode

## 📦 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/agencia-modelos.git
cd agencia-modelos
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

#### Para desarrollo local (SQLite):
```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=tu-session-secret-aqui
```

#### Para producción (Supabase):
```env
USE_SUPABASE=true
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
PORT=3000
NODE_ENV=production
SESSION_SECRET=tu-session-secret-seguro-aqui
```

**Nota**: Para obtener las credenciales de Supabase, ve a tu proyecto en [supabase.com](https://supabase.com) → Settings → API

### 4. Configurar Base de Datos

#### Opción A: SQLite (Desarrollo)
- La base de datos se crea automáticamente al iniciar
- No requiere configuración adicional

#### Opción B: Supabase (Producción)
1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase-migration.sql`
3. Configura las variables de entorno en `.env`

### 5. Iniciar la aplicación

#### Desarrollo (2 terminales):
```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend React
npm run dev
```

Accede a: `http://localhost:5173`

#### Producción local:
```bash
npm run build
npm start
```

Accede a: `http://localhost:3000`

## 🔐 Credenciales por Defecto

- **Usuario**: `admin`
- **Contraseña**: `admin123`

⚠️ **Importante**: Cambia la contraseña después del primer acceso en producción.

## 📁 Estructura del Proyecto

```
.
├── src/                    # Código React
│   ├── components/        # Componentes reutilizables
│   ├── pages/            # Páginas principales
│   ├── utils/            # Utilidades
│   ├── App.jsx           # Router principal
│   └── main.jsx          # Entry point
├── public/                # Archivos estáticos (legacy)
├── server.js             # Servidor Express + API
├── database.js           # SQLite database
├── database-supabase.js  # Supabase database
├── vercel.json           # Configuración Vercel
├── vite.config.js        # Configuración Vite
└── package.json
```

## 🌐 Despliegue en Vercel

### 1. Preparación

1. **Asegúrate de que el código esté en GitHub**
2. **Configura Supabase** (recomendado para producción):
   - Crea proyecto en Supabase
   - Ejecuta `supabase-migration.sql`
   - Obtén las credenciales

### 2. Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Haz clic en **"Add New Project"**
3. Importa tu repositorio de GitHub
4. Configura el proyecto:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Variables de Entorno en Vercel

En la configuración del proyecto en Vercel, agrega estas variables:

```
USE_SUPABASE=true
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
SESSION_SECRET=tu-session-secret-seguro
NODE_ENV=production
```

### 4. Desplegar

- Haz clic en **"Deploy"**
- Vercel construirá y desplegará automáticamente
- Tu app estará disponible en `https://tu-proyecto.vercel.app`

## 🔄 Cambiar entre SQLite y Supabase

El proyecto soporta ambas bases de datos automáticamente:

- **SQLite**: Si `USE_SUPABASE=false` o no está definido
- **Supabase**: Si `USE_SUPABASE=true` y las credenciales están configuradas

## 📝 Scripts Disponibles

```bash
npm run dev              # Desarrollo React (Vite)
npm run build            # Build para producción
npm run preview          # Preview del build
npm run server           # Solo backend
npm run generar-modelos  # Generar modelos de prueba en Supabase
npm start        # Producción (backend + React)
npm test         # Ejecutar tests
```

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Sesiones seguras con Express Session
- ✅ Validación de datos en servidor
- ✅ Protección contra XSS (escape de HTML)
- ✅ Validación de IDs y parámetros
- ✅ Variables de entorno para secretos
- ⚠️ **Cambiar SESSION_SECRET en producción**
- ⚠️ **Usar HTTPS en producción**

## 🐛 Solución de Problemas

### El servidor no inicia
- Verifica que el puerto 3000 no esté en uso
- Revisa que todas las dependencias estén instaladas: `npm install`
- Verifica las variables de entorno en `.env`

### No puedo ver las modelos
- Asegúrate de que el backend esté corriendo en puerto 3000
- Verifica que haya modelos en la base de datos
- Revisa la consola del navegador por errores

### Error de base de datos (Supabase)
- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de que las tablas estén creadas en Supabase
- Revisa las políticas RLS en Supabase

### Error de base de datos (SQLite)
- Elimina `agencia.db` y reinicia el servidor
- Verifica permisos de escritura en el directorio

### Problemas en Vercel
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de usar Supabase (SQLite no funciona en Vercel)
- Revisa los logs de build en Vercel Dashboard

## 📊 Base de Datos

### Tablas
- **usuarios**: Administradores del sistema
- **modelos**: Información de las modelos
- **modelo_fotos**: Múltiples fotos por modelo
- **contactos**: Datos de contacto recibidos

### Migración de Datos

Si tienes datos en SQLite y quieres migrarlos a Supabase:

```bash
node migrate-to-supabase.js
```

## 🧪 Testing

```bash
npm test              # Ejecutar todos los tests
npm run test:watch    # Modo watch
```

## 📄 Licencia

ISC

---

**Desarrollado para Agencia Modelos Argentinas** 👗✨
