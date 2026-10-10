// ABOUTME: Tests that page and hub-tab error boundaries recover when the active tab changes
// ABOUTME: Guards SO-27: one crashing hub tab must not blank its sibling tabs

import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PageErrorBoundary from '../PageErrorBoundary';
import { PageHeaderWithTabs } from '../ui/PageHeaderWithTabs';

const Boom: React.FC = () => {
  throw new Error('tab A exploded');
};

const tabs = [
  { id: 'a', label: 'Tab A' },
  { id: 'b', label: 'Tab B' },
];

const Hub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('a');
  return (
    <PageHeaderWithTabs
      title="Hub"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {activeTab === 'a' ? <Boom /> : <div>Tab B content</div>}
    </PageHeaderWithTabs>
  );
};

describe('PageErrorBoundary', () => {
  beforeEach(() => {
    // React logs caught render errors to console.error; keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resets when the reset key changes', () => {
    const { rerender } = render(
      <PageErrorBoundary pageName="Hub" resetKey="a">
        <Boom />
      </PageErrorBoundary>
    );

    expect(screen.getByText('Page Error')).toBeInTheDocument();

    rerender(
      <PageErrorBoundary pageName="Hub" resetKey="b">
        <div>Tab B content</div>
      </PageErrorBoundary>
    );

    expect(screen.getByText('Tab B content')).toBeInTheDocument();
    expect(screen.queryByText('Page Error')).not.toBeInTheDocument();
  });

  it('keeps the error when the reset key does not change', () => {
    const { rerender } = render(
      <PageErrorBoundary pageName="Hub" resetKey="a">
        <Boom />
      </PageErrorBoundary>
    );

    rerender(
      <PageErrorBoundary pageName="Hub" resetKey="a">
        <div>Recovered</div>
      </PageErrorBoundary>
    );

    expect(screen.getByText('Page Error')).toBeInTheDocument();
  });

  it('throw in tab A, switch to tab B renders', () => {
    render(<Hub />);

    // Tab A crashed, but the tab bar stays usable.
    expect(screen.getByText('Page Error')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tab B' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Tab B' }));

    expect(screen.getByText('Tab B content')).toBeInTheDocument();
    expect(screen.queryByText('Page Error')).not.toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'tabpanel-b');
  });
});
