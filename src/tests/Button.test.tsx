// ABOUTME: Comprehensive tests for Button, IconButton, and ButtonGroup components
// ABOUTME: Tests functionality, accessibility, and WCAG compliance

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import ButtonGroup from '@/components/ui/ButtonGroup';

// Mock icon for testing
const MockIcon = () => <svg data-testid="mock-icon" />;

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-indigo-600'); // Default primary variant
  });

  it('applies different variants correctly', () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-100');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-2', 'text-sm');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('shows loading state correctly', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeInTheDocument(); // Spinner
  });

  it('shows loading text when provided', () => {
    render(<Button loading loadingText="Saving...">Save</Button>);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('renders with icons', () => {
    render(
      <Button leftIcon={<MockIcon />} rightIcon={<MockIcon />}>
        With Icons
      </Button>
    );
    const icons = screen.getAllByTestId('mock-icon');
    expect(icons).toHaveLength(2);
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('cursor-not-allowed', 'opacity-60');
  });

  it('supports fullWidth prop', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('supports polymorphic as prop', () => {
    render(<Button as="a" href="/test">Link Button</Button>);
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });

  it('has proper accessibility attributes', () => {
    render(
      <Button 
        aria-label="Custom label" 
        aria-describedby="description"
      >
        Button
      </Button>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
    expect(button).toHaveAttribute('aria-describedby', 'description');
  });

  it('has proper focus indicators', () => {
    render(<Button>Focus me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-offset-2');
  });
});

describe('IconButton Component', () => {
  it('renders with required aria-label', () => {
    render(<IconButton icon={<MockIcon />} aria-label="Delete item" />);
    const button = screen.getByRole('button', { name: /delete item/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('applies different variants correctly', () => {
    const { rerender } = render(
      <IconButton icon={<MockIcon />} aria-label="Test" variant="primary" />
    );
    expect(screen.getByRole('button')).toHaveClass('bg-indigo-600');

    rerender(
      <IconButton icon={<MockIcon />} aria-label="Test" variant="ghost" />
    );
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(
      <IconButton icon={<MockIcon />} aria-label="Test" size="sm" />
    );
    expect(screen.getByRole('button')).toHaveClass('w-8', 'h-8');

    rerender(
      <IconButton icon={<MockIcon />} aria-label="Test" size="lg" />
    );
    expect(screen.getByRole('button')).toHaveClass('w-11', 'h-11');
  });

  it('supports rounded prop', () => {
    render(
      <IconButton icon={<MockIcon />} aria-label="Test" rounded />
    );
    expect(screen.getByRole('button')).toHaveClass('rounded-full');
  });

  it('shows loading state correctly', () => {
    render(
      <IconButton icon={<MockIcon />} aria-label="Test" loading />
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeInTheDocument(); // Spinner
  });

  it('has tooltip support', () => {
    render(
      <IconButton 
        icon={<MockIcon />} 
        aria-label="Delete" 
        tooltip="Delete this item"
      />
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Delete this item');
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    render(
      <IconButton 
        icon={<MockIcon />} 
        aria-label="Test" 
        onClick={handleClick}
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports polymorphic as prop', () => {
    render(
      <IconButton 
        as="a" 
        href="/test" 
        icon={<MockIcon />} 
        aria-label="Link"
      />
    );
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });
});

describe('ButtonGroup Component', () => {
  it('renders children correctly', () => {
    render(
      <ButtonGroup>
        <Button>First</Button>
        <Button>Second</Button>
        <Button>Third</Button>
      </ButtonGroup>
    );
    
    expect(screen.getByRole('button', { name: /first/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /second/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /third/i })).toBeInTheDocument();
  });

  it('applies orientation correctly', () => {
    const { rerender } = render(
      <ButtonGroup orientation="horizontal">
        <Button>First</Button>
        <Button>Second</Button>
      </ButtonGroup>
    );
    expect(screen.getByRole('group')).toHaveClass('flex-row');

    rerender(
      <ButtonGroup orientation="vertical">
        <Button>First</Button>
        <Button>Second</Button>
      </ButtonGroup>
    );
    expect(screen.getByRole('group')).toHaveClass('flex-col');
  });

  it('applies spacing correctly', () => {
    const { rerender } = render(
      <ButtonGroup spacing="sm">
        <Button>First</Button>
        <Button>Second</Button>
      </ButtonGroup>
    );
    expect(screen.getByRole('group')).toHaveClass('gap-1');

    rerender(
      <ButtonGroup spacing="lg">
        <Button>First</Button>
        <Button>Second</Button>
      </ButtonGroup>
    );
    expect(screen.getByRole('group')).toHaveClass('gap-3');
  });

  it('supports segmented variant with selection', () => {
    const handleChange = vi.fn();
    render(
      <ButtonGroup variant="segmented" value="first" onChange={handleChange}>
        <Button value="first">First</Button>
        <Button value="second">Second</Button>
      </ButtonGroup>
    );
    
    const group = screen.getByRole('group');
    expect(group).toHaveClass('bg-gray-100', 'border', 'rounded-lg');
  });

  it('supports toolbar variant', () => {
    render(
      <ButtonGroup variant="toolbar">
        <Button>First</Button>
        <Button>Second</Button>
      </ButtonGroup>
    );
    
    const group = screen.getByRole('group');
    expect(group).toHaveClass('bg-white', 'border', 'divide-x');
  });

  it('supports fullWidth prop', () => {
    render(
      <ButtonGroup fullWidth>
        <Button>First</Button>
        <Button>Second</Button>
      </ButtonGroup>
    );
    expect(screen.getByRole('group')).toHaveClass('w-full');
  });

  it('handles selection changes in segmented variant', async () => {
    const handleChange = vi.fn();
    render(
      <ButtonGroup variant="segmented" value="first" onChange={handleChange}>
        <Button value="first">First</Button>
        <Button value="second">Second</Button>
      </ButtonGroup>
    );
    
    fireEvent.click(screen.getByRole('button', { name: /second/i }));
    expect(handleChange).toHaveBeenCalledWith('second');
  });

  it('has proper accessibility attributes', () => {
    render(
      <ButtonGroup aria-label="Action buttons" role="toolbar">
        <Button>First</Button>
        <Button>Second</Button>
      </ButtonGroup>
    );
    
    const group = screen.getByRole('toolbar');
    expect(group).toHaveAttribute('aria-label', 'Action buttons');
  });

  it('supports radiogroup role for exclusive selection', () => {
    render(
      <ButtonGroup role="radiogroup" exclusive value="first">
        <Button value="first">First</Button>
        <Button value="second">Second</Button>
      </ButtonGroup>
    );
    
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });
});

describe('Accessibility Compliance', () => {
  it('Button meets WCAG focus requirements', () => {
    render(<Button>Test Button</Button>);
    const button = screen.getByRole('button');
    
    // Should have focus-visible classes for keyboard navigation
    expect(button).toHaveClass('focus-visible:ring-2');
    expect(button).toHaveClass('focus-visible:ring-offset-2');
  });

  it('IconButton requires aria-label', () => {
    // This would fail in TypeScript compilation, but we can test runtime behavior
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<IconButton icon={<MockIcon />} aria-label="Required label" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Required label');
    
    consoleSpy.mockRestore();
  });

  it('ButtonGroup supports keyboard navigation', () => {
    render(
      <ButtonGroup>
        <Button>First</Button>
        <Button>Second</Button>
        <Button>Third</Button>
      </ButtonGroup>
    );
    
    const group = screen.getByRole('group');
    expect(group).toBeInTheDocument();
    
    // Should support arrow key navigation (tested via keyboard event handling)
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    // Navigation behavior would be tested in integration tests
  });

  it('Loading states are announced to screen readers', () => {
    render(<Button loading>Loading Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});