import React, { useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Spinner from '@/components/ui/Spinner';
import { ChartBarIcon, StarIcon } from '@/components/ui/icons';
import { useHousesData } from '../data/useHousesData';
import { useTranslation } from 'react-i18next';
import type { HouseLeaderboardEntry } from '../data/types';

const rankColors: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-gray-400',
  3: 'text-amber-600',
};

const rankIcons: Record<number, string> = {
  1: '\u{1F947}', // Gold medal
  2: '\u{1F948}', // Silver medal
  3: '\u{1F949}', // Bronze medal
};

const LeaderboardPage: React.FC = () => {
  const { t } = useTranslation('houses');
  const { houses, loading, getLeaderboard } = useHousesData();

  const leaderboard = useMemo(() => {
    return getLeaderboard();
  }, [houses, getLeaderboard]);

  // Calculate stats
  const stats = useMemo(() => {
    if (leaderboard.length === 0) return null;
    const totalPoints = leaderboard.reduce((sum, e) => sum + e.totalPoints, 0);
    const totalMembers = leaderboard.reduce((sum, e) => sum + e.memberCount, 0);
    const avgPoints = totalMembers > 0 ? Math.round(totalPoints / totalMembers) : 0;
    return { totalPoints, totalMembers, avgPoints, houseCount: leaderboard.length };
  }, [leaderboard]);

  const columns: DataGridColumn<HouseLeaderboardEntry>[] = [
    {
      key: 'rank',
      header: t('leaderboard.rank'),
      sortable: true,
      filterable: false,
      width: 100,
      align: 'center',
      render: (value: number) => (
        <div className="flex items-center justify-center gap-2">
          {rankIcons[value] && (
            <span className="text-2xl">{rankIcons[value]}</span>
          )}
          {!rankIcons[value] && (
            <span className={`text-lg font-bold ${rankColors[value] || 'text-gray-600'}`}>
              #{value}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'houseName',
      header: t('leaderboard.house'),
      sortable: true,
      filterable: true,
      width: 200,
      render: (value, item) => (
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-semibold text-base">{value}</span>
        </div>
      ),
    },
    {
      key: 'totalPoints',
      header: t('leaderboard.totalPoints'),
      sortable: true,
      filterable: false,
      width: 140,
      align: 'center',
      render: (value: number, item) => (
        <div>
          <span className="text-xl font-bold text-indigo-600">{value}</span>
          <p className="text-xs text-gray-500">total points</p>
        </div>
      ),
    },
    {
      key: 'meritPoints',
      header: t('leaderboard.merits'),
      sortable: true,
      filterable: false,
      width: 120,
      align: 'center',
      render: (value: number) => (
        <span className="font-semibold text-green-600">+{value}</span>
      ),
    },
    {
      key: 'demeritPoints',
      header: t('leaderboard.demerits'),
      sortable: true,
      filterable: false,
      width: 120,
      align: 'center',
      render: (value: number) => (
        <span className="font-semibold text-red-600">-{value}</span>
      ),
    },
    {
      key: 'memberCount',
      header: t('leaderboard.members'),
      sortable: true,
      filterable: false,
      width: 120,
      align: 'center',
    },
  ];

  // Visual leaderboard cards for top houses
  const renderLeaderboardCards = () => {
    if (leaderboard.length === 0) return null;

    const topHouses = leaderboard.slice(0, 3);
    const maxPoints = leaderboard[0]?.totalPoints || 1;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {topHouses.map((entry, index) => {
          const percentage = Math.round((entry.totalPoints / maxPoints) * 100);
          const isFirst = index === 0;

          return (
            <Card
              key={entry.houseId}
              variant={isFirst ? 'elevated' : 'default'}
              className={`relative overflow-hidden ${isFirst ? 'ring-2 ring-yellow-400' : ''}`}
            >
              {/* Rank Badge */}
              <div className="absolute top-4 right-4">
                <span className="text-4xl">{rankIcons[entry.rank]}</span>
              </div>

              {/* Color Indicator */}
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: entry.color }}
              />

              <div className="pl-4">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{entry.houseName}</h3>
                    <p className="text-xs text-gray-500">{entry.memberCount} members</p>
                  </div>
                </div>

                <div className="mb-3">
                  <span className="text-3xl font-bold text-indigo-600">
                    {entry.totalPoints.toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Total Points</p>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: entry.color,
                    }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span className="text-green-600 font-medium">+{entry.meritPoints} merits</span>
                  <span className="text-red-600 font-medium">-{entry.demeritPoints} demerits</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="compact" className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{stats.houseCount}</p>
            <p className="text-xs text-gray-500 mt-1">Houses</p>
          </Card>
          <Card variant="compact" className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.totalMembers}</p>
            <p className="text-xs text-gray-500 mt-1">Total Members</p>
          </Card>
          <Card variant="compact" className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.totalPoints.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Total Points</p>
          </Card>
          <Card variant="compact" className="text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.avgPoints}</p>
            <p className="text-xs text-gray-500 mt-1">Avg Points/Member</p>
          </Card>
        </div>
      )}

      {/* Top Houses Cards */}
      {renderLeaderboardCards()}

      {/* Full Leaderboard Table */}
      <Card
        title={t('leaderboard.title')}
        subtitle="Complete house rankings"
        icon={<ChartBarIcon className="w-5 h-5 text-indigo-600" />}
      >
        <DataGrid
          columns={columns}
          data={leaderboard}
          sortable
          filterable={false}
          emptyState={
            <div className="text-center py-12">
              <StarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('common.noData')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No houses have been set up yet.
              </p>
            </div>
          }
        />
      </Card>
    </div>
  );
};

export default LeaderboardPage;
