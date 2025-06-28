
import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode; // For buttons or links in the header
  icon?: ReactNode; // Optional icon for the card header
  bodyClassName?: string; // Optional class for the content area
}

const Card: React.FC<CardProps> = ({ title, children, className = '', actions, icon, bodyClassName = '' }) => {
  return (
    <div className={`bg-white shadow-lg rounded-xl overflow-hidden ${className}`}>
      {(title || actions || icon) && (
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            {icon && <span className="mr-2 text-indigo-500">{icon}</span>}
            {title && <h3 className="text-lg leading-6 font-semibold text-gray-900">{title}</h3>}
          </div>
          {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
        </div>
      )}
      <div className={`px-4 py-5 sm:p-6 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default Card;