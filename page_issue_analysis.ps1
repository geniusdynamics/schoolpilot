# ABOUTME: PowerShell script to analyze pages for common issues that cause blank screens
# ABOUTME: Checks for import issues, missing context usage, and other problems

function Test-PageIssues {
    param([string]$FilePath)
    
    $issues = @()
    $content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) {
        $issues += "❌ File is empty or cannot be read"
        return $issues
    }
    
    # Check for common imports
    if ($content -notmatch "import.*React.*from.*'react'") {
        $issues += "⚠️ Missing React import"
    }
    
    # Check for useAppData context usage
    if ($content -match "useAppData") {
        if ($content -notmatch "import.*useAppData.*from.*'@/contexts/AppDataContext'") {
            $issues += "❌ Uses useAppData but missing import"
        }
    }
    
    # Check for missing export
    if ($content -notmatch "export default") {
        $issues += "❌ Missing default export"
    }
    
    # Check for incomplete components (no return statement)
    if ($content -match "const.*:\s*React\.FC.*=.*=\u003e.*\{" -and $content -notmatch "return\s*\(") {
        $issues += "❌ Component appears to have no return statement"
    }
    
    # Check for unclosed JSX
    $openTags = ([regex]::Matches($content, '\u003c[^/][^>]*\u003e')).Count
    $closeTags = ([regex]::Matches($content, '\u003c/[^>]*\u003e')).Count
    $selfClosing = ([regex]::Matches($content, '\u003c[^>]*/\u003e')).Count
    
    if (($openTags - $selfClosing) -ne $closeTags) {
        $issues += "⚠️ Potential JSX tag mismatch (could cause render issues)"
    }
    
    # Check for basic TypeScript issues
    if ($content -match ":\s*React\.FC.*=.*\(" -and $content -notmatch "React\.FC\u003c") {
        $issues += "⚠️ React.FC might need type parameters"
    }
    
    return $issues
}

function Start-PageAnalysis {
    Write-Host "=== PAGE ISSUE ANALYSIS ===" -ForegroundColor Yellow
    Write-Host ""
    
    $pageDirectories = @(
        "src\pages",
        "src\pages\administration", 
        "src\pages\academics",
        "src\pages\finance",
        "src\pages\hr",
        "src\pages\inventory",
        "src\pages\library",
        "src\pages\nutrition",
        "src\pages\reports",
        "src\pages\settings",
        "src\pages\administration\students"
    )
    
    $totalIssues = 0
    $totalPages = 0
    
    foreach ($dir in $pageDirectories) {
        if (Test-Path $dir) {
            $pages = Get-ChildItem "$dir\*.tsx" -ErrorAction SilentlyContinue
            
            if ($pages) {
                Write-Host "Analyzing ${dir}:" -ForegroundColor Cyan
                
                foreach ($page in $pages) {
                    $totalPages++
                    $issues = Test-PageIssues -FilePath $page.FullName
                    
                    if ($issues.Count -eq 0) {
                        Write-Host "  ✅ $($page.Name)" -ForegroundColor Green
                    } else {
                        Write-Host "  ❌ $($page.Name)" -ForegroundColor Red
                        foreach ($issue in $issues) {
                            Write-Host "     $issue" -ForegroundColor Red
                        }
                        $totalIssues += $issues.Count
                    }
                }
                Write-Host ""
            }
        }
    }
    
    Write-Host "=== ANALYSIS SUMMARY ===" -ForegroundColor Yellow
    Write-Host "Total Pages Analyzed: $totalPages"
    Write-Host "Total Issues Found: $totalIssues" -ForegroundColor $(if ($totalIssues -gt 0) { "Red" } else { "Green" })
    
    return @{
        totalPages = $totalPages
        totalIssues = $totalIssues
    }
}

# Run analysis
$result = Start-PageAnalysis
