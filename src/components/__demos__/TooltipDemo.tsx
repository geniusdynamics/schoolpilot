// ABOUTME: Demo component showcasing comprehensive tooltip system functionality
// ABOUTME: Demonstrates various tooltip types, triggers, and positioning options

import { useState } from 'react';
import {
  Tooltip,
  InfoTooltip,
  HelpTooltip,
  ValidationTooltip,
  Button,
  Input,
  Card
} from '../ui';

export default function TooltipDemo() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="p-8 space-y-12 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tooltip System Demo</h1>
        <p className="text-gray-600 mb-8">
          Comprehensive tooltip system with smart positioning, multiple triggers, and accessibility features.
        </p>

        {/* Basic Tooltips */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Basic Tooltips</h2>
          <div className="flex flex-wrap gap-4">
            <Tooltip content="This is a simple tooltip">
              <Button>Hover me</Button>
            </Tooltip>

            <Tooltip content="Click tooltip with rich content" trigger="click">
              <Button variant="secondary">Click me</Button>
            </Tooltip>

            <Tooltip content="Focus tooltip for keyboard navigation" trigger="focus">
              <Button variant="outline">Focus me</Button>
            </Tooltip>

            <Tooltip 
              content={
                <div>
                  <strong>Rich Content Tooltip</strong>
                  <p className="mt-1">This tooltip contains multiple elements and formatting.</p>
                  <ul className="mt-2 text-xs">
                    <li>â€¢ Bullet point one</li>
                    <li>â€¢ Bullet point two</li>
                  </ul>
                </div>
              }
              maxWidth="300px"
            >
              <Button variant="ghost">Rich content</Button>
            </Tooltip>
          </div>
        </Card>

        {/* Positioning */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Smart Positioning</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Tooltip content="Tooltip positioned on top" placement="top">
              <Button className="w-full">Top</Button>
            </Tooltip>

            <Tooltip content="Tooltip positioned on bottom" placement="bottom">
              <Button className="w-full">Bottom</Button>
            </Tooltip>

            <Tooltip content="Tooltip positioned on left" placement="left">
              <Button className="w-full">Left</Button>
            </Tooltip>

            <Tooltip content="Tooltip positioned on right" placement="right">
              <Button className="w-full">Right</Button>
            </Tooltip>
          </div>

          <div className="mt-6">
            <Tooltip content="Auto positioning will find the best placement" placement="auto">
              <Button>Auto positioning</Button>
            </Tooltip>
          </div>
        </Card>

        {/* Interactive Tooltips */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Interactive Tooltips</h2>
          <div className="flex gap-4">
            <Tooltip 
              content={
                <div>
                  <p className="mb-2">This tooltip is interactive!</p>
                  <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                    Click me
                  </button>
                </div>
              }
              interactive={true}
              trigger="hover"
            >
              <Button>Interactive tooltip</Button>
            </Tooltip>

            <Tooltip 
              content="This tooltip has a longer delay"
              delay={1000}
            >
              <Button variant="secondary">Delayed tooltip</Button>
            </Tooltip>
          </div>
        </Card>

        {/* Specialized Tooltips */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Specialized Tooltips</h2>
          
          <div className="space-y-6">
            {/* Info Tooltip */}
            <div className="flex items-center gap-2">
              <span>User Information</span>
              <InfoTooltip
                title="User Profile"
                description="This section contains user profile information including name, email, and preferences."
              >
                <span className="ml-1 text-gray-400">i</span>
              </InfoTooltip>
            </div>

            {/* Help Tooltip */}
            <div className="flex items-center gap-2">
              <span>Need help with this feature?</span>
              <HelpTooltip content="This feature allows you to manage your account settings and preferences. Click on any option to modify it." />
            </div>

            {/* Validation Tooltip */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Password
                <ValidationTooltip
                  rules={[
                    'At least 8 characters long',
                    'Contains uppercase and lowercase letters',
                    'Contains at least one number',
                    'Contains at least one special character'
                  ]}
                  examples={[
                    'MyPassword123!',
                    'SecurePass456#'
                  ]}
                  trigger="focus"
                >
                  <Input
                    label=""
                    type="password"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter your password"
                    className="mt-1"
                  />
                </ValidationTooltip>
              </label>
            </div>
          </div>
        </Card>

        {/* Edge Cases */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Edge Cases & Collision Detection</h2>
          
          <div className="space-y-4">
            {/* Top edge */}
            <div className="flex justify-center">
              <Tooltip content="This tooltip should reposition to avoid clipping at the top edge">
                <Button>Near top edge</Button>
              </Tooltip>
            </div>

            {/* Left and right edges */}
            <div className="flex justify-between">
              <Tooltip content="This tooltip should reposition to avoid clipping at the left edge" placement="left">
                <Button>Left edge</Button>
              </Tooltip>

              <Tooltip content="This tooltip should reposition to avoid clipping at the right edge" placement="right">
                <Button>Right edge</Button>
              </Tooltip>
            </div>

            {/* Long content */}
            <div className="flex justify-center">
              <Tooltip 
                content="This is a very long tooltip content that should wrap properly and not extend beyond the maximum width. It demonstrates how the tooltip handles longer text content gracefully."
                maxWidth="250px"
              >
                <Button>Long content tooltip</Button>
              </Tooltip>
            </div>
          </div>
        </Card>

        {/* Accessibility Features */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Accessibility Features</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Keyboard Navigation</h3>
              <p className="text-sm text-gray-600 mb-2">
                Use Tab to navigate between elements, and tooltips will show on focus.
                Press Escape to hide tooltips.
              </p>
              <div className="flex gap-2">
                <Tooltip content="Keyboard accessible tooltip" trigger="focus">
                  <Button>Tab to me</Button>
                </Tooltip>
                <Tooltip content="Another keyboard accessible tooltip" trigger="focus">
                  <Button>Then to me</Button>
                </Tooltip>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Screen Reader Support</h3>
              <p className="text-sm text-gray-600 mb-2">
                Tooltips are properly announced to screen readers with ARIA attributes.
              </p>
              <Tooltip content="This tooltip is announced to screen readers">
                <Button>Screen reader friendly</Button>
              </Tooltip>
            </div>

            <div>
              <h3 className="font-medium mb-2">High Contrast Mode</h3>
              <p className="text-sm text-gray-600 mb-2">
                Tooltips maintain proper contrast ratios for accessibility.
              </p>
              <Tooltip content="High contrast tooltip for better visibility">
                <Button>High contrast</Button>
              </Tooltip>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}