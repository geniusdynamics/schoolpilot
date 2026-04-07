// ABOUTME: Demo component for testing the enhanced Select component
// ABOUTME: Shows various configurations and use cases

import React, { useState } from 'react';
import Select, { SelectOption } from '../ui/Select';
import { UserIcon, BuildingOfficeIcon, AcademicCapIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const SelectDemo: React.FC = () => {
  const [singleValue, setSingleValue] = useState<string>('');
  const [multiValue, setMultiValue] = useState<string[]>([]);
  const [searchableValue, setSearchableValue] = useState<string>('');
  const [loadingValue, setLoadingValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Sample options
  const basicOptions: SelectOption[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3', disabled: true },
    { value: 'option4', label: 'Option 4' },
  ];

  const iconOptions: SelectOption[] = [
    { 
      value: 'students', 
      label: 'Students', 
      icon: <UserIcon className="w-4 h-4" />,
      description: 'Manage student records'
    },
    { 
      value: 'departments', 
      label: 'Departments', 
      icon: <BuildingOfficeIcon className="w-4 h-4" />,
      description: 'Organize by department'
    },
    { 
      value: 'courses', 
      label: 'Courses', 
      icon: <AcademicCapIcon className="w-4 h-4" />,
      description: 'Academic course management'
    },
    { 
      value: 'finance', 
      label: 'Finance', 
      icon: <CurrencyDollarIcon className="w-4 h-4" />,
      description: 'Financial operations'
    },
  ];

  const manyOptions: SelectOption[] = Array.from({ length: 50 }, (_, i) => ({
    value: `item-${i + 1}`,
    label: `Item ${i + 1}`,
    description: `Description for item ${i + 1}`,
  }));

  const handleLoadingTest = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setLoadingValue('loaded-option');
    }, 2000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Select Component</h1>
        <p className="text-gray-600">Modern, accessible select with search, multi-select, and keyboard navigation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Select */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Basic Select</h2>
          
          <Select
            label="Basic Select"
            placeholder="Choose an option"
            options={basicOptions}
            value={singleValue}
            onChange={(value) => setSingleValue(value as string)}
            helperText="This is a basic select component"
          />

          <Select
            label="With Error"
            placeholder="Choose an option"
            options={basicOptions}
            error="This field is required"
            required
          />

          <Select
            label="Disabled Select"
            placeholder="Cannot select"
            options={basicOptions}
            disabled
          />
        </div>

        {/* Size Variants */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Size Variants</h2>
          
          <Select
            label="Small Size"
            placeholder="Small select"
            options={basicOptions}
            size="sm"
          />

          <Select
            label="Medium Size (Default)"
            placeholder="Medium select"
            options={basicOptions}
            size="md"
          />

          <Select
            label="Large Size"
            placeholder="Large select"
            options={basicOptions}
            size="lg"
          />
        </div>

        {/* Multi-Select */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Multi-Select</h2>
          
          <Select
            label="Multi-Select"
            placeholder="Choose multiple options"
            options={iconOptions}
            value={multiValue}
            onChange={(value) => setMultiValue(value as string[])}
            multiple
            helperText="You can select multiple options"
          />

          <Select
            label="Limited Multi-Select"
            placeholder="Max 2 selections"
            options={iconOptions}
            multiple
            maxSelections={2}
            helperText="Maximum 2 selections allowed"
          />
        </div>

        {/* Searchable Select */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Searchable Select</h2>
          
          <Select
            label="Searchable Select"
            placeholder="Search and select"
            options={manyOptions}
            value={searchableValue}
            onChange={(value) => setSearchableValue(value as string)}
            searchable
            searchPlaceholder="Type to search..."
            helperText="Type to filter options"
          />

          <Select
            label="Searchable Multi-Select"
            placeholder="Search and select multiple"
            options={iconOptions}
            multiple
            searchable
            searchPlaceholder="Search modules..."
            helperText="Search and select multiple modules"
          />
        </div>

        {/* Loading States */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Loading States</h2>
          
          <Select
            label="Loading Select"
            placeholder="Loading options..."
            options={isLoading ? [] : basicOptions}
            value={loadingValue}
            onChange={(value) => setLoadingValue(value as string)}
            loading={isLoading}
            helperText="Click button below to test loading"
          />

          <button
            onClick={handleLoadingTest}
            disabled={isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Test Loading State'}
          </button>
        </div>

        {/* Variant Styles */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Style Variants</h2>
          
          <Select
            label="Outlined (Default)"
            placeholder="Outlined style"
            options={basicOptions}
            variant="outlined"
          />

          <Select
            label="Filled Style"
            placeholder="Filled style"
            options={basicOptions}
            variant="filled"
          />
        </div>
      </div>

      {/* Current Values Display */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Current Values</h3>
        <div className="space-y-2 text-sm">
          <div><strong>Single Value:</strong> {singleValue || 'None'}</div>
          <div><strong>Multi Value:</strong> {multiValue.length > 0 ? multiValue.join(', ') : 'None'}</div>
          <div><strong>Searchable Value:</strong> {searchableValue || 'None'}</div>
          <div><strong>Loading Value:</strong> {loadingValue || 'None'}</div>
        </div>
      </div>

      {/* Accessibility Information */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Accessibility Features</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Full keyboard navigation (Arrow keys, Enter, Escape, Home, End)</li>
          <li>• Screen reader support with proper ARIA attributes</li>
          <li>• Focus management and visual focus indicators</li>
          <li>• WCAG 2.1 AA compliant color contrast</li>
          <li>• Reduced motion support</li>
          <li>• Proper form field associations</li>
        </ul>
      </div>
    </div>
  );
};

export default SelectDemo;