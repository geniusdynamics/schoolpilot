
import React, { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode; // To pass <option> elements
  containerClassName?: string;
}

const Select: React.FC<SelectProps> = ({ label, id, error, children, className = '', containerClassName = '', ...props }) => {
  const baseStyles = 'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm bg-white text-gray-900';
  const errorStyles = 'border-red-500 focus:ring-red-500 focus:border-red-500';
  
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label htmlFor={id || props.name} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={id || props.name}
        className={`${baseStyles} ${error ? errorStyles : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Select;