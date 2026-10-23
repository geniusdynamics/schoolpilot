import React, { useState, useCallback } from 'react';
import Card from '@/components/ui/Card';

import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { DataGrid } from '@/components/ui/data';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

import { useTranslation } from 'react-i18next';
import type { GeneralLedgerEntry } from '@/core/types';
import { DownloadIcon, PrinterIcon } from '@/components/ui/icons';

interface LedgerEntryRow extends GeneralLedgerEntry {
  running_balance_display?: number;
}

export const AccountLedgerPageContent: React.FC = () => {
  // GAP(P1-E05): the canonical registry models no chart of accounts and no journal entry
  // (the ledger entries of spec 02 section 10 are still missing), so the account ledger keeps
  // reading the legacy collections.
  const { chartOfAccounts, generalLedgerEntries = [], loading } = useAppData();

  const { t } = useTranslation('reports');

  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [startDate, setStartDate] = useState<string>(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]); 
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]); 
  
  const [reportData, setReportData] = useState<LedgerEntryRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = useCallback(() => {
    if (!selectedAccountId) {
      alert(t('validation.selectGLAccount'));
      setReportData([]);
      return;
    }
    setIsGenerating(true);

    const filteredEntries = (generalLedgerEntries || [])
      .filter(entry => String(entry.account_id) === selectedAccountId)
      .filter(entry => {
        const entryDate = new Date(entry.effective_date);
        return (!startDate || entryDate >= new Date(startDate)) && (!endDate || entryDate <= new Date(endDate));
      })
      .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime() || new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

    let runningBalance = 0; 
    const processedData = filteredEntries.map(entry => {
      runningBalance += (entry.debit || 0) - (entry.credit || 0);
      return { ...entry, running_balance_display: runningBalance };
    });

    setReportData(processedData);
    setIsGenerating(false);
  }, [generalLedgerEntries, selectedAccountId, startDate, endDate, t]);

  const columns = [
    { header: 'Date', key: 'effective_date' as keyof LedgerEntryRow, render: (_v: any, item: LedgerEntryRow) => new Date(item.effective_date).toLocaleDateString() },
    { header: 'Description', key: 'description' as keyof LedgerEntryRow },
    { header: 'Source', key: 'source', render: (_v: any, item: LedgerEntryRow) => item.source_table ? `${item.source_table} (ID: ${item.source_id})` : '-' },
    { header: 'Debit (KES)', key: 'debit' as keyof LedgerEntryRow, render: (_v: any, item: LedgerEntryRow) => item.debit?.toFixed(2) || '-' },
    { header: 'Credit (KES)', key: 'credit' as keyof LedgerEntryRow, render: (_v: any, item: LedgerEntryRow) => item.credit?.toFixed(2) || '-' },
    { header: 'Balance (KES)', key: 'running_balance_display' as keyof LedgerEntryRow, render: (_v: any, item: LedgerEntryRow) => item.running_balance_display?.toFixed(2) || '0.00' },
  ];

  const isLoadingPage = loading.chartOfAccounts || loading.all; 

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      alert(t('messages.noDataToExport'));
      return;
    }
    const csvHeaders = columns.map(col => col.header).join(',');
    const csvRows = reportData.map(row => {
      return columns.map(col => {
        let value;
        if (col.render) { // Use render function if available
          value = col.render(row[col.key as keyof LedgerEntryRow], row);
        } else {
          value = row[col.key as keyof LedgerEntryRow];
        }
        const stringValue = String(value !== undefined && value !== null ? value : '-');
        return `"${stringValue.replace(/"/g, '""')}"`; // Escape double quotes and handle commas
      }).join(',');
    }).join('\n');
    
    const csvContent = `${csvHeaders}\n${csvRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `account_ledger_${selectedAccountId}_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-3">
      <Card title={t('accountLedgerPage.title')} info={t('accountLedgerPage.description')}>
        <div className="p-4 border-b mb-4 bg-surface-muted rounded-md filter-section">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <Select label={t('accountLedgerPage.selectAccount')} value={selectedAccountId || ''} onChange={e => setSelectedAccountId(e.target.value || undefined)} required>
                    <option value="">-- {t('accountLedgerPage.selectAccountPlaceholder')} --</option>
                    {(chartOfAccounts || []).map(coa => <option key={coa.id} value={coa.id}>{coa.account_code} - {coa.name}</option>)}
                </Select>
                <Input label={t('accountLedgerPage.startDate')} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <Input label={t('accountLedgerPage.endDate')} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                <Button onClick={handleGenerateReport} disabled={isGenerating || isLoadingPage || !selectedAccountId} className="h-10 print-hide">
                    {isGenerating ? <Spinner size="sm" /> : t('accountLedgerPage.generateLedger')}
                </Button>
            </div>
        </div>

        {isLoadingPage && !isGenerating ? (
             <div className="flex justify-center items-center py-10"><Spinner size="lg" /><span className="ml-2">{t('accountLedgerPage.loadingData')}</span></div>
        ) : isGenerating ? (
            <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">{t('accountLedgerPage.generatingLedger')}</span></div>
        ) : reportData.length > 0 ? (
             <>
                <div className="flex justify-end space-x-2 mb-4 print-hide">
                    <Button variant="secondary" size="sm" onClick={handlePrint} leftIcon={<PrinterIcon className="w-4 h-4"/>}>{t('accountLedgerPage.print')}</Button>
                    <Button variant="secondary" size="sm" onClick={handleExportCSV} leftIcon={<DownloadIcon className="w-4 h-4"/>}>{t('accountLedgerPage.exportCSV')}</Button>
                </div>
                <DataGrid columns={columns} data={(reportData || [])} loading={isGenerating} emptyState={t('accountLedgerPage.noTransactionsFound')}/>
            </>
        ) : (
            <p className="text-center text-surface-muted-fg py-4">{t('accountLedgerPage.pleaseSelectFiltersAndClickGenerateLedger')}</p>
        )}
      </Card>
    </div>
  );
};
const AccountLedgerPage: React.FC = () => (
  <div className="space-y-3">
    <AccountLedgerPageContent />
  </div>
);

export default AccountLedgerPage;
