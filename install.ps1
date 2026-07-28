# QckPages CLI Windows Installer Script
# Usage: iwr -useb https://github.com/jR4dh3y/qckpages/releases/latest/download/install.ps1 | iex

$ErrorActionPreference = "Stop"

$repoUrl = "https://github.com/jR4dh3y/qckpages"
$downloadUrl = "$repoUrl/releases/latest/download"
$binaryName = "qckpage.exe"
$assetName = "qckpage-windows-x64.zip"
$installDir = "$env:LOCALAPPDATA\Programs\qckpage"
$targetPath = Join-Path $installDir $binaryName
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "qckpage-$([guid]::NewGuid())"

Write-Host "Installing QckPages CLI (qckpage)..." -ForegroundColor Cyan

try {
    New-Item -ItemType Directory -Force -Path $installDir | Out-Null
    New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

    $archivePath = Join-Path $tempDir $assetName
    $checksumsPath = Join-Path $tempDir "SHA256SUMS"

    Write-Host "Downloading qckpage for Windows..." -ForegroundColor Yellow
    Invoke-WebRequest -UseBasicParsing -Uri "$downloadUrl/$assetName" -OutFile $archivePath
    Invoke-WebRequest -UseBasicParsing -Uri "$downloadUrl/SHA256SUMS" -OutFile $checksumsPath

    $checksumLine = Get-Content $checksumsPath | Where-Object { $_ -match "\s+$([regex]::Escape($assetName))$" } | Select-Object -First 1
    if (!$checksumLine) {
        throw "No checksum published for $assetName."
    }

    $expectedChecksum = ($checksumLine -split "\s+")[0]
    $actualChecksum = (Get-FileHash -Algorithm SHA256 $archivePath).Hash
    if ($actualChecksum -ne $expectedChecksum) {
        throw "Checksum verification failed for $assetName."
    }

    Expand-Archive -Path $archivePath -DestinationPath $tempDir -Force
    Copy-Item -Force (Join-Path $tempDir $binaryName) $targetPath
} finally {
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir
    }
}

# Add to User PATH if not present
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathEntries = @($userPath -split ";" | Where-Object { $_ })
if ($pathEntries -notcontains $installDir) {
    $updatedPath = (@($pathEntries) + $installDir) -join ";"
    [Environment]::SetEnvironmentVariable("Path", $updatedPath, "User")
    Write-Host "[NOTE] Added $installDir to your User PATH environment variable." -ForegroundColor Yellow
}

Write-Host "[OK] Successfully installed qckpage to $targetPath" -ForegroundColor Green
Write-Host "`nGet started with:" -ForegroundColor Cyan
Write-Host "  qckpage login"
Write-Host "  qckpage publish mypage.html -s my-slug`n"
