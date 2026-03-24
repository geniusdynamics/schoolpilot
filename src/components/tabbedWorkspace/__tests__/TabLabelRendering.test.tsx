import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Tab } from '../Tab';
import { TabBar } from '../TabBar';

vi.mock('../../../stores/tabStore', () => ({
  useTabStore: () => ({
    tabs: [],
    activeTabId: 'tab-dashboard',
    activateTab: vi.fn(),
    closeTab: vi.fn(),
    reorderTabs: vi.fn(),
    pinnedTabs: ['tab-dashboard'],
    pinTab: vi.fn(),
    unpinTab: vi.fn(),
    duplicateTab: vi.fn(),
    validateTabAccess: () => true
  })
}));

describe('tab label rendering', () => {
  it('renders a mapped icon instead of the raw icon name', () => {
    const { container } = render(
      <Tab
        tab={{
          id: 'tab-dashboard',
          url: '/dashboard',
          title: 'Dashboard',
          module: 'dashboard',
          isDirty: false,
          pinned: false,
          icon: 'HomeIcon'
        }}
        isActive
        isPinned={false}
        onClick={vi.fn()}
        onClose={vi.fn()}
        onPin={vi.fn()}
        onDuplicate={vi.fn()}
        tabStyle="modern"
      />
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('HomeIcon')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders overflow tabs with page titles instead of icon names', () => {
    render(
      <TabBar
        tabs={[
          {
            id: 'tab-dashboard',
            url: '/dashboard',
            title: 'Dashboard',
            module: 'dashboard',
            isDirty: false,
            pinned: true,
            icon: 'HomeIcon',
            canClose: false
          },
          {
            id: 'tab-administration-applications',
            url: '/administration/applications',
            title: 'Applications',
            module: 'administration',
            entity: 'applications',
            isDirty: false,
            pinned: false,
            icon: 'ClipboardDocumentListIcon',
            canClose: true
          }
        ]}
        activeTabId="tab-dashboard"
        maxVisibleTabs={1}
        showAddButton={false}
        tabStyle="modern"
        onTabClick={vi.fn()}
        onTabClose={vi.fn()}
        onTabReorder={vi.fn()}
        onTabPin={vi.fn()}
        onTabDuplicate={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('1 more tabs'));

    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.queryByText('ClipboardDocumentListIcon')).not.toBeInTheDocument();
  });
});
