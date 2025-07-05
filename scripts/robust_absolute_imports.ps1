# ABOUTME: Robustly convert all relative imports from src/ in module pages to @/ absolute imports using regex.

Write-Host "[robust_absolute_imports] Sweeping all module pages for relative imports..." -ForegroundColor Yellow

$targets = @('components', 'contexts', 'hooks', 'services', 'types', 'utils', 'constants', 'core', 'i18n', 'pages', 'config')
$modulePages = Get-ChildItem "src/modules/*/pages/*.tsx" -Recurse

foreach ($file in $modulePages) {
    Write-Host "Processing: $($file.FullName)" -ForegroundColor Cyan
    $content = Get-Content $file.FullName -Raw
    foreach ($target in $targets) {
        # Regex: from '<any number of ../><target>' to from '@/target'
        $content = [regex]::Replace($content, "from '\.\./(?:\.\./)*$target", "from '@/$target")
    }
    Set-Content $file.FullName $content -NoNewline
    Write-Host "✅ Imports fixed in: $($file.Name)" -ForegroundColor Green
}

Write-Host "[robust_absolute_imports] All module page imports are now absolute!" -ForegroundColor Green 