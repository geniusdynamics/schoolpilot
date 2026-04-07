import React from 'react';
import type { Tab } from '@/types/tabbedWorkspace';

export const resolveTabContent = (tab: Tab): React.ReactNode => {
  if (!tab || !tab.content) {
    return null;
  }

  switch (tab.content.type) {
    case 'component':
      const Component = tab.content.component;
      return Component ? <Component {...(tab.content.props || {})} /> : null;
    case 'url':
      return (
        <iframe
          src={tab.content.url}
          className="w-full h-full border-0"
          title={tab.title}
        />
      );
    case 'html':
      return <div dangerouslySetInnerHTML={{ __html: tab.content.html }} />;
    case 'text':
      return <div className="whitespace-pre-wrap">{tab.content.text}</div>;
    case 'empty':
    default:
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <p>This tab is empty.</p>
          </div>
        </div>
      );
  }
};