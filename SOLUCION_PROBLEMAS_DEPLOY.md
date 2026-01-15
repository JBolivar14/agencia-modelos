# 🔧 Solución de Problemas - Deploy en Vercel

## Problemas Comunes y Soluciones

### ❌ Problema 1: "Cannot find module" o errores de dependencias

**Síntomas:**
- Error al hacer build en Vercel
- "Module not found" en los logs

**Solución:**
1. Verifica que `package.json` tenga todas las dependencias
2. Asegúrate de que `node_modules` esté en `.gitignore`
3. Vercel instala automáticamente las dependencias, pero verifica los logs

### ❌ Problema 2: SQLite "Database locked" o errores de base de datos

**Síntomas:**
- Errores al acceder a la base de datos
- "SQLITE_BUSY" o "SQLITE_LOCKED"
- La base de datos no persiste entre deploys

**Causa:** SQLite no funciona bien en entornos serverless como Vercel porque:
- Cada función puede tener su propia instancia
- No hay disco persistente
- Los datos se pierden entre deploys

**Soluciones:**

#### Opción A: Usar Vercel Postgres (Recomendado para producción)
1. En Vercel Dashboard → Storage → Create Database
2. Elige "Postgres"
3. Obtén la connection string
4. Modifica `database.js` para usar PostgreSQL en lugar de SQLite

#### Opción B: Usar PlanetScale (MySQL serverless)
1. Crea cuenta en https://planetscale.com
2. Crea una base de datos
3. Obtén connection string
4. Modifica `database.js` para usar MySQL

#### Opción C: Para pruebas rápidas (temporal)
- SQLite puede funcionar para pruebas, pero los datos no persistirán
- Cada deploy creará una nueva base de datos vacía

### ❌ Problema 3: "404 Not Found" en rutas

**Síntomas:**
- Las páginas HTML cargan pero las rutas API dan 404
- Los archivos estáticos no cargan

**Solución:**
1. Verifica que `vercel.json` esté correcto
2. Asegúrate de que las rutas estén definidas antes de `express.static()`
3. Verifica que el path en `server.js` sea correcto

### ❌ Problema 4: Sesiones no funcionan

**Síntomas:**
- No puedes mantener sesión iniciada
- Te redirige a login constantemente

**Solución:**
1. Verifica que `SESSION_SECRET` esté configurado en Vercel
   - Vercel Dashboard → Settings → Environment Variables
   - Agrega `SESSION_SECRET` con un valor seguro
2. Verifica que `NODE_ENV=production` esté configurado
3. En producción, las cookies `secure: true` requieren HTTPS (Vercel lo tiene por defecto)

### ❌ Problema 5: Error al subir a GitHub

**Síntomas:**
- `git push` falla
- Error de autenticación

**Solución:**
1. **Usar Personal Access Token:**
   - GitHub → Settings → Developer settings → Personal access tokens
   - Genera un token con permisos `repo`
   - Usa el token como contraseña al hacer `git push`

2. **O configurar SSH:**
   ```bash
   ssh-keygen -t ed25519 -C "tu-email@example.com"
   # Copia la clave pública a GitHub → Settings → SSH keys
   ```

### ❌ Problema 6: Build falla en Vercel

**Síntomas:**
- El deploy falla durante el build
- Errores en los logs de Vercel

**Solución:**
1. Revisa los logs en Vercel Dashboard → Deployments → [tu deploy] → Logs
2. Verifica que no haya errores de sintaxis
3. Asegúrate de que todas las dependencias estén en `package.json`
4. Verifica que `vercel.json` tenga la sintaxis correcta

### ❌ Problema 7: Archivos estáticos no cargan

**Síntomas:**
- CSS/JS no se cargan
- Imágenes no aparecen

**Solución:**
1. Verifica que `express.static('public')` esté después de todas las rutas
2. Verifica que los paths en HTML sean relativos (ej: `styles.css` no `/styles.css`)
3. Verifica que los archivos estén en la carpeta `public/`

### ❌ Problema 8: Puerto incorrecto

**Síntomas:**
- La app no inicia
- Error "Port already in use"

**Solución:**
- Vercel asigna el puerto automáticamente con `process.env.PORT`
- No hardcodees el puerto, usa `process.env.PORT || 3000`
- ✅ Ya está configurado correctamente en `server.js`

## 🔍 Cómo Diagnosticar Problemas

### 1. Revisar Logs de Vercel
1. Ve a Vercel Dashboard
2. Click en tu proyecto
3. Click en "Deployments"
4. Click en el último deploy
5. Revisa la pestaña "Logs"

### 2. Revisar Logs de Build
1. En el mismo lugar, revisa "Build Logs"
2. Busca errores en rojo
3. Copia los mensajes de error

### 3. Probar Localmente
```bash
# Simular entorno de producción
NODE_ENV=production npm start
```

### 4. Verificar Variables de Entorno
1. Vercel Dashboard → Settings → Environment Variables
2. Verifica que estén configuradas:
   - `SESSION_SECRET`
   - `NODE_ENV` (opcional, se puede poner en vercel.json)

## 📋 Checklist de Verificación

Antes de hacer deploy, verifica:

- [ ] `package.json` tiene todas las dependencias
- [ ] `vercel.json` está en la raíz del proyecto
- [ ] `.gitignore` incluye `node_modules/`, `.env`, `agencia.db`
- [ ] `server.js` exporta el app correctamente
- [ ] Variables de entorno configuradas en Vercel
- [ ] No hay errores de sintaxis en el código
- [ ] Los paths de archivos estáticos son correctos

## 🆘 Si Nada Funciona

1. **Revisa los logs completos** en Vercel
2. **Prueba localmente** con `NODE_ENV=production`
3. **Simplifica**: Intenta hacer deploy de una versión mínima primero
4. **Consulta la documentación de Vercel**: https://vercel.com/docs

## 💡 Recomendación para Producción

Para una aplicación en producción, considera:

1. **Migrar de SQLite a PostgreSQL/MySQL**
   - Vercel Postgres (integrado)
   - PlanetScale (MySQL serverless)
   - Supabase (PostgreSQL)

2. **Usar variables de entorno** para toda la configuración
3. **Implementar logging** estructurado
4. **Configurar backups** de la base de datos
5. **Monitoreo** de errores (Sentry, etc.)

---

**¿Tienes un error específico?** Comparte el mensaje de error completo y te ayudo a resolverlo.
