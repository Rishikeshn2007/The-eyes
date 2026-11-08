import React, { useState } from 'react';
import { Heart, Maximize2, Users, Target } from 'lucide-react';
import { resolveImageUrl } from '../services/api';
import { useFavorites } from '../context/FavoritesContext';

export const PhotoCard = ({ photo, onOpenModal }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [imgError, setImgError] = useState(false);

  const photoPath = photo.photo_path || photo.url;
  const filename = photo.filename || (photo.photo_path ? photo.photo_path.replace(/\\/g, '/').split('/').pop() : 'Photo');
  const imageUrl = resolveImageUrl(photo.url || photo.photo_path);
  const favorited = isFavorite(photoPath);

  const hasScore = typeof photo.score === 'number';
  const scorePercent = hasScore ? Math.min(100, Math.max(0, Math.round(photo.score * 100))) : null;

  return (
    <div className="photo-card">
      <div className="photo-img-wrap" onClick={() => onOpenModal && onOpenModal(photo)}>
        {imgError ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              padding: '12px',
              textAlign: 'center',
            }}
          >
            Failed to load image
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={filename}
            className="photo-img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}

        {/* Top badges */}
        {hasScore && (
          <div className="photo-badge-top-left">
            <Target size={13} />
            <span>{(photo.score * 100).toFixed(1)}% Match</span>
          </div>
        )}

        {!hasScore && typeof photo.face_count === 'number' && (
          <div className="photo-badge-top-left">
            <Users size={13} />
            <span>{photo.face_count} Faces</span>
          </div>
        )}

        {/* Favorite button */}
        <button
          type="button"
          className={`photo-fav-btn ${favorited ? 'is-fav' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(photo);
          }}
          title={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={16} fill={favorited ? '#ffffff' : 'none'} />
        </button>
      </div>

      <div className="photo-details">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span className="photo-filename" title={filename}>
            {filename}
          </span>
          <button
            type="button"
            onClick={() => onOpenModal && onOpenModal(photo)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            title="View Full Size"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {hasScore && (
          <div className="photo-score-bar-wrap">
            <div className="score-meter">
              <div
                className="score-meter-fill"
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <span className="score-text">{photo.score.toFixed(4)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
