// ABOUTME: Hook to get content width state based on fullwidth mode
// ABOUTME: Returns width class and container class for responsive page content
import { useFullWidth } from '@/contexts/FullWidthContext';

export function useContentWidth() {
  const { isFullWidth } = useFullWidth();
  
  return {
    isFullWidth,
    widthClass: isFullWidth ? 'w-full' as const : 'max-w-7xl' as const,
    containerClass: isFullWidth ? 'px-4' as const : 'mx-auto px-4 sm:px-6 lg:px-8' as const,
  };
}
