import React, { useState } from 'react';
import { Heart, Trash2, Layers, ArrowRight } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { PhotoCard } from '../components/PhotoCard';

export const FavoritesView = ({ onOpenModal, onNavigate }) => {
  const { favorites, clearFavorites, count } = useFavorites();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">
              <Heart size={22} color="var(--accent-rose)" fill="var(--accent-rose)" /> Saved Favorites
            </h2>
            <p className="panel-subtitle">
              Your curated collection of search results and saved moments
            </p>
          </div>

          {count > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {confirmClear ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#f87171' }}>Are you sure?</span>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      clearFavorites();
                      setConfirmClear(false);
                    }}
                  >
                    Confirm Clear All
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setConfirmClear(true)}
                  style={{ color: '#f87171' }}
                >
                  <Trash2 size={15} />
                  <span>Clear All Favorites ({count})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {count === 0 ? (
        <div className="empty-state">
          <Heart className="empty-icon" style={{ color: 'var(--accent-rose)' }} />
          <h3 style={{ color: 'var(--text-primary)' }}>Your Favorites List is Empty</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', fontSize: '0.9rem' }}>
            Click the heart icon on any photo in the gallery or search results to save it here.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate('gallery')}
            >
              Browse All Photos <ArrowRight size={15} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate('face')}
            >
              Try Face Search
            </button>
          </div>
        </div>
      ) : (
        <div className="gallery-grid">
          {favorites.map((photo, idx) => (
            <PhotoCard
              key={photo.photo_path || idx}
              photo={photo}
              onOpenModal={onOpenModal}
            />
          ))}
        </div>
      )}
    </div>
  );
};
