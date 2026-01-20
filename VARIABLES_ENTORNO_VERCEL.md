# 🔑 Variables de Entorno para Vercel

## 📋 Lista Completa de Variables

### 🔴 OBLIGATORIAS (para que funcione)

Estas variables **DEBES** configurarlas en Vercel:

```env
USE_SUPABASE=true
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
SESSION_SECRET=genera-uno-seguro-aqui
```

### 🟡 RECOMENDADAS (muy importantes)

Estas son altamente recomendadas:

```env
SUPABASE_ANON_KEY=tu-anon-key
NODE_ENV=production
```

### 🟢 OPCIONALES (tienen valores por defecto)

Estas son opcionales pero puedes configurarlas:

```env
PORT=3000
SUPABASE_STORAGE_BUCKET=modelos
```

---

## 📝 Cómo Configurarlas en Vercel

### Paso 1: Ir a Vercel Dashboard

1. Ve a [vercel.com](https://vercel.com)
2. Selecciona tu proyecto
3. Ve a **Settings** (⚙️)
4. Click en **Environment Variables**

### Paso 2: Agregar Variables

Para cada variable:

1. Click en **"Add New"**
2. Ingresa el **Name** (ej: `USE_SUPABASE`)
3. Ingresa el **Value** (ej: `true`)
4. Selecciona los **Environments**:
   - ✅ Production
   - ✅ Preview (opcional)
   - ✅ Development (opcional)
5. Click en **"Save"**

### Paso 3: Lista Completa con Valores

| Variable | Valor Ejemplo | ¿Obligatoria? | Descripción |
|----------|---------------|---------------|-------------|
| `USE_SUPABASE` | `true` | ✅ SÍ | Activa Supabase |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | ✅ SÍ | URL de tu proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` | ✅ SÍ | Service Role Key (secreta) |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | 🟡 Recomendada | Anon Key (pública) |
| `SESSION_SECRET` | `tu-secret-aleatorio` | 🟡 Recomendada | Secret para sesiones |
| `NODE_ENV` | `production` | 🟡 Recomendada | Entorno de producción |
| `PORT` | `3000` | 🟢 Opcional | Puerto (Vercel lo asigna automáticamente) |
| `APP_BASE_URL` | `https://modelosargentinas.com` | 🟡 Recomendada | Base URL para links (confirmación email) |
| `EMAIL_FROM` | `Agencia <no-reply@tu-dominio.com>` | 🟡 Recomendada | Remitente del email (confirmaciones) |
| `SMTP_HOST` | `smtp.tu-proveedor.com` | 🟡 Recomendada | Host SMTP (necesario para confirmaciones) |
| `SMTP_PORT` | `587` | 🟡 Recomendada | Puerto SMTP |
| `SMTP_USER` | `usuario-smtp` | 🟡 Recomendada | Usuario SMTP |
| `SMTP_PASS` | `password-smtp` | 🟡 Recomendada | Password SMTP |
| `SMTP_SECURE` | `false` | 🟡 Recomendada | `true` si usas 465 (SSL) |

---

## 🔍 Dónde Obtener los Valores

### SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY

1. Ve a [supabase.com](https://supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings** (⚙️) → **API**
4. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (haz click en 👁️ para verla)
   - **anon key** → `SUPABASE_ANON_KEY`

### SESSION_SECRET

Genera uno seguro:

```bash
# Opción 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opción 2: Online
# Ve a: https://randomkeygen.com/
# Usa "CodeIgniter Encryption Keys"
```

---

## ✅ Configuración Mínima Recomendada

**Copia y pega esto en Vercel** (reemplaza con tus valores):

```
USE_SUPABASE=true
SUPABASE_URL=https://tu-proyecto-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1LXByb3llY3RvLWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxMjM0NTYsImV4cCI6MTk2MDY5OTQ1Nn0.ejemplo...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1LXByb3llY3RvLWlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NTEyMzQ1NiwiZXhwIjoxOTYwNjk5NDU2fQ.ejemplo...
SESSION_SECRET=genera-uno-aleatorio-y-seguro-aqui
NODE_ENV=production
```

---

## ⚠️ Importante

1. **SUPABASE_SERVICE_ROLE_KEY es SECRETA** - No la compartas
2. **SESSION_SECRET debe ser único y seguro** - No uses el valor por defecto
3. **Después de agregar variables, haz Redeploy** para que se apliquen
4. **Verifica que todas las variables estén en "Production"**

---

## 🔄 Después de Configurar

1. **Haz Redeploy** en Vercel:
   - Ve a **Deployments**
   - Click en los 3 puntos (⋯) del último deploy
   - Click en **"Redeploy"**

2. **Verifica**:
   - Revisa los logs de build
   - Revisa los logs de funciones serverless
   - Prueba la aplicación

---

**¡Con estas variables configuradas, tu app debería funcionar en Vercel!** 🚀
