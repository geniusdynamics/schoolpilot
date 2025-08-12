// Main components
export { TabbedWorkspace } from './TabbedWorkspace';
export { TabBar } from './TabBar';
export { Tab } from './Tab';
export { ActionBar } from './ActionBar';

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
export { useActionRegistry } from '../../services/actionRegistry';
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
} from '../../services/moduleActions';

// Default export
export { TabbedWorkspace as default } from './TabbedWorkspace';