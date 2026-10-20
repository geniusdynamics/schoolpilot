// ABOUTME: Comprehensive tests for TabbedForm against the CURRENT implementation
// ABOUTME: (desktop tablist with role=tab buttons, always-rendered mobile controls,
// ABOUTME: footer Previous/Next/Submit where Submit appears only on the last tab,
// ABOUTME: submission blocked while any tab's validation reports an error).

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import TabbedForm, { FormTab } from '@/components/ui/forms/TabbedForm';

vi.mock('@/utils/animations', () => ({
  useTransition: vi.fn(() => ({})),
}));

vi.mock('@/utils/designTokens', () => ({
  designTokens: {
    animations: { duration: { normal: '200ms', fast: '100ms' } },
  },
}));

vi.mock('@/utils/accessibility', () => ({
  generateId: vi.fn((prefix: string) => `${prefix}-test-id`),
  announceToScreenReader: vi.fn(),
  createAriaDescribedBy: vi.fn(() => undefined),
}));

const mockTabs: FormTab[] = [
  { id: 'tab1', label: 'Tab 1', content: <div>Tab 1 Content</div>, validation: () => true },
  { id: 'tab2', label: 'Tab 2', content: <div>Tab 2 Content</div>, validation: () => true },
  { id: 'tab3', label: 'Tab 3', content: <div>Tab 3 Content</div>, validation: () => true },
];

const defaultProps = { tabs: mockTabs };

describe('TabbedForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Desktop footer and mobile header both render nav buttons; the desktop ones
  // carry exact labels ("Next"/"Previous"/"Submit") while mobile uses aria-labels
  // ("Next tab"/"Previous tab"). Scope to exact text to get the desktop button.
  const getDesktopNavButton = (exactName: string) => {
    const matches = screen.getAllByRole('button', { name: exactName });
    return matches.find((b) => (b.textContent || '').trim() === exactName) ?? matches[0];
  };

  const renderToLastTab = async () => {
    const user = userEvent.setup();
    render(<TabbedForm {...defaultProps} onSubmit={vi.fn()} />);
    await user.click(getDesktopNavButton('Next'));
    await user.click(getDesktopNavButton('Next'));
    return user;
  };

  it('renders the tab bar with all tabs and marks the first as selected', () => {
    render(<TabbedForm {...defaultProps} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('switches tabs when clicked', async () => {
    const user = userEvent.setup();
    render(<TabbedForm {...defaultProps} />);

    const secondTab = screen.getByRole('tab', { name: /tab 2/i });
    await user.click(secondTab);

    expect(secondTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Tab 2 Content')).toBeInTheDocument();
    expect(screen.queryByText('Tab 1 Content')).not.toBeInTheDocument();
  });

  it('renders the submit button when on the last tab with onSubmit', async () => {
    await renderToLastTab();

    expect(getDesktopNavButton('Submit')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('renders the cancel button when onCancel is provided', () => {
    render(<TabbedForm {...defaultProps} onCancel={vi.fn()} />);

    expect(getDesktopNavButton('Cancel')).toBeTruthy();
  });

  it('calls onSubmit when submit is clicked on the last tab', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<TabbedForm {...defaultProps} onSubmit={onSubmit} />);

    await user.click(getDesktopNavButton('Next'));
    await user.click(getDesktopNavButton('Next'));
    await user.click(getDesktopNavButton('Submit'));

    expect(onSubmit).toHaveBeenCalled();
  });

  it('calls onCancel when cancel is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<TabbedForm {...defaultProps} onCancel={onCancel} />);

    await user.click(getDesktopNavButton('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows a loading state while submitting', async () => {
    const onSubmit = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 200)));
    const user = userEvent.setup();
    render(<TabbedForm {...defaultProps} onSubmit={onSubmit} />);

    await user.click(getDesktopNavButton('Next'));
    await user.click(getDesktopNavButton('Next'));
    await user.click(getDesktopNavButton('Submit'));

    // While the (async) submit is in flight the button is disabled
    const submit = await screen.findByRole('button', { name: 'Submit' });
    expect(submit).toBeDisabled();
  });

  it('shows Next/Previous buttons for mid-form navigation', async () => {
    const user = userEvent.setup();
    render(<TabbedForm {...defaultProps} onSubmit={vi.fn()} />);

    expect(getDesktopNavButton('Next')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();

    await user.click(getDesktopNavButton('Next'));
    expect(getDesktopNavButton('Next')).toBeTruthy();
    expect(getDesktopNavButton('Previous')).toBeTruthy();
  });

  it('renders mobile navigation controls', () => {
    render(<TabbedForm {...defaultProps} mobileBreakpoint="md" />);

    expect(screen.getByLabelText('Previous tab')).toBeInTheDocument();
    expect(screen.getByLabelText('Next tab')).toBeInTheDocument();
  });

  it('shows current tab information in mobile view', () => {
    render(<TabbedForm {...defaultProps} />);

    expect(screen.getByText('1 of 3')).toBeInTheDocument();
  });

  it('handles submission errors gracefully', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Submission error'));
    const user = userEvent.setup();
    render(<TabbedForm {...defaultProps} onSubmit={onSubmit} />);

    await user.click(getDesktopNavButton('Next'));
    await user.click(getDesktopNavButton('Next'));
    await user.click(getDesktopNavButton('Submit'));

    // Should surface the error without crashing and re-enable the button
    await expect(screen.findByRole('button', { name: 'Submit' })).resolves.not.toBeDisabled();
  });

  it('uses custom submit button text', async () => {
    const user = userEvent.setup();
    render(
      <TabbedForm {...defaultProps} onSubmit={vi.fn()} submitButtonText="Save Changes" />
    );

    await user.click(getDesktopNavButton('Next'));
    await user.click(getDesktopNavButton('Next'));
    expect(getDesktopNavButton('Save Changes')).toBeTruthy();
  });

  it('uses custom cancel button text', () => {
    render(<TabbedForm {...defaultProps} onCancel={vi.fn()} cancelButtonText="Discard" />);

    expect(getDesktopNavButton('Discard')).toBeTruthy();
  });

  it('blocks submission while a tab validation reports an error', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const invalidTabs: FormTab[] = [
      { id: 'tab1', label: 'Tab 1', content: <div>Tab 1 Content</div>, required: true, validation: () => false },
      { id: 'tab2', label: 'Tab 2', content: <div>Tab 2 Content</div> },
      { id: 'tab3', label: 'Tab 3', content: <div>Tab 3 Content</div> },
    ];
    render(<TabbedForm tabs={invalidTabs} onSubmit={onSubmit} />);

    await user.click(getDesktopNavButton('Next'));
    await user.click(getDesktopNavButton('Next'));
    await user.click(getDesktopNavButton('Submit'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders all tabs inside a tablist with form-sections label', () => {
    render(<TabbedForm {...defaultProps} />);

    const tablist = screen.getByRole('tablist', { name: /form sections/i });
    expect(within(tablist).getAllByRole('tab')).toHaveLength(3);
  });
});
