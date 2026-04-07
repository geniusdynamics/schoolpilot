// Main components
export { TabbedWorkspace } from './TabbedWorkspace';
export { TabBar } from './TabBar';
export { Tab } from './Tab';
export { TabContent } from './TabContent';
export { ActionBar } from './ActionBar';
export { ContextualActionBar } from './ContextualActionBar';
export { SubTabNavigation } from './SubTabNavigation';

// Types
export type {
  Tab as TabType,
  TabState,
  TabGroup,
  TabStore,
  ActionDefinition,
  ActionGroup,
  ActionRegistry,
  TabComponentProps,
  TabBarProps,
  ActionBarProps,
  TabbedWorkspaceProps
} from '../../types/tabbedWorkspace';

// Stores and services
export { useTabStore } from '../../stores/tabStore';
export { useActionRegistry } from '../../services/ui/actionRegistry';
export {
  allModuleActions,
  getActionsByModule,
  registerAllModuleActions,
  academicsActions,
  administrationActions,
  financeActions,
  hrActions,
  inventoryActions,
  libraryActions,
  nutritionActions,
  reportsActions,
  settingsActions
} from '../../services/module/moduleActions';

// Default export
export { TabbedWorkspace as default } from './TabbedWorkspace';