import React, { useState, useMemo, useCallback } from 'react';
import Card from '../../components/ui/Card';
import { BookOpenIcon, PrinterIcon, DownloadIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { ChartOfAccount, GeneralLedgerEntry } from '../../types';
import { useTranslation } from 'react-i18next';

interface LedgerEntryRow extends GeneralLedgerEntry {
  running_balance_display?: number;
}

const AccountLedgerPage: React.FC = () => {
  const { chartOfAccounts, rawInitialData, loading } = useAppData(); 
  const { initialMockGeneralLedgerEntries: generalLedgerEntries } = rawInitialData;

  const { t } = useTranslation();

  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [startDate, setStartDate] = useState<string>(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]); 
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]); 
  
  const [reportData, setReportData] = useState<LedgerEntryRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = useCallback(() => {
    if (!selectedAccountId) {
      alert("Please select a GL Account.");
      setReportData([]);
      return;
    }
    setIsGenerating(true);

    const filteredEntries = generalLedgerEntries
      .filter(entry => entry.account_id === selectedAccountId)
      .filter(entry => {
        const entryDate = new Date(entry.effective_date);
        return (!startDate || entryDate >= new Date(startDate)) && (!endDate || entryDate <= new Date(endDate));
      })
      .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime() || new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

    let runningBalance = 0; 
    const processedData = filteredEntries.map(entry => {
      runningBalance += (entry.debit || 0) - (entry.credit || 0);
      return { ...entry, running_balance_display: runningBalance };
    });

    setReportData(processedData);
    setIsGenerating(false);
  }, [generalLedgerEntries, selectedAccountId, startDate, endDate]);

  const columns = [
    { header: 'Date', accessor: 'effective_date' as keyof LedgerEntryRow, render: (item: LedgerEntryRow) => new Date(item.effective_date).toLocaleDateString() },
    { header: 'Description', accessor: 'description' as keyof LedgerEntryRow },
    { header: 'Source', accessor: (item: LedgerEntryRow) => item.source_table ? `${item.source_table} (ID: ${item.source_id})` : '-' },
    { header: 'Debit (KES)', accessor: 'debit' as keyof LedgerEntryRow, render: (item: LedgerEntryRow) => item.debit?.toFixed(2) || '-' },
    { header: 'Credit (KES)', accessor: 'credit' as keyof LedgerEntryRow, render: (item: LedgerEntryRow) => item.credit?.toFixed(2) || '-' },
    { header: 'Balance (KES)', accessor: 'running_balance_display' as keyof LedgerEntryRow, render: (item: LedgerEntryRow) => item.running_balance_display?.toFixed(2) || '0.00' },
  ];

  const isLoadingPage = loading.chartOfAccounts || loading.all; 

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      alert("No data to export.");
      return;
    }
    const csvHeaders = columns.map(col => col.header).join(',');
    const csvRows = reportData.map(row => {
      return columns.map(col => {
        let value;
        if (col.render) { // Use render function if available
          value = col.render(row);
        } else if (typeof col.accessor === 'function') {
          value = col.accessor(row);
        } else {
          // @ts-ignore
          value = row[col.accessor as keyof LedgerEntryRow];
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
    <div className="space-y-6">
      <Card title={t('accountLedgerPage.title')}>
        <div className="p-4 border-b mb-4 bg-gray-50 rounded-md filter-section">
            <p className="text-sm text-gray-600 mb-4">
                {t('accountLedgerPage.description')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <Select label={t('accountLedgerPage.selectAccount')} value={selectedAccountId || ''} onChange={e => setSelectedAccountId(Number(e.target.value) || undefined)} required>
                    <option value="">-- {t('accountLedgerPage.selectAccountPlaceholder')} --</option>
                    {chartOfAccounts.map(coa => <option key={coa.id} value={coa.id}>{coa.account_code} - {coa.name}</option>)}
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
                <Table columns={columns} data={reportData} isLoading={isGenerating} emptyStateMessage={t('accountLedgerPage.noTransactionsFound')}/>
            </>
        ) : (
            <p className="text-center text-gray-500 py-4">{t('accountLedgerPage.pleaseSelectFiltersAndClickGenerateLedger')}</p>
        )}
      </Card>
    </div>
  );
};

export default AccountLedgerPage;
