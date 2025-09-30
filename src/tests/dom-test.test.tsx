// ABOUTME: Simple DOM test to verify React Testing Library setup
// ABOUTME: Tests basic DOM container functionality for React 19 compatibility

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

function SimpleComponent() {
  return <div>Test Component</div>;
}

describe('DOM Container Test', () => {
  it('should have a proper DOM container', () => {
    // Check if document.body exists
    expect(document.body).toBeDefined();
    expect(document.body).toBeInstanceOf(HTMLElement);
    
    // Test basic render
    render(<SimpleComponent />);
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
  
  it('should create DOM elements properly', () => {
    const div = document.createElement('div');
    expect(div).toBeInstanceOf(HTMLDivElement);
    
    document.body.appendChild(div);
    expect(document.body.contains(div)).toBe(true);
  });
});