# ABOUTME: PowerShell script to validate all routes have corresponding page files
# ABOUTME: Cross-references App.tsx routes with actual filesystem structure

# Expected pages based on App.tsx routes
$expectedPages = @{
    "root" = @(
        "DashboardPage.tsx",
        "SettingsPage.tsx"
    )
    "administration" = @(
        "AdministrationDashboardPage.tsx",
        "StaffListPage.tsx",
        "StudentsListPage.tsx",
        "PartnersPage.tsx",
        "DepartmentsPage.tsx",
        "DesignationsPage.tsx",
        "StudentCategoriesPage.tsx",
        "DormitoriesPage.tsx",
        "ClubsPage.tsx",
        "CustomersPage.tsx",
        "StudentHealthRecordsPage.tsx",
        "StudentAttendancePage.tsx",
        "CommunicationTemplatesPage.tsx",
        "MessageCampaignsPage.tsx",
        "AcademicStructurePage.tsx",
        "AcademicYearsPage.tsx",
        "SchoolPeriodsPage.tsx",
        "AcademicPeriodDefinitionsPage.tsx"
    )
    "administration\students" = @(
        "StudentDetailPage.tsx",
        "StudentFinancialDashboardPage.tsx"
    )
    "academics" = @(
        "AcademicsDashboardPage.tsx",
        "ClassesPage.tsx",
        "SubjectsPage.tsx",
        "ExamSessionsPage.tsx",
        "SubjectPapersManagementPage.tsx",
        "GradingSchemesPage.tsx",
        "StudentExamResultsEntryPage.tsx",
        "TimetablePeriodsPage.tsx",
        "TimetableEntriesPage.tsx",
        "ClassSubjectAllocationsPage.tsx",
        "TeacherSubjectAssignmentPage.tsx",
        "StudentSubjectEnrollmentPage.tsx",
        "ExamAnalysisPage.tsx"
    )
    "finance" = @(
        "FinanceDashboardPage.tsx",
        "BanksPage.tsx",
        "ChartOfAccountsPage.tsx",
        "CustomerInvoicesPage.tsx",
        "ExpensesPage.tsx",
        "FeeAdjustmentsPage.tsx",
        "StudentOpeningBalancesPage.tsx",
        "StudentPaymentsPage.tsx",
        "FeeTemplatesPage.tsx",
        "EffectFeeStructuresPage.tsx",
        "TransportRoutesPage.tsx",
        "StudentTransportAssignmentsPage.tsx",
        "SuppliersPage.tsx",
        "SupplierInvoicesPage.tsx",
        "GeneralReceiptsPage.tsx"
    )
    "hr" = @(
        "HRDashboardPage.tsx",
        "PayrollPeriodsPage.tsx",
        "PayrollItemTypesPage.tsx",
        "StaffSalarySettingsPage.tsx",
        "PayslipsPage.tsx"
    )
    "inventory" = @(
        "InventoryDashboardPage.tsx",
        "SchoolProcurementDashboardPage.tsx",
        "VendorPortalDashboardPage.tsx",
        "WarehousesPage.tsx",
        "ItemCategoriesPage.tsx",
        "ItemsPage.tsx",
        "FixedAssetsPage.tsx",
        "RequisitionsPage.tsx",
        "PurchaseOrdersPage.tsx",
        "StockIssuancePage.tsx",
        "StockLevelsPage.tsx"
    )
    "library" = @(
        "LibraryDashboardPage.tsx",
        "BookCategoriesPage.tsx",
        "BooksPage.tsx",
        "BookLoansPage.tsx",
        "FinesPage.tsx"
    )
    "nutrition" = @(
        "NutritionDashboardPage.tsx",
        "MealPlansPage.tsx",
        "MenusPage.tsx",
        "StudentMealAssignmentsPage.tsx",
        "MealConsumptionLogPage.tsx",
        "MerchantsPage.tsx",
        "StudentWalletPage.tsx"
    )
    "reports" = @(
        "StudentMasterlistPage.tsx",
        "ExamResultsHorizontalPage.tsx",
        "StudentFinancialSummaryPage.tsx",
        "StudentVoteheadStatementPage.tsx",
        "TeacherAssignmentsPage.tsx",
        "AccountLedgerPage.tsx",
        "FeeCollectionSummaryPage.tsx"
    )
    "settings" = @(
        "SettingsSchoolProfilePage.tsx",
        "SettingsUsersPage.tsx",
        "SettingsWorkflowsPage.tsx",
        "AuditLogPage.tsx",
        "DatabaseSettingsPage.tsx"
    )
}

function Test-PageExists {
    param(
        [string]$BasePath,
        [string]$RelativePath,
        [string]$FileName
    )
    
    if ($RelativePath -eq "root") {
        $fullPath = Join-Path $BasePath "src\pages\$FileName"
    } else {
        $fullPath = Join-Path $BasePath "src\pages\$RelativePath\$FileName"
    }
    
    return Test-Path $fullPath
}

function Start-PageValidation {
    $basePath = Get-Location
    $missing = @()
    $existing = @()
    
    Write-Host "=== PAGE VALIDATION REPORT ===" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($moduleEntry in $expectedPages.GetEnumerator()) {
        $folder = $moduleEntry.Key
        $pages = $moduleEntry.Value
        
        Write-Host "Checking $($folder.ToUpper()) module:" -ForegroundColor Cyan
        
        foreach ($page in $pages) {
            $exists = Test-PageExists -BasePath $basePath -RelativePath $folder -FileName $page
            
            if ($exists) {
                $existing += "$folder/$page"
                Write-Host "  ✅ $page" -ForegroundColor Green
            } else {
                $missing += "$folder/$page"
                Write-Host "  ❌ $page - MISSING" -ForegroundColor Red
            }
        }
        Write-Host ""
    }
    
    $totalExpected = ($expectedPages.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum
    
    Write-Host "=== SUMMARY ===" -ForegroundColor Yellow
    Write-Host "Total Expected: $totalExpected"
    Write-Host "Existing: $($existing.Count)" -ForegroundColor Green
    Write-Host "Missing: $($missing.Count)" -ForegroundColor Red
    
    if ($missing.Count -gt 0) {
        Write-Host ""
        Write-Host "=== MISSING PAGES ===" -ForegroundColor Red
        foreach ($page in $missing) {
            Write-Host "  - $page" -ForegroundColor Red
        }
    }
    
    return @{
        existing = $existing
        missing = $missing
    }
}

# Run validation
$result = Start-PageValidation
$result | ConvertTo-Json -Depth 2 | Out-File "page_validation_result.json" -Encoding UTF8
Write-Host ""
Write-Host "Results saved to page_validation_result.json" -ForegroundColor Yellow
