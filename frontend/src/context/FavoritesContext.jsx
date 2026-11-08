import React, { createContext, useContext, useState, useEffect } from 'react';

const FavoritesContext = createContext();

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('the_eyes_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('the_eyes_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error('Failed to persist favorites', e);
    }
  }, [favorites]);

  const isFavorite = (photoPath) => {
    if (!photoPath) return false;
    return favorites.some((item) => item.photo_path === photoPath);
  };

  const toggleFavorite = (photoItem) => {
    if (!photoItem || !photoItem.photo_path) return;
    setFavorites((prev) => {
      const exists = prev.some((item) => item.photo_path === photoItem.photo_path);
      if (exists) {
        return prev.filter((item) => item.photo_path !== photoItem.photo_path);
      } else {
        return [
          {
            ...photoItem,
            addedAt: new Date().toISOString(),
          },
          ...prev,
        ];
      }
    });
  };

  const addMultipleFavorites = (photoItems) => {
    if (!Array.isArray(photoItems) || photoItems.length === 0) return 0;
    let addedCount = 0;
    setFavorites((prev) => {
      const existingPaths = new Set(prev.map((i) => i.photo_path));
      const newItems = [];
      for (const item of photoItems) {
        if (item && item.photo_path && !existingPaths.has(item.photo_path)) {
          existingPaths.add(item.photo_path);
          newItems.push({
            ...item,
            addedAt: new Date().toISOString(),
          });
          addedCount++;
        }
      }
      return [...newItems, ...prev];
    });
    return addedCount;
  };

  const removeFavorite = (photoPath) => {
    setFavorites((prev) => prev.filter((item) => item.photo_path !== photoPath));
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        addMultipleFavorites,
        removeFavorite,
        clearFavorites,
        count: favorites.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
