// ABOUTME: Dismissible banner component for temporary network status notifications
// ABOUTME: Auto-dismisses after a specified duration and respects dismissed state

import React, { useEffect, useState } from 'react';

interface DismissibleBannerProps {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  duration?: number; // Auto-dismiss duration in milliseconds
  showOnReload?: boolean;
}

const DismissibleBanner: React.FC<DismissibleBannerProps> = ({
  id,
  message,
  type,
  duration = 5000, // Default 5 seconds
  showOnReload = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if this banner has been dismissed in this session
  useEffect(() => {
    const dismissedKey = `dismissed-banner-${id}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey) === 'true';
    
    if (!wasDismissed || !showOnReload) {
      setIsVisible(true);
    }
  }, [id, showOnReload]);

  // Auto-dismiss after duration
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem(`dismissed-banner-${id}`, 'true');
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.95)',
          color: 'white',
          borderColor: 'rgba(220, 38, 38, 1)',
        };
      case 'warning':
        return {
          backgroundColor: 'rgba(245, 158, 11, 0.95)',
          color: 'white',
          borderColor: 'rgba(217, 119, 6, 1)',
        };
      case 'info':
        return {
          backgroundColor: 'rgba(59, 130, 246, 0.95)',
          color: 'white',
          borderColor: 'rgba(37, 99, 235, 1)',
        };
      case 'success':
        return {
          backgroundColor: 'rgba(34, 197, 94, 0.95)',
          color: 'white',
          borderColor: 'rgba(22, 163, 74, 1)',
        };
      default:
        return {
          backgroundColor: 'rgba(107, 114, 128, 0.95)',
          color: 'white',
          borderColor: 'rgba(75, 85, 99, 1)',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        padding: '4px 8px',
        borderRadius: '4px',
        zIndex: 10000,
        fontSize: '0.7rem',
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        border: `1px solid ${styles.borderColor}`,
        maxWidth: '200px',
        wordWrap: 'break-word',
        animation: 'slideIn 0.3s ease-out',
        lineHeight: '1.2',
      }}
      className="dismissible-banner"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <span>{message}</span>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            fontSize: '0.9rem',
            cursor: 'pointer',
            padding: '0',
            margin: '0',
            lineHeight: '1',
            opacity: 0.7,
            marginLeft: '4px',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .dismissible-banner {
    transition: opacity 0.3s ease-out, transform 0.3s ease-out;
  }
  
  .dismissible-banner.dismissing {
    opacity: 0;
    transform: translateX(100%);
  }
`;

if (typeof document !== 'undefined' && !document.getElementById('dismissible-banner-styles')) {
  style.id = 'dismissible-banner-styles';
  document.head.appendChild(style);
}

export default DismissibleBanner;