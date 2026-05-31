// ABOUTME: Hub page for library resources
// ABOUTME: Consolidates books, categories, loans, damaged/lost books, digital resources, and import books into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  BookOpenIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
} from '@/components/ui/icons';
import { BooksPageContent } from './BooksPage';
import { BookCategoriesPageContent } from './BookCategoriesPage';
import { BookLoansPageContent } from './BookLoansPage';
import { DamagedLostBooksPageContent } from './DamagedLostBooksPage';
import { DigitalResourcesPageContent } from './DigitalResourcesPage';
import { ImportBooksPageContent } from './ImportBooksPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const LibraryResourcesHubPage: React.FC = () => {
  const { t } = useTranslation('library');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'books',
      label: t('books.title', 'Books'),
      icon: <BookOpenIcon className="w-4 h-4" />,
      component: <BooksPageContent />,
    },
    {
      id: 'categories',
      label: t('bookCategories.title', 'Categories'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <BookCategoriesPageContent />,
    },
    {
      id: 'loans',
      label: t('bookLoans.title', 'Loans'),
      icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
      component: <BookLoansPageContent />,
    },
    {
      id: 'damaged-lost',
      label: t('damagedLostBooks.title', 'Damaged/Lost'),
      icon: <ExclamationTriangleIcon className="w-4 h-4" />,
      component: <DamagedLostBooksPageContent />,
    },
    {
      id: 'digital-resources',
      label: t('digitalResources.title', 'Digital Resources'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <DigitalResourcesPageContent />,
    },
    {
      id: 'import-books',
      label: t('importBooks.title', 'Import Books'),
      icon: <ArrowUpTrayIcon className="w-4 h-4" />,
      component: <ImportBooksPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'books';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'books') {
        navigate('/library/resources', { replace: true });
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
        title={t('libraryResources.title', 'Library Resources')}
        subtitle={t(
          'libraryResources.subtitle',
          'Manage books, categories, loans, damaged/lost books, and digital resources'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="purple"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default LibraryResourcesHubPage;

