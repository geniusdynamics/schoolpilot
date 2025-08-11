# PowerShell script to update useAppData imports
# Updates imports from AppDataContext to the new hooks file

$sourceDir = "D:\DevCenter\abuilds\EduGen\old_system\schoolpilot3\src"

# Find all TypeScript and TSX files
$files = Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx" | Where-Object { $_.Name -ne "AppDataContext.tsx" }

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Check if file contains useAppData import from AppDataContext
    if ($content -match "import.*useAppData.*from.*['\"].*AppDataContext['\"]" -or 
        $content -match "import.*useAppDataInternal.*from.*['\"].*AppDataContext['\"]" -or
        $content -match "import.*\{[^}]*useAppData[^}]*\}.*from.*['\"].*AppDataContext['\"]" -or
        $content -match "import.*\{[^}]*useAppDataInternal[^}]*\}.*from.*['\"].*AppDataContext['\"]")
    {
        Write-Host "Updating: $($file.FullName)"
        
        # Replace various import patterns
        $content = $content -replace "import\s*\{\s*useAppData\s*\}\s*from\s*['\"]@/contexts/AppDataContext['\"];", "import { useAppData } from '@/hooks/useAppData';"
        $content = $content -replace "import\s*\{\s*useAppData\s*\}\s*from\s*['\"]\.\.\./contexts/AppDataContext['\"];", "import { useAppData } from '../hooks/useAppData';"
        $content = $content -replace "import\s*\{\s*useAppData\s*\}\s*from\s*['\"]\.\.\./\.\./\.\./contexts/AppDataContext['\"];", "import { useAppData } from '../../../hooks/useAppData';"
        $content = $content -replace "import\s*\{\s*useAppDataInternal\s*\}\s*from\s*['\"]\.\.\./contexts/AppDataContext['\"];", "import { useAppDataInternal } from '../hooks/useAppData';"
        
        # Handle mixed imports (useAppData with other imports)
        $content = $content -replace "import\s*\{([^}]*),\s*useAppData([^}]*)\}\s*from\s*['\"]@/contexts/AppDataContext['\"];", "import {`$1`$2} from '@/contexts/AppDataContext';`nimport { useAppData } from '@/hooks/useAppData';"
        $content = $content -replace "import\s*\{([^}]*),\s*useAppDataInternal([^}]*)\}\s*from\s*['\"]\.\.\./contexts/AppDataContext['\"];", "import {`$1`$2} from '../contexts/AppDataContext';`nimport { useAppDataInternal } from '../hooks/useAppData';"
        
        # Handle cases where useAppData is first in the import list
        $content = $content -replace "import\s*\{\s*useAppData\s*,([^}]*)\}\s*from\s*['\"]@/contexts/AppDataContext['\"];", "import {`$1} from '@/contexts/AppDataContext';`nimport { useAppData } from '@/hooks/useAppData';"
        $content = $content -replace "import\s*\{\s*useAppDataInternal\s*,([^}]*)\}\s*from\s*['\"]\.\.\./contexts/AppDataContext['\"];", "import {`$1} from '../contexts/AppDataContext';`nimport { useAppDataInternal } from '../hooks/useAppData';"
        
        # Write the updated content back to the file
        Set-Content -Path $file.FullName -Value $content -NoNewline
    }
}

Write-Host "Import updates completed!"