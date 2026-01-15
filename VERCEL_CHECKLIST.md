# ✅ Checklist para Despliegue en Vercel

## 📋 Pre-requisitos

- [x] Código en GitHub
- [x] Supabase configurado (recomendado)
- [x] Build funciona localmente (`npm run build`)
- [x] Variables de entorno listas

## 🔧 Configuración en Vercel

### 1. Importar Proyecto
- [ ] Ir a [vercel.com](https://vercel.com)
- [ ] "Add New Project"
- [ ] Importar repositorio de GitHub
- [ ] Framework: **Vite** (o dejar en auto)

### 2. Configurar Build
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `dist`
- [ ] Install Command: `npm install`

### 3. Variables de Entorno
Agregar en Vercel Dashboard > Settings > Environment Variables:

```
USE_SUPABASE=true
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
SESSION_SECRET=tu-session-secret-seguro
NODE_ENV=production
```

### 4. Desplegar
- [ ] Click en "Deploy"
- [ ] Esperar que termine el build
- [ ] Verificar que la app funcione

## ✅ Verificación Post-Deploy

- [ ] La app carga correctamente
- [ ] Las APIs funcionan (`/api/modelos`)
- [ ] El login funciona
- [ ] Las modelos se muestran
- [ ] El formulario de contacto funciona

## 🐛 Problemas Comunes

### Build falla
- Verificar que `npm run build` funciona localmente
- Revisar logs de build en Vercel

### Error 500 en APIs
- Verificar variables de entorno
- Asegurarse de usar Supabase (no SQLite)
- Revisar logs de funciones serverless

### No carga la app React
- Verificar que `dist/` se generó correctamente
- Revisar rutas en `vercel.json`

---

**¡Listo para desplegar!** 🚀
