// ABOUTME: Simple tabbed mode demo component
// ABOUTME: Demonstrates basic tabbed mode functionality

import React from 'react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

const TabbedModeDemo: React.FC = () => {
  // const { t } = useTranslation(['common', 'settings']);

  return (
    <Card title="Tabbed Mode Demo" className="shadow-sm">
      <div className="space-y-4">
        <p className="text-gray-600">
          Demonstrate tabbed mode functionality with interactive examples
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Instructions</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use the tabs above to navigate between different sections</li>
            <li>• Test tabbed navigation by creating new tabs</li>
            <li>• Configure tabbed mode settings using the controls below</li>
          </ul>
        </div>
        
        <div className="flex justify-end">
          <Button variant="primary">
            Learn More
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TabbedModeDemo;