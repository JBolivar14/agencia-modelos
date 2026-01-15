# 🚀 Despliegue en Vercel - Guía Rápida

## ✅ Pre-requisitos Completados

- [x] Proyecto migrado a React + Vite
- [x] Supabase configurado y listo
- [x] Build funciona correctamente
- [x] `vercel.json` configurado
- [x] Documentación consolidada

## 📋 Pasos para Desplegar

### 1. Preparar Supabase (Recomendado)

1. Crea proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta `supabase-migration.sql`
3. Ve a **Settings > API** y copia:
   - Project URL
   - anon key
   - service_role key

### 2. Desplegar en Vercel

1. **Ir a Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Inicia sesión con GitHub

2. **Importar Proyecto:**
   - Click en **"Add New Project"**
   - Selecciona tu repositorio `agencia-modelos`
   - Framework: **Vite** (auto-detectado)

3. **Configurar Variables de Entorno:**
   En Settings > Environment Variables, agrega:

   ```
   USE_SUPABASE=true
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu-anon-key
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
   SESSION_SECRET=genera-uno-seguro-aqui
   NODE_ENV=production
   ```

4. **Desplegar:**
   - Click en **"Deploy"**
   - Espera que termine (2-3 minutos)
   - Tu app estará en `https://tu-proyecto.vercel.app`

## ✅ Verificación

Después del deploy, verifica:

- [ ] La app carga en la URL de Vercel
- [ ] Las modelos se muestran en Home
- [ ] El login funciona (`/login`)
- [ ] El panel admin funciona (`/admin`)
- [ ] El formulario de contacto funciona (`/contacto`)

## 🐛 Troubleshooting

### Build falla
- Verifica que `npm run build` funciona localmente
- Revisa los logs en Vercel Dashboard

### Error 500 en APIs
- Verifica todas las variables de entorno
- Asegúrate de usar Supabase (no SQLite)
- Revisa logs de funciones serverless

### No carga React
- Verifica que `dist/` se generó
- Revisa rutas en `vercel.json`

---

**¡Listo para desplegar!** 🎉
