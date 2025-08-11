# ABOUTME: Fix cross-module imports by converting them to use @/ alias.

Write-Host "[fix_cross_module_imports] Fixing cross-module imports..." -ForegroundColor Yellow

$modulePages = Get-ChildItem "src/modules/*/pages/*.tsx" -Recurse

foreach ($file in $modulePages) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
    $content = Get-Content $file.FullName -Raw
    
    # Get the current module name from the file path
    $currentModule = $file.Directory.Parent.Name
    
    # Fix cross-module imports: from '../../../../../../modules/<otherModule>/...' to '@/modules/<otherModule>/...'
    # This regex matches any number of ../ followed by modules/<moduleName>/ where moduleName is not the current module
    $content = [regex]::Replace($content, "from '\.\./(?:\.\./)*modules/([^/]+)/", "from '@/modules/`$1/")
    
    Set-Content $file.FullName $content -NoNewline
    Write-Host "✅ Cross-module imports fixed in: $($file.Name)" -ForegroundColor Green
}

Write-Host "[fix_cross_module_imports] All cross-module imports are now using @/ alias!" -ForegroundColor Green 