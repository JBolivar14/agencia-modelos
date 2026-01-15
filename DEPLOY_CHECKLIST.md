# ✅ Checklist de Despliegue

## Antes de Desplegar

- [ ] **Código revisado y sin errores**
  - [ ] Sin errores de linting
  - [ ] Todas las funcionalidades probadas localmente
  - [ ] Validaciones implementadas

- [ ] **Dependencias**
  - [ ] `npm install` ejecutado
  - [ ] Todas las dependencias en `package.json`
  - [ ] `node_modules` en `.gitignore`

- [ ] **Base de Datos**
  - [ ] Base de datos se crea automáticamente
  - [ ] Usuario admin creado por defecto
  - [ ] Backup de datos importantes (si aplica)

- [ ] **Seguridad**
  - [ ] Secret de sesión cambiado (o usar variable de entorno)
  - [ ] Contraseña de admin cambiada
  - [ ] HTTPS configurado (para producción)

- [ ] **Archivos de Configuración**
  - [ ] `.env` en `.gitignore` (no subir credenciales)
  - [ ] `.gitignore` actualizado
  - [ ] README actualizado

## Probar Localmente

- [ ] Servidor inicia sin errores
- [ ] Home carga correctamente
- [ ] Páginas de detalle funcionan
- [ ] Formulario de contacto funciona
- [ ] Login funciona
- [ ] Panel admin funciona
  - [ ] Generar QR funciona
  - [ ] Crear modelo funciona
  - [ ] Editar modelo funciona
  - [ ] Eliminar modelo funciona
  - [ ] Ver contactos funciona
- [ ] Compartir en redes sociales funciona
- [ ] Copiar URL funciona

## Despliegue

- [ ] Elegir método de despliegue (ngrok/VPS/Cloud)
- [ ] Configurar según método elegido
- [ ] Verificar que la aplicación esté accesible
- [ ] Probar todas las funcionalidades en producción
- [ ] Configurar monitoreo (opcional)
- [ ] Configurar backups (opcional)

## Post-Despliegue

- [ ] Probar acceso desde diferentes dispositivos
- [ ] Verificar que HTTPS funcione (si aplica)
- [ ] Documentar URL de acceso
- [ ] Compartir credenciales de forma segura
- [ ] Configurar alertas (opcional)

---

**Estado Actual:** ✅ Listo para desplegar
