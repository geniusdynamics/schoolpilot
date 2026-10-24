<#
ABOUTME: Starts the installed hub on Windows from hub.env: the one place the port, data directory,
ABOUTME: name and TLS switch live, so the scheduled task, a manual start and the installer all launch
ABOUTME: it the same way. It records the hub's own process id in hub.pid, so `-Stop` stops the hub
ABOUTME: rather than the launcher, and writes the hub's output to logs\hub.log.
#>

[CmdletBinding()]
param([switch]$Stop)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$envFile = Join-Path $root 'hub.env'
$pidFile = Join-Path $root 'hub.pid'

if (-not (Test-Path $envFile)) {
  Write-Error "run-hub.ps1: no hub.env in $root; install the hub first"
  exit 1
}

$settings = @{}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
  $key, $value = $line -split '=', 2
  $settings[$key.Trim()] = $value.Trim()
}

if ($Stop) {
  if (Test-Path $pidFile) {
    $hubPid = [int](Get-Content $pidFile | Select-Object -First 1)
    try {
      Stop-Process -Id $hubPid -Force
      Write-Host "stopped the hub (pid $hubPid)"
    } catch {
      Write-Host 'the hub is not running'
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  } else {
    Write-Host "no pid file at $pidFile; if the scheduled task started the hub use: Stop-ScheduledTask -TaskName SchoolPilotHub"
  }
  exit 0
}

$app = $settings['SCHOOLPILOT_APP']
$tsx = Join-Path $app 'node_modules\tsx\dist\cli.mjs'
$cli = Join-Path $app 'src\server\cli.ts'

if (-not (Test-Path $tsx)) { Write-Error "run-hub.ps1: $tsx is missing; reinstall the hub"; exit 1 }

$logs = Join-Path $root 'logs'
if (-not (Test-Path $logs)) { New-Item -ItemType Directory -Force -Path $logs | Out-Null }

$node = $settings['SCHOOLPILOT_NODE']
if (-not $node -or -not (Test-Path $node)) {
  $node = (Get-Command node -ErrorAction SilentlyContinue).Source
}
if (-not $node) {
  $bundled = Join-Path $root 'node\node.exe'
  if (Test-Path $bundled) { $node = $bundled } else { Write-Error 'run-hub.ps1: no node found; reinstall the hub'; exit 1 }
}

$arguments = @(
  $tsx, $cli,
  '--data-dir', $settings['SCHOOLPILOT_DATA_DIR'],
  '--port', $settings['SCHOOLPILOT_PORT'],
  '--host', $settings['SCHOOLPILOT_HOST'],
  '--name', $settings['SCHOOLPILOT_NAME'],
  '--mdns-port', $settings['SCHOOLPILOT_MDNS_PORT']
) + ($settings['SCHOOLPILOT_TLS_ARGS'] -split '\s+' | Where-Object { $_ })

# The hub runs as this script's child and is waited on, so hub.pid names the hub itself: a stop
# request reaches the server, not the launcher that would otherwise outlive it. It runs from its own
# directory, because the `@/*` paths in the app's tsconfig.json resolve against the working
# directory and a hub started elsewhere would load another checkout's sources.
$hub = Start-Process -FilePath $node -ArgumentList $arguments -WorkingDirectory $app -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $logs 'hub.log') `
  -RedirectStandardError (Join-Path $logs 'hub.err.log')
Set-Content -Path $pidFile -Value $hub.Id -Encoding ASCII

$hub.WaitForExit()
Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
exit $hub.ExitCode
