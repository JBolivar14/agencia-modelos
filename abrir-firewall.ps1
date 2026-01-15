# Script para abrir el puerto 3000 en el firewall de Windows
# Ejecuta este script como Administrador

Write-Host "🔓 Abriendo puerto 3000 en el firewall..." -ForegroundColor Yellow

try {
    # Verificar si la regla ya existe
    $existingRule = Get-NetFirewallRule -DisplayName "Node.js Server Port 3000" -ErrorAction SilentlyContinue
    
    if ($existingRule) {
        Write-Host "✅ La regla del firewall ya existe" -ForegroundColor Green
    } else {
        # Crear nueva regla
        New-NetFirewallRule -DisplayName "Node.js Server Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
        Write-Host "✅ Puerto 3000 abierto en el firewall" -ForegroundColor Green
    }
    
    Write-Host "`n📱 Ahora puedes acceder desde tu celular usando:" -ForegroundColor Cyan
    Write-Host "   http://10.11.0.189:3000" -ForegroundColor White
    Write-Host "`n💡 Asegúrate de que tu celular esté en la misma red WiFi`n" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "`n💡 Asegúrate de ejecutar este script como Administrador" -ForegroundColor Yellow
    Write-Host "   Click derecho en PowerShell → Ejecutar como administrador" -ForegroundColor Yellow
}

