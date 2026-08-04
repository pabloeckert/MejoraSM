# scripts/guardar-clave.ps1
# Guarda la clave que tengas copiada en el portapapeles en secrets/keys.local.txt
# (append, nunca sobreescribe), con fecha y un nombre corto para identificarla.
# secrets/ esta en .gitignore -- nunca se sube al repo.
#
# Uso: doble click en el acceso directo "Guardar clave" del escritorio,
# o "powershell -File scripts\guardar-clave.ps1" a mano.

$repoRoot = Split-Path -Parent $PSScriptRoot
$secretsDir = Join-Path $repoRoot "secrets"
$destFile = Join-Path $secretsDir "keys.local.txt"

if (-not (Test-Path $secretsDir)) {
    New-Item -ItemType Directory -Path $secretsDir | Out-Null
}

$clave = Get-Clipboard -ErrorAction SilentlyContinue

if ([string]::IsNullOrWhiteSpace($clave)) {
    Write-Host ""
    Write-Host "El portapapeles esta vacio (o no es texto). Copia la clave y volve a correr este script." -ForegroundColor Red
    Read-Host "Presiona Enter para cerrar"
    exit 1
}

Write-Host ""
Write-Host "Clave detectada en el portapapeles (se guarda completa, esto es solo una vista previa):"
$preview = if ($clave.Length -gt 20) { $clave.Substring(0, 20) + "..." } else { $clave }
Write-Host "  $preview" -ForegroundColor Yellow
Write-Host ""

$nombre = Read-Host "Nombre corto para esta clave (ej: anthropic-orchestrator)"
if ([string]::IsNullOrWhiteSpace($nombre)) {
    $nombre = "sin-nombre"
}

$fecha = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$linea = "[$fecha] ${nombre}: $clave"

Add-Content -Path $destFile -Value $linea -Encoding UTF8

Write-Host ""
Write-Host "Guardado en $destFile" -ForegroundColor Green
Write-Host "Nombre: $nombre"
Write-Host ""
Read-Host "Presiona Enter para cerrar"
