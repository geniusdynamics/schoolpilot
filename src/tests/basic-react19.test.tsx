// ABOUTME: Basic React 19 compatibility test
// ABOUTME: Minimal test to verify React 19 setup is working

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

const SimpleComponent: React.FC = () => {
  return (
    <div>
      <h1>Hello React 19</h1>
      <p>This is a basic test</p>
    </div>
  );
};

describe('React 19 Basic Test', () => {
  it('should render a simple component', () => {
    render(<SimpleComponent />);
    
    expect(screen.getByText('Hello React 19')).toBeInTheDocument();
    expect(screen.getByText('This is a basic test')).toBeInTheDocument();
  });

  it('should handle basic DOM operations', () => {
    render(<SimpleComponent />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Hello React 19');
  });
});