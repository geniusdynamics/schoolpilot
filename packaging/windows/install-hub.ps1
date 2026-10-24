<#
ABOUTME: The Windows installer: takes a fresh PC to a running SchoolPilot hub with a pinned TLS
ABOUTME: certificate, mDNS discovery and a scheduled task that starts it at boot. It installs Node
ABOUTME: when the machine has none or an old one, and it never needs a second machine to finish.
#>

[CmdletBinding()]
param(
  [string]$Root = (Join-Path $env:ProgramData 'SchoolPilot'),
  [string]$DataDir = '',
  [int]$Port = 8443,
  [Alias('Bind')][string]$HostAddress = '0.0.0.0',
  [string]$Name = '',
  [string]$Source = '',
  [ValidateSet('auto', 'system', 'local', 'none')][string]$NodeStrategy = 'auto',
  [int]$MdnsPort = 5353,
  [switch]$NoService,
  [switch]$NoTls,
  [switch]$DryRun,
  [switch]$Help
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Set-StrictMode -Version 2.0

$script:TemplateDir = $PSScriptRoot
$script:Platform = "Windows $([System.Environment]::OSVersion.Version) ($env:PROCESSOR_ARCHITECTURE)"
$script:RequiredNodeMajor = 22
$script:HealthTimeoutSeconds = 120
$script:UseTls = -not $NoTls
$script:InstallService = -not $NoService
$script:Checkpoints = @{}
$script:LastHealthError = ''
$script:NodePath = ''
$script:CurlPath = (Get-Command curl.exe -ErrorAction SilentlyContinue).Source
if (-not $script:CurlPath) {
  $bundled = Join-Path $env:SystemRoot 'System32\curl.exe'
  if (Test-Path $bundled) { $script:CurlPath = $bundled }
}

function Say { param([string]$Message) Write-Host $Message }
function Step { param([string]$Message) Write-Host ''; Write-Host "==> $Message" }
function Warn { param([string]$Message) Write-Warning $Message }
function Fail { param([string]$Message) Write-Error $Message; exit 2 }

function Mark { param([string]$Name) $script:Checkpoints[$Name] = (Get-Date) }
function Elapsed {
  param([string]$From, [string]$To)
  if (-not $script:Checkpoints.ContainsKey($From) -or -not $script:Checkpoints.ContainsKey($To)) { return 0 }
  return [int]($script:Checkpoints[$To] - $script:Checkpoints[$From]).TotalMilliseconds
}

function Show-Usage {
  @"
SchoolPilot hub installer — $script:Platform

Usage: install-hub.ps1 [options]

  -Root DIR            where the hub is installed (default $env:ProgramData\SchoolPilot)
  -DataDir DIR         database, TLS material and backups (default <root>\data)
  -Port N              the port the hub listens on (default 8443)
  -HostAddress ADDR    the address to bind (default 0.0.0.0)
  -Name LABEL          the name clients resolve as <label>.local (default this PC's)
  -Source SOURCE       a checkout directory, a .tar.gz (path or URL) or a git URL
  -NodeStrategy S      auto | system | local | none (default auto)
  -NoService           do not register a scheduled task; start the hub in the background
  -NoTls               serve plain HTTP (a trusted loopback box only)
  -MdnsPort N          the mDNS UDP port (default 5353)
  -DryRun              print every step and change nothing
  -Help                this text

Run this from an elevated PowerShell to register the service and the firewall rule.
"@ | Write-Host
}

# --------------------------------------------------------------------------- preflight

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-PortFree {
  param([int]$Port)
  try {
    return -not (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
  } catch {
    return $true
  }
}

function Invoke-Preflight {
  Step "Preflight on $script:Platform"

  if ($DryRun) { Say 'dry run: nothing will be changed'; return }

  if (Test-Path $Root) {
    if (-not (Test-Path $Root -PathType Container)) { Fail "$Root exists and is not a directory" }
    if (Test-Path (Join-Path $Root 'hub.env')) { Say "an existing installation was found at $Root; it will be upgraded in place" }
  }

  $drive = (Split-Path -Qualifier $Root)
  if ($drive) {
    $free = (Get-PSDrive -Name $drive.TrimEnd(':')).Free
    if ($free -and $free -lt 500MB) { Warn "$drive has less than 500 MB free; the payload and its dependencies need more" }
  }

  if (-not (Test-PortFree -Port $Port)) { Fail "port $Port is already in use; stop what holds it or pass -Port" }

  if (-not (Test-Administrator)) {
    Warn 'not running elevated: the scheduled task and the firewall rule will be skipped'
  }
}

# --------------------------------------------------------------------------- node

function Get-NodeMajor {
  param([string]$Path)
  if (-not $Path) { return 0 }
  try {
    $version = & $Path -v 2>$null
    return [int]($version.TrimStart('v').Split('.')[0])
  } catch {
    return 0
  }
}

function Install-NodeLocal {
  $slug = switch ($env:PROCESSOR_ARCHITECTURE) {
    'AMD64' { 'win-x64' }
    'ARM64' { 'win-arm64' }
    'x86' { 'win-x86' }
    default { Fail "no Node build is published for $env:PROCESSOR_ARCHITECTURE" }
  }

  $base = 'https://nodejs.org/dist/latest-v22.x'
  $sums = (Invoke-WebRequest -Uri "$base/SHASUMS256.txt" -UseBasicParsing).Content
  $match = ($sums -split "`n" | Where-Object { $_ -match "node-v.*-$slug\.zip$" } | Select-Object -First 1)
  if (-not $match) { Fail "no Node build was published for $slug" }
  $file = ($match -split '\s+')[1]
  $expected = ($match -split '\s+')[0]

  $zip = Join-Path $env:TEMP $file
  Say "downloading $file (about 30 MB)"
  Invoke-WebRequest -Uri "$base/$file" -OutFile $zip -UseBasicParsing

  $actual = (Get-FileHash -Path $zip -Algorithm SHA256).Hash.ToLower()
  if ($expected -and $actual -ne $expected) {
    Remove-Item $zip -Force
    Fail 'the Node download did not match its published checksum; nothing was installed'
  }

  $target = Join-Path $Root 'node'
  if (Test-Path $target) { Remove-Item $target -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $target -Force
  Remove-Item $zip -Force

  # The archive holds one directory; lift its contents up so node.exe is at <root>\node\node.exe.
  $inner = Get-ChildItem $target | Select-Object -First 1
  if ($inner -and $inner.PSIsContainer) {
    Get-ChildItem $inner.FullName | Move-Item -Destination $target -Force
    Remove-Item $inner.FullName -Recurse -Force
  }

  return (Join-Path $target 'node.exe')
}

function Install-NodeSystem {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { return $null }
  Say "installing Node v$script:RequiredNodeMajor LTS with winget (this needs the network)"
  & winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements | Out-Null
  if ($LASTEXITCODE -ne 0) { return $null }

  $machine = Join-Path $env:ProgramFiles 'nodejs\node.exe'
  if (Test-Path $machine) { return $machine }
  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  return $null
}

function Resolve-Node {
  Step 'Node'

  if ($NodeStrategy -ne 'local') {
    $existing = (Get-Command node -ErrorAction SilentlyContinue).Source
    if ((Get-NodeMajor -Path $existing) -ge $script:RequiredNodeMajor) {
      Say "using $( & $existing -v ) at $existing"
      return $existing
    }
    if ($existing) { Say "Node $( & $existing -v ) is older than v$script:RequiredNodeMajor; a newer one is needed" }
    else { Say 'Node is not installed' }
  }

  if ($NodeStrategy -eq 'none') { Fail "Node v$script:RequiredNodeMajor+ is required; install it and run this installer again" }

  if ($DryRun) { Say "dry run: would provide Node v$script:RequiredNodeMajor for this install"; return (Join-Path $Root 'node\node.exe') }

  $node = $null
  if ($NodeStrategy -eq 'system') {
    $node = Install-NodeSystem
    if (-not $node) { Fail 'installing Node system-wide failed; retry with -NodeStrategy local' }
  } elseif ($NodeStrategy -eq 'auto') {
    $node = Install-NodeSystem
    if (-not $node) {
      Warn "winget could not install Node; putting a Node inside $Root instead"
      $node = Install-NodeLocal
    }
  } else {
    $node = Install-NodeLocal
  }

  if (-not (Test-Path $node)) { Fail "Node was not installed where expected ($node)" }
  Say "using $( & $node -v ) at $node"
  return $node
}

# --------------------------------------------------------------------------- payload

function Resolve-Source {
  if ($Source) { return $Source }

  $beside = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
  if (Test-Path (Join-Path $beside 'src\server\cli.ts')) {
    Say "installing from the checkout this script sits in: $beside"
    return $beside
  }
  Fail 'no source given and no checkout found; pass -Source <dir|tar.gz|url>'
}

# A checkout is copied by the four paths a hub needs, so a working tree with uncommitted work
# installs as it stands and nothing else — node_modules, build output, data — can leak in. tar does
# the copy in one pass: robocopy spends minutes on the tens of thousands of small files in src/.
function Copy-FromCheckout {
  param([string]$From, [string]$To)

  New-Item -ItemType Directory -Force -Path $To | Out-Null
  $tar = Join-Path $env:TEMP "schoolpilot-payload-$PID.tar"
  Push-Location $From
  try {
    & tar -cf $tar src server tsconfig.json packaging
    if ($LASTEXITCODE -ne 0) { Fail 'archiving the payload failed' }
  } finally {
    Pop-Location
  }
  try {
    & tar -xf $tar -C $To
    if ($LASTEXITCODE -ne 0) { Fail 'unpacking the payload failed' }
  } finally {
    Remove-Item $tar -Force -ErrorAction SilentlyContinue
  }
}

function Get-Payload {
  param([string]$From, [string]$To)

  if (Test-Path $From -PathType Container) {
    Copy-FromCheckout -From $From -To $To
    return
  }

  $archive = $null
  if (Test-Path $From -PathType Leaf) {
    $archive = $From
  } elseif ($From -match '^https?://') {
    $archive = Join-Path $To 'payload.tar.gz'
    Say "downloading $From"
    Invoke-WebRequest -Uri $From -OutFile $archive -UseBasicParsing
  } elseif ($From -match '^(git@|https?://.*\.git$)') {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'git is required to install from a git URL' }
    Say "cloning $From"
    & git clone --depth 1 $From (Join-Path $To 'checkout')
    if ($LASTEXITCODE -ne 0) { Fail 'cloning the payload failed' }
    Copy-FromCheckout -From (Join-Path $To 'checkout') -To $To
    Remove-Item (Join-Path $To 'checkout') -Recurse -Force
    return
  } else {
    Fail "$From is not a directory, an archive or a URL"
  }

  & tar -xzf $archive -C $To
  if ($LASTEXITCODE -ne 0) { Fail 'unpacking the payload failed' }
}

function Install-Payload {
  param([string]$From)

  Step 'Payload'
  $staging = Join-Path $Root '.staging'
  if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $staging | Out-Null

  Get-Payload -From $From -To $staging

  # An archive of a checkout keeps everything under a single top directory.
  if (-not (Test-Path (Join-Path $staging 'src\server\cli.ts'))) {
    $nested = Get-ChildItem $staging -Recurse -Depth 2 -Filter 'cli.ts' |
      Where-Object { $_.FullName -match '\\src\\server\\cli\.ts$' } | Select-Object -First 1
    if ($nested) {
      $top = $nested.FullName -replace '\\src\\server\\cli\.ts$', ''
      Get-ChildItem $top | Move-Item -Destination $staging -Force
      Remove-Item $top -Recurse -Force
    }
  }

  if (-not (Test-Path (Join-Path $staging 'src\server\cli.ts'))) { Fail 'the payload has no src/server/cli.ts; it is not a SchoolPilot hub' }
  if (-not (Test-Path (Join-Path $staging 'packaging\hub\package.json'))) { Fail 'the payload has no packaging/hub/package.json; it is not a SchoolPilot hub' }

  $app = Join-Path $Root 'app'
  New-Item -ItemType Directory -Force -Path $app | Out-Null
  foreach ($stale in @('src', 'server')) {
    if (Test-Path (Join-Path $app $stale)) { Remove-Item (Join-Path $app $stale) -Recurse -Force }
  }
  Copy-Item (Join-Path $staging 'src') (Join-Path $app 'src') -Recurse -Force
  Copy-Item (Join-Path $staging 'server') (Join-Path $app 'server') -Recurse -Force
  Copy-Item (Join-Path $staging 'tsconfig.json') (Join-Path $app 'tsconfig.json') -Force

  # The runtime manifest replaces the frontend's: a hub does not install the browser's tree.
  Copy-Item (Join-Path $staging 'packaging\hub\package.json') (Join-Path $app 'package.json') -Force
  $lock = Join-Path $staging 'packaging\hub\package-lock.json'
  if (Test-Path $lock) { Copy-Item $lock (Join-Path $app 'package-lock.json') -Force }

  Copy-Item (Join-Path $script:TemplateDir 'run-hub.ps1') (Join-Path $Root 'run-hub.ps1') -Force

  Remove-Item $staging -Recurse -Force
  Say "payload staged at $app"
}

function Install-Dependencies {
  param([string]$Node)

  Step 'Dependencies'
  $app = Join-Path $Root 'app'
  $npm = Join-Path (Split-Path $Node -Parent) 'npm.cmd'
  if (-not (Test-Path $npm)) { $npm = (Get-Command npm.cmd).Source }

  # Every child process from here on — npm, and the compiler npm's install scripts spawn — must be
  # this Node: with another Node first on PATH, better-sqlite3 is built for the wrong ABI and the hub
  # refuses to start.
  $env:PATH = "$(Split-Path $Node -Parent);$env:PATH"

  Push-Location $app
  try {
    if (Test-Path 'package-lock.json') {
      & $npm ci --omit=dev --no-audit --no-fund --loglevel=error
    } else {
      & $npm install --omit=dev --no-audit --no-fund --loglevel=error
    }
    if ($LASTEXITCODE -ne 0) { Fail "installing the hub's dependencies failed; check the network and run again" }
  } finally {
    Pop-Location
  }
  Say "installed $((Get-ChildItem (Join-Path $app 'node_modules')).Count) packages"
  Test-NativeModule -Node $Node
}

# The hub cannot open its database without better-sqlite3 built for the Node that will run it.
# A machine whose PATH holds a different Node produces a binary for that one instead, so this is
# checked here and rebuilt once rather than discovered as a refusal to start.
function Test-NativeModule {
  param([string]$Node)

  Step 'Native module'
  $app = Join-Path $Root 'app'
  $probe = "const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.exec('create table t(a)'); db.close();"

  Push-Location $app
  try {
    & $Node -e $probe *> $null
    if ($LASTEXITCODE -eq 0) {
      Say "better-sqlite3 loads under $( & $Node -v )"
      return
    }

    Warn "better-sqlite3 does not load under $( & $Node -v ); rebuilding it"
    $npm = Join-Path (Split-Path $Node -Parent) 'npm.cmd'
    if (-not (Test-Path $npm)) { $npm = (Get-Command npm.cmd).Source }
    & $npm rebuild better-sqlite3 --no-audit --no-fund *> $null

    & $Node -e $probe *> $null
    if ($LASTEXITCODE -eq 0) {
      Say 'better-sqlite3 loads after a rebuild'
      return
    }

    Fail 'better-sqlite3 was built for a different Node; install the Node.js build tools and run this installer again'
  } finally {
    Pop-Location
  }
}

# --------------------------------------------------------------------------- certificate

function New-Certificate {
  param([string]$Node)

  if (-not $script:UseTls) { return @{ certFile = ''; fingerprint = '' } }

  Step 'TLS certificate'
  $tsx = Join-Path $Root 'app\node_modules\tsx\dist\cli.mjs'
  $cli = Join-Path $Root 'app\src\server\cli.ts'
  $printed = & $Node $tsx $cli --data-dir $DataDir --name $Name --print-fingerprint
  if ($LASTEXITCODE -ne 0) { Fail "issuing the hub's certificate failed" }

  $parsed = $printed | ConvertFrom-Json
  if (-not $parsed.certFile -or -not $parsed.sha256) { Fail 'the hub did not report its certificate' }
  Say "certificate: $($parsed.certFile)"
  Say "fingerprint: $($parsed.sha256)"
  return @{ certFile = $parsed.certFile; fingerprint = $parsed.sha256 }
}

# --------------------------------------------------------------------------- configuration and service

function Write-Environment {
  Step 'Configuration'
  New-Item -ItemType Directory -Force -Path (Join-Path $Root 'logs') | Out-Null
  New-Item -ItemType Directory -Force -Path $DataDir | Out-Null

  $tlsArgs = if ($script:UseTls) { '--tls' } else { '--no-tls' }
  $lines = @(
    '# The hub''s configuration, read by run-hub.ps1 and by the scheduled task.',
    "SCHOOLPILOT_ROOT=$Root",
    "SCHOOLPILOT_APP=$Root\app",
    "SCHOOLPILOT_DATA_DIR=$DataDir",
    "SCHOOLPILOT_PORT=$Port",
    "SCHOOLPILOT_HOST=$HostAddress",
    "SCHOOLPILOT_NAME=$Name",
    "SCHOOLPILOT_MDNS_PORT=$MdnsPort",
    "SCHOOLPILOT_TLS_ARGS=$tlsArgs",
    "SCHOOLPILOT_NODE=$script:NodePath"
  )
  Set-Content -Path (Join-Path $Root 'hub.env') -Value $lines -Encoding ASCII
  Say "wrote $(Join-Path $Root 'hub.env')"
}

function Register-HubTask {
  $taskName = 'SchoolPilotHub'
  if (-not (Test-Administrator)) {
    Warn 'not elevated: skipping the scheduled task; the hub will be started in the background'
    $script:InstallService = $false
    return
  }

  Step 'Service'
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Root\run-hub.ps1`""
  $trigger = New-ScheduledTaskTrigger -AtStartup
  $principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
  $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 0)

  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal `
    -Settings $settings -Description 'SchoolPilot hub (school management server)' -Force | Out-Null
  Start-ScheduledTask -TaskName $taskName
  Say "registered the $taskName scheduled task and started it"
}

function Open-Firewall {
  if (-not (Test-Administrator)) { return }
  if (Get-NetFirewallRule -DisplayName 'SchoolPilot hub' -ErrorAction SilentlyContinue) { return }

  try {
    New-NetFirewallRule -DisplayName 'SchoolPilot hub' -Direction Inbound -Protocol TCP `
      -LocalPort $Port -Action Allow -Profile Domain,Private | Out-Null
    Say "firewall: allowed TCP $Port"
    New-NetFirewallRule -DisplayName 'SchoolPilot hub discovery' -Direction Inbound -Protocol UDP `
      -LocalPort $MdnsPort -Action Allow -Profile Domain,Private | Out-Null
    Say "firewall: allowed UDP $MdnsPort for discovery"
  } catch {
    Warn "could not add the firewall rule: $($_.Exception.Message)"
  }
}

function Start-Hub {
  Step 'Start'
  if ($script:InstallService) { Say 'started by the scheduled task'; return }

  # The hub outlives the installer, so it must not inherit the installer's console handles: the
  # launcher's own output goes to a file of its own, and run-hub.ps1 records the hub's process id.
  $pidFile = Join-Path $Root 'hub.pid'
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  $process = Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $Root 'run-hub.ps1')) `
    -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $Root 'logs\hub.launch.log') `
    -RedirectStandardError (Join-Path $Root 'logs\hub.launch.err.log')
  Say "started in the background (launcher pid $($process.Id); the hub writes $Root\logs\hub.log)"
}

function Wait-Hub {
  param([string]$Fingerprint, [string]$CertFile)

  Step 'Waiting for the hub'
  $scheme = if ($script:UseTls) { 'https' } else { 'http' }
  $url = "$scheme`://$Name.local`:$Port/health"
  $deadline = (Get-Date).AddSeconds($script:HealthTimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    if (Test-HubHealth -Fingerprint $Fingerprint -CertFile $CertFile) {
      Mark 'ready'
      Say "the hub answered on $url"
      return
    }
    Start-Sleep -Seconds 1
  }

  $log = Join-Path $Root 'logs\hub.log'
  if (Test-Path $log) { Get-Content $log -Tail 20 | Write-Error }
  if ($script:LastHealthError) { Write-Error "the last attempt failed: $script:LastHealthError" }
  Fail "the hub did not answer within $script:HealthTimeoutSeconds seconds"
}

# Asks the hub for its status with curl.exe, which verifies the certificate against the PEM the
# installer just wrote and checks the advertised name, then compares the fingerprint the hub reports
# with the one that was issued. Windows' own TLS stack is deliberately not used here: PowerShell 5.1
# runs a validation callback without a runspace, so a .NET pin would fail for the wrong reason.
function Test-HubHealth {
  param([string]$Fingerprint, [string]$CertFile)

  $scheme = if ($script:UseTls) { 'https' } else { 'http' }
  $url = "$scheme`://$Name.local`:$Port/health"

  if (-not $script:CurlPath) {
    # No curl.exe (Windows before 10 1803): prove the port is open and say the certificate was not
    # pinned, rather than claiming a check that did not happen.
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $client.Connect('127.0.0.1', $Port)
      $client.Close()
      $script:LastHealthError = 'curl.exe is not available, so only the port was checked'
      return $true
    } catch {
      $script:LastHealthError = $_.Exception.Message
      return $false
    }
  }

  $arguments = @('-fsS', '--max-time', '5')
  if ($script:UseTls) {
    $arguments += @('--cacert', $CertFile, '--resolve', "$Name.local`:$Port`:127.0.0.1")
  }
  $arguments += $url

  # PowerShell 5.1 turns a native command's stderr into a terminating error under 'Stop', which would
  # end the wait loop on the first attempt, before the hub has finished opening its database.
  $previous = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $response = & $script:CurlPath @arguments 2>$null
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previous

  if ($exitCode -ne 0 -or -not $response) {
    $script:LastHealthError = "curl exited with $exitCode"
    return $false
  }

  try {
    $status = $response | ConvertFrom-Json
  } catch {
    $script:LastHealthError = 'the hub answered with something that is not JSON'
    return $false
  }

  if ($script:UseTls) {
    $served = ($status.tlsFingerprint -replace ':', '').ToLower()
    if ($served -ne $Fingerprint) {
      $script:LastHealthError = "the hub served certificate $served, not the one that was issued ($Fingerprint)"
      return $false
    }
  }

  return $status.running -eq $true
}

# --------------------------------------------------------------------------- summary

function Write-Summary {
  param([string]$Node, [string]$Fingerprint, [string]$CertFile)

  $scheme = if ($script:UseTls) { 'https' } else { 'http' }
  $service = if ($script:InstallService) { 'SchoolPilotHub' } else { $null }
  $summary = [ordered]@{
    platform    = $script:Platform
    root        = $Root
    dataDir     = $DataDir
    port        = $Port
    protocol    = $scheme
    url         = "$scheme`://$Name.local`:$Port"
    addressUrl  = "$scheme`://127.0.0.1`:$Port"
    certificateFile = $CertFile
    fingerprint = $Fingerprint
    node        = ( & $Node -v )
    nodePath    = $Node
    service     = $service
    mdnsPort    = $MdnsPort
    durationsMs = [ordered]@{
      preflight    = Elapsed 'start' 'preflight'
      node         = Elapsed 'preflight' 'node'
      payload      = Elapsed 'node' 'payload'
      dependencies = Elapsed 'payload' 'dependencies'
      certificate  = Elapsed 'dependencies' 'certificate'
      ready        = Elapsed 'certificate' 'ready'
      total        = Elapsed 'start' 'finish'
    }
  }
  $path = Join-Path $Root 'install-summary.json'
  # Written without a byte-order mark: PowerShell 5.1's Set-Content -Encoding UTF8 adds one, and a
  # reader that parses the file as JSON must not have to know that.
  $json = $summary | ConvertTo-Json -Depth 5
  [System.IO.File]::WriteAllText($path, $json, (New-Object System.Text.UTF8Encoding($false)))
  Say "wrote $path"
}

function Show-Result {
  param([string]$Fingerprint, [string]$CertFile)

  $scheme = if ($script:UseTls) { 'https' } else { 'http' }
  $service = if ($script:InstallService) { 'the SchoolPilotHub scheduled task' } else { "background process $(Join-Path $Root 'hub.pid')" }
  $trust = if ($script:UseTls) { "trust $CertFile or pin the fingerprint above" } else { 'nothing to trust over plain HTTP' }

  @"

SchoolPilot hub is running.

  Open        $scheme`://$Name.local`:$Port
  On this PC  $scheme`://127.0.0.1`:$Port
  Data        $DataDir
  TLS         $(if ($script:UseTls) { "on, fingerprint $Fingerprint" } else { 'off (-NoTls)' })
  Service     $service
  Log         $Root\logs\hub.log
  Stop        $(if ($script:InstallService) { 'Stop-ScheduledTask -TaskName SchoolPilotHub' } else { "& `"$Root\run-hub.ps1`" -Stop" })
  Discovery   every machine on this LAN finds the hub as $Name.local
  Clients     $trust

  Staff open $scheme`://$Name.local`:$Port in a browser; the first login creates the administrator.
"@ | Write-Host
}

# --------------------------------------------------------------------------- the install

if ($Help) { Show-Usage; exit 0 }

if (-not $Name) { $Name = ($env:COMPUTERNAME.ToLower() -replace '[^a-z0-9-]', '-') }
if (-not $DataDir) { $DataDir = Join-Path $Root 'data' }

Mark 'start'
Invoke-Preflight
Mark 'preflight'

if ($DryRun) {
  Say "dry run: would install to $Root from $(Resolve-Source)"
  Say "dry run: would listen on ${HostAddress}:$Port as $Name.local and register a scheduled task"
  exit 0
}

$node = Resolve-Node
$script:NodePath = $node
Mark 'node'
$source = Resolve-Source
Install-Payload -From $source
Mark 'payload'
Install-Dependencies -Node $node
Mark 'dependencies'
$certificate = New-Certificate -Node $node
Mark 'certificate'
Write-Environment
Register-HubTask
Open-Firewall
Start-Hub
Wait-Hub -Fingerprint $certificate.fingerprint -CertFile $certificate.certFile
Mark 'finish'
Write-Summary -Node $node -Fingerprint $certificate.fingerprint -CertFile $certificate.certFile
Show-Result -Fingerprint $certificate.fingerprint -CertFile $certificate.certFile
