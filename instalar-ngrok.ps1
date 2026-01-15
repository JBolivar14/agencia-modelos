# Script para descargar e instalar ngrok
Write-Host "Descargando ngrok..." -ForegroundColor Cyan

$ngrokUrl = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
$zipFile = "ngrok.zip"

try {
    # Descargar ngrok
    Write-Host "Descargando desde: $ngrokUrl" -ForegroundColor Yellow
    Invoke-WebRequest -Uri $ngrokUrl -OutFile $zipFile -UseBasicParsing
    
    Write-Host "Descarga completada" -ForegroundColor Green
    
    # Extraer el archivo
    Write-Host "Extrayendo archivo..." -ForegroundColor Cyan
    Expand-Archive -Path $zipFile -DestinationPath . -Force
    
    # Limpiar el archivo zip
    Remove-Item $zipFile -Force
    
    Write-Host ""
    Write-Host "ngrok instalado correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para usar ngrok, ejecuta:" -ForegroundColor Cyan
    Write-Host "  .\ngrok.exe http 3000" -ForegroundColor White
    Write-Host ""
    Write-Host "Copia la URL que aparece y usala desde tu celular" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternativa: Descarga ngrok manualmente desde:" -ForegroundColor Yellow
    Write-Host "  https://ngrok.com/download" -ForegroundColor Cyan
    Write-Host "  Luego extrae ngrok.exe en esta carpeta" -ForegroundColor Yellow
    Write-Host ""
}
