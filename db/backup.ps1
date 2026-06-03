# Backs up the FEMS PostgreSQL database to ./backups/fems_<timestamp>.sql
# Usage: ./db/backup.ps1   (postgres container must be running via docker compose)
$ErrorActionPreference = "Stop"
$container = "fems-postgres"
$db = if ($env:PGDATABASE) { $env:PGDATABASE } else { "fems" }
$user = if ($env:PGUSER) { $env:PGUSER } else { "fems" }
$dir = Join-Path $PSScriptRoot "backups"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$out = Join-Path $dir "fems_$stamp.sql"
Write-Host "Dumping $db from container $container -> $out"
docker exec -t $container pg_dump -U $user -d $db | Out-File -Encoding utf8 $out
Write-Host "Backup complete: $out"
