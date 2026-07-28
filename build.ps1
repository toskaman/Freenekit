# Script PowerShell de compilation pour Freenekit (Windows)
# Génère l'application autonome Freenekit.exe dans le dossier BUILD avec l'icône Freebox

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host '  Freenekit - Compilation Windows (.exe)' -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Génération de l'icône si nécessaire
if (-not (Test-Path (Join-Path $PSScriptRoot "icon.png"))) {
    Write-Host "[1/5] Génération de l'icône Freebox..." -ForegroundColor Yellow
    powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "generate-icon.ps1")
}

# 2. Nettoyage du dossier BUILD
$BuildDir = Join-Path $PSScriptRoot "BUILD"
if (Test-Path $BuildDir) {
    Write-Host "[2/5] Nettoyage de l'ancien dossier BUILD..." -ForegroundColor Yellow
    Remove-Item -Path $BuildDir -Recurse -Force
}

# 3. Installation des dépendances NPM si absentes
Write-Host "[3/5] Vérification des dépendances NPM..." -ForegroundColor Green
if (-not (Test-Path (Join-Path $PSScriptRoot "node_modules"))) {
    Write-Host "  Installation des dépendances..." -ForegroundColor Gray
    npm install
}

# 4. Build Frontend Vite
Write-Host "[4/5] Compilation des ressources Web (Vite Build)..." -ForegroundColor Green
npm run build

# 5. Packaging Electron avec l'icône Freebox dans BUILD
Write-Host "[5/5] Packaging Electron vers BUILD\..." -ForegroundColor Green
npx electron-builder --win dir

$ExePath = Join-Path $BuildDir "win-unpacked\Freenekit.exe"

if (Test-Path $ExePath) {
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "  COMPILATION RÉUSSIE AVEC SUCCÈS !" -ForegroundColor Green
    Write-Host "  Exécutable créé : $ExePath" -ForegroundColor White
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host "`n[ERREUR] Une erreur est survenue lors de la création du fichier .exe." -ForegroundColor Red
}
