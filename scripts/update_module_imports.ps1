# ABOUTME: This script updates all import paths in module definitions and RBAC files to use @/ absolute imports.

Write-Host "Updating import paths in module definitions and RBAC files..." -ForegroundColor Yellow

# Get all TypeScript files in the modules directory (excluding pages)
$moduleFiles = Get-ChildItem "src/modules/*/*.ts" -Recurse | Where-Object { $_.Directory.Name -ne "pages" }
$moduleFiles += Get-ChildItem "src/modules/*/*.tsx" -Recurse | Where-Object { $_.Directory.Name -ne "pages" }

foreach ($file in $moduleFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
    $content = Get-Content $file.FullName -Raw

    # Replace relative imports with absolute imports using @/ alias
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
    Write-Host "Updated imports in: $($file.Name)" -ForegroundColor Green
}

Write-Host "All module definition and RBAC imports updated to @/ absolute imports!" -ForegroundColor Green 