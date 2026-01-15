# 🔧 Solución de Problemas - Acceso desde Celular

## ✅ Verificación Inicial

**Tu servidor está corriendo:**
- IP Local: `10.11.0.189`
- Puerto: `3000`
- URL: `http://10.11.0.189:3000`

## 🔍 Pasos para Diagnosticar

### 1. Verificar que el celular esté en la misma red WiFi

**En tu celular:**
- Ve a Configuración → WiFi
- Verifica que estés conectado a la **misma red WiFi** que tu computadora
- Anota la IP de tu celular (si puedes verla)

### 2. Probar desde la computadora primero

Abre en tu navegador de la computadora:
```
http://localhost:3000
```

Si funciona aquí, el problema es de red, no del servidor.

### 3. Verificar el firewall de Windows

El firewall puede estar bloqueando el puerto 3000. Para permitirlo:

**Opción A: Desde PowerShell (como Administrador)**
```powershell
New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

**Opción B: Desde el Panel de Control**
1. Abre "Firewall de Windows Defender"
2. Click en "Configuración avanzada"
3. Click en "Reglas de entrada" → "Nueva regla"
4. Selecciona "Puerto" → Siguiente
5. TCP → Puerto específico: `3000` → Siguiente
6. "Permitir la conexión" → Siguiente
7. Marca todas las casillas → Siguiente
8. Nombre: "Node.js Server" → Finalizar

### 4. Probar desde el celular

**URLs para probar:**
- Principal: `http://10.11.0.189:3000`
- Formulario: `http://10.11.0.189:3000/contacto`
- Login: `http://10.11.0.189:3000/login`

**Si no funciona, prueba:**
- `http://192.168.1.X:3000` (si tu red usa ese rango)
- Verifica que no haya un proxy en tu celular
- Prueba con datos móviles desactivados (solo WiFi)

### 5. Verificar la IP de nuevo

La IP puede cambiar si te desconectas. Para verificar:
```powershell
ipconfig | findstr IPv4
```

### 6. Alternativa: Usar ngrok (túnel público)

Si nada funciona, puedes usar ngrok para crear un túnel público:

1. Descarga ngrok: https://ngrok.com/download
2. Ejecuta: `ngrok http 3000`
3. Copia la URL que te da (ej: `https://abc123.ngrok.io`)
4. Úsala desde cualquier dispositivo

## 🚨 Problemas Comunes

### "No se puede conectar"
- ✅ Verifica que el servidor esté corriendo
- ✅ Verifica que estés en la misma red WiFi
- ✅ Verifica el firewall

### "Página no carga"
- ✅ Verifica la IP (puede haber cambiado)
- ✅ Prueba desde la computadora primero
- ✅ Reinicia el servidor

### "Funciona en la PC pero no en el celular"
- ✅ Problema de red/firewall
- ✅ El celular puede estar en otra red
- ✅ Prueba desactivar el firewall temporalmente

## 📱 Prueba Rápida

1. En tu celular, abre el navegador
2. Escribe exactamente: `http://10.11.0.189:3000`
3. Presiona Enter
4. Si no carga, sigue los pasos de arriba

## 💡 Tip

Si tienes problemas persistentes, usa ngrok para crear un túnel público que funcione desde cualquier lugar.

