# 🚀 Guía de Deploy - GitHub + Vercel

Esta guía te ayudará a subir el proyecto a GitHub y hacer deploy en Vercel.

---

## 📋 Paso 1: Preparar el Proyecto Local

### 1.1 Inicializar Git (si no está inicializado)

```bash
git init
git add .
git commit -m "Initial commit: Agencia Modelos v2.0"
```

### 1.2 Verificar que estos archivos estén en .gitignore

- `node_modules/`
- `agencia.db`
- `.env`
- `coverage/`
- `.vercel`

---

## 📦 Paso 2: Crear Repositorio en GitHub

### 2.1 Crear el repositorio en GitHub

1. Ve a [GitHub](https://github.com) e inicia sesión
2. Click en el botón **"+"** (arriba derecha) → **"New repository"**
3. Configura el repositorio:
   - **Repository name**: `agencia-modelos` (o el nombre que prefieras)
   - **Description**: "Portal web para gestión de catálogo de modelos profesionales"
   - **Visibility**: 
     - ✅ **Public** (si quieres que sea público)
     - ✅ **Private** (si quieres que sea privado)
   - ❌ **NO** marques "Add a README file" (ya tenemos uno)
   - ❌ **NO** marques "Add .gitignore" (ya tenemos uno)
   - ❌ **NO** marques "Choose a license"
4. Click en **"Create repository"**

### 2.2 Conectar el repositorio local con GitHub

GitHub te mostrará instrucciones. Ejecuta estos comandos en tu terminal:

```bash
# Asegúrate de estar en la carpeta del proyecto
cd "c:\Users\jesus\OneDrive\Documentos\Agenciamodelos"

# Agrega el remoto (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/agencia-modelos.git

# Cambia el nombre de la rama principal a 'main' (si es necesario)
git branch -M main

# Sube el código
git push -u origin main
```

**Nota**: Si GitHub te pide autenticación, puedes usar:
- **Personal Access Token** (recomendado)
- O configurar SSH keys

---

## 🌐 Paso 3: Deploy en Vercel

### 3.1 Crear cuenta en Vercel

1. Ve a [Vercel](https://vercel.com)
2. Click en **"Sign Up"**
3. Elige **"Continue with GitHub"** (recomendado para conectar fácilmente)
4. Autoriza Vercel para acceder a tus repositorios

### 3.2 Importar Proyecto desde GitHub

1. En el dashboard de Vercel, click en **"Add New..."** → **"Project"**
2. Busca tu repositorio `agencia-modelos` en la lista
3. Click en **"Import"**

### 3.3 Configurar el Proyecto

Vercel detectará automáticamente que es un proyecto Node.js. Configura:

#### Framework Preset
- **Framework Preset**: "Other" o "Node.js"

#### Build Settings
- **Root Directory**: `./` (dejar por defecto)
- **Build Command**: (dejar vacío - no necesitamos build)
- **Output Directory**: (dejar vacío)
- **Install Command**: `npm install` (por defecto)

#### Environment Variables
Click en **"Environment Variables"** y agrega:

| Variable | Valor | Entornos |
|----------|-------|----------|
| `SESSION_SECRET` | `tu-secret-super-seguro-aqui` | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

**Para generar un SESSION_SECRET seguro:**
```bash
# En Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O usa cualquier string largo y aleatorio.

### 3.4 Deploy

1. Click en **"Deploy"**
2. Espera a que Vercel construya y despliegue tu proyecto (2-3 minutos)
3. Una vez completado, verás una URL como: `https://agencia-modelos.vercel.app`

---

## ⚙️ Paso 4: Configuración Post-Deploy

### 4.1 Verificar que el Deploy Funcionó

1. Visita la URL que Vercel te proporcionó
2. Verifica que:
   - ✅ La página principal carga
   - ✅ Puedes ver los modelos
   - ✅ Puedes hacer login en `/login`
   - ✅ El panel admin funciona

### 4.2 Problemas Comunes y Soluciones

#### Problema: "Cannot find module"
**Solución**: Verifica que todas las dependencias estén en `package.json`

#### Problema: "Database locked" o errores de SQLite
**Solución**: SQLite puede tener problemas en Vercel (serverless). Considera:
- Usar una base de datos externa (PostgreSQL, MySQL) para producción
- O usar Vercel KV/Postgres

#### Problema: Sesiones no funcionan
**Solución**: 
- Verifica que `SESSION_SECRET` esté configurado en Vercel
- Verifica que las cookies funcionen (Vercel usa HTTPS por defecto)

### 4.3 Actualizar Variables de Entorno

Si necesitas cambiar variables de entorno:
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Edita o agrega variables
4. Vuelve a hacer deploy (o espera el redeploy automático)

---

## 🔄 Paso 5: Deploy Automático (Opcional)

Vercel automáticamente:
- ✅ Hace deploy cada vez que haces `git push` a `main`
- ✅ Crea previews para cada Pull Request
- ✅ Te notifica por email de los deploys

### 5.1 Workflow Recomendado

```bash
# 1. Hacer cambios localmente
# 2. Probar localmente
npm start

# 3. Commit y push
git add .
git commit -m "Descripción de los cambios"
git push origin main

# 4. Vercel automáticamente hace deploy
```

---

## 📝 Notas Importantes

### Base de Datos SQLite en Vercel

⚠️ **IMPORTANTE**: SQLite puede tener limitaciones en Vercel porque:
- Vercel es serverless (sin disco persistente)
- Cada función puede tener su propia instancia de la BD
- Los datos pueden no persistir entre deploys

**Soluciones recomendadas para producción**:
1. **Vercel Postgres** (recomendado)
2. **PlanetScale** (MySQL serverless)
3. **Supabase** (PostgreSQL)
4. **MongoDB Atlas** (MongoDB)

### Variables de Entorno

Nunca subas archivos `.env` a GitHub. Usa las variables de entorno de Vercel.

### Dominio Personalizado

Puedes agregar un dominio personalizado en:
- Vercel Dashboard → Settings → Domains

---

## 🎯 Checklist de Deploy

- [ ] Repositorio creado en GitHub
- [ ] Código subido a GitHub
- [ ] Proyecto importado en Vercel
- [ ] Variables de entorno configuradas (`SESSION_SECRET`, `NODE_ENV`)
- [ ] Deploy completado exitosamente
- [ ] Página principal carga correctamente
- [ ] Login funciona
- [ ] Panel admin funciona
- [ ] Base de datos funciona (o migrar a BD externa si es necesario)

---

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en Vercel Dashboard → Deployments → [tu deploy] → Logs
2. Revisa la consola del navegador (F12)
3. Verifica que todas las variables de entorno estén configuradas

---

**¡Listo!** Tu aplicación debería estar funcionando en Vercel. 🎉
