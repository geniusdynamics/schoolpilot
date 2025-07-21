// Quick debug script to test Select component
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select from './src/components/ui/Select.tsx';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
];

const onChange = jest.fn();

// Test the component
render(<Select options={mockOptions} onChange={onChange} />);

console.log('Component rendered');
console.log('Options:', mockOptions);
console.log('onChange function:', onChange);