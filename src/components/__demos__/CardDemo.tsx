// ABOUTME: Demo component showcasing enhanced Card component with various variants and features
// ABOUTME: Demonstrates hover effects, interactive states, and responsive layouts

import React, { useState } from 'react';
import Card from '../ui/Card';
import DataCard from '../ui/data/DataCard';
import Button from '../ui/Button';

const CardDemo: React.FC = () => {
  const [clickedCard, setClickedCard] = useState<string | null>(null);
  const [loadingCard, setLoadingCard] = useState<string | null>(null);

  const handleCardClick = (cardId: string) => {
    setClickedCard(cardId);
    setTimeout(() => setClickedCard(null), 2000);
  };

  const handleLoadingDemo = (cardId: string) => {
    setLoadingCard(cardId);
    setTimeout(() => setLoadingCard(null), 3000);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Card Components</h1>
          <p className="text-gray-600">
            Showcasing modern card components with hover effects, interactive states, and various layouts.
          </p>
        </div>

        {/* Card Variants */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Card Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card
              title="Default Card"
              variant="default"
              icon={<span className="text-2xl">📄</span>}
            >
              <p className="text-gray-600">
                This is the default card variant with standard styling and subtle shadows.
              </p>
            </Card>

            <Card
              title="Elevated Card"
              variant="elevated"
              icon={<span className="text-2xl">⬆️</span>}
            >
              <p className="text-gray-600">
                Elevated card with enhanced shadows and hover effects for prominence.
              </p>
            </Card>

            <Card
              title="Outlined Card"
              variant="outlined"
              icon={<span className="text-2xl">🔲</span>}
            >
              <p className="text-gray-600">
                Outlined card with border emphasis and minimal shadows.
              </p>
            </Card>

            <Card
              title="Filled Card"
              variant="filled"
              icon={<span className="text-2xl">🎨</span>}
            >
              <p className="text-gray-600">
                Filled card with background color and subtle styling.
              </p>
            </Card>

            <Card
              title="Interactive Card"
              variant="interactive"
              icon={<span className="text-2xl">👆</span>}
              onClick={() => handleCardClick('interactive')}
            >
              <p className="text-gray-600">
                Interactive card with hover animations and click feedback.
                {clickedCard === 'interactive' && (
                  <span className="block mt-2 text-blue-600 font-medium">
                    Card clicked! ✨
                  </span>
                )}
              </p>
            </Card>

            <Card
              title="Compact Card"
              variant="compact"
              size="sm"
              icon={<span className="text-xl">📦</span>}
            >
              <p className="text-gray-600 text-sm">
                Compact card with smaller padding and size.
              </p>
            </Card>
          </div>
        </section>

        {/* Card Sizes */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Card Sizes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card
              title="Small"
              size="sm"
              variant="elevated"
              icon={<span className="text-lg">🔸</span>}
            >
              <p className="text-sm text-gray-600">Small card size</p>
            </Card>

            <Card
              title="Medium"
              size="md"
              variant="elevated"
              icon={<span className="text-xl">🔹</span>}
            >
              <p className="text-gray-600">Medium card size (default)</p>
            </Card>

            <Card
              title="Large"
              size="lg"
              variant="elevated"
              icon={<span className="text-2xl">🔷</span>}
            >
              <p className="text-gray-600">Large card size with more padding</p>
            </Card>

            <Card
              title="Extra Large"
              size="xl"
              variant="elevated"
              icon={<span className="text-3xl">💎</span>}
            >
              <p className="text-gray-600">Extra large card with maximum padding</p>
            </Card>
          </div>
        </section>

        {/* Interactive Features */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Interactive Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card
              title="Clickable Card"
              variant="interactive"
              icon={<span className="text-2xl">🖱️</span>}
              onClick={() => handleCardClick('clickable')}
              actions={
                <Button size="sm" variant="outline">
                  Action
                </Button>
              }
            >
              <p className="text-gray-600">
                Click anywhere on this card to see the interaction feedback.
              </p>
              {clickedCard === 'clickable' && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-blue-700 text-sm font-medium">
                    Card interaction detected! 🎉
                  </p>
                </div>
              )}
            </Card>

            <Card
              title="Loading State"
              variant="default"
              icon={<span className="text-2xl">⏳</span>}
              loading={loadingCard === 'loading'}
              actions={
                <Button
                  size="sm"
                  onClick={() => handleLoadingDemo('loading')}
                  disabled={loadingCard === 'loading'}
                >
                  {loadingCard === 'loading' ? 'Loading...' : 'Demo Loading'}
                </Button>
              }
            >
              <p className="text-gray-600">
                Click the button to see the loading state overlay.
              </p>
            </Card>

            <Card
              title="Disabled Card"
              variant="interactive"
              icon={<span className="text-2xl">🚫</span>}
              disabled
              onClick={() => handleCardClick('disabled')}
            >
              <p className="text-gray-600">
                This card is disabled and won't respond to interactions.
              </p>
            </Card>
          </div>
        </section>

        {/* Data Cards */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Data Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DataCard
              title="Revenue"
              subtitle="Monthly Performance"
              metric={{
                label: 'Total Revenue',
                value: 125000,
                change: {
                  value: 12.5,
                  type: 'increase',
                  period: 'vs last month'
                },
                icon: <span className="text-2xl">💰</span>,
                color: 'green'
              }}
              fields={[
                { label: 'New Customers', value: '234', type: 'number' },
                { label: 'Conversion Rate', value: '3.2', type: 'percentage' },
                { label: 'Average Order', value: '89.50', type: 'currency' }
              ]}
            />

            <DataCard
              title="User Analytics"
              subtitle="Last 30 Days"
              metric={{
                label: 'Active Users',
                value: 8420,
                change: {
                  value: 5.8,
                  type: 'increase',
                  period: 'this month'
                },
                icon: <span className="text-2xl">👥</span>,
                color: 'blue'
              }}
              fields={[
                { label: 'New Signups', value: '156', type: 'number' },
                { label: 'Retention Rate', value: '87.3', type: 'percentage' },
                { label: 'Last Updated', value: new Date().toISOString(), type: 'date' }
              ]}
            />

            <DataCard
              title="System Status"
              subtitle="Infrastructure Health"
              metric={{
                label: 'Uptime',
                value: '99.9',
                icon: <span className="text-2xl">⚡</span>,
                color: 'green'
              }}
              fields={[
                { label: 'Status', value: 'Active', type: 'status' },
                { label: 'Response Time', value: '45ms', type: 'text' },
                { label: 'Last Check', value: new Date().toISOString(), type: 'date' }
              ]}
              onClick={() => handleCardClick('system')}
            />
          </div>
        </section>

        {/* Responsive Grid Layout */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Responsive Grid Layout</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Card
                key={i}
                title={`Card ${i + 1}`}
                variant="elevated"
                size="sm"
                interactive
                onClick={() => handleCardClick(`grid-${i}`)}
                icon={<span className="text-lg">🎯</span>}
              >
                <p className="text-sm text-gray-600">
                  Responsive card in grid layout
                </p>
                {clickedCard === `grid-${i}` && (
                  <p className="text-xs text-blue-600 mt-2">Clicked!</p>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Accessibility Features */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Accessibility Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              title="Keyboard Navigation"
              variant="interactive"
              icon={<span className="text-2xl">⌨️</span>}
              onClick={() => handleCardClick('keyboard')}
              aria-label="Keyboard accessible card - press Enter or Space to activate"
            >
              <p className="text-gray-600 mb-3">
                This card supports keyboard navigation. Tab to focus and press Enter or Space to activate.
              </p>
              {clickedCard === 'keyboard' && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-green-700 text-sm">
                    ✅ Keyboard interaction successful!
                  </p>
                </div>
              )}
            </Card>

            <Card
              title="Screen Reader Support"
              variant="default"
              icon={<span className="text-2xl">🔊</span>}
              role="region"
              aria-label="Screen reader accessible card with proper ARIA labels"
            >
              <p className="text-gray-600">
                This card includes proper ARIA labels and semantic markup for screen readers.
              </p>
              <ul className="mt-3 text-sm text-gray-500 space-y-1">
                <li>• Proper heading hierarchy</li>
                <li>• ARIA labels and roles</li>
                <li>• Focus indicators</li>
                <li>• Semantic HTML structure</li>
              </ul>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CardDemo;
