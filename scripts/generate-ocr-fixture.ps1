$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $root "tests\fixtures"
$outFile = Join-Path $outDir "hello-ocr.png"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 420, 90
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font("Arial", 28, [System.Drawing.FontStyle]::Regular)
$graphics.DrawString("Hello OCR Test", $font, [System.Drawing.Brushes]::Black, 12, 24)
$bitmap.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

Write-Host "Wrote OCR fixture: $outFile"
