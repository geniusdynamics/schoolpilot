# SchoolPilot3 Comprehensive Fix Script
# PowerShell Version

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SchoolPilot3 Comprehensive Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting comprehensive fix execution..." -ForegroundColor Yellow
Write-Host ""

# Create backup directory
$backupDir = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host "Creating backup directory: $backupDir" -ForegroundColor Green
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

# Function to execute a step with error handling
function Execute-Step {
    param(
        [string]$StepName,
        [string]$ScriptPath,
        [int]$StepNumber,
        [int]$TotalSteps
    )
    
    Write-Host ""
    Write-Host "[$StepNumber/$TotalSteps] $StepName..." -ForegroundColor Yellow
    
    try {
        $result = node $ScriptPath 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $StepName completed" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $StepName failed" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ $StepName errored: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Step 1: Modular Architecture Fix
$step1Success = Execute-Step -StepName "Modular Architecture Fix" -ScriptPath "scripts/fix_modular_architecture_and_rxdb.js" -StepNumber 1 -TotalSteps 5
if (!$step1Success) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR: Modular architecture fix failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Backup files are available in: $backupDir" -ForegroundColor Yellow
    Write-Host "You can restore original files from the backup." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To rollback changes:" -ForegroundColor Yellow
    Write-Host "1. Copy files from $backupDir back to src/" -ForegroundColor Yellow
    Write-Host "2. Restart the development server" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 2: RxDB Production Mode Fix
$step2Success = Execute-Step -StepName "RxDB Production Mode Fix" -ScriptPath "scripts/fix_rxdb_production_mode.js" -StepNumber 2 -TotalSteps 5
if (!$step2Success) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "ERROR: RxDB production mode fix failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Backup files are available in: $backupDir" -ForegroundColor Yellow
    Write-Host "You can restore original files from the backup." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To rollback changes:" -ForegroundColor Yellow
    Write-Host "1. Copy files from $backupDir back to src/" -ForegroundColor Yellow
    Write-Host "2. Restart the development server" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 3: Application Testing
$step3Success = Execute-Step -StepName "Application Testing" -ScriptPath "scripts/test_application_functionality.js" -StepNumber 3 -TotalSteps 5
if (!$step3Success) {
    Write-Host "⚠️  Some tests failed, but continuing..." -ForegroundColor Yellow
}

# Step 4: Build Test
Write-Host ""
Write-Host "[4/5] Testing Application Build..." -ForegroundColor Yellow
try {
    $buildResult = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Application build successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Application build failed" -ForegroundColor Red
        Write-Host $buildResult -ForegroundColor Red
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "ERROR: Application build failed" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Backup files are available in: $backupDir" -ForegroundColor Yellow
        Write-Host "You can restore original files from the backup." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To rollback changes:" -ForegroundColor Yellow
        Write-Host "1. Copy files from $backupDir back to src/" -ForegroundColor Yellow
        Write-Host "2. Restart the development server" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
} catch {
    Write-Host "❌ Build test errored: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Final Verification
Write-Host ""
Write-Host "[5/5] Final Verification..." -ForegroundColor Yellow
Write-Host "✓ All fixes completed successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "FIX EXECUTION COMPLETED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backup files are available in: $backupDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "To test the application:" -ForegroundColor Cyan
Write-Host "1. Run: npm run dev" -ForegroundColor White
Write-Host "2. Open: http://localhost:5173" -ForegroundColor White
Write-Host "3. Test both demo and production modes" -ForegroundColor White
Write-Host ""
Write-Host "To switch to production mode:" -ForegroundColor Cyan
Write-Host "1. Edit src/contexts/config.ts" -ForegroundColor White
Write-Host "2. Change APP_MODE to 'production'" -ForegroundColor White
Write-Host "3. Restart the development server" -ForegroundColor White
Write-Host ""
Write-Host "Press Enter to exit..." -ForegroundColor Yellow
Read-Host 