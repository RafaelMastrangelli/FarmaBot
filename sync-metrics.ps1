# Forca o n8n a reenviar metricas acumuladas para o dashboard
# Uso: .\sync-metrics.ps1 [telefone_opcional]

param(
    [string]$Phone = "5511999999999"
)

$Root = $PSScriptRoot
$PayloadFile = Join-Path $Root "test-payload-zapi.json"

if (-not (Test-Path $PayloadFile)) {
    throw "Arquivo nao encontrado: $PayloadFile"
}

$payload = Get-Content $PayloadFile -Raw | ConvertFrom-Json
$payload.phone = $Phone
$tempFile = Join-Path $env:TEMP "farmacia-sync-metrics.json"
$payload | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 $tempFile

Write-Host "Disparando webhook n8n (telefone: $Phone)..." -ForegroundColor Cyan
$result = curl.exe -s -w "`nHTTP:%{http_code}" -X POST "http://localhost:5678/webhook/whatsapp-farmacia" `
    -H "Content-Type: application/json" `
    --data-binary "@$tempFile"

Write-Host $result
Write-Host "`nVerifique o dashboard: http://localhost:5000" -ForegroundColor Green
Write-Host "Pedidos: http://localhost:5000 (aba Pedidos)"
