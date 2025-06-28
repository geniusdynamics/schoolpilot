
import React, { useState, ReactNode } from 'react';

interface TabProps {
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabProps[];
  defaultTabIndex?: number;
}

const Tabs: React.FC<TabsProps> = ({ tabs, defaultTabIndex = 0 }) => {
  const [activeTabIndex, setActiveTabIndex] = useState(defaultTabIndex);

  const handleTabClick = (index: number) => {
    if (!tabs[index].disabled) {
      setActiveTabIndex(index);
    }
  };

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              onClick={() => handleTabClick(index)}
              disabled={tab.disabled}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                ${activeTabIndex === index
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-current={activeTabIndex === index ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-5">
        {tabs[activeTabIndex] && tabs[activeTabIndex].content}
      </div>
    </div>
  );
};

export default Tabs;
