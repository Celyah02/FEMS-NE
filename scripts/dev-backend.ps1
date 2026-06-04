param(
  [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

$processes = @(
  @{ Name = "user-service"; Path = "services\user-service"; Port = "4001" },
  @{ Name = "extinguisher-service"; Path = "services\extinguisher-service"; Port = "4002" },
  @{ Name = "inspection-service"; Path = "services\inspection-service"; Port = "4003" },
  @{ Name = "reporting-service"; Path = "services\reporting-service"; Port = "4004" },
  @{ Name = "notification-service"; Path = "services\notification-service"; Port = "4005" },
  @{ Name = "gateway"; Path = "services\gateway"; Port = "8080" }
)

foreach ($process in $processes) {
  $serviceDir = Join-Path $root $process.Path
  $title = "FEMS $($process.Name)"
  $command = "`$Host.UI.RawUI.WindowTitle = '$title'; cd '$serviceDir'; `$env:PORT = '$($process.Port)'; npm run dev"

  if ($WhatIf) {
    Write-Host "Would start $($process.Name) on port $($process.Port)"
    continue
  }

  # Start-Process powershell -ArgumentList @(
  #   "-NoExit",
  #   "-ExecutionPolicy", "Bypass",
  #   "-Command", $command
  # )

  Start-Process "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-Command", $command
)
}

if ($WhatIf) {
  Write-Host "Dry run complete. No services were started."
} else {
  Write-Host "Started backend services in separate PowerShell windows."
  Write-Host "Gateway: http://localhost:8080"
}
