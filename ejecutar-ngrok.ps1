# Script para ejecutar ngrok
Write-Host "Iniciando ngrok..." -ForegroundColor Cyan
Write-Host "El servidor debe estar corriendo en el puerto 3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona Ctrl+C para detener ngrok" -ForegroundColor Yellow
Write-Host ""

if (Test-Path "ngrok.exe") {
    .\ngrok.exe http 3000
} else {
    Write-Host "Error: ngrok.exe no encontrado" -ForegroundColor Red
    Write-Host "Ejecuta primero: instalar-ngrok.ps1" -ForegroundColor Yellow
}

