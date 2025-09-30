// ABOUTME: Simple test to isolate React Testing Library DOM container issue
// ABOUTME: Tests basic rendering functionality without complex components

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

const SimpleComponent = () => {
  return <div>Hello World</div>;
};

describe('Simple Render Test', () => {
  it('should render a simple component', () => {
    render(<SimpleComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});