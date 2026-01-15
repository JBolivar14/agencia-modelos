# 📱 Cómo Acceder desde tu Celular - Guía Rápida

## ✅ Tu servidor está corriendo

**URL para acceder desde tu celular:**
```
http://10.11.0.189:3000
```

## 🚀 Pasos Rápidos

### 1. Conecta tu celular a la misma WiFi
- Ve a Configuración → WiFi en tu celular
- Conéctate a la **misma red WiFi** que tu computadora

### 2. Abre el navegador en tu celular
- Chrome, Safari, Firefox, etc.

### 3. Escribe la URL
En la barra de direcciones, escribe exactamente:
```
http://10.11.0.189:3000
```

### 4. Presiona Enter
Deberías ver la página de modelos.

## 🔧 Si NO funciona

### Opción 1: Verificar la IP
La IP puede cambiar. Para ver la IP actual, ejecuta en PowerShell:
```powershell
ipconfig | findstr IPv4
```

### Opción 2: Probar desde la computadora
Abre en tu navegador de la PC:
```
http://localhost:3000
```
Si funciona aquí pero no en el celular, es problema de red/firewall.

### Opción 3: Usar ngrok (Funciona desde cualquier lugar)

1. **Descarga ngrok:**
   - Ve a: https://ngrok.com/download
   - Descarga para Windows
   - Extrae el archivo `ngrok.exe`

2. **Ejecuta ngrok:**
   - Abre PowerShell en la carpeta donde está `ngrok.exe`
   - Ejecuta: `.\ngrok.exe http 3000`
   - Copia la URL que aparece (ej: `https://abc123.ngrok-free.app`)

3. **Úsala desde tu celular:**
   - Abre esa URL en tu celular
   - Funciona desde cualquier red, incluso datos móviles

## 📋 URLs Disponibles

- **Página Principal:** `http://10.11.0.189:3000`
- **Formulario de Contacto:** `http://10.11.0.189:3000/contacto`
- **Login Admin:** `http://10.11.0.189:3000/login`
  - Usuario: `admin`
  - Contraseña: `admin123`

## ⚠️ Problemas Comunes

**"No se puede conectar"**
- Verifica que estés en la misma WiFi
- Verifica que el servidor esté corriendo
- Prueba reiniciar el servidor

**"Página en blanco"**
- Espera unos segundos
- Recarga la página
- Verifica la URL (debe empezar con `http://`)

**"Funciona en PC pero no en celular"**
- El firewall puede estar bloqueando
- Prueba desactivar temporalmente el firewall
- O usa ngrok (más fácil)

## 💡 Recomendación

Si tienes problemas, **usa ngrok**. Es la forma más fácil y funciona desde cualquier lugar, incluso si no estás en la misma red WiFi.

