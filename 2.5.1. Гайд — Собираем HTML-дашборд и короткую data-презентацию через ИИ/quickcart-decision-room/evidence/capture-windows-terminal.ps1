$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$branchRoot = (Resolve-Path (Join-Path $projectRoot '..')).Path
$assetDirectory = Join-Path $branchRoot 'assets\sprint-2\2.5.1'
$outputPath = Join-Path $assetDirectory 'quickcart-windows-powershell.png'
$readyMarker = Join-Path $PSScriptRoot '.windows-terminal-ready.json'
$stopMarker = Join-Path $PSScriptRoot '.windows-terminal-stop'
$showScript = Join-Path $PSScriptRoot 'show-windows-clean.ps1'
$windowTitle = 'QuickCart Decision Room - verified PowerShell'

New-Item -ItemType Directory -Path $assetDirectory -Force | Out-Null
Remove-Item -LiteralPath $readyMarker, $stopMarker -Force -ErrorAction SilentlyContinue

$arguments = @(
  '-NoProfile',
  '-ExecutionPolicy', 'Bypass',
  '-File', "`"$showScript`"",
  '-ProjectRoot', "`"$projectRoot`"",
  '-ReadyMarker', "`"$readyMarker`"",
  '-StopMarker', "`"$stopMarker`"",
  '-WindowTitle', "`"$windowTitle`""
)

$terminal = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -PassThru

try {
  $deadline = (Get-Date).AddMinutes(3)
  while (-not (Test-Path -LiteralPath $readyMarker) -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 250
  }
  if (-not (Test-Path -LiteralPath $readyMarker)) {
    throw 'Timed out waiting for the Windows clean-run terminal.'
  }

  $result = Get-Content -LiteralPath $readyMarker -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($result.status -ne 'PASS') {
    throw "Windows clean run failed: $($result.error)"
  }

  Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class QuickCartWindowCapture {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll", SetLastError=true)] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int width, int height, bool repaint);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@
  Add-Type -AssemblyName System.Drawing

  $handle = [IntPtr]::Zero
  $handleDeadline = (Get-Date).AddSeconds(15)
  while ($handle -eq [IntPtr]::Zero -and (Get-Date) -lt $handleDeadline) {
    $terminal.Refresh()
    $handle = $terminal.MainWindowHandle
    if ($handle -eq [IntPtr]::Zero) {
      $windowProcess = Get-Process | Where-Object { $_.MainWindowTitle -eq $windowTitle } | Select-Object -First 1
      if ($windowProcess) { $handle = $windowProcess.MainWindowHandle }
    }
    if ($handle -eq [IntPtr]::Zero) { Start-Sleep -Milliseconds 250 }
  }
  if ($handle -eq [IntPtr]::Zero) { throw 'Could not locate the PowerShell window.' }

  [QuickCartWindowCapture]::MoveWindow($handle, 20, 20, 1200, 675, $true) | Out-Null
  [QuickCartWindowCapture]::SetForegroundWindow($handle) | Out-Null
  Start-Sleep -Seconds 1

  $rect = New-Object QuickCartWindowCapture+RECT
  if (-not [QuickCartWindowCapture]::GetWindowRect($handle, [ref]$rect)) {
    throw 'GetWindowRect failed for the PowerShell window.'
  }
  $bitmap = New-Object System.Drawing.Bitmap 1200, 675
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }

  Write-Output "PASS: captured actual Windows PowerShell clean run to $outputPath"
} finally {
  Set-Content -LiteralPath $stopMarker -Value 'stop' -Encoding ASCII
  if (-not $terminal.HasExited) {
    $terminal.WaitForExit(5000) | Out-Null
  }
  if (-not $terminal.HasExited) {
    Stop-Process -Id $terminal.Id -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $readyMarker, $stopMarker -Force -ErrorAction SilentlyContinue
}
