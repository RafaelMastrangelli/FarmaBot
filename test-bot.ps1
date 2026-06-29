# Simula mensagem recebida no WhatsApp (webhook Z-API -> n8n)
# Uso:
#   .\test-bot.ps1 -Phone "5511999999999" -Message "oi"
#   .\test-bot.ps1 -Phone "5511999999999" -Message "1"
#   .\test-bot.ps1 -Message "Cliente Teste"   # usa telefone salvo em .test-phone

param(
    [string]$Phone,
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [string]$WebhookUrl = "http://localhost:5678/webhook/whatsapp-farmacia"
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$PhoneFile = Join-Path $Root ".test-phone"

if (-not $Phone) {
    if (Test-Path $PhoneFile) {
        $Phone = (Get-Content $PhoneFile -Raw).Trim()
    } else {
        throw @"
Informe seu numero pessoal (WhatsApp que RECEBE a resposta do bot):
  .\test-bot.ps1 -Phone "5511999999999" -Message "oi"

Formato: 55 + DDD + 9 + numero (sem + ou espacos)
"@
    }
} else {
    $Phone | Set-Content -Encoding utf8 -NoNewline $PhoneFile
}

$Phone = $Phone -replace '\D', ''

$payload = @{
    type    = "ReceivedCallback"
    isGroup = $false
    fromMe  = $false
    phone   = $Phone
    text    = @{ message = $Message }
}

$json = $payload | ConvertTo-Json -Depth 5 -Compress
$tempFile = Join-Path $env:TEMP "farmacia-bot-test.json"
[System.IO.File]::WriteAllText($tempFile, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "Enviando para o bot..." -ForegroundColor Cyan
Write-Host "  Telefone : $Phone"
Write-Host "  Mensagem : $Message"
Write-Host "  Webhook  : $WebhookUrl"
Write-Host ""

$result = curl.exe -s -w "`nHTTP:%{http_code}" -X POST $WebhookUrl `
    -H "Content-Type: application/json" `
    --data-binary "@$tempFile"

Write-Host $result

if ($result -match "HTTP:200") {
    Write-Host "`nOK! Verifique o WhatsApp ($Phone) - a resposta do bot deve chegar em alguns segundos." -ForegroundColor Green
} else {
    Write-Host "`nFalha na requisicao. Confira:" -ForegroundColor Yellow
    Write-Host "  - n8n rodando? http://localhost:5678"
    Write-Host "  - Workflow ATIVO no n8n?"
    Write-Host "  - Execucoes: http://localhost:5678/home/executions"
}
