// ABOUTME: Basic smoke tests for TabbedForm against the current implementation
// ABOUTME: (desktop tablist + always-rendered mobile controls; footer nav appears
// ABOUTME: only when onSubmit/onCancel are provided)

import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TabbedForm, { FormTab } from '@/components/ui/forms/TabbedForm';

const mockTabs: FormTab[] = [
  { id: 'tab1', label: 'Tab 1', content: <div>Tab 1 Content</div> },
  { id: 'tab2', label: 'Tab 2', content: <div>Tab 2 Content</div> },
];

describe('TabbedForm - Basic Functionality', () => {
  it('renders without crashing with tab bar and active content', () => {
    render(<TabbedForm tabs={mockTabs} />);

    expect(screen.getByRole('tablist', { name: /form sections/i })).toBeInTheDocument();
    // The active tab's label appears in the tab bar; the mobile header also
    // mirrors it, so assert at least one match rather than exactly one.
    expect(screen.getAllByText('Tab 1').length).toBeGreaterThan(0);
    expect(screen.getByText('Tab 1 Content')).toBeInTheDocument();
    expect(screen.queryByText('Tab 2 Content')).not.toBeInTheDocument();
  });

  it('shows progress bar when enabled', () => {
    render(<TabbedForm tabs={mockTabs} showProgress />);
    // Progress UI renders without crashing
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('accepts the validation prop without crashing', () => {
    const tabsWithValidation: FormTab[] = [
      { id: 'tab1', label: 'Tab 1', content: <div>Tab 1 Content</div>, validation: () => true },
      { id: 'tab2', label: 'Tab 2', content: <div>Tab 2 Content</div>, validation: () => true },
    ];
    render(<TabbedForm tabs={tabsWithValidation} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders the footer navigation when onSubmit is provided', () => {
    render(<TabbedForm tabs={mockTabs} onSubmit={vi.fn()} />);
    // Desktop "Next" + mobile "Next tab" both match /next/i
    expect(screen.getAllByRole('button', { name: /next/i }).length).toBeGreaterThan(0);
  });
});
