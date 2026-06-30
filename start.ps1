# Sobe dashboard, n8n e ngrok com um comando
# Uso: .\start.ps1

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$DashboardDir = Join-Path $Root "WebApp\Metric-Dashboard-Farmacia"
$EnvFile = Join-Path $Root ".env"

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }

function Import-DotEnv($path) {
    if (-not (Test-Path $path)) { return @{} }
    $vars = @{}
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line -match "^\s*([^#=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            $vars[$key] = $value
        }
    }
    return $vars
}

Write-Host "FarmaBot - subindo ambiente local" -ForegroundColor Green

$envVars = Import-DotEnv $EnvFile
if (-not (Test-Path $EnvFile)) {
    Write-Host "AVISO: .env nao encontrado. Copie .env.example para .env e configure as credenciais." -ForegroundColor Yellow
}

# 1. Dashboard + Postgres
Write-Step "Dashboard + PostgreSQL (docker compose)"
if (-not (Test-Path $DashboardDir)) {
    throw "Pasta nao encontrada: $DashboardDir"
}
Push-Location $DashboardDir
docker compose up -d
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Falha ao subir docker compose" }
Pop-Location

# 2. n8n (detached, persiste dados no volume n8n_data)
Write-Step "n8n (porta 5678)"
$n8nEnvArgs = @()
foreach ($key in @("ZAPI_INSTANCE_ID", "ZAPI_TOKEN", "ZAPI_CLIENT_TOKEN", "GROQ_API_KEY", "DASHBOARD_API_KEY", "ATTENDANT_PHONE")) {
    if ($envVars.ContainsKey($key) -and $envVars[$key]) {
        $n8nEnvArgs += "-e"
        $n8nEnvArgs += "${key}=$($envVars[$key])"
    }
}

$existing = docker ps -a --filter "name=^n8n$" --format "{{.Names}}" 2>$null
if ($existing -eq "n8n") {
    $running = docker ps --filter "name=^n8n$" --format "{{.Names}}" 2>$null
    if ($running -eq "n8n") {
        Write-Host "   n8n ja esta rodando (recrie o container se alterou o .env)"
    } else {
        docker start n8n | Out-Null
        Write-Host "   n8n reiniciado"
    }
} else {
    $dockerArgs = @(
        "run", "-d",
        "--name", "n8n",
        "-p", "5678:5678",
        "-v", "n8n_data:/home/node/.n8n",
        "--add-host=host.docker.internal:host-gateway"
    ) + $n8nEnvArgs + @("n8nio/n8n")
    & docker @dockerArgs | Out-Null
    Write-Host "   n8n criado e iniciado"
}

# 3. ngrok (janela separada, se ainda nao estiver ativo)
Write-Step "ngrok (tunnel para Z-API)"
$ngrokProc = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($ngrokProc) {
    Write-Host "   ngrok ja esta rodando (PID $($ngrokProc.Id))"
} else {
    $ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
    if (-not $ngrokCmd) {
        Write-Host "   AVISO: ngrok nao encontrado no PATH. Instale em https://ngrok.com" -ForegroundColor Yellow
    } else {
        Start-Process -FilePath "ngrok" -ArgumentList "http", "5678"
        Write-Host "   ngrok iniciado em nova janela"
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Ambiente pronto!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Dashboard : http://localhost:5000"
Write-Host "  n8n       : http://localhost:5678"
Write-Host "  ngrok UI  : http://127.0.0.1:4040  (copie a URL https para o Z-API)"
Write-Host ""
Write-Host "Lembrete: workflow precisa estar ATIVO no n8n."
Write-Host "Parar tudo: .\stop.ps1"
