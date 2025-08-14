import React from 'react';

interface LoadingScreenProps {
  message?: string;
  spinner?: boolean;
  overlay?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  spinner = true,
  overlay = false,
}) => {
  const overlayClasses = overlay
    ? 'fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50'
    : 'w-full h-full';

  return (
    <div className={overlayClasses}>
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {spinner && (
          <div className="relative w-16 h-16 mb-4">
            {/* Spinner rings */}
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-[spin_3s_linear_infinite]" />
            <div className="absolute inset-2 border-4 border-cyan-300 rounded-full animate-[spin_2s_linear_infinite]" />
            <div className="absolute inset-4 border-4 border-indigo-400 rounded-full animate-[spin_1.5s_linear_infinite]" />
            {/* Center dot */}
            <div className="absolute inset-[30px] bg-indigo-500 rounded-full animate-pulse" />
          </div>
        )}
        <p className={`
          text-lg sm:text-xl font-medium
          ${overlay ? 'text-slate-700' : 'text-slate-600'}
          animate-pulse
        `}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
