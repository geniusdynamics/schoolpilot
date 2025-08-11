// ABOUTME: Animation system demonstration component
// ABOUTME: Showcases all animation utilities, page transitions, and performance features

import React, { useState, useRef } from 'react';
import { 
  usePageTransition, 
  usePerformantAnimation, 
  useAnimationPerformance,
  useProgressiveAnimation,
  useStaggeredAnimation,
  useAnimationOrchestrator,
  animationPresets,
  createAnimation,
  useAnimation,
  getAnimationStyles
} from '../utils/animations';
import { useReducedMotion } from '../utils/accessibility';
import Button from './ui/Button';
import Card from './ui/Card';

const AnimationDemo: React.FC = () => {
  const [currentDemo, setCurrentDemo] = useState<string>('basic');
  const [isVisible, setIsVisible] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  
  // Page transition demo
  const pageTransition = usePageTransition({
    type: 'slide',
    direction: 'right',
    duration: 400,
  });
  
  // Performance monitoring
  const { measureFrame, getAverageFPS, isPerformant } = useAnimationPerformance();
  const { startAnimation, isAnimating } = usePerformantAnimation();
  
  // Progressive animation
  const progressiveAnimation = useProgressiveAnimation('fadeIn');
  
  // Animation orchestrator
  const orchestrator = useAnimationOrchestrator();
  
  // Staggered animation for list items
  const listItems = Array.from({ length: 6 }, (_, i) => `Item ${i + 1}`);
  const staggeredAnimation = useStaggeredAnimation(listItems, 'slideInUp');
  
  const handlePageTransition = (newDemo: string) => {
    pageTransition.startTransition(() => {
      setCurrentDemo(newDemo);
    });
  };
  
  const handlePerformantAnimation = () => {
    startAnimation((progress) => {
      measureFrame();
      // Animate something based on progress
      const element = document.getElementById('performance-demo');
      if (element) {
        element.style.transform = `translateX(${progress * 200}px)`;
      }
    }, 1000);
  };
  
  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
  };
  
  const renderBasicAnimations = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Basic Animations</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 animate-fade-in">
          <h4 className="font-medium">Fade In</h4>
          <p className="text-sm text-gray-600">Smooth opacity transition</p>
        </Card>
        
        <Card className="p-4 animate-slide-in-up">
          <h4 className="font-medium">Slide In Up</h4>
          <p className="text-sm text-gray-600">Slides from bottom</p>
        </Card>
        
        <Card className="p-4 animate-slide-in-left">
          <h4 className="font-medium">Slide In Left</h4>
          <p className="text-sm text-gray-600">Slides from left</p>
        </Card>
        
        <Card className="p-4 animate-scale-in">
          <h4 className="font-medium">Scale In</h4>
          <p className="text-sm text-gray-600">Scales from center</p>
        </Card>
        
        <Card className="p-4 animate-morph-in">
          <h4 className="font-medium">Morph In</h4>
          <p className="text-sm text-gray-600">Complex transformation</p>
        </Card>
        
        <Card className="p-4 animate-elastic-in">
          <h4 className="font-medium">Elastic In</h4>
          <p className="text-sm text-gray-600">Bouncy entrance</p>
        </Card>
      </div>
      
      <div className="mt-8">
        <h4 className="font-medium mb-4">Interactive Animations</h4>
        <div className="flex gap-4">
          <Button 
            onClick={() => {
              const element = document.getElementById('shake-demo');
              element?.classList.add('animate-shake');
              setTimeout(() => element?.classList.remove('animate-shake'), 600);
            }}
          >
            Shake Animation
          </Button>
          
          <Button 
            onClick={() => {
              const element = document.getElementById('wobble-demo');
              element?.classList.add('animate-wobble');
              setTimeout(() => element?.classList.remove('animate-wobble'), 1000);
            }}
          >
            Wobble Animation
          </Button>
          
          <div 
            id="shake-demo" 
            className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold"
          >
            S
          </div>
          
          <div 
            id="wobble-demo" 
            className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold"
          >
            W
          </div>
        </div>
      </div>
    </div>
  );
  
  const renderPageTransitions = () => (
    <div className="space-y-6" style={pageTransition.getTransitionStyles()}>
      <h3 className="text-lg font-semibold mb-4">Page Transitions</h3>
      
      <div className="bg-gray-50 p-6 rounded-lg">
        <p className="mb-4">
          Current transition stage: <strong>{pageTransition.transitionStage}</strong>
        </p>
        <p className="mb-4">
          Is transitioning: <strong>{pageTransition.isTransitioning ? 'Yes' : 'No'}</strong>
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={() => handlePageTransition('basic')}>
            Slide to Basic
          </Button>
          <Button onClick={() => handlePageTransition('performance')}>
            Slide to Performance
          </Button>
        </div>
      </div>
      
      <Card className="p-6">
        <h4 className="font-medium mb-2">Page Content</h4>
        <p>This content animates during page transitions. The transition respects user motion preferences.</p>
        {prefersReducedMotion && (
          <p className="text-amber-600 mt-2">
            ⚠️ Reduced motion detected - transitions are simplified
          </p>
        )}
      </Card>
    </div>
  );
  
  const renderPerformanceDemo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Performance Optimization</h3>
      
      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-medium mb-4">Performance Metrics</h4>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Average FPS</p>
            <p className="text-2xl font-bold">{getAverageFPS()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Performance Status</p>
            <p className={`text-lg font-medium ${isPerformant() ? 'text-green-600' : 'text-red-600'}`}>
              {isPerformant() ? 'Good' : 'Poor'}
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handlePerformantAnimation}
          disabled={isAnimating}
        >
          {isAnimating ? 'Animating...' : 'Start Performance Test'}
        </Button>
        
        <div 
          id="performance-demo"
          className="w-16 h-16 bg-purple-500 rounded-lg mt-4 will-change-transform gpu-accelerated"
        />
      </div>
      
      <div className="bg-blue-50 p-6 rounded-lg">
        <h4 className="font-medium mb-4">Progressive Enhancement</h4>
        <p className="mb-4">
          Can animate: <strong>{progressiveAnimation.canAnimate ? 'Yes' : 'No'}</strong>
        </p>
        
        <div 
          className={progressiveAnimation.getAnimationClass()}
          style={progressiveAnimation.getAnimationStyles()}
        >
          <Card className="p-4">
            <p>This content uses progressive enhancement for animations.</p>
            <p className="text-sm text-gray-600 mt-2">
              Animations are only applied if the device can handle them performantly.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
  
  const renderStaggeredDemo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Staggered Animations</h3>
      
      <div className="space-y-4">
        {listItems.map((item, index) => (
          <Card 
            key={item}
            className="p-4"
            {...staggeredAnimation.getItemProps(index)}
          >
            <h4 className="font-medium">{item}</h4>
            <p className="text-sm text-gray-600">
              Animation delay: {index * 50}ms
            </p>
          </Card>
        ))}
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-medium mb-4">Animation Orchestrator</h4>
        <p className="mb-4">
          Active animations: <strong>{orchestrator.activeAnimationCount}</strong>
        </p>
        
        <div className="flex gap-4">
          <Button 
            onClick={() => {
              orchestrator.registerAnimation('test-1');
              setTimeout(() => orchestrator.unregisterAnimation('test-1'), 2000);
            }}
          >
            Start Animation 1
          </Button>
          
          <Button 
            onClick={() => {
              orchestrator.registerAnimation('test-2');
              setTimeout(() => orchestrator.unregisterAnimation('test-2'), 3000);
            }}
          >
            Start Animation 2
          </Button>
          
          <Button 
            onClick={async () => {
              await orchestrator.waitForAnimations();
              alert('All animations completed!');
            }}
          >
            Wait for All
          </Button>
        </div>
      </div>
    </div>
  );
  
  const renderCurrentDemo = () => {
    switch (currentDemo) {
      case 'basic':
        return renderBasicAnimations();
      case 'transitions':
        return renderPageTransitions();
      case 'performance':
        return renderPerformanceDemo();
      case 'staggered':
        return renderStaggeredDemo();
      default:
        return renderBasicAnimations();
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Animation System Demo</h1>
        <p className="text-gray-600 mb-6">
          Comprehensive demonstration of the SchoolPilot3 animation system with performance optimization and accessibility features.
        </p>
        
        {prefersReducedMotion && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800">
              🔧 Reduced motion preference detected. Animations are simplified or disabled for better accessibility.
            </p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mb-6">
          <Button 
            variant={currentDemo === 'basic' ? 'primary' : 'secondary'}
            onClick={() => setCurrentDemo('basic')}
          >
            Basic Animations
          </Button>
          <Button 
            variant={currentDemo === 'transitions' ? 'primary' : 'secondary'}
            onClick={() => handlePageTransition('transitions')}
          >
            Page Transitions
          </Button>
          <Button 
            variant={currentDemo === 'performance' ? 'primary' : 'secondary'}
            onClick={() => handlePageTransition('performance')}
          >
            Performance
          </Button>
          <Button 
            variant={currentDemo === 'staggered' ? 'primary' : 'secondary'}
            onClick={() => setCurrentDemo('staggered')}
          >
            Staggered Animations
          </Button>
        </div>
      </div>
      
      <div className="min-h-96">
        {renderCurrentDemo()}
      </div>
      
      <div className="mt-12 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Animation System Features</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">✨ Motion Design</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Consistent easing curves</li>
              <li>• Appropriate duration scaling</li>
              <li>• Smooth transitions</li>
              <li>• Advanced keyframe animations</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">🚀 Performance</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 60fps optimization</li>
              <li>• GPU acceleration</li>
              <li>• Progressive enhancement</li>
              <li>• Performance monitoring</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">♿ Accessibility</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Reduced motion support</li>
              <li>• High contrast compatibility</li>
              <li>• Screen reader friendly</li>
              <li>• Keyboard navigation</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">🎯 Developer Experience</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Easy-to-use hooks</li>
              <li>• CSS utility classes</li>
              <li>• Animation orchestration</li>
              <li>• TypeScript support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimationDemo;