# 🚀 Instrucciones Rápidas: GitHub + Vercel

## ✅ Paso 1: Crear Repositorio en GitHub

1. Ve a https://github.com y inicia sesión
2. Click en **"+"** (arriba derecha) → **"New repository"**
3. Configura:
   - **Name**: `agencia-modelos`
   - **Description**: "Portal web para gestión de catálogo de modelos"
   - **Visibility**: Public o Private (tu elección)
   - ❌ **NO marques** "Add a README file"
   - ❌ **NO marques** "Add .gitignore"
4. Click **"Create repository"**

## ✅ Paso 2: Conectar y Subir Código

**Copia y pega estos comandos** (reemplaza `TU_USUARIO` con tu usuario de GitHub):

```bash
cd "c:\Users\jesus\OneDrive\Documentos\Agenciamodelos"

git remote add origin https://github.com/TU_USUARIO/agencia-modelos.git

git branch -M main

git push -u origin main
```

**Si te pide autenticación:**
- Usa un **Personal Access Token** de GitHub
- O configura SSH keys

## ✅ Paso 3: Deploy en Vercel

1. Ve a https://vercel.com
2. Click **"Sign Up"** → **"Continue with GitHub"**
3. Autoriza Vercel
4. Click **"Add New..."** → **"Project"**
5. Busca `agencia-modelos` → Click **"Import"**

### Configuración en Vercel:

**Framework Preset**: "Other"

**Environment Variables** (IMPORTANTE):
- Click en **"Environment Variables"**
- Agrega:
  - **Name**: `SESSION_SECRET`
  - **Value**: `tu-secret-super-seguro-aqui` (usa un string largo y aleatorio)
  - **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **"Add"**
- Agrega otra:
  - **Name**: `NODE_ENV`
  - **Value**: `production`
  - **Environments**: ✅ Production

6. Click **"Deploy"**
7. Espera 2-3 minutos
8. ¡Listo! Tu app estará en `https://agencia-modelos.vercel.app`

## ⚠️ Nota Importante sobre SQLite

SQLite puede tener problemas en Vercel (serverless). Si tienes errores de base de datos:
- Considera migrar a **Vercel Postgres** o **PlanetScale** para producción
- Para pruebas, puede funcionar, pero los datos pueden no persistir

## 🎯 Verificar que Funciona

1. Visita la URL de Vercel
2. Verifica:
   - ✅ Página principal carga
   - ✅ Puedes ver modelos
   - ✅ Login funciona (`/login`)
   - ✅ Panel admin funciona

## 🔄 Actualizaciones Futuras

Cada vez que hagas `git push origin main`, Vercel automáticamente hará un nuevo deploy.

---

**¿Problemas?** Revisa `GUIA_DEPLOY.md` para más detalles.
