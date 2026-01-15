# Script para configurar ngrok con authtoken
Write-Host "Configuracion de ngrok" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para usar ngrok necesitas un token gratuito:" -ForegroundColor Yellow
Write-Host ""
Write-Host "PASO 1: Obtener el token" -ForegroundColor Green
Write-Host "  1. Ve a: https://dashboard.ngrok.com/signup" -ForegroundColor White
Write-Host "  2. Crea una cuenta gratuita (o inicia sesion si ya tienes una)" -ForegroundColor White
Write-Host "  3. Ve a: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
Write-Host "  4. Copia tu authtoken" -ForegroundColor White
Write-Host ""
Write-Host "PASO 2: Configurar ngrok" -ForegroundColor Green
Write-Host "  Ejecuta este comando reemplazando TU_TOKEN con tu token:" -ForegroundColor White
Write-Host "  .\ngrok.exe config add-authtoken TU_TOKEN" -ForegroundColor Cyan
Write-Host ""
Write-Host "PASO 3: Usar ngrok" -ForegroundColor Green
Write-Host "  Una vez configurado, ejecuta:" -ForegroundColor White
Write-Host "  .\ngrok.exe http 3000" -ForegroundColor Cyan
Write-Host ""

$token = Read-Host "Si ya tienes tu token, pegalo aqui (o presiona Enter para saltar)"

if ($token -and $token.Trim() -ne "") {
    try {
        Write-Host ""
        Write-Host "Configurando ngrok..." -ForegroundColor Cyan
        & .\ngrok.exe config add-authtoken $token.Trim()
        Write-Host ""
        Write-Host "Configuracion completada!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Ahora puedes ejecutar: .\ngrok.exe http 3000" -ForegroundColor Cyan
    } catch {
        Write-Host ""
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host "Intenta ejecutar manualmente:" -ForegroundColor Yellow
        Write-Host "  .\ngrok.exe config add-authtoken TU_TOKEN" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "Para configurar mas tarde, ejecuta:" -ForegroundColor Yellow
    Write-Host "  .\ngrok.exe config add-authtoken TU_TOKEN" -ForegroundColor White
    Write-Host ""
    Write-Host "O ejecuta este script de nuevo cuando tengas tu token" -ForegroundColor Yellow
}


