// ABOUTME: School blog/news feed widget
// ABOUTME: Displays company news, product news, partner news with pagination

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PortalWidgetCard from './PortalWidgetCard';
import { ChevronLeftIcon, ChevronRightIcon, NewspaperIcon } from '@/components/ui/icons';
import Button from '@/components/ui/Button';

export interface BlogPost {
  id: string;
  category: 'company' | 'product' | 'partner';
  title: string;
  excerpt: string;
  date?: string;
}

export interface SchoolBlogFeedProps {
  posts?: BlogPost[];
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

const defaultPosts: BlogPost[] = [
  {
    id: '1',
    category: 'company',
    title: 'Company News',
    excerpt: 'We are changing our remote management',
  },
  {
    id: '2',
    category: 'product',
    title: 'Product News',
    excerpt: 'Academic Reporting goes Mobile with our New iReport App',
  },
  {
    id: '3',
    category: 'partner',
    title: 'Partner News',
    excerpt: 'SchoolPilot integration a financial boost for International Schools',
  },
];

const categoryColors: Record<string, string> = {
  company: 'text-rose-600 font-semibold',
  product: 'text-rose-600 font-semibold',
  partner: 'text-rose-600 font-semibold',
};



export const SchoolBlogFeed: React.FC<SchoolBlogFeedProps> = ({
  posts = defaultPosts,
  currentPage = 2,
  totalPages = 100,
  onPageChange,
}) => {
  const { t } = useTranslation('portal');
  const [page, setPage] = useState(currentPage);

  const handlePrev = () => {
    if (page > 1) {
      const newPage = page - 1;
      setPage(newPage);
      onPageChange?.(newPage);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      const newPage = page + 1;
      setPage(newPage);
      onPageChange?.(newPage);
    }
  };

  return (
    <PortalWidgetCard
      title={t('portal.blog.title')}
      showMoreOptions={true}
    >
      {/* Posts List */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="group cursor-pointer">
            {/* Category */}
            <p className={`text-sm mb-1 ${categoryColors[post.category]}`}>
              {t(`blog.${post.category}News`)}
            </p>
            
            {/* Title */}
            <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              {post.excerpt}
            </h4>
          </div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <NewspaperIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">{t('portal.blog.noNews')}</p>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={page <= 1}
          leftIcon={<ChevronLeftIcon className="w-4 h-4" />}
          className="text-xs"
        >
          {t('portal.blog.newer')}
        </Button>

        <span className="text-xs text-gray-500">
          {t('portal.blog.pageOf', { current: page, total: totalPages })}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleNext}
          disabled={page >= totalPages}
          rightIcon={<ChevronRightIcon className="w-4 h-4" />}
          className="text-xs"
        >
          {t('portal.blog.older')}
        </Button>
      </div>
    </PortalWidgetCard>
  );
};

export default SchoolBlogFeed;
