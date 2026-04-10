import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useTranslation } from 'react-i18next';
import { FolderIcon, ChevronLeftIcon, ChevronRightIcon, BookOpenIcon, DocumentReportIcon, XIcon, StarIcon } from './ui/icons';
import { useSecondarySidebar } from '@/hooks/useSecondarySidebar';
import HookErrorBoundary from './HookErrorBoundary';
import { SidebarSkeleton } from './ModuleLoadingFallback';

// Fallback icon helper
function getFallbackIcon(moduleKey: string) {
  switch (moduleKey) {
    case 'library':
      return <BookOpenIcon className="w-4 h-4" />;
    case 'reports':
      return <DocumentReportIcon className="w-4 h-4" />;
    default:
      return <FolderIcon className="w-4 h-4" />;
  }
}

// Icon wrapper component
const IconWrapper: React.FC<{ 
  icon?: React.ComponentType<any>; 
  moduleKey: string; 
  className?: string;
  isMinimized?: boolean;
  isMobile?: boolean;
}> = ({ icon, moduleKey, className = "", isMinimized = false, isMobile = false }) => {
  const iconSize = isMobile ? "w-5 h-5" : "w-4 h-4";
  const wrapperSize = isMinimized ? "w-5 h-5" : isMobile ? "w-6 h-6" : "w-5 h-5";
  
  return (
    <div className={`
      ${wrapperSize} 
      flex items-center justify-center 
      flex-shrink-0
      backdrop-blur-sm bg-white/20 rounded-md
      border border-white/10 shadow-sm
      transition-all duration-200
      ${className}
    `}>
      {icon 
        ? React.createElement(icon, { 
            className: `${iconSize} transition-all duration-200 relative z-10` 
          })
        : React.cloneElement(getFallbackIcon(moduleKey), {
            className: `${iconSize} transition-all duration-200 relative z-10`
          })
      }
    </div>
  );
};

interface SecondarySidebarProps {
  selectedModuleKey: string;
  isOpen: boolean;
  onClose: () => void;
  items?: any[];
  onItemClick?: (item: { path: string; name?: string }) => void;
  /** Whether full-width mode is active (primary sidebar hidden) */
  isFullWidth?: boolean;
  /** Whether this sidebar should act as the primary sidebar (at far left) */
  isAsPrimary?: boolean;
}

const SecondarySidebar: React.FC<SecondarySidebarProps> = ({
  selectedModuleKey,
  isOpen,
  onClose,
  items: propItems,
  onItemClick,
  isFullWidth = false,
  isAsPrimary = false
}) => {
  const { t } = useTranslation(['navigation', 'common']);
  
  // Helper function to translate item names
  const translateItemName = (itemName: string): string => {
    if (!itemName) return '';
    // Parse namespace from key like "navigation:key.subkey"
    const [namespace, key] = itemName.includes(':') 
      ? itemName.split(':') 
      : ['navigation', itemName];
    return t(key, { ns: namespace });
  };
  
  const {
    search,
    setSearch,
    openGroups,
    isMinimized,
    isMobile,
    focusedIndex,
    subMenus,
    isLoading,
    moduleKey,
    moduleStyle,
    toggleGroup,
    toggleMinimized,
    handleNavigationClick,
    handleKeyDown,
    handleDragEnd,
    filterItems,
    setFocusedIndex
  } = useSecondarySidebar({ 
    selectedModuleKey, 
    isOpen, 
    onClose, 
    items: propItems, 
    onItemClick 
  });

  if (!isOpen) {
    return null;
  }

  const sidebarWidth = isMinimized ? 'w-14' : 'w-52';
  // When full-width and acting as primary, position at far left (left-0)
  // Otherwise, position next to primary sidebar (left-16 sm:left-20)
  const leftPosition = (isFullWidth && isAsPrimary) ? 'left-0' : 'left-16 sm:left-20';
  const sidebarClasses = isMobile
    ? `w-44 sm:w-24 fixed top-0 ${leftPosition} z-40 shadow-2xl h-screen pt-16`
    : `${sidebarWidth} fixed top-0 ${leftPosition} z-40 h-screen pt-16 transition-all duration-300 ease-in-out`;

  if (isLoading) {
    return <SidebarSkeleton />;
  }

  return (
    <HookErrorBoundary>
      {/* Mobile backdrop */}
      {isMobile && (
        <div
          className={`
            fixed inset-0 top-12 ${(isFullWidth && isAsPrimary) ? 'left-0' : 'left-16 sm:left-20'} z-30 transition-all duration-300 ease-in-out
            ${isOpen 
              ? 'bg-transparent opacity-100 pointer-events-auto mobile-fade-in' 
              : 'bg-transparent opacity-0 pointer-events-none mobile-fade-out'
            }
          `}
          onClick={isOpen ? onClose : undefined}
          onTouchStart={(e) => {
            if (isOpen) {
              e.preventDefault();
              onClose();
            }
          }}
          role={isOpen ? "button" : undefined}
          aria-label={isOpen ? "Close sidebar" : undefined}
          tabIndex={isOpen ? 0 : -1}
          onKeyDown={(e) => {
            if (isOpen && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) {
              e.preventDefault();
              onClose();
            }
          }}
        />
      )}

      <aside
        id="secondary-sidebar"
        className={`
          ${sidebarClasses}
          ${isOpen ? 'block transform translate-x-0 mobile-slide-in' : 'hidden transform -translate-x-full mobile-slide-out'}
          flex flex-col shadow-xl border-l ${moduleStyle.border}
          px-2 py-4
          ${moduleStyle.background}
          ${isMobile ? 'bg-white/98' : 'bg-white/95'}
          transition-transform duration-300 ease-in-out
        `}
        style={{ willChange: isMobile ? 'transform' : 'auto' }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Control buttons */}
        <div className="absolute top-4 right-2 z-[70] flex flex-col gap-1">
          {!isMobile && (
            <button
              className={`
                text-slate-600 hover:text-slate-800
                bg-white/90 hover:bg-white
                border border-slate-200/50 hover:border-slate-300
                shadow-sm hover:shadow-md
                p-1.5 rounded-lg
                transition-all duration-200
                hover:scale-105
                focus:outline-none focus:ring-2 focus:ring-slate-400/50
              `}
              onClick={toggleMinimized}
              title={isMinimized ? "Expand menu" : "Minimize menu"}
            >
              {isMinimized ? <ChevronRightIcon className="w-3 h-3" /> : <ChevronLeftIcon className="w-3 h-3" />}
            </button>
          )}
        </div>
        
        {/* Close button */}
        <button
          className={`
            absolute ${isMobile ? '-top-2 -right-2 w-10 h-10 p-2' : '-top-1 -right-1 w-8 h-8 p-1.5'} 
            z-40 text-red-600 hover:text-red-800 active:text-red-900
            hover:bg-red-100 active:bg-red-200
            rounded-full bg-white shadow-lg border border-red-200 
            transition-all duration-200 hover:scale-110 hover:shadow-xl
            focus:outline-none focus:ring-2 focus:ring-red-400/50
            touch-manipulation
          `}
          onClick={onClose}
          onTouchEnd={(e) => {
            e.preventDefault();
            onClose();
          }}
          title="Close sidebar"
          aria-label="Close sidebar"
        >
          <XIcon className={`${isMobile ? 'w-5 h-5' : 'w-3 h-3'}`} />
        </button>
        
        {subMenus.length === 0 && (
          <div className="flex-1 flex items-center justify-center px-3">
            <div className="text-center text-slate-500 text-sm">
              <div className="font-medium">No submenu items available</div>
              <div className="mt-1 text-xs text-slate-400">{moduleKey}</div>
            </div>
          </div>
        )}

        {/* Search bar */}
        {!isMinimized && (
          <div className="mb-3 sm:mb-4 flex-shrink-0 relative z-10">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className={`
                w-full rounded-lg bg-white/80
                border ${moduleStyle.border} 
                ${moduleStyle.accent} 
                ${isMobile ? 'px-4 py-4 text-base font-medium' : 'px-3 py-1.5 text-sm'}
                focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50
                focus:bg-white/90 focus:placeholder-slate-600
                placeholder-slate-500
                ${isMobile ? 'shadow-lg' : 'shadow-sm'}
                transition-all duration-200
                touch-manipulation
              `}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>
        )}
        
        {/* Navigation content */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 sm:pr-2 relative z-10 min-h-0 ${subMenus.length === 0 ? 'hidden' : ''}`}>
          <ul className={`${isMobile ? 'space-y-2' : 'space-y-1'} ${isMinimized ? 'items-center' : ''} pb-4 sm:pb-6`}>
            {filterItems(subMenus).map((item, index) => (
              <li key={item.name || index}>
                {item.isGroup && item.children ? (
                  <div className="relative group">
                    <button
                      onClick={() => !isMinimized && toggleGroup(item.name)}
                      onFocus={() => setFocusedIndex(filterItems(subMenus).indexOf(item))}
                      className={`
                        flex items-center ${isMinimized ? 'justify-center w-full px-1 py-2' : 'justify-between w-full px-3 py-2'} 
                        ${isMobile ? 'min-h-[3rem] text-sm' : 'text-xs'} uppercase tracking-wider 
                        ${moduleStyle.accent} font-bold 
                        focus:outline-none ${moduleStyle.hover} 
                        rounded transition-all duration-200
                        bg-white/10 hover:bg-white/20
                        ${isMinimized ? 'min-h-[2.5rem]' : ''}
                        touch-manipulation
                        focus:ring-2 focus:ring-current focus:ring-opacity-50
                        focus:bg-white/25 focus:scale-105
                        ${focusedIndex === filterItems(subMenus).indexOf(item) ? 'bg-white/25 ring-2 ring-current ring-opacity-50' : ''}
                      `}
                      title={isMinimized ? translateItemName(item.name) : undefined}
                      tabIndex={0}
                    >
                      <span className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-2'}`}>
                        <IconWrapper 
                          icon={item.icon} 
                          moduleKey={moduleKey} 
                          isMinimized={isMinimized}
                          isMobile={isMobile}
                        />
                        {!isMinimized && <span className="truncate text-xs">{translateItemName(item.name)}</span>}
                      </span>
                      {!isMinimized && <span className="flex-shrink-0 text-xs">{openGroups[item.name] ? '▼' : '▶'}</span>}
                    </button>
                    
                    {/* Tooltip for minimized state */}
                    {isMinimized && !isMobile && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50">
                        {translateItemName(item.name)}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-b-[4px] border-r-[6px] border-t-transparent border-b-transparent border-r-slate-800"></div>
                      </div>
                    )}
                    
                    {/* Children */}
                    {openGroups[item.name] && !isMinimized && (
                      item.name === 'Favorites' ? (
                        <DragDropContext onDragEnd={handleDragEnd}>
                          <Droppable droppableId="favorites-list">
                            {(provided) => (
                              <ul 
                                className="space-y-1 mt-1"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                              >
                                {item.children.map((child: any, childIndex: number) => (
                                  <Draggable key={child?.id || child?.path || `fav-${childIndex}`} draggableId={child?.id || child?.path || `fav-${childIndex}`} index={childIndex}>
                                    {(provided, snapshot) => (
                                      <li 
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={snapshot.isDragging ? "opacity-80 scale-105 z-50" : ""}
                                      >
                                        <button
                                          onClick={(e) => handleNavigationClick(child, e)}
                                          className={`flex items-center gap-3 ${isMobile ? 'px-4 py-4 min-h-[3.5rem]' : 'px-3 py-2'} border border-transparent transition-all duration-200 rounded-lg text-slate-700 ${moduleStyle.hoverLink} hover:shadow-md bg-white/5 hover:bg-white/20 touch-manipulation focus:ring-2 focus:ring-current focus:ring-opacity-50 focus:bg-white/25 focus:scale-105 w-full text-left`}
                                          tabIndex={0}
                                        >
                                          <IconWrapper 
                                            icon={child.icon} 
                                            moduleKey={moduleKey}
                                            isMobile={isMobile}
                                          />
                                          <span className={`font-medium ${isMobile ? 'text-base leading-relaxed' : 'text-sm'} truncate`}>{child.name}</span>
                                        </button>
                                      </li>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </ul>
                            )}
                          </Droppable>
                        </DragDropContext>
                      ) : (
                        <ul className="space-y-1 mt-1">
                          {item.children.map((child: any) => (
                            <li key={child.name}>
                              <button
                                onClick={(e) => handleNavigationClick(child, e)}
                                className={`flex items-center gap-3 ${isMobile ? 'px-4 py-4 min-h-[3.5rem]' : 'px-3 py-2'} border border-transparent transition-all duration-200 rounded-lg text-slate-700 ${moduleStyle.hoverLink} hover:shadow-md bg-white/5 hover:bg-white/20 touch-manipulation focus:ring-2 focus:ring-current focus:ring-opacity-50 focus:bg-white/25 focus:scale-105 w-full text-left`}
                                tabIndex={0}
                              >
                                <IconWrapper 
                                  icon={child.icon} 
                                  moduleKey={moduleKey}
                                  isMobile={isMobile}
                                />
                                <span className={`font-medium ${isMobile ? 'text-base leading-relaxed' : 'text-sm'} truncate`}>{child.name}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )
                    )}
                  </div>
                ) : (
                  <div className="relative group">
                    <button
                      onClick={(e) => handleNavigationClick(item, e)}
                      onFocus={() => setFocusedIndex(filterItems(subMenus).indexOf(item))}
                      className={`flex items-center ${isMinimized ? 'justify-center px-1 py-2 min-h-[2.5rem]' : isMobile ? 'gap-3 px-4 py-4 min-h-[3.5rem]' : 'gap-2 px-3 py-2'} border border-transparent transition-all duration-200 rounded-lg text-slate-700 ${moduleStyle.hoverLink} hover:shadow-md bg-white/5 hover:bg-white/20 touch-manipulation focus:ring-2 focus:ring-current focus:ring-opacity-50 focus:bg-white/25 focus:scale-105 ${focusedIndex === filterItems(subMenus).indexOf(item) ? 'bg-white/25 ring-2 ring-current ring-opacity-50' : ''} w-full text-left`}
                      title={isMinimized ? translateItemName(item.name) : undefined}
                      tabIndex={0}
                    >
                      <IconWrapper 
                        icon={item.icon} 
                        moduleKey={moduleKey} 
                        isMinimized={isMinimized}
                        isMobile={isMobile}
                      />
                      {!isMinimized && <span className={`font-medium ${isMobile ? 'text-base leading-relaxed' : 'text-sm'} truncate`}>{translateItemName(item.name)}</span>}
                    </button>
                    
                    {/* Tooltip for minimized state */}
                    {isMinimized && !isMobile && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50">
                        {translateItemName(item.name)}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-b-[4px] border-r-[6px] border-t-transparent border-b-transparent border-r-slate-800"></div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        <style>{`
          .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: ${isMobile ? '8px' : '6px'};
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(156, 163, 175, ${isMobile ? '0.6' : '0.5'});
            border-radius: ${isMobile ? '4px' : '3px'};
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(156, 163, 175, 0.7);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:active {
            background-color: rgba(156, 163, 175, 0.8);
          }
          
          @media (max-width: 1024px) {
            .custom-scrollbar {
              -webkit-overflow-scrolling: touch;
              scroll-behavior: smooth;
            }
            
            .mobile-slide-in {
              animation: slideInFromLeft 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            
            .mobile-slide-out {
              animation: slideOutToLeft 0.25s cubic-bezier(0.55, 0.06, 0.68, 0.19);
            }
            
            .mobile-fade-in {
              animation: fadeIn 0.2s ease-out;
            }
            
            .mobile-fade-out {
              animation: fadeOut 0.15s ease-in;
            }
          }
          
          @keyframes slideInFromLeft {
            from {
              transform: translateX(-100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes slideOutToLeft {
            from {
              transform: translateX(0);
              opacity: 1;
            }
            to {
              transform: translateX(-100%);
              opacity: 0;
            }
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          
          @media (prefers-reduced-motion: reduce) {
            .custom-scrollbar,
            .mobile-slide-in,
            .mobile-slide-out,
            .mobile-fade-in,
            .mobile-fade-out {
              animation: none !important;
              transition: none !important;
            }
          }
        `}</style>
      </aside>
    </HookErrorBoundary>
  );
};

export default SecondarySidebar;
