param([Parameter(Mandatory=$true)][string]$Executable, [Parameter(Mandatory=$true)][string]$ReportPath)
$ErrorActionPreference = 'Stop'
if (-not $IsWindows) { throw 'This smoke check must run on Windows.' }
$exe = (Resolve-Path $Executable).Path
$state = Join-Path $env:RUNNER_TEMP ('ace-smoke-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $state | Out-Null
$env:T3CODE_HOME = $state
$env:T3CODE_PORT = '45197'
$env:T3CODE_DISABLE_AUTO_UPDATE = 'true'
$env:CODEX_HOME = Join-Path $state 'codex'
$env:CLAUDE_CONFIG_DIR = Join-Path $state 'claude'
$stdout = Join-Path $state 'stdout.log'
$stderr = Join-Path $state 'stderr.log'
$process = Start-Process -FilePath $exe -ArgumentList '--disable-gpu' -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
$ready = $false
try {
  $deadline = [DateTime]::UtcNow.AddSeconds(90)
  while ([DateTime]::UtcNow -lt $deadline) {
    $process.Refresh()
    if ($process.HasExited) { throw "ACE exited before readiness (code $($process.ExitCode))." }
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:45197/' -TimeoutSec 2
      if ($response.StatusCode -eq 200 -and $response.Content -match '<html') { $ready = $true; break }
    } catch { }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'ACE backend did not serve its web client within 90 seconds.' }
  $trace = Join-Path $state 'userdata/logs/desktop.trace.ndjson'
  if (-not (Test-Path $trace)) { throw 'Desktop startup trace missing.' }
  $traceText = Get-Content $trace -Raw
  if ($traceText -notmatch 'app ready') { throw 'Desktop did not report app readiness.' }
  $db = Join-Path $state 'userdata/state.sqlite'
  if (-not (Test-Path $db)) { throw 'Backend database was not initialized.' }
  $result = [ordered]@{
    platform = [Environment]::OSVersion.VersionString
    executable = [IO.Path]::GetFileName($exe)
    desktopReady = $true
    backendHttp = 200
    databaseInitialized = $true
    providerInferenceCalls = 0
    interactiveProviderLoginTested = $false
    guiInteractionTested = $false
  }
  $result | ConvertTo-Json | Set-Content $ReportPath
  Write-Output 'ACE packaged Windows startup passed: desktop ready, backend HTTP200, database initialized.'
} finally {
  # Only the exact process we started, never a name/pattern match.
  $process.Refresh()
  if (-not $process.HasExited) {
    $null = $process.CloseMainWindow()
    if (-not $process.WaitForExit(15000)) { $process.Kill($true); $process.WaitForExit() }
  }
  # Logs may contain short-lived pairing material; do not upload or print them.
}
