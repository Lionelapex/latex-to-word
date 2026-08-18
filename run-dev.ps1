# Run dev server (uses npm.cmd via cmd.exe — bypasses PowerShell npm.ps1 / execution policy)
# Prefer run-dev.bat if this script still fails on your machine.
Set-Location $PSScriptRoot
$env:Path = "C:\Program Files\nodejs;" + [System.Environment]::GetEnvironmentVariable('Path','Machine') + ";" + [System.Environment]::GetEnvironmentVariable('Path','User')
& cmd.exe /c "`"C:\Program Files\nodejs\npm.cmd`" run dev"
