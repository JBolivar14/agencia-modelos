# Agencia Modelos - Portal Web

Aplicación web completa para gestionar y mostrar un catálogo de modelos profesionales. Incluye panel de administración, galería pública, páginas de detalle y sistema de contacto mediante QR.

## 🚀 Características

### Público
- **Home**: Galería de modelos activas con diseño moderno
- **Páginas de Detalle**: Información completa de cada modelo
- **Formulario de Contacto**: Sistema para que futuras modelos compartan sus datos
- **QR Code**: Generación de códigos QR para compartir el formulario de contacto

### Administración
- **Panel Admin**: Gestión completa de modelos (crear, editar, eliminar)
- **Gestión de Contactos**: Ver todos los contactos recibidos
- **Generación de QR**: Crear y compartir códigos QR en múltiples redes sociales
- **Autenticación**: Sistema de login seguro con sesiones

## 📦 Instalación

1. **Clonar o descargar el repositorio**

2. **Instalar dependencias:**
```bash
npm install
```

3. **Iniciar el servidor:**
```bash
npm start
```

4. **Acceder a la aplicación:**
   - Home: `http://localhost:3000`
   - Admin: `http://localhost:3000/admin`
   - Login: `http://localhost:3000/login`

## 🔐 Credenciales por Defecto

- **Usuario**: `admin`
- **Contraseña**: `admin123`

⚠️ **Importante**: Cambia la contraseña después del primer acceso en producción.

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Base de Datos**: SQLite3
- **Autenticación**: Express Session + bcrypt
- **QR Codes**: qrcode
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Estilos**: CSS personalizado con gradientes y animaciones

## 📝 Estructura del Proyecto

```
.
├── server.js              # Servidor Express principal
├── database.js            # Configuración y funciones de base de datos
├── package.json           # Dependencias del proyecto
├── agencia.db            # Base de datos SQLite (se crea automáticamente)
├── public/
│   ├── home.html         # Página principal con galería
│   ├── modelo-detalle.html # Página de detalle de modelo
│   ├── contacto.html     # Formulario de contacto
│   ├── login.html        # Página de login
│   ├── admin.html        # Panel de administración
│   ├── admin.js          # Lógica del panel admin
│   ├── utils.js          # Utilidades y sistema de notificaciones
│   └── styles.css        # Estilos globales
└── README.md
```

## 🎯 Funcionalidades Principales

### Gestión de Modelos
- Crear nuevos modelos con información completa
- Editar información existente
- Activar/desactivar modelos
- Ver estadísticas y datos de contacto

### Sistema de Contacto
- Formulario público para recibir datos
- Generación de QR para compartir
- Compartir en redes sociales (WhatsApp, Facebook, Twitter, X, Instagram, LinkedIn, Email, Telegram)
- Almacenamiento de contactos en base de datos

### Panel de Administración
- Gestión completa de modelos
- Visualización de contactos recibidos
- Generación y compartir de códigos QR
- Interfaz intuitiva con tabs

## 📱 Acceso desde Red Local

El servidor se inicia automáticamente escuchando en todas las interfaces de red:

1. El servidor mostrará tu IP local en la consola
2. Conecta tu dispositivo móvil a la misma red WiFi
3. Accede desde el navegador usando: `http://TU_IP:3000`

## 🌐 Despliegue

### Opción 1: Despliegue Local con ngrok (Recomendado para pruebas)

1. **Configurar ngrok:**
   - Ejecuta `configurar-ngrok.ps1` para configurar tu token
   - O sigue las instrucciones en `GUIA_NGROK_TOKEN.txt`

2. **Iniciar ngrok:**
   ```bash
   .\ejecutar-ngrok.ps1
   ```
   O manualmente:
   ```bash
   .\ngrok.exe http 3000
   ```

3. **Usar la URL de ngrok** que aparece en la consola

### Opción 2: Despliegue en Servidor

1. **Requisitos:**
   - Node.js instalado
   - Acceso SSH al servidor
   - Puerto 3000 (o el que configures) abierto

2. **Pasos:**
   ```bash
   # Subir archivos al servidor
   scp -r * usuario@servidor:/ruta/aplicacion/
   
   # En el servidor
   cd /ruta/aplicacion
   npm install
   npm start
   ```

3. **Usar PM2 para producción:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name agencia-modelos
   pm2 save
   pm2 startup
   ```

### Opción 3: Plataformas Cloud

#### Heroku
```bash
heroku create agencia-modelos
git push heroku main
```

#### Railway
1. Conecta tu repositorio
2. Railway detectará automáticamente Node.js
3. Configura el puerto: `PORT` variable de entorno

#### Render
1. Conecta tu repositorio
2. Selecciona Node.js
3. Build command: `npm install`
4. Start command: `npm start`

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Sesiones seguras con Express Session
- ✅ Validación de datos en servidor
- ✅ Protección contra XSS (escape de HTML)
- ✅ Validación de IDs y parámetros
- ⚠️ **Cambiar secret de sesión en producción**
- ⚠️ **Usar HTTPS en producción**

## 📊 Base de Datos

La aplicación usa SQLite3 con las siguientes tablas:

- **usuarios**: Administradores del sistema
- **modelos**: Información de las modelos
- **contactos**: Datos de contacto recibidos

La base de datos se crea automáticamente al iniciar el servidor.

## 🐛 Solución de Problemas

### El servidor no inicia
- Verifica que el puerto 3000 no esté en uso
- Revisa que todas las dependencias estén instaladas: `npm install`

### No puedo acceder desde otro dispositivo
- Verifica que estén en la misma red WiFi
- Abre el firewall (ejecuta `abrir-firewall.ps1`)
- O usa ngrok para acceso externo

### Error de base de datos
- Elimina `agencia.db` y reinicia el servidor
- Verifica permisos de escritura en el directorio

## 📞 Soporte

Para más información, consulta:
- `LEEME_PRIMERO.txt` - Guía inicial
- `GUIA_NGROK_TOKEN.txt` - Configuración de ngrok
- `SOLUCION_PROBLEMAS.md` - Soluciones comunes

## 📄 Licencia

ISC

---

**Desarrollado para Agencia Modelos** 👗✨
