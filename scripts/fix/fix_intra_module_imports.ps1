# ABOUTME: Fix intra-module imports by reverting @/modules/<moduleName>/... back to relative paths.

Write-Host "[fix_intra_module_imports] Fixing intra-module imports..." -ForegroundColor Yellow

$modulePages = Get-ChildItem "src/modules/*/pages/*.tsx" -Recurse

foreach ($file in $modulePages) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
    $content = Get-Content $file.FullName -Raw
    
    # Get the module name from the file path
    $moduleName = $file.Directory.Parent.Name
    
    # Revert @/modules/<moduleName>/... back to relative paths
    # From: from '@/modules/<moduleName>/data/...'
    # To: from '../data/...' (since we're in pages/ and need to go up one level)
    $content = $content -replace "from '@/modules/$moduleName/", "from '../"
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "✅ Intra-module imports fixed in: $($file.Name)" -ForegroundColor Green
}

Write-Host "[fix_intra_module_imports] All intra-module imports are now relative!" -ForegroundColor Green 