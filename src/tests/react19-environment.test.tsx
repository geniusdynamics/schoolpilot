// ABOUTME: Simple React 19 environment test to verify testing setup
// ABOUTME: Tests basic React 19 features and DOM rendering capabilities

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Simple test component using React 19 features
const TestComponent: React.FC = () => {
  return (
    <div>
      <h1>React 19 Test</h1>
      <p>Testing environment setup</p>
    </div>
  );
};

describe('React 19 Environment Test', () => {
  it('should render a simple component', () => {
    render(<TestComponent />);
    expect(screen.getByText('React 19 Test')).toBeInTheDocument();
    expect(screen.getByText('Testing environment setup')).toBeInTheDocument();
  });

  it('should handle DOM queries correctly', () => {
    render(<TestComponent />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('React 19 Test');
  });

  it('should support basic assertions', () => {
    expect(true).toBe(true);
    expect('hello').toContain('ell');
    expect([1, 2, 3]).toHaveLength(3);
  });
});