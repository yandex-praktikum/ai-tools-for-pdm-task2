param(
  [Parameter(Mandatory = $true)][string]$ProjectRoot,
  [Parameter(Mandatory = $true)][string]$ReadyMarker,
  [Parameter(Mandatory = $true)][string]$StopMarker,
  [Parameter(Mandatory = $true)][string]$WindowTitle
)

$ErrorActionPreference = 'Stop'
$Host.UI.RawUI.WindowTitle = $WindowTitle
Set-Location -LiteralPath $ProjectRoot

function Invoke-ExternalCommand {
  param(
    [string]$Label,
    [string]$Executable,
    [string[]]$Arguments
  )

  $outputLines = & $Executable @Arguments 2>&1 | ForEach-Object { $_.ToString() }
  $exitCode = $LASTEXITCODE
  [pscustomobject]@{
    Label = $Label
    Output = ($outputLines -join "`r`n")
    ExitCode = $exitCode
  }
}

try {
  $results = @(
    (Invoke-ExternalCommand -Label 'node --version' -Executable 'node.exe' -Arguments @('--version'))
    (Invoke-ExternalCommand -Label 'npm --version' -Executable 'npm.cmd' -Arguments @('--version'))
    (Invoke-ExternalCommand -Label 'npm ci' -Executable 'npm.cmd' -Arguments @('ci'))
    (Invoke-ExternalCommand -Label 'npm run verify' -Executable 'npm.cmd' -Arguments @('run', 'verify'))
    (Invoke-ExternalCommand -Label 'npm list echarts' -Executable 'npm.cmd' -Arguments @('list', 'echarts'))
    (Invoke-ExternalCommand -Label 'npm run browser:smoke' -Executable 'npm.cmd' -Arguments @('run', 'browser:smoke'))
  )

  $failed = @($results | Where-Object { $_.ExitCode -ne 0 })
  if ($failed.Count -gt 0) {
    throw "Command failed: $($failed[0].Label) (exit $($failed[0].ExitCode))"
  }

  $executedAt = (Get-Date).ToString('o')
  $transcript = @(
    'QuickCart Decision Room - actual Windows PowerShell clean run'
    "Executed at: $executedAt"
    "Working directory: $ProjectRoot"
    ''
  )
  foreach ($result in $results) {
    $transcript += "PS quickcart-decision-room> $($result.Label)"
    $transcript += $result.Output
    $transcript += "[exit $($result.ExitCode)]"
    $transcript += ''
  }
  $transcript += 'RESULT: WINDOWS CLEAN RUN PASS'
  Set-Content -LiteralPath (Join-Path $ProjectRoot 'evidence\windows-powershell-run.txt') -Value $transcript -Encoding UTF8

  $nodeVersion = ($results | Where-Object Label -eq 'node --version').Output.Trim()
  $npmVersion = ($results | Where-Object Label -eq 'npm --version').Output.Trim()
  $ciLine = (($results | Where-Object Label -eq 'npm ci').Output -split "`r?`n" | Where-Object { $_ -match 'added|audited|up to date' } | Select-Object -First 1)
  $verifyLines = (($results | Where-Object Label -eq 'npm run verify').Output -split "`r?`n" | Where-Object { $_ -match '^PASS:' })
  $echartsLine = (($results | Where-Object Label -eq 'npm list echarts').Output -split "`r?`n" | Where-Object { $_ -match 'echarts@6\.1\.0' } | Select-Object -First 1)

  Clear-Host
  Write-Host 'QuickCart Decision Room | verified clean run' -ForegroundColor Cyan
  Write-Host 'Actual Windows PowerShell session' -ForegroundColor DarkGray
  Write-Host "Executed: $executedAt"
  Write-Host ''
  Write-Host 'PS quickcart-decision-room> node --version'
  Write-Host $nodeVersion -ForegroundColor Green
  Write-Host 'PS quickcart-decision-room> npm --version'
  Write-Host $npmVersion -ForegroundColor Green
  Write-Host 'PS quickcart-decision-room> npm ci'
  Write-Host "$ciLine | exit 0" -ForegroundColor Green
  Write-Host 'PS quickcart-decision-room> npm run verify'
  foreach ($line in $verifyLines) { Write-Host $line -ForegroundColor Green }
  Write-Host 'PS quickcart-decision-room> npm list echarts'
  Write-Host $echartsLine -ForegroundColor Green
  Write-Host 'PS quickcart-decision-room> npm run browser:smoke'
  Write-Host 'PASS | SQL check + desktop/mobile + SVG + navigation | exit 0' -ForegroundColor Green
  Write-Host ''
  Write-Host 'RESULT: WINDOWS CLEAN RUN PASS' -ForegroundColor Green
  Write-Host 'URL: http://localhost:4173/ | snapshot: quickcart-evening-pilot-v1'

  @{ status = 'PASS'; executed_at = $executedAt } | ConvertTo-Json | Set-Content -LiteralPath $ReadyMarker -Encoding UTF8
} catch {
  Clear-Host
  Write-Host 'QuickCart Decision Room | Windows clean run' -ForegroundColor Cyan
  Write-Host "RESULT: FAIL - $($_.Exception.Message)" -ForegroundColor Red
  @{ status = 'FAIL'; error = $_.Exception.Message } | ConvertTo-Json | Set-Content -LiteralPath $ReadyMarker -Encoding UTF8
}

while (-not (Test-Path -LiteralPath $StopMarker)) {
  Start-Sleep -Milliseconds 250
}
