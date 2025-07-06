# Fix Import Paths Script
# This script updates all relative import paths in the moved pages to work with the new modular structure

Write-Host "Fixing import paths in moved pages..." -ForegroundColor Yellow

# Get all TypeScript files in the modules/pages directories
$modulePages = Get-ChildItem "src/modules/*/pages/*.tsx" -Recurse

foreach ($file in $modulePages) {
    Write-Host "Processing: $($file.FullName)" -ForegroundColor Cyan
    
    $content = Get-Content $file.FullName -Raw
    
    # Fix relative imports that go up two levels (../../) to go up three levels (../../../)
    # This is needed because pages moved from src/pages/module/ to src/modules/module/pages/
    $content = $content -replace 'from ''\.\./\.\./', 'from ''../../../'
    
    # Fix relative imports that go up one level (../) to go up two levels (../../)
    $content = $content -replace 'from ''\.\./', 'from ''../../'
    
    # Fix imports that reference types, contexts, etc. from the root src directory
    $content = $content -replace 'from ''\.\./\.\./types''', 'from ''../../../types'''
    $content = $content -replace 'from ''\.\./\.\./contexts', 'from ''../../../contexts'
    $content = $content -replace 'from ''\.\./\.\./hooks', 'from ''../../../hooks'
    $content = $content -replace 'from ''\.\./\.\./services', 'from ''../../../services'
    $content = $content -replace 'from ''\.\./\.\./utils', 'from ''../../../utils'
    
    # Write the updated content back to the file
    Set-Content $file.FullName $content -NoNewline
    
    Write-Host "Fixed imports in: $($file.Name)" -ForegroundColor Green
}

Write-Host "Import path fixing completed!" -ForegroundColor Green 