# 🚀 Despliegue en Vercel - Configuración Completa

## ✅ Cambios Realizados para Vercel

### 1. Estructura Creada
- ✅ `api/index.js` - Servidor Express como función serverless
- ✅ `vercel.json` - Configuración optimizada para Vercel
- ✅ `memorystore` - Instalado para sesiones en serverless

### 2. Configuración de Vercel

**vercel.json** está configurado para:
- `/api/*` → Función serverless (`api/index.js`)
- Todo lo demás → React app (`dist/index.html`)
- Assets estáticos con cache optimizado

## 📋 Pasos para Desplegar

### 1. Configurar Variables de Entorno en Vercel

En Vercel Dashboard > Settings > Environment Variables, agrega:

```
USE_SUPABASE=true
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
SESSION_SECRET=genera-uno-seguro-aqui
NODE_ENV=production
```

**⚠️ IMPORTANTE**: Debes usar Supabase en Vercel (SQLite no funciona en serverless)

### 2. Hacer Commit y Push

```bash
git add .
git commit -m "Configuración para Vercel: API en /api, React optimizado"
git push origin main
```

### 3. Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Si ya tienes el proyecto conectado, Vercel detectará los cambios automáticamente
3. Si no, importa el repositorio y configura:
   - **Framework**: Vite (auto-detectado)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Haz click en **Deploy**

### 4. Verificar el Deploy

Después del deploy:
- ✅ La app React debería cargar
- ✅ Las APIs deberían funcionar (`/api/modelos`, etc.)
- ✅ El login debería funcionar
- ✅ Las rutas de React deberían funcionar

## 🔍 Verificación Post-Deploy

1. **Abre la URL de Vercel** (ej: `https://tu-proyecto.vercel.app`)
2. **Abre la consola del navegador** (F12)
3. **Verifica**:
   - No hay errores en Console
   - Los archivos JS/CSS se cargan (Network tab)
   - Las APIs responden correctamente

## 🐛 Troubleshooting

### Página en blanco
- **Causa**: Los archivos estáticos no se están sirviendo
- **Solución**: Verifica que `dist/` se generó correctamente en el build
- **Verifica**: Revisa los logs de build en Vercel Dashboard

### Error 500 en APIs
- **Causa**: Variables de entorno no configuradas o Supabase no configurado
- **Solución**: 
  - Verifica todas las variables de entorno en Vercel
  - Asegúrate de usar Supabase (no SQLite)
  - Revisa los logs de funciones serverless

### Error: "Cannot find module"
- **Causa**: Dependencias faltantes
- **Solución**: Verifica que todas las dependencias estén en `dependencies` (no `devDependencies`)

### Las rutas de React no funcionan
- **Causa**: Configuración de rewrites incorrecta
- **Solución**: Verifica que `vercel.json` tenga las rewrites correctas

## 📝 Notas Importantes

1. **SQLite NO funciona en Vercel** - Debes usar Supabase
2. **Sesiones**: Usamos MemoryStore que es compatible con serverless
3. **CORS**: Configurado para funcionar con el dominio de Vercel
4. **Assets**: Se sirven desde `dist/` con cache optimizado

---

**¡Listo para desplegar!** 🚀
