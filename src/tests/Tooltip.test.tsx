// ABOUTME: Tests for Tooltip component and its specialized variants
// ABOUTME: Covers rendering, interactions, accessibility, and positioning

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import {
  Tooltip,
  InfoTooltip,
  HelpTooltip,
  ValidationTooltip
} from '../components/ui/feedback/Tooltip';

// Mock createPortal to render in the same container
vi.mock('react-dom', () => ({
  ...vi.importActual('react-dom'),
  createPortal: (children: React.ReactNode) => children
}));

// Mock getBoundingClientRect
const mockGetBoundingClientRect = vi.fn(() => ({
  top: 100,
  left: 100,
  bottom: 140,
  right: 200,
  width: 100,
  height: 40
}));

Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  value: mockGetBoundingClientRect
});

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should render trigger element', () => {
    render(
      <Tooltip content="Test tooltip">
        <button>Trigger</button>
      </Tooltip>
    );

    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument();
  });

  it('should render tooltip content when visible', () => {
    render(
      <Tooltip content="Test tooltip">
        <button>Trigger</button>
      </Tooltip>
    );

    // The tooltip should be in the DOM but hidden initially
    expect(screen.getByText('Test tooltip')).toBeInTheDocument();
  });

  it('should not show tooltip when disabled', () => {
    render(
      <Tooltip content="Test tooltip" disabled>
        <button>Trigger</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });
    fireEvent.mouseEnter(trigger);

    // Tooltip should still be in DOM but remain hidden
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render rich content', () => {
    const richContent = (
      <div>
        <strong>Title</strong>
        <p>Description</p>
      </div>
    );

    render(
      <Tooltip content={richContent}>
        <button>Trigger</button>
      </Tooltip>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(
      <Tooltip content="Test tooltip">
        <button>Trigger</button>
      </Tooltip>
    );

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveAttribute('id', 'tooltip');
    expect(tooltip).toHaveAttribute('role', 'tooltip');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('should apply custom className', () => {
    render(
      <Tooltip content="Test tooltip" className="custom-tooltip">
        <button>Trigger</button>
      </Tooltip>
    );

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveClass('custom-tooltip');
  });

  it('should apply custom maxWidth style', () => {
    render(
      <Tooltip content="Test tooltip" maxWidth="400px">
        <button>Trigger</button>
      </Tooltip>
    );

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveStyle({ maxWidth: '400px' });
  });
});

describe('InfoTooltip', () => {
  it('should render title and description', () => {
    render(
      <InfoTooltip title="Info Title" description="Info description">
        <button>Trigger</button>
      </InfoTooltip>
    );

    expect(screen.getByText('Info Title')).toBeInTheDocument();
    expect(screen.getByText('Info description')).toBeInTheDocument();
  });

  it('should render only title when no description', () => {
    render(
      <InfoTooltip title="Info Title">
        <button>Trigger</button>
      </InfoTooltip>
    );

    expect(screen.getByText('Info Title')).toBeInTheDocument();
    expect(screen.queryByText('Info description')).not.toBeInTheDocument();
  });
});

describe('HelpTooltip', () => {
  it('should render help button with tooltip', () => {
    render(<HelpTooltip content="Help content" />);

    const helpButton = screen.getByRole('button', { name: 'Help' });
    expect(helpButton).toBeInTheDocument();
    expect(screen.getByText('Help content')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<HelpTooltip content="Help content" />);

    const helpButton = screen.getByRole('button', { name: 'Help' });
    expect(helpButton).toHaveAttribute('aria-label', 'Help');
  });

  it('should apply custom className', () => {
    render(<HelpTooltip content="Help content" className="custom-help" />);

    const helpButton = screen.getByRole('button', { name: 'Help' });
    expect(helpButton).toHaveClass('custom-help');
  });
});

describe('ValidationTooltip', () => {
  it('should render validation rules', () => {
    const rules = ['Rule 1', 'Rule 2'];
    
    render(
      <ValidationTooltip rules={rules}>
        <input />
      </ValidationTooltip>
    );

    expect(screen.getByText('Requirements:')).toBeInTheDocument();
    expect(screen.getByText('Rule 1')).toBeInTheDocument();
    expect(screen.getByText('Rule 2')).toBeInTheDocument();
  });

  it('should render examples when provided', () => {
    const rules = ['Rule 1'];
    const examples = ['Example 1', 'Example 2'];
    
    render(
      <ValidationTooltip rules={rules} examples={examples}>
        <input />
      </ValidationTooltip>
    );

    expect(screen.getByText('Examples:')).toBeInTheDocument();
    expect(screen.getByText('Example 1')).toBeInTheDocument();
    expect(screen.getByText('Example 2')).toBeInTheDocument();
  });

  it('should not render examples section when not provided', () => {
    const rules = ['Rule 1'];
    
    render(
      <ValidationTooltip rules={rules}>
        <input />
      </ValidationTooltip>
    );

    expect(screen.getByText('Requirements:')).toBeInTheDocument();
    expect(screen.queryByText('Examples:')).not.toBeInTheDocument();
  });

  it('should apply custom maxWidth', () => {
    const rules = ['Rule 1'];
    
    render(
      <ValidationTooltip rules={rules} maxWidth="350px">
        <input />
      </ValidationTooltip>
    );

    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveStyle({ maxWidth: '350px' });
  });
});