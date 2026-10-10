import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  BookOpenIcon,
  DownloadIcon,
} from '@/components/ui/icons';
import { AccountLedgerPageContent } from './AccountLedgerPage';
import { CashBookPageContent } from './CashBookPage';
import { DayBookPageContent } from './DayBookPage';
import { JournalRegisterPageContent } from './JournalRegisterPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const AccountingOperationsPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'ledger',
      label: t('accountLedger.title', 'Account Ledger'),
      icon: <DownloadIcon className="w-4 h-4" />,
      component: <AccountLedgerPageContent />,
    },
    {
      id: 'cash-book',
      label: t('cashBook.title', 'Cash Book'),
      icon: <BookOpenIcon className="w-4 h-4" />,
      component: <CashBookPageContent />,
    },
    {
      id: 'day-book',
      label: t('dayBook.title', 'Day Book'),
      icon: <BookOpenIcon className="w-4 h-4" />,
      component: <DayBookPageContent />,
    },
    {
      id: 'journal',
      label: t('journalRegister.title', 'Journal Register'),
      icon: <BookOpenIcon className="w-4 h-4" />,
      component: <JournalRegisterPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'ledger';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'ledger') {
        navigate('/finance/accounting-ops', { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [navigate, setSearchParams]
  );

  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('accountingOps.title', 'Accounting Operations')}
        subtitle={t(
          'accountingOps.subtitle',
          'Manage ledger, cash book, day book, and journal register'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="indigo"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

export default AccountingOperationsPage;
