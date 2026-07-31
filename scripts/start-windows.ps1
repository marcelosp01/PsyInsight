$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

docker compose up --build -d
Write-Host "PsyInsight disponível em http://localhost:8000"
