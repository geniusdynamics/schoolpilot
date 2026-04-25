// ============================================================================
// Icon Registry - Domain-based exports
// ============================================================================
// This barrel file re-exports all icons for backward compatibility.
// For better tree-shaking, import from specific domain files:
//   - navigation.ts - Navigation icons
//   - actions.ts - Action icons (edit, delete, save)
//   - status.ts - Status icons (check, warning, error)
//   - module.ts - Module-specific icons
//   - misc.ts - Miscellaneous icons
// ============================================================================

// Base interface
export interface IconProps extends React.SVGProps<SVGSVGElement> {}

// Navigation icons
export {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  AcademicCapIcon,
  BookOpenIcon,
  CogIcon,
  ArchiveIcon,
  CurrencyDollarIcon,
  LibraryIcon,
  BeakerIcon,
  ChartPieIcon,
  DocumentReportIcon,
  BuildingLibraryIcon,
  BriefcaseIcon,
  FolderIcon,
  NewspaperIcon,
  FlagIcon,
} from './navigation';

// Action icons
export {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  XIcon,
  UploadIcon,
  ArrowUpTrayIcon,
  DownloadIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BellIcon,
  RefreshCwIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  EyeSlashIcon,
  SearchIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  MenuIcon,
  PaperAirplaneIcon,
  LogoutIcon,
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
  MinusIcon,
  PencilIcon,
  PlayIcon,
  StopIcon,
} from './actions';

// Status icons
export {
  AlertTriangleIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  MinusCircleIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  StarIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
} from './status';

// Module-specific icons
export {
  TicketIcon,
  CollectionIcon,
  BuildingOffice2Icon,
  BuildingOfficeIcon,
  IdentificationIcon,
  ListBulletIcon,
  DatabaseIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  CalendarIcon,
  EnvelopeIcon,
  MegaphoneIcon,
  PuzzlePieceIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  DocumentAddIcon,
  DocumentSearchIcon,
  CopyIcon,
  TableCellsIcon,
  BanknotesIcon,
  CircleStackIcon,
  ReceiptPercentIcon,
  ReceiptRefundIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  WalletIcon,
  ScaleIcon,
  CubeIcon,
  CubeTransparentIcon,
  QueueListIcon,
  ShoppingCartIcon,
  SparklesIcon,
  CakeIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  ViewColumnsIcon,
  DocumentTextIcon,
  ExamIcon,
  InboxIcon,
  FunnelIcon,
  FilterIcon,
  UserMinusIcon,
  DocumentCheckIcon,
  TrophyIcon,
  CalculatorIcon,
  PaintBrushIcon,
  KeyIcon,
  WrenchIcon,
} from './module';

// Miscellaneous icons
export {
  PhoneIcon,
  MessageIcon,
  PrinterIcon,
  LockClosedIcon,
  PaperClipIcon,
  UserCircleIcon,
  UserIcon,
  GlobeAltIcon,
  LoaderIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ChatBubbleLeftEllipsisIcon,
  UserPlusIcon,
  XMarkIcon,
  TrashIcon,
  SchoolIcon,
  DocumentArrowUpIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
} from './misc';

// Re-export IconProps as default
export type { IconProps as default };
