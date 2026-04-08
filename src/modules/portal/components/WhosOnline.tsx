// ABOUTME: Who's Online widget showing online users
// ABOUTME: Displays online users with last seen status and messenger launch

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PortalWidgetCard from './PortalWidgetCard';
import {
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@/components/ui/icons';
import Button from '@/components/ui/Button';

export interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
  lastSeen: string;
  isOnline: boolean;
  status?: 'online' | 'away' | 'busy';
}

export interface WhosOnlineProps {
  users?: OnlineUser[];
  currentUserStatus?: 'online' | 'offline';
  onLaunchMessenger?: () => void;
  onStatusChange?: (status: 'online' | 'offline') => void;
}

const defaultUsers: OnlineUser[] = [
  { id: '1', name: 'James Smith', lastSeen: '2 mins ago', isOnline: true, status: 'online' },
  { id: '2', name: 'Michael Jones', lastSeen: '3 mins ago', isOnline: true, status: 'online' },
  { id: '3', name: 'Susan Johnston', lastSeen: '9 mins ago', isOnline: true, status: 'away' },
];

const getTabs = (t: (key: string) => string) => [
  t('portal.whosOnline.title'),
  t('portal.whosOnline.loginHistory'),
  t('portal.whosOnline.accountOptions'),
];

export const WhosOnline: React.FC<WhosOnlineProps> = ({
  users = defaultUsers,
  currentUserStatus = 'online',
  onLaunchMessenger,
  onStatusChange,
}) => {
  const { t } = useTranslation('portal');
  const [activeTab, setActiveTab] = useState<string>('');
  
  React.useEffect(() => {
    const tabs = getTabs(t);
    if (!activeTab) {
      setActiveTab(tabs[0]);
    }
  }, [t, activeTab]);

  const onlineCount = users.filter(u => u.isOnline).length;

  return (
    <PortalWidgetCard
      title={t('portal.whosOnline.title')}
      tabs={getTabs(t)}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      showMoreOptions={false}
    >
      {activeTab === t('portal.whosOnline.title') && (
        <div className="space-y-3">
          {/* Users List */}
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <UserCircleIcon className="w-5 h-5" />
                    </div>
                  )}
                  {/* Online Indicator */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      user.status === 'online'
                        ? 'bg-emerald-500'
                        : user.status === 'away'
                        ? 'bg-amber-500'
                        : 'bg-gray-400'
                    }`}
                  />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                </div>

                {/* Last Seen */}
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <span>{t('portal.whosOnline.lastSeen')} {user.lastSeen}</span>
                </div>
              </div>
            ))}
          </div>

          {/* My Status */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('portal.whosOnline.myStatus')}:</span>
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                currentUserStatus === 'online' ? 'text-emerald-600' : 'text-gray-500'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  currentUserStatus === 'online' ? 'bg-emerald-500' : 'bg-gray-400'
                }`} />
                {currentUserStatus === 'online' ? t('portal.whosOnline.online') : t('portal.whosOnline.offline')}
              </span>
            </div>
          </div>

          {/* Launch Messenger Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onLaunchMessenger}
            leftIcon={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
            className="w-full justify-center"
          >
            {t('portal.whosOnline.launchMessenger')}
          </Button>
        </div>
      )}

      {activeTab === t('portal.whosOnline.loginHistory') && (
        <div className="text-center py-6 text-gray-500">
          <ClockIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">{t('portal.whosOnline.loginHistoryPlaceholder')}</p>
        </div>
      )}

      {activeTab === t('portal.whosOnline.accountOptions') && (
        <div className="text-center py-6 text-gray-500">
          <ShieldCheckIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">{t('portal.whosOnline.accountOptionsPlaceholder')}</p>
        </div>
      )}
    </PortalWidgetCard>
  );
};

export default WhosOnline;
