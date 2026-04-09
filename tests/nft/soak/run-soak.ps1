# Wong Sheen Kerr (A0269647J)
<#
AI Usage Declaration

Tool Used: GPT-5.4

Prompt:
- Asked for help drafting and refining a PowerShell runner for the soak test suite, including process-memory monitoring.
- Asked for ideas on how to make the runner safer and easier to use for long soak executions.

How the AI Output Was Used:
- Output was used as a reference to draft the script.
#>

<#
This Windows runner wraps the core k6 JavaScript files.
It is responsible for:
- resolving the k6 executable
- waiting for the backend to become reachable before starting k6
- writing timestamped CSV outputs
- optionally starting memory sampling for the backend process

The underlying soak logic still lives in the k6 `.js` files. This script only helps launch and manage the run more conveniently on Windows.
#>
[CmdletBinding()]
param(
    [string]$K6Path = "",

    [string]$ResultsDir = "",

    [int]$ServerPid = 0,

    [int]$MonitorIntervalSeconds = 5,

    [int]$WaitForBackendSeconds = 60,

    [string]$HealthPath = "/"
)

function Resolve-K6Command {
    param([string]$RequestedPath)

    if ($RequestedPath) {
        return (Resolve-Path $RequestedPath).Path
    }

    $command = Get-Command k6 -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $defaultPath = "C:\Program Files\k6\k6.exe"
    if (Test-Path $defaultPath) {
        return $defaultPath
    }

    throw "Unable to find k6. Install it or pass -K6Path."
}

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
}

function Wait-ForBackend {
    param(
        [string]$BaseUrl,
        [string]$Path,
        [int]$TimeoutSeconds
    )

    if ($TimeoutSeconds -le 0) {
        return
    }

    $healthUrl = "$($BaseUrl.TrimEnd('/'))/$($Path.TrimStart('/'))"
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    Write-Host "Waiting for backend: $healthUrl (timeout ${TimeoutSeconds}s)"

    while ((Get-Date) -lt $deadline) {
        try {
            Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5 | Out-Null
            return
        }
        catch {
            if ($_.Exception.Response) {
                return
            }
        }

        Start-Sleep -Seconds 2
    }

    throw "Backend did not become reachable at $healthUrl within ${TimeoutSeconds}s."
}

$repoRoot = Get-RepoRoot
$k6Executable = Resolve-K6Command -RequestedPath $K6Path
$soakBaseUrl = "http://localhost:6060"
$soakVcTotal = 100
$soakContinuousDuration = "365d"

if (-not $ResultsDir) {
    $ResultsDir = Join-Path $repoRoot "tests\nft\soak\results"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$scriptPath = Join-Path $repoRoot "tests\nft\soak\soak.k6.js"
$csvPath = Join-Path $ResultsDir "soak-$timestamp.csv"
$memoryCsvPath = Join-Path $ResultsDir "soak-$timestamp-process-memory.csv"
$monitorScriptPath = Join-Path $repoRoot "tests\nft\soak\monitor-process-memory.ps1"
$monitorProcess = $null

New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null

$arguments = @("run", "--summary-trend-stats=avg,min,med,max,p(90),p(95),p(99)")

$arguments += @("--out", "csv=$csvPath", $scriptPath)

Write-Host "k6: $k6Executable"
Write-Host "Script: $scriptPath"
Write-Host "Base URL: $soakBaseUrl"
Write-Host "VC_TOTAL: $soakVcTotal"
Write-Host "Run style: manual stop"
Write-Host "Continuous duration: $soakContinuousDuration"
Write-Host "CSV output: $csvPath"
if ($ServerPid -gt 0) {
    Write-Host "Server PID: $ServerPid"
    Write-Host "Process memory CSV: $memoryCsvPath"
}
Write-Host ""

Push-Location $repoRoot
try {
    # Wait until the backend is up before starting k6.
    Wait-ForBackend -BaseUrl $soakBaseUrl -Path $HealthPath -TimeoutSeconds $WaitForBackendSeconds

    if ($ServerPid -gt 0) {
        # Track only the backend process so the memory numbers come from the
        # app itself rather than the whole computer.
        $monitorArguments = @(
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-File", $monitorScriptPath,
            "-ServerPid", $ServerPid,
            "-OutputPath", $memoryCsvPath,
            "-IntervalSeconds", $MonitorIntervalSeconds
        )
        $monitorProcess = Start-Process -FilePath "powershell.exe" -ArgumentList $monitorArguments -PassThru -WindowStyle Hidden
    }

    & $k6Executable @arguments
}
finally {
    if ($monitorProcess -and -not $monitorProcess.HasExited) {
        Stop-Process -Id $monitorProcess.Id -ErrorAction SilentlyContinue
    }
    Pop-Location
}
