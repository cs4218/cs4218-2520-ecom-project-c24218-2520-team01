# Wong Sheen Kerr (A0269647J)
<#
AI Usage Declaration

Tool Used: GPT-5.4

Prompt:
- Asked for help drafting a PowerShell helper to capture process-level memory metrics for the backend during soak testing.
- Asked for guidance on which process-specific memory fields would be useful as evidence for endurance testing.

How the AI Output Was Used:
- Output was used as a reference to draft the script.
#>

<#
This helper samples memory and related runtime values for the backend process during a soak run.

It is intentionally separate from the k6 test code because:
- k6 focuses on workload generation and HTTP metrics
- memory sampling is something done on the local machine
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [int]$ServerPid,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath,

  [int]$IntervalSeconds = 5
)

function Get-ProcessSample {
  param([System.Diagnostics.Process]$Process)

  $Process.Refresh()

  # Save memory values from the backend process itself instead of using whole-computer memory numbers.
  return [PSCustomObject]@{
    timestamp_iso        = [DateTime]::UtcNow.ToString("o")
    pid                  = $Process.Id
    process_name         = $Process.ProcessName
    rss_bytes            = $Process.WorkingSet64
    private_memory_bytes = $Process.PrivateMemorySize64
    virtual_memory_bytes = $Process.VirtualMemorySize64
    paged_memory_bytes   = $Process.PagedMemorySize64
    handle_count         = $Process.HandleCount
    thread_count         = $Process.Threads.Count
    cpu_seconds          = $Process.CPU
  }
}

$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory) {
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
}

if (Test-Path $OutputPath) {
  Remove-Item $OutputPath
}

try {
  $process = Get-Process -Id $ServerPid -ErrorAction Stop
}
catch {
  throw "Unable to find process with PID $ServerPid."
}

while (-not $process.HasExited) {
  $sample = Get-ProcessSample -Process $process
  $sample | Export-Csv -Path $OutputPath -NoTypeInformation -Append
  Start-Sleep -Seconds $IntervalSeconds
  $process.Refresh()
}
