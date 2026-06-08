# scripts/generate-certs.ps1
# Generates self-signed certificates in the certs/ directory for local HTTPS development.

$CertsDir = Resolve-Path (Join-Path $PSScriptRoot "..\certs") -ErrorAction SilentlyContinue
if (-not $CertsDir) {
    $CertsDir = Join-Path $PSScriptRoot "..\certs"
    if (-not (Test-Path $CertsDir)) {
        New-Item -ItemType Directory -Force -Path $CertsDir | Out-Null
    }
}
$KeyPath = Join-Path $CertsDir "privkey.pem"
$CertPath = Join-Path $CertsDir "fullchain.pem"

Write-Host "Checking for OpenSSL..." -ForegroundColor Cyan
$openssl = Get-Command openssl -ErrorAction SilentlyContinue

$GitOpenSSL = "C:\Program Files\Git\usr\bin\openssl.exe"
if (-not $openssl -and (Test-Path $GitOpenSSL)) {
    Write-Host "Found OpenSSL in Git installation directory: $GitOpenSSL" -ForegroundColor Cyan
    $openssl = $GitOpenSSL
}

if ($openssl) {
    Write-Host "Generating self-signed certificate..." -ForegroundColor Green
    & $openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
        -keyout $KeyPath `
        -out $CertPath `
        -subj "/C=US/ST=State/L=City/O=Development/CN=localhost"
    
    if (Test-Path $KeyPath) {
        Write-Host "Successfully generated certificate files:" -ForegroundColor Green
        Write-Host "  Private Key: $KeyPath" -ForegroundColor Green
        Write-Host "  Certificate: $CertPath" -ForegroundColor Green
    } else {
        Write-Host "Error: Failed to generate certificates." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Error: OpenSSL was not found in PATH or at '$GitOpenSSL'." -ForegroundColor Red
    Write-Host "Please install OpenSSL or run this script in a Git Bash terminal." -ForegroundColor Yellow
    exit 1
}
