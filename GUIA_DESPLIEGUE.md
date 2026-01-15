# 🚀 Guía de Despliegue - Agencia Modelos

## ✅ Checklist Pre-Despliegue

- [x] Todas las dependencias instaladas (`npm install`)
- [x] Base de datos configurada (se crea automáticamente)
- [x] Errores corregidos y validaciones implementadas
- [x] README actualizado

## 🧪 Probar Localmente

### 1. Iniciar el Servidor
```bash
npm start
```

### 2. Verificar Funcionalidades

#### Páginas Públicas
- [ ] **Home** (`http://localhost:3000`)
  - Verificar que se muestren las modelos
  - Probar clic en tarjetas para ir a detalles
  - Verificar diseño y fondo degradado

- [ ] **Página de Detalle** (`http://localhost:3000/modelo/1`)
  - Verificar que se cargue la información completa
  - Probar botón "Contactar"
  - Verificar diseño y formato

- [ ] **Formulario de Contacto** (`http://localhost:3000/contacto`)
  - Probar envío de formulario
  - Verificar validaciones
  - Confirmar que se guarde en base de datos

#### Panel de Administración
- [ ] **Login** (`http://localhost:3000/login`)
  - Usuario: `admin`
  - Contraseña: `admin123`
  - Verificar redirección al panel

- [ ] **Panel Admin** (`http://localhost:3000/admin`)
  - **Tab QR**: Generar QR y probar compartir
  - **Tab Modelos**: Crear, editar, eliminar modelos
  - **Tab Contactos**: Ver contactos recibidos

### 3. Probar desde Dispositivo Móvil

1. Obtener IP local (se muestra en consola al iniciar)
2. Conectar móvil a la misma WiFi
3. Acceder desde navegador móvil: `http://TU_IP:3000`
4. Probar todas las funcionalidades

## 🌐 Opciones de Despliegue

### Opción 1: ngrok (Rápido para Pruebas)

**Ventajas:**
- ✅ Acceso desde cualquier lugar
- ✅ HTTPS incluido
- ✅ Fácil de configurar

**Pasos:**
1. Configurar token (si no está configurado):
   ```powershell
   .\configurar-ngrok.ps1
   ```

2. Iniciar ngrok:
   ```powershell
   .\ejecutar-ngrok.ps1
   ```
   O manualmente:
   ```bash
   .\ngrok.exe http 3000
   ```

3. Copiar la URL HTTPS que aparece (ej: `https://abc123.ngrok-free.app`)

4. Compartir esta URL con las modelos

**Nota:** La URL gratuita de ngrok cambia cada vez que reinicias. Para URL fija, necesitas plan de pago.

---

### Opción 2: Servidor VPS (Producción)

**Requisitos:**
- Servidor con Node.js instalado
- Acceso SSH
- Puerto 3000 (o el configurado) abierto

**Pasos:**

1. **Subir archivos al servidor:**
   ```bash
   # Usando SCP
   scp -r * usuario@servidor:/ruta/aplicacion/
   
   # O usando Git
   git clone tu-repositorio
   ```

2. **En el servidor:**
   ```bash
   cd /ruta/aplicacion
   npm install
   ```

3. **Usar PM2 para mantener el servidor corriendo:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name agencia-modelos
   pm2 save
   pm2 startup  # Para iniciar automáticamente al reiniciar
   ```

4. **Configurar Nginx como proxy reverso (opcional pero recomendado):**
   ```nginx
   server {
       listen 80;
       server_name tu-dominio.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Configurar SSL con Let's Encrypt:**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d tu-dominio.com
   ```

---

### Opción 3: Plataformas Cloud

#### Heroku

1. **Instalar Heroku CLI:**
   ```bash
   # Descargar desde heroku.com
   ```

2. **Login:**
   ```bash
   heroku login
   ```

3. **Crear app:**
   ```bash
   heroku create agencia-modelos
   ```

4. **Desplegar:**
   ```bash
   git push heroku main
   ```

5. **Configurar base de datos:**
   - Heroku usa PostgreSQL por defecto
   - Necesitarás adaptar `database.js` para usar PostgreSQL
   - O usar un addon de SQLite

#### Railway

1. Conectar repositorio en railway.app
2. Railway detecta automáticamente Node.js
3. Configurar variable de entorno `PORT` (Railway la proporciona automáticamente)
4. Deploy automático

#### Render

1. Crear nuevo Web Service
2. Conectar repositorio
3. Configurar:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Deploy

---

## 🔒 Configuración de Seguridad para Producción

### 1. Cambiar Secret de Sesión

En `server.js`, línea 17:
```javascript
secret: process.env.SESSION_SECRET || 'tu-secret-super-seguro-aqui',
```

Y crear archivo `.env`:
```
SESSION_SECRET=tu-secret-super-seguro-y-aleatorio-aqui
```

### 2. Cambiar Contraseña de Admin

1. Login al panel admin
2. (Si implementas cambio de contraseña) o manualmente en la base de datos

### 3. Habilitar HTTPS

- **Con ngrok**: Automático
- **Con servidor propio**: Usar Let's Encrypt
- **En cloud**: Generalmente incluido

### 4. Variables de Entorno

Crear archivo `.env`:
```
PORT=3000
SESSION_SECRET=tu-secret-aqui
NODE_ENV=production
```

---

## 📊 Monitoreo

### Ver Logs

**Con PM2:**
```bash
pm2 logs agencia-modelos
```

**Sin PM2:**
```bash
# Los logs aparecen en la consola
```

### Verificar Estado

**Con PM2:**
```bash
pm2 status
pm2 monit
```

---

## 🔄 Actualizaciones

### Actualizar Código

1. Hacer cambios en el código
2. Si usas Git:
   ```bash
   git add .
   git commit -m "Descripción de cambios"
   git push
   ```
3. En el servidor:
   ```bash
   git pull
   pm2 restart agencia-modelos
   ```

---

## 🆘 Solución de Problemas

### El servidor no inicia
- Verificar que Node.js esté instalado: `node --version`
- Verificar que el puerto no esté en uso
- Revisar logs de errores

### No se guardan datos
- Verificar permisos de escritura en el directorio
- Verificar que la base de datos se creó correctamente

### Error 404 en rutas
- Verificar que `express.static` esté después de las rutas
- Verificar que los archivos estén en `public/`

### Problemas de CORS (si usas API externa)
- Agregar middleware CORS si es necesario

---

## ✅ Listo para Producción

Una vez completado el despliegue:

1. ✅ Probar todas las funcionalidades
2. ✅ Verificar que HTTPS funcione (si aplica)
3. ✅ Cambiar credenciales por defecto
4. ✅ Configurar backup de base de datos
5. ✅ Configurar monitoreo (opcional)

---

**¡Tu aplicación está lista para usar!** 🎉
