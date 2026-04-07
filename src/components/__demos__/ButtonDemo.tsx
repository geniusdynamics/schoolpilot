// ABOUTME: Demo component showcasing the enhanced Button, IconButton, and ButtonGroup components
// ABOUTME: Demonstrates various states, variants, and accessibility features

import React, { useState } from 'react';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import ButtonGroup from '../ui/ButtonGroup';

// Mock icons for demo
const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const ButtonDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [selectedView, setSelectedView] = useState('grid');

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-8 space-y-12 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Button Components</h1>
        <p className="text-gray-600 mb-8">
          Showcasing modern, accessible button components with animations, loading states, and WCAG compliance.
        </p>

        {/* Button Variants */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Button Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Primary Actions</h3>
              <div className="space-y-3">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="success">Success Button</Button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Alert Actions</h3>
              <div className="space-y-3">
                <Button variant="warning">Warning Button</Button>
                <Button variant="danger">Danger Button</Button>
                <Button variant="ghost">Ghost Button</Button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Outline Style</h3>
              <div className="space-y-3">
                <Button variant="outline">Outline Button</Button>
                <Button variant="outline" disabled>Disabled Button</Button>
                <Button variant="primary" loading={loading} onClick={handleLoadingDemo}>
                  {loading ? 'Loading...' : 'Test Loading'}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Button Sizes */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Button Sizes</h2>
          <div className="flex flex-wrap items-end gap-4">
            <Button size="xs" variant="primary">Extra Small</Button>
            <Button size="sm" variant="primary">Small</Button>
            <Button size="md" variant="primary">Medium</Button>
            <Button size="lg" variant="primary">Large</Button>
            <Button size="xl" variant="primary">Extra Large</Button>
          </div>
        </section>

        {/* Buttons with Icons */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Buttons with Icons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Left Icons</h3>
              <div className="space-y-3">
                <Button leftIcon={<PlusIcon />} variant="primary">Add New</Button>
                <Button leftIcon={<EditIcon />} variant="secondary">Edit Item</Button>
                <Button leftIcon={<DeleteIcon />} variant="danger">Delete</Button>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Right Icons</h3>
              <div className="space-y-3">
                <Button rightIcon={<PlusIcon />} variant="outline">Create</Button>
                <Button rightIcon={<HeartIcon />} variant="ghost">Like</Button>
                <Button 
                  leftIcon={<PlusIcon />} 
                  rightIcon={<HeartIcon />} 
                  variant="primary"
                >
                  Both Icons
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Icon Buttons */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Icon Buttons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Square Icons</h3>
              <div className="flex flex-wrap gap-3">
                <IconButton icon={<EditIcon />} aria-label="Edit" variant="primary" />
                <IconButton icon={<DeleteIcon />} aria-label="Delete" variant="danger" />
                <IconButton icon={<HeartIcon />} aria-label="Like" variant="ghost" />
                <IconButton icon={<PlusIcon />} aria-label="Add" variant="outline" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Rounded Icons</h3>
              <div className="flex flex-wrap gap-3">
                <IconButton icon={<EditIcon />} aria-label="Edit" variant="primary" rounded />
                <IconButton icon={<DeleteIcon />} aria-label="Delete" variant="danger" rounded />
                <IconButton icon={<HeartIcon />} aria-label="Like" variant="ghost" rounded />
                <IconButton icon={<PlusIcon />} aria-label="Add" variant="outline" rounded />
              </div>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Different Sizes</h3>
            <div className="flex flex-wrap items-center gap-3">
              <IconButton icon={<HeartIcon />} aria-label="Like" size="xs" />
              <IconButton icon={<HeartIcon />} aria-label="Like" size="sm" />
              <IconButton icon={<HeartIcon />} aria-label="Like" size="md" />
              <IconButton icon={<HeartIcon />} aria-label="Like" size="lg" />
              <IconButton icon={<HeartIcon />} aria-label="Like" size="xl" />
            </div>
          </div>
        </section>

        {/* Button Groups */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Button Groups</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Default Group</h3>
              <ButtonGroup>
                <Button variant="outline">First</Button>
                <Button variant="outline">Second</Button>
                <Button variant="outline">Third</Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Segmented Control</h3>
              <ButtonGroup 
                variant="segmented" 
                value={selectedTab} 
                onChange={(value) => setSelectedTab(value as string)}
              >
                <Button value="overview">Overview</Button>
                <Button value="details">Details</Button>
                <Button value="settings">Settings</Button>
              </ButtonGroup>
              <p className="text-sm text-gray-600 mt-2">Selected: {selectedTab}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Toolbar Style</h3>
              <ButtonGroup variant="toolbar">
                <IconButton icon={<EditIcon />} aria-label="Edit" />
                <IconButton icon={<DeleteIcon />} aria-label="Delete" />
                <IconButton icon={<HeartIcon />} aria-label="Like" />
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">View Toggle</h3>
              <ButtonGroup 
                variant="segmented" 
                value={selectedView} 
                onChange={(value) => setSelectedView(value as string)}
              >
                <Button value="grid">Grid</Button>
                <Button value="list">List</Button>
              </ButtonGroup>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Vertical Group</h3>
              <ButtonGroup orientation="vertical" spacing="sm">
                <Button variant="outline">Top</Button>
                <Button variant="outline">Middle</Button>
                <Button variant="outline">Bottom</Button>
              </ButtonGroup>
            </div>
          </div>
        </section>

        {/* Full Width Examples */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Full Width Examples</h2>
          <div className="space-y-4 max-w-md">
            <Button fullWidth variant="primary">Full Width Primary</Button>
            <Button fullWidth variant="outline">Full Width Outline</Button>
            <ButtonGroup fullWidth variant="segmented" value="option1">
              <Button value="option1">Option 1</Button>
              <Button value="option2">Option 2</Button>
            </ButtonGroup>
          </div>
        </section>

        {/* Accessibility Features */}
        <section className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Accessibility Features</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              All components include proper ARIA attributes, keyboard navigation, and WCAG 2.1 AA compliance:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4">
              <li>• Focus indicators with proper contrast ratios</li>
              <li>• Screen reader announcements for loading states</li>
              <li>• Keyboard navigation support</li>
              <li>• Proper ARIA labels and descriptions</li>
              <li>• Reduced motion support</li>
            </ul>
            <div className="flex flex-wrap gap-4 mt-4">
              <Button 
                aria-label="Custom accessible button" 
                aria-describedby="button-help"
                variant="primary"
              >
                Accessible Button
              </Button>
              <p id="button-help" className="text-xs text-gray-500 self-center">
                This button has custom ARIA attributes
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ButtonDemo;
