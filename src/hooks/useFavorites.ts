import { useState, useEffect } from 'react';

const FAVORITES_KEY = 'schoolpilot_favorite_tabs';

export interface FavoriteTab {
  id: string;
  title: string;
  url: string;
  icon?: string;
  module: string;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteTab[]>(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (tab: FavoriteTab) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === tab.id)) return prev;
      return [...prev, {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        icon: tab.icon,
        module: tab.module
      }];
    });
  };

  const removeFavorite = (tabId: string) => {
    setFavorites(prev => prev.filter(f => f.id !== tabId));
  };

  const toggleFavorite = (tab: FavoriteTab) => {
    setFavorites(prev => {
      if (prev.some(f => f.id === tab.id)) {
        return prev.filter(f => f.id !== tab.id);
      }
      return [...prev, tab];
    });
  };

  const isFavorite = (tabId: string) => favorites.some(f => f.id === tabId);

  const reorderFavorites = (startIndex: number, endIndex: number) => {
    setFavorites(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    reorderFavorites
  };
}
