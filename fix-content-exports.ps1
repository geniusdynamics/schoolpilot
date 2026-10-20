$root = "D:\DevCenter\abuilds\EduGen\old_system\schoolpilot3\src\modules"
$hubFiles = Get-ChildItem -Recurse -Filter "*HubPage.tsx" $root
$fixed = @{}

foreach ($hf in $hubFiles) {
    $hubContent = Get-Content $hf.FullName -Raw
    $hubDir = $hf.DirectoryName
    $imports = [regex]::Matches($hubContent, "import\s+\{([^}]+)\}\s+from\s+'\.\/(\w+)'")
    
    foreach ($m in $imports) {
        $srcFile = $m.Groups[2].Value
        $srcPath = Join-Path $hubDir "$srcFile.tsx"
        
        if (Test-Path $srcPath) {
            $srcContent = Get-Content $srcPath -Raw
            
            if ($srcContent -notmatch "export const (\w+)Content") {
                $compMatch = [regex]::Match($srcContent, "const (\w+Page)\s*:")
                if ($compMatch.Success) {
                    $compName = $compMatch.Groups[1].Value
                    $importNames = ($m.Groups[1].Value -split ',').Trim()
                    $firstImport = $importNames[0]
                    
                    if (-not $fixed.ContainsKey($srcPath)) {
                        Add-Content -Path $srcPath -Value "`nexport const $firstImport = $compName;"
                        Write-Host "FIXED: $srcFile.tsx -> added $firstImport"
                        $fixed[$srcPath] = $true
                    }
                }
            }
        }
    }
}

Write-Host "`nTotal files fixed: $($fixed.Count)"
