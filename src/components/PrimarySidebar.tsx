import React from 'react';
import { useDynamicNavigation } from '../hooks/useDynamicNavigation';

const PrimarySidebar: React.FC<{ selectedModuleKey: string; onModuleSelect: (key: string) => void }> = ({ selectedModuleKey, onModuleSelect }) => {
  const { navigationItems } = useDynamicNavigation();
  const mainModules = navigationItems.filter(item => item.isGroup);
  return (
    <aside className="flex flex-col items-center h-full w-16 bg-gradient-to-r from-blue-900 via-indigo-800 to-fuchsia-600/70 backdrop-blur-lg rounded-r-3xl py-4 shadow-xl">
      <div className="flex flex-col gap-4 flex-1 w-full items-center">
        {mainModules.map(item => (
          <button
            key={item.name}
            onClick={() => onModuleSelect(item.name)}
            className={`group flex items-center justify-center w-12 h-12 rounded-2xl mb-1 transition-all duration-200 ${selectedModuleKey === item.name ? 'bg-white/20 shadow text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
            title={item.name.replace('navigation:', '').replace('.title', '')}
          >
            {item.icon && React.isValidElement(item.icon) && React.cloneElement(item.icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
            <span className="sr-only">{item.name.replace('navigation:', '').replace('.title', '')}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default PrimarySidebar; 