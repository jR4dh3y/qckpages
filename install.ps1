# QckPages CLI Windows Installer Script
# Usage: iwr -useb https://raw.githubusercontent.com/jR4dh3y/qckpages/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$repoUrl = "https://github.com/jR4dh3y/qckpages"
$binaryName = "qckpage.exe"
$installDir = "$env:LOCALAPPDATA\Programs\qckpage"
$targetPath = Join-Path $installDir $binaryName

Write-Host "Installing QckPages CLI (qckpage)..." -ForegroundColor Cyan

if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
}

$downloadUrl = "$repoUrl/raw/main/dist/qckpage-windows-x64.exe"
Write-Host "Downloading qckpage for Windows..." -ForegroundColor Yellow

Invoke-WebRequest -Uri $downloadUrl -OutFile $targetPath

# Add to User PATH if not present
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$installDir", "User")
    Write-Host "[NOTE] Added $installDir to your User PATH environment variable." -ForegroundColor Yellow
}

Write-Host "[OK] Successfully installed qckpage to $targetPath" -ForegroundColor Green
Write-Host "`nGet started with:" -ForegroundColor Cyan
Write-Host "  qckpage login"
Write-Host "  qckpage publish mypage.html -s my-slug`n"
