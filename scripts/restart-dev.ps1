$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "Stopping Vite ports 5173-5175..."
foreach ($port in 5173, 5174, 5175) {
  $lines = netstat -ano | Select-String ":$port\s" | Select-String "LISTENING"
  foreach ($line in $lines) {
    if ($line -match "\s(\d+)\s*$") {
      $procId = [int]$Matches[1]
      if ($procId -gt 0) {
        Write-Host "  Killing PID $procId on port $port"
        taskkill /PID $procId /F | Out-Null
      }
    }
  }
}

$npm = "C:\Program Files\nodejs\npm.cmd"
if (-not (Test-Path $npm)) {
  throw "npm.cmd not found at $npm"
}

Write-Host "Generating OCR test image..."
powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "generate-ocr-fixture.ps1")

Write-Host "Running unit tests..."
& $npm test
if ($LASTEXITCODE -ne 0) { throw "npm test failed" }

Write-Host "Running OCR verification (Tesseract.js)..."
& "C:\Program Files\nodejs\node.exe" (Join-Path $PSScriptRoot "verify-image-ocr.mjs")
if ($LASTEXITCODE -ne 0) { throw "OCR verification failed" }

$logOut = Join-Path $root "dev-server-out.log"
$logErr = Join-Path $root "dev-server-err.log"
Write-Host "Starting dev server on http://127.0.0.1:5173/latex-to-word/ ..."
Start-Process -FilePath $npm -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "5173") -WorkingDirectory $root -RedirectStandardOutput $logOut -RedirectStandardError $logErr -WindowStyle Hidden

Start-Sleep -Seconds 8
foreach ($log in @($logOut, $logErr)) {
  if (Test-Path $log) {
    Write-Host "--- $(Split-Path $log -Leaf) ---"
    Get-Content $log -Tail 10
  }
}

try {
  $response = Invoke-WebRequest -Uri "http://127.0.0.1:5173/latex-to-word/" -UseBasicParsing -TimeoutSec 10
  Write-Host "HTTP $($response.StatusCode) OK"
} catch {
  Write-Warning "Server may still be starting. Open http://127.0.0.1:5173/latex-to-word/ manually."
}

Write-Host ""
Write-Host "Ready: http://127.0.0.1:5173/latex-to-word/"
Write-Host "Test OCR: click Extract from image or paste a screenshot with Ctrl+V in the textarea."
