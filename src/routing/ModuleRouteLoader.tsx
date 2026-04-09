// ABOUTME: Route-based module loading component
// ABOUTME: Loads modules dynamically when their routes are accessed

import { useEffect, useState } from 'react';
import { moduleLoader } from '@/core/moduleLoader';
import Spinner from '@/components/ui/Spinner';

interface ModuleRouteLoaderProps {
  moduleId: string;
  children: React.ReactNode;
  autoEnable?: boolean;
}

export function ModuleRouteLoader({ 
  moduleId, 
  children, 
  autoEnable = true 
}: ModuleRouteLoaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => moduleLoader.isLoaded(moduleId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isLoaded) return;

    const loadModule = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await moduleLoader.load(moduleId, { autoEnable });
        
        if (result.success) {
          setIsLoaded(true);
        } else {
          setError(result.error || new Error('Failed to load module'));
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModule();
  }, [moduleId, autoEnable, isLoaded]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading {moduleId} module...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center p-6 max-w-md">
          <div className="text-red-600 text-xl mb-2">Module Load Error</div>
          <div className="text-gray-700 mb-4">{error.message}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-yellow-50">
        <div className="text-center p-6 max-w-md">
          <div className="text-yellow-600 text-xl mb-2">Module Not Available</div>
          <div className="text-gray-700 mb-4">
            The {moduleId} module is not loaded. Please enable it in settings.
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// HOC for wrapping route components with module loading
export function withModuleLoading<P extends object>(
  moduleId: string,
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function WithModuleLoadingWrapper(props: P) {
    return (
      <ModuleRouteLoader moduleId={moduleId}>
        <Component {...props} />
      </ModuleRouteLoader>
    );
  };
}
