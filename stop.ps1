# Para dashboard, n8n e ngrok
# Uso: .\stop.ps1

$ErrorActionPreference = "Continue"
$Root = $PSScriptRoot
$DashboardDir = Join-Path $Root "WebApp\Metric-Dashboard-Farmacia"

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }

Write-Host "FarmaBot - parando ambiente local" -ForegroundColor Yellow

Write-Step "Parando dashboard + PostgreSQL"
if (Test-Path $DashboardDir) {
    Push-Location $DashboardDir
    docker compose stop
    Pop-Location
}

Write-Step "Parando n8n"
docker stop n8n 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   n8n parado"
} else {
    Write-Host "   n8n nao estava rodando"
}

Write-Step "Parando ngrok"
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "   ngrok encerrado (se estava ativo)"

Write-Host "`nAmbiente parado. Dados do n8n e do banco foram preservados." -ForegroundColor Green
Write-Host "Para zerar o banco: cd WebApp\Metric-Dashboard-Farmacia; docker compose down -v"
