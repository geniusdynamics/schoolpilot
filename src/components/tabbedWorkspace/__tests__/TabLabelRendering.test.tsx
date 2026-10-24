
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

  it('labels the context menu pin item by what it does, never by the icon name', () => {
    const onPin = vi.fn();
    const tab = {
      id: 'tab-dashboard',
      url: '/dashboard',
      title: 'Dashboard',
      module: 'dashboard',
      isDirty: false,
      pinned: false,
      icon: 'HomeIcon'
    };

    const { container, rerender } = render(
      <Tab
        tab={tab}
        isActive
        isPinned={false}
        onClick={vi.fn()}
        onClose={vi.fn()}
        onPin={onPin}
        onDuplicate={vi.fn()}
        tabStyle="modern"
      />
    );

    fireEvent.contextMenu(screen.getByText('Dashboard'));

    // The item said 'MapPinIcon Tab' — the icon's name, not the action.
    expect(screen.queryByText('MapPinIcon Tab')).not.toBeInTheDocument();
    expect(screen.getByText('Pin Tab')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Pin Tab'));

    expect(onPin).toHaveBeenCalled();
    // The menu closes, as it does for every other item.
    expect(screen.queryByText('Pin Tab')).not.toBeInTheDocument();

    // A pinned tab offers the other half of the pair.
    rerender(
      <Tab
        tab={{ ...tab, pinned: true }}
        isActive
        isPinned
        onClick={vi.fn()}
        onClose={vi.fn()}
        onPin={vi.fn()}
        onDuplicate={vi.fn()}
        tabStyle="modern"
      />
    );
    // A pinned tab shows no title, as a browser's does, so the menu is opened on the tab's own
    // element rather than on its text.
    fireEvent.contextMenu(container.firstElementChild as Element);
    expect(screen.getByText('Unpin Tab')).toBeInTheDocument();
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
