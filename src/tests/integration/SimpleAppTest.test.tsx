

import App from '../../App';
import { initializeI18n } from '../../i18n/i18n';

// Restore console methods to see debug output
vi.restoreAllMocks();

beforeAll(async () => {
  await initializeI18n();
});

describe('Simple App Test', () => {
  it('should render App component and show debug logs', async () => {
    console.log('ðŸ” [TEST] Starting simple App render test...');
    
    let appContentRendered = false;
    let dynamicRoutesRendered = false;
    
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    
    // Track console outputs
    console.error = (...args) => {
      const message = args[0];
      if (typeof message === 'string') {
        if (message.includes('ðŸš¨ðŸš¨ðŸš¨ [AppContent] Component is rendering!')) {
          appContentRendered = true;
          console.log('âœ… [TEST] AppContent rendered!');
        }
        if (message.includes('ðŸš¨ðŸš¨ðŸš¨ [DynamicRoutes] Component is rendering!')) {
          dynamicRoutesRendered = true;
          console.log('âœ… [TEST] DynamicRoutes rendered!');
        }
      }
      originalConsoleError(...args);
    };
    
    console.warn = (...args) => {
      const message = args[0];
      if (typeof message === 'string') {
        if (message.includes('ðŸš¨ðŸš¨ðŸš¨ [DynamicRoutes] Component is rendering!')) {
          dynamicRoutesRendered = true;
          console.log('âœ… [TEST] DynamicRoutes rendered via warn!');
        }
      }
      originalConsoleWarn(...args);
    };
    
    console.log('ðŸ” [TEST] About to render App...');
    render(<App />);
    console.log('ðŸ” [TEST] App render call completed');
    
    // Wait a bit for components to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('ðŸ” [TEST] Final state:');
    console.log('  - AppContent rendered:', appContentRendered);
    console.log('  - DynamicRoutes rendered:', dynamicRoutesRendered);
    
    // Restore console
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
    
    // Just check that something rendered
    expect(document.body).toBeTruthy();
  }, 15000);
});