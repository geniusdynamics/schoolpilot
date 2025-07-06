# Fix Import Paths Script v2 - More Comprehensive
# This script updates all relative import paths in the moved pages to work with the new modular structure

Write-Host "Fixing import paths in moved pages (v2)..." -ForegroundColor Yellow

# Get all TypeScript files in the modules/pages directories
$modulePages = Get-ChildItem "src/modules/*/pages/*.tsx" -Recurse

foreach ($file in $modulePages) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
    
    $content = Get-Content $file.FullName -Raw
    
    # Fix all relative imports to go up 3 levels to reach src/
    # From src/modules/module/pages/ to src/components/ui/ = ../../../components/ui/
    $content = $content -replace 'from ''\.\./\.\./\.\./\.\./', 'from ''../../../'
    $content = $content -replace 'from ''\.\./\.\./\.\./', 'from ''../../../'
    $content = $content -replace 'from ''\.\./\.\./', 'from ''../../../'
    $content = $content -replace 'from ''\.\./', 'from ''../../../'
    
    # Fix specific imports that should go to the root src directory
    $content = $content -replace 'from ''\.\./\.\./\.\./types''', 'from ''../../../types'''
    $content = $content -replace 'from ''\.\./\.\./\.\./contexts', 'from ''../../../contexts'
    $content = $content -replace 'from ''\.\./\.\./\.\./hooks', 'from ''../../../hooks'
    $content = $content -replace 'from ''\.\./\.\./\.\./services', 'from ''../../../services'
    $content = $content -replace 'from ''\.\./\.\./\.\./utils', 'from ''../../../utils'
    $content = $content -replace 'from ''\.\./\.\./\.\./components', 'from ''../../../components'
    
    # Write the updated content back to the file
    Set-Content $file.FullName $content -NoNewline
    
    Write-Host "Fixed imports in: $($file.Name)" -ForegroundColor Green
}

Write-Host "Import path fixing completed (v2)!" -ForegroundColor Green 