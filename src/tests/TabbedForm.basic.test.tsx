// ABOUTME: Basic test to verify TabbedForm component renders without errors
// ABOUTME: Tests the useMemo import fix and basic functionality

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import TabbedForm from '../components/ui/forms/TabbedForm';

describe('TabbedForm - Basic Functionality', () => {
  const mockTabs = [
    {
      id: 'tab1',
      label: 'Tab 1',
      content: <div>Tab 1 Content</div>,
    },
    {
      id: 'tab2', 
      label: 'Tab 2',
      content: <div>Tab 2 Content</div>,
    },
  ];

  it('renders without crashing', () => {
    render(<TabbedForm tabs={mockTabs} />);
    
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Tab 2')).toBeInTheDocument();
    expect(screen.getByText('Tab 1 Content')).toBeInTheDocument();
  });

  it('shows progress bar when enabled', () => {
    render(<TabbedForm tabs={mockTabs} showProgress={true} />);
    
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('handles validation prop', () => {
    const validation = { tab1: true, tab2: false };
    
    render(<TabbedForm tabs={mockTabs} validation={validation} />);
    
    // Should render without errors
    expect(screen.getByText('Tab 1')).toBeInTheDocument();
  });
});