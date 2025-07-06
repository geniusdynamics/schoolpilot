# ABOUTME: This script converts all relative imports in module pages to use the @/ alias for absolute imports.

Write-Host "Converting all relative imports in module pages to use @/ absolute imports..." -ForegroundColor Yellow

$modulePages = Get-ChildItem "src/modules/*/pages/*.tsx" -Recurse

foreach ($file in $modulePages) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
    $content = Get-Content $file.FullName -Raw

    # Replace imports from src/components, src/contexts, src/hooks, src/services, src/types, src/utils, src/constants, src/core, src/i18n, src/pages, src/config
    $content = $content -replace "from '\.\./\.+/components", "from '@/components"
    $content = $content -replace "from '\.\./\.+/contexts", "from '@/contexts"
    $content = $content -replace "from '\.\./\.+/hooks", "from '@/hooks"
    $content = $content -replace "from '\.\./\.+/services", "from '@/services"
    $content = $content -replace "from '\.\./\.+/types", "from '@/types"
    $content = $content -replace "from '\.\./\.+/utils", "from '@/utils"
    $content = $content -replace "from '\.\./\.+/constants", "from '@/constants"
    $content = $content -replace "from '\.\./\.+/core", "from '@/core"
    $content = $content -replace "from '\.\./\.+/i18n", "from '@/i18n"
    $content = $content -replace "from '\.\./\.+/pages", "from '@/pages"
    $content = $content -replace "from '\.\./\.+/config", "from '@/config"

    # Write the updated content back to the file
    Set-Content $file.FullName $content -NoNewline
    Write-Host "Converted imports in: $($file.Name)" -ForegroundColor Green
}

Write-Host "All imports converted to @/ absolute imports!" -ForegroundColor Green 